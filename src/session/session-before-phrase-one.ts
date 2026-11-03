/**
 * A session started without phrase 1, before its caller hands phrase 1 over: the engine stays in
 * its count-in phase, requests nothing on its own and sets no deadline of its own. It runs each
 * phrase 1 attempt its caller asks for as any attempt (its own attempt id, its generation request,
 * its fit check, its cancellation when a newer request supersedes it or the session ends) and
 * reports each result back; the caller's own ladder chooses the next attempt. Every end in this
 * phase is a count-in end with its cause, and a lost controller ends the session at once. Pure,
 * immutable state; no clock is read.
 */

import {
  SessionEngineError,
  type AudioTime,
  type PhraseOneAttemptResult,
  type PhraseOneEvent,
  type SessionEndCause,
  type SessionEvent,
  type SessionOutput,
  type SessionPhrase,
  type SessionSettings,
  type SuccessfulOutcome,
} from './session-types'

/** A phrase 1 attempt request, as the caller asked for it. */
type AttemptRequest = Extract<PhraseOneEvent, { kind: 'phrase-one-attempt' }>

/**
 * The phrase 1 attempt in flight: generating, generated and waiting for its fit check, or fitting
 * and waiting to be handed over as phrase 1.
 */
// @spec-link [[module_session_start_without_phrase_one]]
type PhraseOneAttempt =
  | {
      readonly attemptId: number
      readonly request: AttemptRequest
      readonly stage: 'generating'
    }
  | {
      readonly attemptId: number
      readonly request: AttemptRequest
      readonly stage: 'fitting' | 'fitted'
      readonly outcome: SuccessfulOutcome
    }

/**
 * The state before phrase 1 is handed over: the latest event time, the next attempt id, the
 * attempt in flight, and whether the session has ended.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export interface BeforePhraseOne {
  readonly lastAt: AudioTime
  readonly nextAttemptId: number
  readonly attempt: PhraseOneAttempt | undefined
  readonly ended: boolean
}

/**
 * Phrase 1 handed over: the decided phrase (its origin the step its attempt took), the settings it
 * was generated under, the time of the hand-over, the time it starts sounding, and the next
 * attempt id the session goes on from.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export interface PhraseOneHandover {
  readonly phraseOne: SessionPhrase
  readonly settings: SessionSettings
  readonly at: AudioTime
  readonly soundsAt: AudioTime
  readonly nextAttemptId: number
}

/** A new state, the outputs that produced it, and phrase 1 once it is handed over. */
// @spec-link [[module_session_start_without_phrase_one]]
export interface BeforePhraseOneStep {
  readonly state: BeforePhraseOne
  readonly outputs: readonly SessionOutput[]
  readonly handover?: PhraseOneHandover
}

/** Intent: the state at a start without phrase 1: no attempt yet, attempt ids from 1. */
// @spec-link [[module_session_start_without_phrase_one]]
export function beforePhraseOneAt(at: AudioTime): BeforePhraseOne {
  return { lastAt: at, nextAttemptId: 1, attempt: undefined, ended: false }
}

/** Intent: the cancellation of the attempt in flight when it is still generating; none else. */
function cancelInFlight(state: BeforePhraseOne): readonly SessionOutput[] {
  const { attempt } = state
  if (attempt?.stage !== 'generating') return []
  return [{ kind: 'cancel-generation', attemptId: attempt.attemptId }]
}

/**
 * Intent: end the session in its count-in phase for `cause`: the attempt in flight is dropped,
 * cancelled first while still generating, and the end is reported as a count-in end.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_dropped_attempt_cancelled]]
function endBeforePhraseOne(
  state: BeforePhraseOne,
  at: AudioTime,
  cause: SessionEndCause,
): BeforePhraseOneStep {
  return {
    state: { ...state, attempt: undefined, ended: true },
    outputs: [
      ...cancelInFlight(state),
      { kind: 'ended', at, cause, phase: 'count-in', soundedPhraseCount: 0 },
    ],
  }
}

/**
 * Intent: request one phrase 1 attempt as the caller asked: it supersedes the attempt in flight,
 * cancelled first while still generating, takes the next attempt id and is requested at once.
 */
// @spec-link [[rule_dropped_attempt_cancelled]]
function requestAttempt(state: BeforePhraseOne, request: AttemptRequest): BeforePhraseOneStep {
  const attemptId = state.nextAttemptId
  const { step, retry, intent, deadline } = request
  return {
    state: {
      ...state,
      nextAttemptId: attemptId + 1,
      attempt: { attemptId, request, stage: 'generating' },
    },
    outputs: [
      ...cancelInFlight(state),
      { kind: 'request-generation', attemptId, phraseNumber: 1, step, retry, intent, deadline },
    ],
  }
}

/** Intent: drop the attempt in flight and report its result to the caller. */
function reportFailure(
  state: BeforePhraseOne,
  attemptId: number,
  result: PhraseOneAttemptResult,
): BeforePhraseOneStep {
  return {
    state: { ...state, attempt: undefined },
    outputs: [{ kind: 'phrase-one-attempt-result', attemptId, result }],
  }
}

/** Intent: the attempt in flight with id `attemptId`, or none when it was superseded or dropped. */
function attemptNamed(state: BeforePhraseOne, attemptId: number): PhraseOneAttempt | undefined {
  return state.attempt?.attemptId === attemptId ? state.attempt : undefined
}

