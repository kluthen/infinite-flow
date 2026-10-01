/**
 * The session engine: a pure, deterministic state machine that decides what a running session
 * requests, shows and ends, from timed events alone. It keeps immutable state in a closure, never
 * reads a clock (every event carries its audio time) and touches no browser API: its only seams
 * are the identity and seed providers and the window-width reading. The same event list always
 * gives the same outputs.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  LADDER,
  acceptedPhrase,
  currentAttempt,
  nextRung,
  openLookAhead,
  repeatedPhrase,
  type Attempt,
  type LadderRung,
  type LookAhead,
} from './failure-ladder'
import { buildAttemptIntent, freezeSessionSettings, type IntentSeams } from './session-intents'
import { deadlineReached, nextPhraseDeadline, phraseTwoDeadline } from './session-timing'
import {
  SessionEngineError,
  type AudioTime,
  type SessionEngine,
  type SessionEngineDependencies,
  type SessionEvent,
  type SessionOutput,
  type SessionPhrase,
  type SessionStart,
} from './session-types'
import {
  NOTICE_AT_START,
  noticeAtEnd,
  noticeOnDecision,
  noticeOnSounding,
  type StrugglingNotice,
} from './struggling-notice'

/** Everything fixed for the whole session: the seams, the frozen settings and phrase 1. */
interface EngineContext extends IntentSeams {
  readonly phraseOne: SessionPhrase
}

/**
 * The engine's state between events. `lastDecided` is the latest decided phrase (phrase 1 at
 * start); `lookAhead` is the phrase after it while undecided; `soundedCount` is how many phrases
 * have started sounding.
 */
interface EngineState {
  readonly phase: 'count-in' | 'running' | 'ended'
  readonly lastAt: AudioTime
  readonly soundedCount: number
  readonly lastDecided: SessionPhrase
  readonly lookAhead: LookAhead | undefined
  readonly steppedDown: boolean
  readonly notice: StrugglingNotice
  readonly nextAttemptId: number
}

/** A new state and the outputs that produced it. */
interface Step {
  readonly state: EngineState
  readonly outputs: readonly SessionOutput[]
}

/** Intent: refuse a time that is not a finite number of seconds. */
function assertAudioTime(at: AudioTime): void {
  if (!Number.isFinite(at)) throw new SessionEngineError(`Audio time must be finite, got ${at}.`)
}

/** Intent: the look-ahead of a state, which the caller has established exists. */
function lookAheadOf(state: EngineState): LookAhead {
  if (state.lookAhead === undefined)
    throw new SessionEngineError('No phrase is being looked ahead.')
  return state.lookAhead
}

/**
 * Intent: request one rung for the look-ahead phrase: build its intent now (the window read now,
 * the step-down memory updated), give it the next attempt id, and make it the attempt in flight.
 */
function requestRung(context: EngineContext, state: EngineState, rung: LadderRung): Step {
  const lookAhead = lookAheadOf(state)
  const plan = {
    step: rung.step,
    carryIn: lookAhead.carryIn,
    candidates: lookAhead.previous.intent.registerIntent.candidates,
  }
  const { intent, steppedDown } = buildAttemptIntent(context, plan, state.steppedDown)
  const attemptId = state.nextAttemptId
  const attempt: Attempt = { attemptId, rung, intent, stage: 'generating' }
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
        step: rung.step,
        retry: rung.retry,
        intent,
        deadline: lookAhead.deadline,
      },
    ],
  }
}

/** Intent: open the look-ahead for the phrase after the latest decided one and request it. */
function requestNextPhrase(context: EngineContext, state: EngineState, deadline: AudioTime): Step {
  if (state.lookAhead !== undefined)
    throw new SessionEngineError('A phrase is requested while another is still undecided.')
  const opened = { ...state, lookAhead: openLookAhead(state.lastDecided, deadline) }
  const requested = requestRung(context, opened, LADDER[0]!)
  return {
    state: requested.state,
    outputs: [...requested.outputs, { kind: 'wake-at', at: deadline }],
  }
}

/** Intent: decide the look-ahead phrase: it is the next one to show, and the notice learns of it. */
function decide(state: EngineState, phrase: SessionPhrase): Step {
  const { notice, outputs } = noticeOnDecision(state.notice, phrase.origin)
  return {
    state: { ...state, lookAhead: undefined, lastDecided: phrase, notice },
    outputs: [{ kind: 'phrase-ready', phrase }, ...outputs],
  }
}

