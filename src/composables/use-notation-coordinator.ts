/**
 * Implements the session's `notate(result)` seam by driving a single `PhraseScore` instance:
 * computes the written phrase for the active instrument profile's own written pitch, publishes it
 * as `pendingPhrase` for a `PhraseScore` to render, and settles the returned promise from that
 * same `PhraseScore`'s next `engraved`/`notation-error` event. `PhraseScore` also fires those
 * events on its own (a viewport resize, a breakpoint crossing) with no session request behind
 * them; those unsolicited events report through the session's
 * `reportNotationFailure`/`reportNotationRecovered` seam instead of settling a promise nothing is
 * waiting on. It also keeps the staff's latest layout inputs, as `PhraseScore` reports them, and
 * implements the session's two pre-draw checks against them (does this phrase fit, is there room
 * for the staff at all) through the same lazy engraver loader `PhraseScore` draws with, with the
 * shared system-position size those inputs carry.
 */
import { ref, type Ref } from 'vue'

import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { NotationError } from '@/notation/notation-error'
import type {
  StaffFitVerdict,
  StaffKeySignature,
  StaffLayoutInputs,
  StaffRoomVerdict,
} from '@/notation/staff-fit-types'
import { loadVexflowEngraver, type VexflowEngraverModule } from '@/notation/vexflow-engraver-loader'
import type { StaffLayoutReports } from './generation-session-room-notice'
import type { WorkspaceGeneratedPhrase, WorkspaceSessionResult } from './workspace-session-result'

/** A programming-usage error: a second `notate` call arrived before the first one settled. */
export class NotationCoordinatorUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotationCoordinatorUsageError'
  }
}

/** The session-facing report actions this coordinator routes unsolicited PhraseScore events to. */
// @spec-link [[service_idle_generation_session]]
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
  /** Wire to `PhraseScore`'s `@layout-inputs`: keeps them as the latest and tells subscribers. */
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
  /** The session's `staffLayout` seam: every layout report, as `handleLayoutInputs` receives it. */
  readonly staffLayout: StaffLayoutReports
  /** The session's `checkFit` seam: a generated phrase, as written, against the latest inputs. */
  readonly checkFit: (generated: WorkspaceGeneratedPhrase) => Promise<StaffFitVerdict>
  /** The session's `checkRoom` seam: room for the staff with this key, at the latest inputs. */
  readonly checkRoom: (signature: StaffKeySignature) => Promise<StaffRoomVerdict>
}

/** The part of the engraver module the pre-draw checks use. */
type EngraverPlanning = Pick<
  VexflowEngraverModule,
  'ensureNotationFonts' | 'planWrittenPhraseFit' | 'planStaffRoomForKey'
>

interface AwaitingRequest {
  readonly resolve: () => void
  readonly reject: (error: Error) => void
}

/**
 * Intent: the trailing size argument of a planning call: the shared system-position size the
 * inputs carry, or none, leaving the engraver's built-in default, when they carry none.
 */
function sizeArgument(inputs: StaffLayoutInputs): [] | [number] {
  return inputs.systemPositionUnits === undefined ? [] : [inputs.systemPositionUnits]
}

/** Intent: the written phrase a result is drawn as: the active profile's own written pitch. */
// @spec-link [[module_idle_fit_round]]
function writtenPhraseOf(result: WorkspaceGeneratedPhrase): WrittenPhrase {
  return transformToWrittenPhrase(notationInputFromOutcome(result.outcome, result.intent))
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
    const phrase = writtenPhraseOf(result)
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
  // @spec-link [[service_idle_generation_session]]
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
  // @spec-link [[service_idle_generation_session]]
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

  /** The staff's latest layout inputs, or null before `PhraseScore` has measured any. */
  let latestInputs: StaffLayoutInputs | null = null
  const layoutListeners = new Set<(inputs: StaffLayoutInputs) => void>()

  /**
   * Intent: keep the reported inputs as the latest, then tell every subscriber; stored first, so a
   * check a subscriber starts in reaction already plans with them.
   */
  // @spec-link [[module_idle_fit_round]]
  function handleLayoutInputs(inputs: StaffLayoutInputs): void {
    latestInputs = inputs
    for (const listener of [...layoutListeners]) listener(inputs)
  }

  /** Intent: add a layout-report listener; the returned function removes it. */
  // @spec-link [[module_idle_fit_round]]
  function subscribeToLayout(listener: (inputs: StaffLayoutInputs) => void): () => void {
    layoutListeners.add(listener)
    return () => {
      layoutListeners.delete(listener)
    }
  }

  /**
   * Intent: the latest layout inputs, or the retryable failure a check meets before `PhraseScore`
   * has measured any. There are no default inputs: a check against a guessed width could let a
   * phrase through that the staff then cannot draw.
   */
  // @spec-link [[module_idle_fit_round]]
  function requireLayoutInputs(): StaffLayoutInputs {
    if (latestInputs === null) {
      throw new NotationError(
        'notation_container_unavailable',
        'The staff has not reported its layout inputs yet, so nothing can be checked against it.',
        {},
      )
    }
    return latestInputs
  }

  /**
   * Intent: the engraver module with its notation fonts ready, since the planning measures the
   * chord symbols' text as the drawing does. A load or font failure is the loader's or the font
   * wait's own NotationError, unchanged; the next check tries again.
   */
  // @spec-link [[module_idle_fit_round]]
  async function planningModule(): Promise<EngraverPlanning> {
    const loaded: EngraverPlanning = await loadVexflowEngraver()
    await loaded.ensureNotationFonts()
    return loaded
  }

  /**
   * Intent: check, drawing nothing, whether the result's written phrase fits the staff at the
   * layout inputs current once the engraver is ready.
   */
  // @spec-link [[module_idle_fit_round]]
  // @spec-link [[rule_idle_phrase_too_dense_is_replaced]]
  async function checkFit(result: WorkspaceGeneratedPhrase): Promise<StaffFitVerdict> {
    requireLayoutInputs()
    const phrase = writtenPhraseOf(result)
    const engraver = await planningModule()
    const inputs = requireLayoutInputs()
    return engraver.planWrittenPhraseFit(
      phrase,
      inputs.containerWidthPx,
      inputs.viewport,
      ...sizeArgument(inputs),
    )
  }

  /**
   * Intent: check, whatever the notes, whether the staff has room with this key signature at the
   * layout inputs current once the engraver is ready.
   */
  // @spec-link [[module_idle_fit_round]]
  // @spec-link [[rule_staff_needs_room_notice]]
  async function checkRoom(signature: StaffKeySignature): Promise<StaffRoomVerdict> {
    requireLayoutInputs()
    const engraver = await planningModule()
    const inputs = requireLayoutInputs()
    return engraver.planStaffRoomForKey(
      signature,
      inputs.containerWidthPx,
      inputs.viewport,
      ...sizeArgument(inputs),
    )
  }

  return {
    pendingPhrase,
    notate,
    clearPresentedPhrase,
    handleEngraved,
    handleNotationError,
    handleLayoutInputs,
    staffLayout: { subscribe: subscribeToLayout },
    checkFit,
    checkRoom,
  }
}
