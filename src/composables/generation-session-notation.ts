/**
 * The workspace session's handling of the phrase the staff shows, split out of
 * use-generation-session.ts: drawing it, retrying a failed drawing, the failures and recoveries of
 * redraws raised outside a run, and clearing it to no phrase. This module owns no session state of
 * its own: it reads and writes the shared session state object the root composable passes in.
 */

import { NotationError, isStaffLayoutFailure } from '@/notation/notation-error'
import { toError } from './generation-session-fit-round'
import type { RoomNoticeReactions } from './generation-session-room-notice'
import type {
  GenerationSessionActions,
  MutableGenerationSessionState,
} from './generation-session-types'

/** The dependency surface the notation actions need from the root session composable. */
export interface NotationActionDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  /** The injected notation seam: draw this result on the staff. */
  readonly notate: (result: TResult) => Promise<void>
  /** Drop whatever the injected notation seam is currently presenting. */
  readonly clearPresentedPhrase: () => void
  /** Route a layout failure of the phrase on screen to the room-notice reactions. */
  readonly routeLayoutFailure: RoomNoticeReactions['routeLayoutFailure']
}

/** The notation actions, plus the transition to no phrase the rest of the session shares. */
export type NotationActions = Pick<
  GenerationSessionActions,
  'retryNotation' | 'reportNotationFailure' | 'reportNotationRecovered'
> & {
  /** Show no phrase: the phrase, the room notice and every field tied to them go. */
  readonly clearPhrase: () => void
}

/**
 * Intent: build the session's actions on the phrase the staff shows, over the shared state. Each
 * acts only at idle with a phrase present, except clearing, which always discards the phrase.
 */
export function createNotationActions<TResult>(
  deps: NotationActionDependencies<TResult>,
): NotationActions {
  const { state } = deps

  /**
   * Coordinate one injected notation attempt without changing phrase identity or generation
   * inputs. A layout failure is routed as one of the phrase on screen; the operation is idle by
   * then, so the replacement run it may start owns the operation.
   */
  // @spec-link [[service_idle_generation_session]]
  // @spec-link [[module_idle_fit_round]]
  async function runNotation(result: TResult): Promise<boolean> {
    if (state.operation !== 'idle') return false
    state.operation = 'notating'
    state.notationError = null
    try {
      await deps.notate(result)
      state.resultEngraved = true
      state.operation = 'idle'
      return true
    } catch (error: unknown) {
      state.operation = 'idle'
      reportNotationFailure(toError(error))
      return false
    }
  }

  /** Retry the retained failed notation request against its original result. */
  // @spec-link [[service_idle_generation_session]]
  function retryNotation(): Promise<boolean> {
    if (state.operation !== 'idle' || state.result === null || state.notationError === null) {
      return Promise.resolve(false)
    }
    return runNotation(state.result)
  }

  /**
   * Surface a notation failure of the phrase on screen raised outside a run (a viewport-resize
   * redraw, a Retry notation): a staff-layout failure goes to the room notice or a replacement
   * run; any other failure is the retryable notation error.
   */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[module_idle_fit_round]]
  function reportNotationFailure(error: Error): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.resultEngraved = false
    if (error instanceof NotationError && isStaffLayoutFailure(error)) {
      deps.routeLayoutFailure(error)
      return true
    }
    state.notationError = error
    return true
  }

  /** Clear a previously reported outside-operation notation failure once a later redraw succeeds. */
  // @spec-link [[module_notation_layout_preflight]]
  // @spec-link [[service_idle_generation_session]]
  function reportNotationRecovered(): boolean {
    if (state.operation !== 'idle' || state.result === null) return false
    state.notationError = null
    state.resultEngraved = true
    return true
  }

  /**
   * Discard the current phrase, the room notice and every field tied to them, without generating
   * a replacement: no phrase shows, as before a first one exists. The transition wherever a
   * replacement phrase is needed but the active rhythm combination has no legal generation.
   */
  // @spec-link [[rule_profile_switch_validates_phrase]]
  // @spec-link [[module_idle_fit_round]]
  function clearPhrase(): void {
    state.latestIntent = null
    state.result = null
    state.generationError = null
    state.notationError = null
    state.resultEngraved = false
    state.roomNotice = null
    state.retriesRunning = false
    deps.clearPresentedPhrase()
  }

  return { retryNotation, reportNotationFailure, reportNotationRecovered, clearPhrase }
}
