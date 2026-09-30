/**
 * The workspace session's Idle fit run, split out of use-generation-session.ts: one operation that
 * generates up to four attempts (the first plus up to three fresh-seed retries), checks each one
 * against the staff's current room before anything is drawn, and draws only the first that fits.
 * This module owns no session state of its own: it reads and writes the shared session state
 * object the root composable constructs, through the dependency surface below, and keeps only the
 * run token that makes a stopped run's late continuations no-ops.
 */

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { NotationError } from '@/notation/notation-error'
import type { StaffFitVerdict } from '@/notation/staff-fit-types'
import type { MutableGenerationSessionState } from './use-generation-session'

/** Every attempt budget a run has: the first attempt plus up to three fresh-seed retries. */
export const FIT_RUN_ATTEMPTS = 4

/** Why the "staff needs more room" notice shows: no room for the staff, or notes too wide. */
// @spec-link [[rule_staff_needs_room_notice]]
export type RoomNoticeCause = 'no_room' | 'notes_too_wide'

/**
 * How a run treats what the staff shows when it starts: `keep_screen` leaves it (a phrase kept on
 * screen, a notice kept dimmed for a round under it, or nothing); `no_score` drops the phrase and
 * any notice first, for the replacement of a phrase left too wide and the no-room clearing.
 */
// @spec-link [[module_idle_fit_round]]
export type FitRunStart = 'keep_screen' | 'no_score'

/** The dependency surface the fit run needs from the root session composable. */
// @spec-link [[module_idle_fit_round]]
export interface FitRunDependencies<TResult> {
  readonly state: MutableGenerationSessionState<TResult>
  readonly generate: (intent: GenerationIntent) => Promise<TResult>
  readonly checkFit: (result: TResult) => Promise<StaffFitVerdict>
  readonly notate: (result: TResult) => Promise<void>
  readonly clearPresentedPhrase: () => void
  /** One fresh seed and request identity, with the note density the width gives now. */
  readonly freshIntent: () => GenerationIntent
  /** Whether the current rhythm combination blocks generation at the width now. */
  readonly isBlocked: () => boolean
  /** Show no phrase, as before a first one exists: phrase, notice and both errors all go. */
  readonly showEmpty: () => void
}

/** The fit run's controls, for the session actions and the room-notice reactions. */
export interface FitRunner {
  /** Run one fit run; resolves true when it leaves a phrase as the result (drawn or retryable). */
  readonly run: (start: FitRunStart) => Promise<boolean>
  /** Stop a retrying or no-score run at once when the rhythm combination now blocks generation. */
  readonly stopIfBlocked: () => void
  /** Show the notice with this cause, dropping the phrase; `announceAgain` re-announces it. */
  readonly showNotice: (cause: RoomNoticeCause, announceAgain?: boolean) => void
  /** Changes whenever a run starts or stops, so a pending room check can tell it is stale. */
  readonly epoch: () => number
}

/** How one attempt ended: drawn or kept retryable, too wide, ended the run, or superseded. */
type AttemptOutcome = 'published' | 'too_wide' | 'ended' | 'stale'

/** Intent: normalize an unknown caught value to an Error without losing a non-Error's message. */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Intent: build the session's fit runner. Each attempt draws one fresh intent, generates it and
 * checks it; a too-wide attempt is never set as the result nor drawn; the first that fits is set
 * and drawn, and only a draw puts the operation in `notating`. A run token stops a retrying or
 * no-score run whose width crossing blocked the rhythm combination: its later generate, check and
 * draw continuations do nothing, so its worker response is discarded on arrival.
 */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[rule_idle_phrase_too_dense_is_replaced]]