/**
 * Intent: a generation result or a rejected request for a phrase 1 attempt: a success goes to its
 * fit check, anything else is reported as the attempt's result. A superseded attempt's late result
 * is ignored.
 */
function onAttemptGenerated(
  state: BeforePhraseOne,
  event: Extract<SessionEvent, { kind: 'generation-result' | 'generation-crashed' }>,
): BeforePhraseOneStep {
  const attempt = attemptNamed(state, event.attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'generating')
    throw new SessionEngineError(`Attempt ${attempt.attemptId} already has its generation result.`)
  if (event.kind === 'generation-crashed')
    return reportFailure(state, attempt.attemptId, { kind: 'crash' })
  const { outcome } = event
  if (outcome.kind !== 'generation_success')
    return reportFailure(state, attempt.attemptId, {
      kind: 'generation-failure',
      code: outcome.code,
    })
  const { attemptId, request } = attempt
  return {
    state: { ...state, attempt: { attemptId, request, stage: 'fitting', outcome } },
    outputs: [{ kind: 'check-fit', attemptId, phraseNumber: 1, outcome, intent: request.intent }],
  }
}

/** Intent: a fit result for a phrase 1 attempt, reported to the caller; a fitting one waits. */
function onAttemptFit(
  state: BeforePhraseOne,
  event: Extract<SessionEvent, { kind: 'fit-result' }>,
): BeforePhraseOneStep {
  const attempt = attemptNamed(state, event.attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'fitting')
    throw new SessionEngineError(`Attempt ${attempt.attemptId} has no fit check pending.`)
  if (!event.fits) return reportFailure(state, attempt.attemptId, { kind: 'not-fitting' })
  return {
    state: { ...state, attempt: { ...attempt, stage: 'fitted' } },
    outputs: [
      { kind: 'phrase-one-attempt-result', attemptId: attempt.attemptId, result: { kind: 'fits' } },
    ],
  }
}

/**
 * Intent: phrase 1 handed over: the attempt named must be the one in flight and fit, and phrase 1
 * must start sounding no earlier than now. Phrase 1 takes the step its attempt took as its origin.
 */
// @spec-link [[module_session_start_without_phrase_one]]
function onHandover(
  state: BeforePhraseOne,
  event: Extract<PhraseOneEvent, { kind: 'phrase-one' }>,
): BeforePhraseOneStep {
  const attempt = attemptNamed(state, event.attemptId)
  if (attempt?.stage !== 'fitted')
    throw new SessionEngineError(`Attempt ${event.attemptId} is not a phrase 1 that fits.`)
  if (!Number.isFinite(event.soundsAt) || event.soundsAt < event.at)
    throw new SessionEngineError(`Phrase 1 cannot start sounding at ${event.soundsAt} s.`)
  const { request, outcome } = attempt
  const phraseOne: SessionPhrase = {
    phraseNumber: 1,
    origin: request.step,
    intent: request.intent,
    outcome,
  }
  const handover: PhraseOneHandover = {
    phraseOne,
    settings: request.settings,
    at: event.at,
    soundsAt: event.soundsAt,
    nextAttemptId: state.nextAttemptId,
  }
  return { state: { ...state, attempt: undefined }, outputs: [], handover }
}

/**
 * Intent: after a count-in end, late results, ticks and controller events are dropped; any other
 * event is a caller bug.
 */
function afterEnd(state: BeforePhraseOne, event: SessionEvent): BeforePhraseOneStep {
  const dropped: readonly SessionEvent['kind'][] = [
    'generation-result',
    'generation-crashed',
    'fit-result',
    'tick',
    'controller',
  ]
  if (!dropped.includes(event.kind))
    throw new SessionEngineError(`The session has ended; "${event.kind}" cannot follow.`)
  return { state, outputs: [] }
}

/**
 * Intent: handle one timed event before phrase 1 is handed over. Time never runs backwards. A
 * phrase 1 attempt is requested, generated, fit-checked and reported; `phrase-one` hands phrase 1
 * over; `end` and a lost controller end the session as a count-in end; ticks and a controller
 * coming back change nothing. The events of a session already running (`count-in-over`, a later
 * phrase sounding, a settings change) cannot come before phrase 1 and throw.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[rule_jam_controller_loss_before_phrase_one]]
// @spec-link [[rule_jam_ending_before_phrase_one]]
export function handleBeforePhraseOne(
  state: BeforePhraseOne,
  event: SessionEvent,
): BeforePhraseOneStep {
  if (state.ended) return afterEnd(state, event)
  if (event.at < state.lastAt)
    throw new SessionEngineError(`Time ran backwards: ${event.at} s after ${state.lastAt} s.`)
  const timed: BeforePhraseOne = { ...state, lastAt: event.at }
  switch (event.kind) {
    case 'phrase-one-attempt':
      return requestAttempt(timed, event)
    case 'generation-result':
    case 'generation-crashed':
      return onAttemptGenerated(timed, event)
    case 'fit-result':
      return onAttemptFit(timed, event)
    case 'phrase-one':
      return onHandover(timed, event)
    case 'end':
      return endBeforePhraseOne(timed, event.at, event.cause)
    case 'controller':
      return event.attached
        ? { state: timed, outputs: [] }
        : endBeforePhraseOne(timed, event.at, 'controller-lost')
    case 'tick':
      return { state: timed, outputs: [] }
    case 'count-in-over':
    case 'phrase-started-sounding':
    case 'settings-change':
      throw new SessionEngineError(`"${event.kind}" cannot come before phrase 1 is handed over.`)
  }
}