/**
 * Intent: at or after the look-ahead's deadline with no valid phrase, repeat the phrase before;
 * any attempt still in flight is dropped with it. Before the deadline nothing happens.
 */
function runDeadline(state: EngineState, at: AudioTime): Step {
  const { lookAhead } = state
  if (lookAhead === undefined || !deadlineReached(at, lookAhead.deadline))
    return { state, outputs: [] }
  return decide(state, repeatedPhrase(lookAhead))
}

/** Intent: after a failed attempt, request the next rung, or wait for the deadline once exhausted. */
function climb(context: EngineContext, state: EngineState, attempt: Attempt): Step {
  const rung = nextRung(attempt.rung)
  if (rung !== undefined) return requestRung(context, state, rung)
  const exhausted = { ...lookAheadOf(state), attempt: undefined }
  return { state: { ...state, lookAhead: exhausted }, outputs: [] }
}

/** Intent: a generation result: a success goes to its fit check, a failure climbs the ladder. */
function onGenerationResult(
  context: EngineContext,
  state: EngineState,
  attemptId: number,
  outcome: GenerationOutcome,
): Step {
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'generating')
    throw new SessionEngineError(`Attempt ${attemptId} already has its generation result.`)
  if (outcome.kind !== 'generation_success') return climb(context, state, attempt)
  const lookAhead = lookAheadOf(state)
  const fitting: Attempt = { ...attempt, stage: 'fitting', outcome }
  return {
    state: { ...state, lookAhead: { ...lookAhead, attempt: fitting } },
    outputs: [
      {
        kind: 'check-fit',
        attemptId,
        phraseNumber: lookAhead.phraseNumber,
        outcome,
        intent: attempt.intent,
      },
    ],
  }
}

/** Intent: a rejected generate request is a failed attempt, which climbs the ladder. */
function onGenerationCrashed(context: EngineContext, state: EngineState, attemptId: number): Step {
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'generating')
    throw new SessionEngineError(`Attempt ${attemptId} crashed after its generation result.`)
  return climb(context, state, attempt)
}

/** Intent: a fit result: a phrase that fits is decided, one that does not climbs the ladder. */
function onFitResult(
  context: EngineContext,
  state: EngineState,
  attemptId: number,
  fits: boolean,
): Step {
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'fitting')
    throw new SessionEngineError(`Attempt ${attemptId} has a fit result before its outcome.`)
  if (!fits) return climb(context, state, attempt)
  return decide(state, acceptedPhrase(lookAheadOf(state), attempt))
}

/** Intent: the count-in is over: phrase 1 starts sounding and nothing new is requested. */
function onCountInOver(context: EngineContext, state: EngineState, at: AudioTime): Step {
  if (state.phase !== 'count-in') throw new SessionEngineError('The count-in is already over.')
  return {
    state: { ...state, phase: 'running', soundedCount: 1 },
    outputs: [{ kind: 'phrase-sounding', at, phrase: context.phraseOne }],
  }
}

/** Intent: refuse a phrase that is not the next decided one to start sounding. */
function assertNextToSound(state: EngineState, phraseNumber: number): void {
  if (state.phase !== 'running')
    throw new SessionEngineError(
      `Phrase ${phraseNumber} cannot start sounding before the count-in is over.`,
    )
  const next = state.soundedCount + 1
  if (phraseNumber !== next)
    throw new SessionEngineError(
      `Phrase ${phraseNumber} cannot start sounding: phrase ${next} is the next to sound.`,
    )
  if (state.lastDecided.phraseNumber !== next)
    throw new SessionEngineError(
      `Phrase ${phraseNumber} cannot start sounding: it is not decided yet.`,
    )
}

/**
 * Intent: phrase N (2 or more) starts sounding: it must be the next decided phrase. A shown notice
 * clears if it is a generated phrase, and phrase N+1 is requested with its deadline at the start
 * of N's last measure.
 */
function onPhraseStartedSounding(
  context: EngineContext,
  state: EngineState,
  at: AudioTime,
  phraseNumber: number,
): Step {
  assertNextToSound(state, phraseNumber)
  const phrase = state.lastDecided
  const cleared = noticeOnSounding(state.notice, phrase.origin)
  const sounded = { ...state, soundedCount: phraseNumber, notice: cleared.notice }
  const deadline = nextPhraseDeadline(at, context.settings.controls.tempo)
  const requested = requestNextPhrase(context, sounded, deadline)
  return {
    state: requested.state,
    outputs: [{ kind: 'phrase-sounding', at, phrase }, ...cleared.outputs, ...requested.outputs],
  }
}