// @spec-link [[rule_retry_round_window_changes]]
// @spec-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
export function createFitRunner<TResult>(deps: FitRunDependencies<TResult>): FitRunner {
  const { state } = deps
  let token = 0
  let running = false

  /** Intent: drop the phrase the staff shows, and the result it stands for. */
  function dropScore(): void {
    deps.clearPresentedPhrase()
    state.result = null
    state.resultEngraved = false
  }

  /** Intent: show the notice; it is announced when it begins, or again when asked to. */
  function showNotice(cause: RoomNoticeCause, announceAgain = false): void {
    dropScore()
    const begins = state.roomNotice === null
    state.roomNotice = cause
    if (begins || announceAgain) state.roomNoticeAnnouncements += 1
  }

  /** Intent: end the run owning `runToken`, when it still owns the session. */
  function finish(runToken: number, published: boolean): boolean {
    if (runToken !== token) return false
    running = false
    state.operation = 'idle'
    state.retriesRunning = false
    return published
  }

  /** Intent: route a draw failure: a layout failure fails the attempt, anything else is retryable. */
  function routeDrawFailure(error: Error): AttemptOutcome {
    state.resultEngraved = false
    if (error instanceof NotationError && error.code === 'notation_notes_too_wide') {
      dropScore()
      state.operation = 'generating'
      return 'too_wide'
    }
    if (error instanceof NotationError && error.code === 'notation_no_room') {
      showNotice('no_room')
      return 'ended'
    }
    state.notationError = error
    state.roomNotice = null
    return 'published'
  }

  /** Intent: set a fitting attempt as the result and draw it; only now is it published. */
  async function draw(runToken: number, result: TResult): Promise<AttemptOutcome> {
    state.result = result
    state.resultEngraved = false
    state.operation = 'notating'
    try {
      await deps.notate(result)
    } catch (error: unknown) {
      if (runToken !== token) return 'stale'
      return routeDrawFailure(toError(error))
    }
    if (runToken !== token) return 'stale'
    state.resultEngraved = true
    state.roomNotice = null
    return 'published'
  }

  /** Intent: act on a fit verdict: draw a fitting attempt, fail a too-wide one, or show the notice. */
  function afterVerdict(runToken: number, result: TResult, verdict: StaffFitVerdict) {
    if (verdict.kind === 'fits') return draw(runToken, result)
    if (verdict.kind === 'notes_too_wide') return 'too_wide' as const
    showNotice('no_room')
    return 'ended' as const
  }

  /** Intent: keep an attempt whose fit check itself failed as a retryable notation error. */
  function keepCheckFailure(result: TResult, error: unknown): AttemptOutcome {
    if (!(error instanceof NotationError)) throw error
    state.result = result
    state.resultEngraved = false
    state.notationError = error
    state.roomNotice = null
    return 'published'
  }

  /** Intent: run one attempt: one fresh intent, generated, checked, and drawn if it fits. */
  async function attempt(runToken: number): Promise<AttemptOutcome> {
    const intent = deps.freshIntent()
    state.latestIntent = intent
    let result: TResult
    try {
      result = await deps.generate(intent)
    } catch (error: unknown) {
      if (runToken !== token) return 'stale'
      state.generationError = toError(error)
      return 'ended'
    }
    if (runToken !== token) return 'stale'
    let verdict: StaffFitVerdict
    try {
      verdict = await deps.checkFit(result)
    } catch (error: unknown) {
      if (runToken !== token) return 'stale'
      return keepCheckFailure(result, error)
    }
    if (runToken !== token) return 'stale'
    return afterVerdict(runToken, result, verdict)
  }

  /** Intent: end the run on no phrase, as before a first one exists. */
  function endOnEmpty(runToken: number): boolean {
    deps.showEmpty()
    return finish(runToken, false)
  }

  /**
   * Intent: run the attempts in order until one ends the run or the budget is spent. A blocked
   * rhythm combination before an attempt, or once the last one fails too wide, ends it on Empty.
   */
  async function runAttempts(runToken: number, underNotice: boolean): Promise<boolean> {
    for (let index = 0; index < FIT_RUN_ATTEMPTS; index += 1) {
      if (deps.isBlocked()) return endOnEmpty(runToken)
      const outcome = await attempt(runToken)
      if (outcome === 'stale') return false
      if (outcome !== 'too_wide') return finish(runToken, outcome === 'published')
      state.retriesRunning = true
    }
    if (deps.isBlocked()) return endOnEmpty(runToken)
    showNotice('notes_too_wide', underNotice)
    return finish(runToken, false)
  }

  /**
   * Intent: run one fit run. It clears both errors as it starts; a run started under the
   * too-many-notes notice is a round, with retries running from its start. A programming error
   * from a seam still ends the run before it propagates, so the session never stays busy.
   */
  async function run(start: FitRunStart): Promise<boolean> {
    const runToken = ++token
    running = true
    state.operation = 'generating'
    state.generationError = null
    state.notationError = null
    if (start === 'no_score') {
      dropScore()
      state.roomNotice = null
    }
    const underNotice = state.roomNotice !== null
    state.retriesRunning = state.roomNotice === 'notes_too_wide'
    try {
      return await runAttempts(runToken, underNotice)
    } catch (error: unknown) {
      finish(runToken, false)
      throw error
    }
  }

  /**
   * Intent: stop a run still generating once a width crossing blocks the rhythm combination, but
   * only when it is retrying (or a round under the notice) or no score is kept: a kept phrase that
   * still fits stays on screen, so the first attempt of a run from Ready carries on, is drawn if it
   * fits, and is otherwise stopped before the next attempt by `runAttempts`' own check.
   */
  function stopIfBlocked(): void {
    if (!running || state.operation !== 'generating' || !deps.isBlocked()) return
    if (!state.retriesRunning && state.result !== null) return
    token += 1
    running = false
    deps.showEmpty()
    state.operation = 'idle'
    state.retriesRunning = false
  }

  return { run, stopIfBlocked, showNotice, epoch: () => token }
}
