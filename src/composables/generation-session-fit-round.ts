/**
 * The workspace session's Idle fit run, split out of use-generation-session.ts: one operation that
 * generates up to four attempts (the first plus up to three fresh-seed retries), checks each one
 * against the staff's current room before anything is drawn, and draws only the first that fits,
 * published as phrase 1 with the one session seed drawn for it. Its intents come from a fresh
 * intent per attempt (session mode's Idle), or from a ladder of attempts it climbs (Jam mode's
 * phrase 1 from a kept doodle): a generation failure then moves on to the ladder's next attempt,
 * and a too-wide attempt is replaced on the same one, within the same four-attempt fit budget.
 * This module owns no session state of its own: it reads and writes the shared Idle phrase state
 * its caller constructs, through the dependency surface below, and keeps only the run token that
 * makes a stopped run's late continuations no-ops.
 */

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import type { Seed } from '@/domain/random/seed'
import { NotationError } from '@/notation/notation-error'
import type { StaffFitVerdict, StaffRoomVerdict } from '@/notation/staff-fit-types'
import type { IdlePhraseState } from './generation-session-types'

/** Every attempt budget a run has: the first attempt plus up to three fresh-seed retries. */
export const FIT_RUN_ATTEMPTS = 4

/** Why the "staff needs more room" notice shows: no room for the staff, or notes too wide. */
// @spec-link [[rule_staff_needs_room_notice]]
export type RoomNoticeCause = 'no_room' | 'notes_too_wide'

/**
 * How a run treats what the staff shows when it starts: `keep_screen` leaves it (a phrase kept on
 * screen, a notice kept dimmed for a round under it, or nothing); `no_score` drops the phrase and
 * any notice first, for the replacement of a phrase left too wide and the no-room clearing;
 * `fresh` drops the phrase and a too-many-notes notice (a no-room notice stays), then checks the
 * staff's room before any attempt, for the phrase a session end asks for: with no room it shows
 * the no-room notice and generates nothing.
 */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[rule_session_end_generates_next_phrase_one]]
export type FitRunStart = 'keep_screen' | 'no_score' | 'fresh'

/**
 * One run's climb of an attempt ladder: the intent of the attempt it stands on, fresh at each call
 * (a too-wide attempt is replaced on the same attempt, with a new seed), and the move on after that
 * attempt's generation failed.
 */
// @spec-link [[module_idle_fit_round]]
export interface FitRunClimb {
  /** One fresh intent, a new seed and request identity, for the attempt the climb stands on. */
  readonly intent: () => GenerationIntent
  /** The attempt's generation failed with `error`: on to the next attempt (true), or none left. */
  readonly failed: (error: Error) => boolean
}

/** A ladder of attempts each run climbs from its first, read when the run's attempts begin. */
// @spec-link [[module_idle_fit_round]]
export interface FitRunLadder {
  readonly climb: () => FitRunClimb
}

/**
 * Where a run's intents come from: one fresh intent per attempt, a generation failure ending the
 * run (session mode's Idle); or a ladder each run climbs, a generation failure moving on to its
 * next attempt and only the last one's ending the run.
 */
// @spec-link [[module_idle_fit_round]]
export type FitRunIntents =
  | {
      /** One fresh seed and request identity, with the note density the width gives now. */
      readonly freshIntent: () => GenerationIntent
      readonly ladder?: never
    }
  | { readonly ladder: FitRunLadder; readonly freshIntent?: never }

/**
 * The dependency surface the fit run needs from the root session composable: an attempt generates
 * a `TGenerated`, and the result it publishes is a `TResult`, joined with its session seed.
 */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[module_session_seed_plan]]
export type FitRunDependencies<TResult, TGenerated = TResult> = FitRunSeams<TResult, TGenerated> &
  FitRunIntents

/** The fit run's seams besides where its intents come from. */
// @spec-link [[module_idle_fit_round]]
// @spec-link [[module_session_seed_plan]]
export interface FitRunSeams<TResult, TGenerated = TResult> {
  readonly state: IdlePhraseState<TResult>
  readonly generate: (intent: GenerationIntent) => Promise<TGenerated>
  readonly checkFit: (generated: TGenerated) => Promise<StaffFitVerdict>
  /** The session seed of a published phrase 1, drawn once per publishing run. */
  readonly nextSessionSeed: () => Seed
  /** Join a generated phrase with its session seed, as the result the run publishes. */
  readonly withSessionSeed: (generated: TGenerated, sessionSeed: Seed) => TResult
  readonly notate: (result: TResult) => Promise<void>
  readonly clearPresentedPhrase: () => void
  /** Whether the current rhythm combination blocks generation at the width now. */
  readonly isBlocked: () => boolean
  /** Whether the staff has room at all, whatever the notes, with the next phrase's key signature. */
  readonly checkRoom: () => Promise<StaffRoomVerdict>
  /** Show no phrase, as before a first one exists: phrase, notice and both errors all go. */
  readonly showEmpty: () => void
  /**
   * Told the intent of every attempt that ends published (drawn, or kept as a retryable notation
   * error), once, after it is published; never for a too-wide, run-ending or superseded attempt.
   */
  // @spec-link [[module_phrase_replay_key]]
  readonly onPublished: (intent: GenerationIntent) => void
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
  /**
   * Stop the run under way at once, whatever it is doing but drawing: its late continuations do
   * nothing; the staff and the state are left as they are, the operation idle.
   */
  readonly stop: () => void
}

