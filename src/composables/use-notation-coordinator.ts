/**
 * Implements the session's `notate(result)` seam by driving a single `PhraseScore` instance:
 * computes the written phrase for the active instrument profile's own written pitch, publishes it
 * as `pendingPhrase` for a `PhraseScore` to render, and settles the returned promise from that
 * same `PhraseScore`'s next `engraved`/`notation-error` event. `PhraseScore` also fires those
 * events on its own (a viewport resize, a breakpoint crossing) with no session request behind
 * them; those unsolicited events report through the session's
 * `reportNotationFailure`/`reportNotationRecovered` seam instead of settling a promise nothing is
 * waiting on.
 */
import { ref, type Ref } from 'vue'

import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { WorkspaceSessionResult } from './workspace-session-result'

/** A programming-usage error: a second `notate` call arrived before the first one settled. */
export class NotationCoordinatorUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotationCoordinatorUsageError'
  }
}

/** The session-facing report actions this coordinator routes unsolicited PhraseScore events to. */
// @spec-link [[service_workspace_session_flow]]
export interface NotationCoordinatorSessionReporter {
  readonly reportNotationFailure: (error: Error) => boolean
  readonly reportNotationRecovered: () => boolean
}

export interface NotationCoordinator {
  /** The written phrase the mounted `PhraseScore` should currently render, or null before any exists. */
  readonly pendingPhrase: Ref<WrittenPhrase | null>
  /** The session's injected `notate` seam. */
  readonly notate: (result: WorkspaceSessionResult) => Promise<void>
  /** Drop the presented phrase outside `notate()`'s promise lifecycle, for a session transition that discards the phrase without ever requesting a redraw. */
  readonly clearPresentedPhrase: () => void
  /** Wire to `PhraseScore`'s `@engraved`. */
  readonly handleEngraved: () => void
  /** Wire to `PhraseScore`'s `@notation-error`. */
  readonly handleNotationError: (error: NotationError) => void
}

interface AwaitingRequest {
  readonly resolve: () => void
  readonly reject: (error: Error) => void
}

/** Intent: build one coordinator instance for one workspace session's PhraseScore lifetime. */
export function createNotationCoordinator(
  reporter: NotationCoordinatorSessionReporter,
): NotationCoordinator {
  const pendingPhrase = ref<WrittenPhrase | null>(null) as Ref<WrittenPhrase | null>
  /**
   * Whether `pendingPhrase` currently reflects a phrase a mounted PhraseScore has rendered or
   * attempted to render -- set by every `notate()` and cleared with `clearPresentedPhrase()` -- so
   * an unsolicited redraw event is only reported when there is actually something to report on.
   */
  let hasPublishedPhrase = false
  let awaiting: AwaitingRequest | null = null

  /** Intent: compute the written phrase and await PhraseScore's next settlement of it. */
  function notate(result: WorkspaceSessionResult): Promise<void> {
    if (awaiting !== null) {
      throw new NotationCoordinatorUsageError(
        'notate() was called while a previous notation request was still pending.',
      )
    }
    const phrase = transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent))
    return new Promise<void>((resolve, reject) => {
      awaiting = { resolve, reject }
      pendingPhrase.value = phrase
      hasPublishedPhrase = true
    })
  }

  /** Intent: drop the presented phrase for a session transition that discards it without redrawing. */
  function clearPresentedPhrase(): void {
    if (awaiting !== null) {
      throw new NotationCoordinatorUsageError(
        'clearPresentedPhrase() was called while a notate() request was still pending.',
      )
    }
    pendingPhrase.value = null
    hasPublishedPhrase = false
  }

  /**
   * Intent: settle a pending notate() request on success, or report an outside-operation recovery.
   * With no phrase ever published (or one since cleared) there is no mounted PhraseScore to have
   * redrawn anything, so there is nothing to report.
   */
  // @spec-link [[service_workspace_session_flow]]
  function handleEngraved(): void {
    if (awaiting !== null) {
      const request = awaiting
      awaiting = null
      request.resolve()
      return
    }
    if (!hasPublishedPhrase) return
    reporter.reportNotationRecovered()
  }

  /**
   * Intent: settle a pending notate() request on failure, or report an outside-operation failure,
   * under the same no-published-phrase guard as `handleEngraved`.
   */
  // @spec-link [[service_workspace_session_flow]]
  function handleNotationError(error: NotationError): void {
    if (awaiting !== null) {
      const request = awaiting
      awaiting = null
      request.reject(error)
      return
    }
    if (!hasPublishedPhrase) return
    reporter.reportNotationFailure(error)
  }

  return { pendingPhrase, notate, clearPresentedPhrase, handleEngraved, handleNotationError }
}