/** Intent: end the session: drop the look-ahead, clear a shown notice and report the end. */
function onEnd(state: EngineState, event: Extract<SessionEvent, { kind: 'end' }>): Step {
  return {
    state: { ...state, phase: 'ended', lookAhead: undefined },
    outputs: [
      ...noticeAtEnd(state.notice),
      {
        kind: 'ended',
        at: event.at,
        cause: event.cause,
        phase: state.phase === 'count-in' ? 'count-in' : 'running',
        soundedPhraseCount: state.soundedCount,
      },
    ],
  }
}

/** Intent: after the end, late results and ticks are dropped; any other event is a caller bug. */
function afterEnd(state: EngineState, event: SessionEvent): Step {
  const dropped: readonly SessionEvent['kind'][] = [
    'generation-result',
    'generation-crashed',
    'fit-result',
    'tick',
  ]
  if (!dropped.includes(event.kind))
    throw new SessionEngineError(`The session has ended; "${event.kind}" cannot follow.`)
  return { state, outputs: [] }
}

/** Intent: handle one event once the deadline logic has run for its time. */
function dispatch(context: EngineContext, state: EngineState, event: SessionEvent): Step {
  switch (event.kind) {
    case 'count-in-over':
      return onCountInOver(context, state, event.at)
    case 'phrase-started-sounding':
      return onPhraseStartedSounding(context, state, event.at, event.phraseNumber)
    case 'generation-result':
      return onGenerationResult(context, state, event.attemptId, event.outcome)
    case 'generation-crashed':
      return onGenerationCrashed(context, state, event.attemptId)
    case 'fit-result':
      return onFitResult(context, state, event.attemptId, event.fits)
    case 'tick':
      return { state, outputs: [] }
    case 'end':
      return onEnd(state, event)
  }
}

/**
 * Intent: handle one timed event. Time never runs backwards. Before the end, any event other than
 * `end` first runs the deadline logic for its time, so a result at or after the deadline is too
 * late; `end` decides nothing more.
 */
function handleEvent(context: EngineContext, state: EngineState, event: SessionEvent): Step {
  assertAudioTime(event.at)
  if (state.phase === 'ended') return afterEnd(state, event)
  if (event.at < state.lastAt)
    throw new SessionEngineError(`Time ran backwards: ${event.at} s after ${state.lastAt} s.`)
  const timed = { ...state, lastAt: event.at }
  const due = event.kind === 'end' ? { state: timed, outputs: [] } : runDeadline(timed, event.at)
  const handled = dispatch(context, due.state, event)
  return { state: handled.state, outputs: [...due.outputs, ...handled.outputs] }
}

/**
 * Intent: start a session from its start time, chosen settings and phrase 1 (the Idle phrase):
 * freeze the settings, keep phrase 1 as the `idle` record, and request phrase 2 at once with its
 * deadline at the end of the count-in. Returns the start outputs and the handler of every later
 * event; every output is deep-frozen, and attempt ids increase from 1.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[req_rolling_practice_session]]
// @spec-link [[rule_session_never_pauses]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[rule_count_in_ending_returns_to_idle]]
export function createSessionEngine(
  deps: SessionEngineDependencies,
  start: SessionStart,
): SessionEngine {
  assertAudioTime(start.at)
  if (start.phraseOne.outcome.kind !== 'generation_success')
    throw new SessionEngineError('Phrase 1 must be a successfully generated phrase.')
  const settings = freezeSessionSettings(start.settings)
  const phraseOne: SessionPhrase = deepFreeze({
    phraseNumber: 1,
    origin: 'idle',
    intent: start.phraseOne.intent,
    outcome: start.phraseOne.outcome,
  })
  const { providers, viewport } = deps
  const context: EngineContext = { providers, viewport, settings, phraseOne }
  const initial: EngineState = {
    phase: 'count-in',
    lastAt: start.at,
    soundedCount: 0,
    lastDecided: phraseOne,
    lookAhead: undefined,
    steppedDown: false,
    notice: NOTICE_AT_START,
    nextAttemptId: 1,
  }
  const phraseTwoDue = phraseTwoDeadline(start.at, settings.controls.tempo)
  const started = requestNextPhrase(context, initial, phraseTwoDue)
  let state = started.state
  return Object.freeze({
    outputsAtStart: deepFreeze([...started.outputs]),
    handle(event: SessionEvent): readonly SessionOutput[] {
      const step = handleEvent(context, state, event)
      state = step.state
      return deepFreeze([...step.outputs])
    },
  })
}