/**
 * How one attempt ended: drawn or kept retryable, too wide, ended the run, superseded, or (on a
 * ladder) its generation failed, for the ladder to move on.
 */
type AttemptOutcome = 'published' | 'too_wide' | 'ended' | 'stale' | 'generation_failed'

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
export function createFitRunner<TResult, TGenerated = TResult>(
  deps: FitRunDependencies<TResult, TGenerated>,
): FitRunner {
  const { state } = deps
  let token = 0
  let running = false
  /** The token of the fresh run, while it is the latest run; 0 with none. */
  let freshToken = 0
  /** The session seed the latest run drew for the phrase it publishes; none before it needs one. */
  let runSessionSeed: Seed | undefined
  /** The error of the ladder attempt whose generation failed last; a placeholder before one. */
  let ladderFailure = new Error('fit run: no ladder attempt has failed')

  /**
   * Intent: the result a fitting or retryable attempt is published as: the generated phrase with
   * the run's session seed, drawn the first time the run publishes and reused if that attempt is
   * found too wide while drawn, so a published phrase 1 costs one draw however many attempts ran.
   */
  // @spec-link [[module_session_seed_plan]]
  function publishable(generated: TGenerated): TResult {
    runSessionSeed ??= deps.nextSessionSeed()
    return deps.withSessionSeed(generated, runSessionSeed)
  }

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

  /**
   * Intent: whether `error` says the staff is not laid out (it has no width, as behind the
   * rotate-device notice) during the fresh run `runToken`, which then counts it as no room: the
   * phrase comes once the notice clears, never as a notation error.
   */
  // @spec-link [[module_idle_fresh_run]]
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  function staffNotLaidOutInFreshRun(runToken: number, error: unknown): boolean {
    return (
      runToken === freshToken &&
      error instanceof NotationError &&
      error.code === 'notation_container_unavailable'
    )
  }

  /**
   * Intent: route a draw failure: a layout failure fails the attempt, a fresh run's staff not laid
   * out shows the no-room notice, anything else is retryable.
   */
  function routeDrawFailure(runToken: number, error: Error): AttemptOutcome {
    state.resultEngraved = false
    if (staffNotLaidOutInFreshRun(runToken, error)) {
      showNotice('no_room')
      return 'ended'
    }
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
      return routeDrawFailure(runToken, toError(error))
    }
    if (runToken !== token) return 'stale'
    state.resultEngraved = true
    state.roomNotice = null
    return 'published'
  }

  /** Intent: act on a fit verdict: draw a fitting attempt, fail a too-wide one, or show the notice. */
  function afterVerdict(runToken: number, generated: TGenerated, verdict: StaffFitVerdict) {
    if (verdict.kind === 'fits') return draw(runToken, publishable(generated))
    if (verdict.kind === 'notes_too_wide') return 'too_wide' as const
    showNotice('no_room')
    return 'ended' as const
  }

  /**
   * Intent: keep an attempt whose fit check itself failed as a retryable notation error; a fresh
   * run's staff not laid out shows the no-room notice instead.
   */
  function keepCheckFailure(
    runToken: number,
    generated: TGenerated,
    error: unknown,
  ): AttemptOutcome {
    if (!(error instanceof NotationError)) throw error
    if (staffNotLaidOutInFreshRun(runToken, error)) {
      showNotice('no_room')
      return 'ended'
    }
    state.result = publishable(generated)
    state.resultEngraved = false
    state.notationError = error
    state.roomNotice = null
    return 'published'
  }

  /**
   * Intent: run one attempt: one fresh intent, generated, checked, and drawn if it fits. An
   * attempt that ends published is accepted, and `onPublished` is told its intent.
   */
  // @spec-link [[module_phrase_replay_key]]
  async function attempt(
    runToken: number,
    freshIntent: () => GenerationIntent,
  ): Promise<AttemptOutcome> {
    const intent = freshIntent()
    const outcome = await settleAttempt(runToken, intent)
    if (outcome === 'published') deps.onPublished(intent)
    return outcome
  }

  /** Intent: generate, check and draw one attempt's intent, and say how the attempt ended. */
  async function settleAttempt(
    runToken: number,
    intent: GenerationIntent,
  ): Promise<AttemptOutcome> {
    state.latestIntent = intent
    let result: TGenerated
    try {
      result = await deps.generate(intent)
    } catch (error: unknown) {
      if (runToken !== token) return 'stale'
      return generationFailed(toError(error))
    }
    if (runToken !== token) return 'stale'
    let verdict: StaffFitVerdict
    try {
      verdict = await deps.checkFit(result)
    } catch (error: unknown) {
      if (runToken !== token) return 'stale'
      return keepCheckFailure(runToken, result, error)
    }
    if (runToken !== token) return 'stale'
    return afterVerdict(runToken, result, verdict)
  }

  /**
   * Intent: an attempt's generation failed: it ends the run on the generation error, or, on a
   * ladder, is kept for the ladder to move on, the error shown only if no attempt is left.
   */
  function generationFailed(error: Error): AttemptOutcome {
    if (deps.ladder !== undefined) {
      ladderFailure = error
      return 'generation_failed'
    }
    state.generationError = error
    return 'ended'
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
    if (deps.ladder !== undefined) return climbLadder(runToken, underNotice, deps.ladder.climb())
    for (let index = 0; index < FIT_RUN_ATTEMPTS; index += 1) {
      if (deps.isBlocked()) return endOnEmpty(runToken)
      const outcome = await attempt(runToken, deps.freshIntent)
      if (outcome === 'stale') return false
      if (outcome !== 'too_wide') return finish(runToken, outcome === 'published')
      state.retriesRunning = true
    }
    return endTooWide(runToken, underNotice)
  }

  /** Intent: every attempt of the fit budget was too wide: Empty when blocked, else the notice. */
  function endTooWide(runToken: number, underNotice: boolean): boolean {
    if (deps.isBlocked()) return endOnEmpty(runToken)
    showNotice('notes_too_wide', underNotice)
    return finish(runToken, false)
  }

  /**
   * Intent: run a ladder's attempts from its first, with no deadline: a generation failure moves on
   * to the ladder's next attempt, and the last one's ends the run on its error; a too-wide attempt
   * is replaced on the same attempt with a fresh intent, until the fit budget is spent, as in a
   * run of fresh intents; a blocked rhythm combination before an attempt ends it on Empty.
   */
  // @spec-link [[rule_held_doodle_phrase_one_at_idle]]
  // @spec-link [[rule_idle_phrase_too_dense_is_replaced]]
  async function climbLadder(
    runToken: number,
    underNotice: boolean,
    climb: FitRunClimb,
  ): Promise<boolean> {
    let tooWide = 0
    while (tooWide < FIT_RUN_ATTEMPTS) {
      if (deps.isBlocked()) return endOnEmpty(runToken)
      const outcome = await attempt(runToken, climb.intent)
      if (outcome === 'stale') return false
      if (outcome === 'generation_failed') {
        if (climb.failed(ladderFailure)) continue
        state.generationError = ladderFailure
        return finish(runToken, false)
      }
      if (outcome !== 'too_wide') return finish(runToken, outcome === 'published')
      tooWide += 1
      state.retriesRunning = true
    }
    return endTooWide(runToken, underNotice)
  }

  /**
   * Intent: a fresh run's first step, before any attempt: a blocked rhythm combination ends it on
   * Empty and no room (a staff not laid out included) ends it on the no-room notice, nothing
   * generated in either case; null lets the attempts go on, a boolean is the run's own result.
   */
  // @spec-link [[module_idle_fresh_run]]
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  // @spec-link [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  async function roomFirst(runToken: number): Promise<boolean | null> {
    if (deps.isBlocked()) return endOnEmpty(runToken)
    let hasRoom: boolean
    try {
      hasRoom = (await deps.checkRoom()).kind === 'room'
    } catch (error: unknown) {
      if (runToken !== token) return false
      if (!staffNotLaidOutInFreshRun(runToken, error)) throw error
      hasRoom = false
    }
    if (runToken !== token) return false
    if (hasRoom) return null
    showNotice('no_room')
    return finish(runToken, false)
  }

  /**
   * Intent: run one fit run. It clears both errors as it starts; a run started under the
   * too-many-notes notice is a round, with retries running from its start. A programming error
   * from a seam still ends the run before it propagates, so the session never stays busy.
   */
  async function run(start: FitRunStart): Promise<boolean> {
    const runToken = ++token
    freshToken = start === 'fresh' ? runToken : 0
    runSessionSeed = undefined
    running = true
    state.operation = 'generating'
    state.generationError = null
    state.notationError = null
    if (start !== 'keep_screen') {
      dropScore()
      if (start === 'no_score' || state.roomNotice === 'notes_too_wide') state.roomNotice = null
    }
    const underNotice = state.roomNotice !== null
    state.retriesRunning = state.roomNotice === 'notes_too_wide'
    try {
      const ended = start === 'fresh' ? await roomFirst(runToken) : null
      if (ended !== null) return ended
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

  /**
   * Intent: stop the run under way, if any: its late continuations do nothing. A drawing in
   * flight cannot be dropped, so stopping a run that draws is a caller defect.
   */
  function stop(): void {
    if (!running) return
    if (state.operation === 'notating') throw new Error('fit run: a run cannot stop while drawing')
    token += 1
    running = false
    state.operation = 'idle'
    state.retriesRunning = false
  }

  return { run, stopIfBlocked, showNotice, epoch: () => token, stop }
}
