/**
 * The session engine's steps on the failure ladder of the look-ahead phrase: request a rung, the
 * first one or the one a failure leads to, keeping time for the standalone attempt; cut a carry-in
 * attempt still generating over to the standalone attempt once that attempt is due; and cancel an
 * attempt the engine drops while it is still generating. Each step reads the event's audio time
 * and no clock.
 */

import {
  LADDER,
  cutoverRung,
  firstRung,
  rungAfterFailure,
  rungsSkipped,
  type Attempt,
  type AttemptFailure,
  type LadderRung,
  type LookAhead,
} from './failure-ladder'
import { buildAttemptIntent, discardSkippedRungs } from './session-intents'
import {
  lookAheadOf,
  type EngineContext,
  type EngineState,
  type Step,
} from './session-engine-state'
import { attemptPlan, registerCandidates } from './session-settings-change'
import { cutoverAt, standaloneDue } from './session-timing'
import type { AudioTime, SessionOutput } from './session-types'

/**
 * Intent: the cancellation of a look-ahead's attempt the engine is dropping, when that attempt is
 * still generating, so a later request never waits behind it on the generator. An attempt in its
 * fit check, whose generation is done, or no attempt at all, gives none.
 */
// @spec-link [[rule_dropped_attempt_cancelled]]
// @spec-link [[service_session_engine]]
export function cancelDropped(lookAhead: LookAhead | undefined): readonly SessionOutput[] {
  const attempt = lookAhead?.attempt
  if (attempt?.stage !== 'generating') return []
  return [{ kind: 'cancel-generation', attemptId: attempt.attemptId }]
}

/**
 * Intent: request one rung for the look-ahead phrase at `at`: build its intent now from the
 * look-ahead's basis (the window read now, the step-down memory updated) with the planned seed of
 * that phrase's rung, give it the next attempt id, and make it the attempt in flight. A carry-in
 * attempt also asks to be woken at the phrase's cutover time when that is still ahead, so the
 * cutover runs on time with no other event.
 */
// @spec-link [[module_session_seed_plan]]
function requestRung(
  context: EngineContext,
  state: EngineState,
  rung: LadderRung,
  at: AudioTime,
): Step {
  const lookAhead = lookAheadOf(state)
  const { settings, source } = lookAhead.basis
  const plan = attemptPlan(rung, source, registerCandidates(lookAhead.previous))
  const slot = { phraseNumber: lookAhead.phraseNumber, rung: LADDER.indexOf(rung) }
  const { intent, steppedDown } = buildAttemptIntent(
    context,
    settings,
    plan,
    state.steppedDown,
    slot,
  )
  const attemptId = state.nextAttemptId
  const attempt: Attempt = { attemptId, rung, step: plan.step, intent, stage: 'generating' }
  const cutover = cutoverAt(lookAhead.deadline)
  const wake: readonly SessionOutput[] =
    plan.step === 'carry-in' && cutover > at ? [{ kind: 'wake-at', at: cutover }] : []
  return {
    state: {
      ...state,
      steppedDown,
      nextAttemptId: attemptId + 1,
      lookAhead: { ...lookAhead, attempt },
    },
    outputs: [
      {
        kind: 'request-generation',
        attemptId,
        phraseNumber: lookAhead.phraseNumber,
        step: plan.step,
        retry: rung.retry,
        intent,
        deadline: lookAhead.deadline,
      },
      ...wake,
    ],
  }
}

/**
 * Intent: request a rung reached by skipping others: the request ids of the `skipped` rungs are
 * drawn and discarded first, so the rung requested is built as if they had failed; its seed is its
 * own rung's whatever was skipped.
 */
function requestAfterSkip(
  context: EngineContext,
  state: EngineState,
  rung: LadderRung,
  skipped: number,
  at: AudioTime,
): Step {
  discardSkippedRungs(context, skipped)
  return requestRung(context, state, rung, at)
}

/**
 * Intent: request the look-ahead phrase's first attempt at `at`: the first carry-in rung, or the
 * standalone rung when the standalone attempt is already due, built with the request id it would
 * have had after three failed carry-in retries and the standalone rung's planned seed.
 */
// @spec-link [[module_session_failure_ladder]]
export function requestFirstRung(context: EngineContext, state: EngineState, at: AudioTime): Step {
  const rung = firstRung(standaloneDue(at, lookAheadOf(state).deadline))
  return requestAfterSkip(context, state, rung, LADDER.indexOf(rung), at)
}

/**
 * Intent: after an attempt failed at `at`, request the rung its failure leads to (the standalone
 * one for a carry-in attempt once the standalone attempt is due), or wait for the deadline once
 * the ladder is exhausted. Rungs skipped on the way create no attempt, but their request ids are
 * drawn and discarded first.
 */
// @spec-link [[module_session_failure_ladder]]
export function climb(
  context: EngineContext,
  state: EngineState,
  attempt: Attempt,
  failure: AttemptFailure,
  at: AudioTime,
): Step {
  const due = standaloneDue(at, lookAheadOf(state).deadline)
  const rung = rungAfterFailure(attempt, failure, due)
  if (rung !== undefined)
    return requestAfterSkip(context, state, rung, rungsSkipped(attempt.rung, rung), at)
  const exhausted = { ...lookAheadOf(state), attempt: undefined }
  return { state: { ...state, lookAhead: exhausted }, outputs: [] }
}

/**
 * Intent: at `at`, once an event is handled, cut the look-ahead's carry-in attempt over when it is
 * still generating and the standalone attempt is due: cancel it where it runs, then request the
 * standalone attempt at once, with the request id it would have had after three failed carry-in
 * retries and the standalone rung's planned seed. Anything else (no look-ahead, an attempt in its
 * fit check, a standalone attempt, an exhausted ladder, a time before the cutover, an ended
 * session) does nothing.
 */
// @spec-link [[module_session_failure_ladder]]
// @spec-link [[rule_dropped_attempt_cancelled]]
export function runCutover(context: EngineContext, state: EngineState, at: AudioTime): Step {
  const { lookAhead } = state
  if (state.phase === 'ended' || lookAhead?.attempt === undefined) return { state, outputs: [] }
  const { attempt, deadline } = lookAhead
  const rung = cutoverRung(attempt, standaloneDue(at, deadline))
  if (rung === undefined) return { state, outputs: [] }
  const requested = requestAfterSkip(context, state, rung, rungsSkipped(attempt.rung, rung), at)
  return { state: requested.state, outputs: [...cancelDropped(lookAhead), ...requested.outputs] }
}
