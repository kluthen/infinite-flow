/**
 * The session engine: a pure, deterministic state machine that decides what a running session
 * requests, shows and ends, from timed events alone. It keeps immutable state in a closure, never
 * reads a clock (every event carries its audio time) and touches no browser API: its only seams
 * are the request-identity provider, the window-width reading and the display reading, and every
 * attempt seed comes from the session seed plan, from the session seed in its start. The
 * settings in effect start as the chosen ones and change only at phrase boundaries, through its
 * own seeded mutations or a settings change event; under the multi-phrase tension arc each phrase
 * is generated with its cycle step, which never reaches them. The same start and event list
 * always give the same outputs.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import { makeSeed } from '../domain/random/seed'
import {
  acceptedPhrase,
  currentAttempt,
  openLookAhead,
  repeatedPhrase,
  type Attempt,
} from './failure-ladder'
import { freezeSessionSettings } from './session-intents'
import {
  decide,
  decidedOf,
  lookAheadOf,
  undecide,
  type EngineContext,
  type EngineState,
  type Step,
} from './session-engine-state'
import { cancelDropped, climb, requestFirstRung, runCutover } from './session-ladder-step'
import { openNextPhrase } from './session-phrase-opening'
import { requireReadyPhrases, takeReadyPhrase } from './session-ready-phrases'
import {
  automaticChange,
  changedSettings,
  discardsPendingPhrase,
  reopenedLookAhead,
} from './session-settings-change'
import {
  countSoundingPhrase,
  fixDueTempo,
  onController,
  soundingTempo,
  startSessionTempo,
  tempoOfPhrase,
} from './session-tempo-step'
import { deadlineReached, nextPhraseDeadline, phraseTwoDeadline } from './session-timing'
import { phraseOneSettingsAtStart } from './stale-phrase-one'
import {
  SessionEngineError,
  type AudioTime,
  type SessionEngine,
  type SessionEngineDependencies,
  type SessionEvent,
  type SessionOutput,
  type SessionPhrase,
  type SessionSettings,
  type SessionStart,
} from './session-types'
import { NOTICE_AT_START, noticeAtEnd, noticeOnSounding } from './struggling-notice'
import { requireTensionArcFlag, settingsGeneratedUnder } from './tension-arc-cycle'

/** Intent: refuse a time that is not a finite number of seconds. */
function assertAudioTime(at: AudioTime): void {
  if (!Number.isFinite(at)) throw new SessionEngineError(`Audio time must be finite, got ${at}.`)
}

/**
 * Intent: open the look-ahead for the phrase after the latest decided one at `at` and wake at its
 * deadline. A mutation scheduled on that phrase is decided first, from the window read now, the
 * step-down memory and the register whose window the carry-in holds, is in effect for it and is
 * reported first; one that meets a dead end is skipped and its skip reported first, the settings
 * in effect unchanged; the phrase is generated under those settings with its tension-arc cycle
 * step, which never reaches the settings in effect. A matching ready phrase is then decided at
 * once; otherwise its first rung is requested, the standalone one when that attempt is already
 * due.
 */
function requestNextPhrase(
  context: EngineContext,
  state: EngineState,
  at: AudioTime,
  deadline: AudioTime,
): Step {
  if (state.lookAhead !== undefined)
    throw new SessionEngineError('A phrase is requested while another is still undecided.')
  const opened = openNextPhrase(context, state)
  const lookAhead = openLookAhead(state.lastDecided, opened.carryIn, opened.basis, deadline)
  const requested = takeReadyPhrase(context, { ...state, settings: opened.settings, lookAhead }, at)
  return {
    state: requested.state,
    outputs: [
      ...(opened.landing === undefined ? [] : [opened.landing.output]),
      ...requested.outputs,
      { kind: 'wake-at', at: deadline },
    ],
  }
}

/**
 * Intent: at or after the look-ahead's deadline with no valid phrase, repeat the phrase before;
 * any attempt still in flight is dropped with it, and cancelled first while still generating.
 * Before the deadline nothing happens.
 */
// @spec-link [[rule_dropped_attempt_cancelled]]
function runDeadline(state: EngineState, at: AudioTime): Step {
  const { lookAhead } = state
  if (lookAhead === undefined || !deadlineReached(at, lookAhead.deadline))
    return { state, outputs: [] }
  const repeated = decide(state, repeatedPhrase(lookAhead))
  return { state: repeated.state, outputs: [...cancelDropped(lookAhead), ...repeated.outputs] }
}

/** Intent: a generation result: a success goes to its fit check, a failure climbs the ladder. */
function onGenerationResult(
  context: EngineContext,
  state: EngineState,
  event: Extract<SessionEvent, { kind: 'generation-result' }>,
): Step {
  const { at, attemptId, outcome } = event
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'generating')
    throw new SessionEngineError(`Attempt ${attemptId} already has its generation result.`)
  if (outcome.kind !== 'generation_success')
    return climb(context, state, attempt, { kind: 'generation-failure', code: outcome.code }, at)
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
function onGenerationCrashed(
  context: EngineContext,
  state: EngineState,
  at: AudioTime,
  attemptId: number,
): Step {
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'generating')
    throw new SessionEngineError(`Attempt ${attemptId} crashed after its generation result.`)
  return climb(context, state, attempt, { kind: 'crash' }, at)
}

/** Intent: a fit result: a phrase that fits is decided, one that does not climbs the ladder. */
function onFitResult(
  context: EngineContext,
  state: EngineState,
  event: Extract<SessionEvent, { kind: 'fit-result' }>,
): Step {
  const { at, attemptId, fits } = event
  const attempt = currentAttempt(state.lookAhead, attemptId)
  if (attempt === undefined) return { state, outputs: [] }
  if (attempt.stage !== 'fitting')
    throw new SessionEngineError(`Attempt ${attemptId} has a fit result before its outcome.`)
  if (!fits) return climb(context, state, attempt, { kind: 'not-fitting' }, at)
  return decide(state, acceptedPhrase(lookAheadOf(state), attempt))
}

/**
 * Intent: the count-in is over: phrase 1 starts sounding at the starting tempo, the schedule may
 * count it, and nothing new is requested.
 */
function onCountInOver(context: EngineContext, state: EngineState, at: AudioTime): Step {
  if (state.phase !== 'count-in') throw new SessionEngineError('The count-in is already over.')
  const tempo = tempoOfPhrase(state.tempo, 1)
  return {
    state: { ...state, phase: 'running', soundedCount: 1, tempo: countSoundingPhrase(state.tempo) },
    outputs: [{ kind: 'phrase-sounding', at, phrase: context.phraseOne, tempo }],
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
 * Intent: phrase N (2 or more) starts sounding: it must be the next decided phrase, its tempo
 * fixed, and the schedule may count it. A shown notice clears if it is a generated phrase, and
 * phrase N+1 is requested with its deadline at the start of N's last measure, at N's tempo.
 */
function onPhraseStartedSounding(
  context: EngineContext,
  state: EngineState,
  at: AudioTime,
  phraseNumber: number,
): Step {
  assertNextToSound(state, phraseNumber)
  const phrase = state.lastDecided
  const tempo = tempoOfPhrase(state.tempo, phraseNumber)
  const cleared = noticeOnSounding(state.notice, phrase.origin)
  const sounded = {
    ...state,
    soundedCount: phraseNumber,
    notice: cleared.notice,
    decided: undefined,
    tempo: countSoundingPhrase(state.tempo),
  }
  const requested = requestNextPhrase(context, sounded, at, nextPhraseDeadline(at, tempo))
  return {
    state: requested.state,
    outputs: [
      { kind: 'phrase-sounding', at, phrase, tempo },
      ...cleared.outputs,
      ...requested.outputs,
    ],
  }
}

/**
 * Intent: put a settings change in effect at `at`. The pending phrase (the undecided look-ahead,
 * or the decided phrase not yet sounding) is discarded when at least a measure, at the sounding
 * phrase's tempo, remains before its deadline and none of it is on screen: a decided one is
 * undecided again, and either way it is requested again from its first rung (the standalone one
 * once that attempt is due) with the new settings (generated under them with its own tension-arc cycle step), same phrase before and
 * deadline, its attempt in flight superseded, and cancelled first while still generating.
 * Otherwise the change applies from the phrase after it. The settings in effect and the
 * settings-changed output never carry the step.
 */
// @spec-link [[rule_dropped_attempt_cancelled]]
function onSettingsChange(
  context: EngineContext,
  state: EngineState,
  at: AudioTime,
  next: SessionSettings,
): Step {
  const settings = changedSettings(state.settings, next)
  const pending = state.lookAhead ?? decidedOf(state).lookAhead
  const { phraseNumber } = pending
  if (!discardsPendingPhrase(at, pending, soundingTempo(state), context.display))
    return { state: { ...state, settings }, outputs: [automaticChange(phraseNumber + 1, settings)] }
  const undecided = state.lookAhead === undefined ? undecide(state) : state
  const under = settingsGeneratedUnder(context.multiPhraseTensionArc, phraseNumber, settings)
  const lookAhead = reopenedLookAhead(pending, under)
  const requested = requestFirstRung(context, { ...undecided, settings, lookAhead }, at)
  const discarded: readonly SessionOutput[] =
    state.lookAhead === undefined ? [{ kind: 'phrase-discarded', phraseNumber }] : []
  return {
    state: requested.state,
    outputs: [
      ...cancelDropped(state.lookAhead),
      ...discarded,
      automaticChange(phraseNumber, settings),
      ...requested.outputs,
    ],
  }
}

/**
 * Intent: end the session: drop the look-ahead, cancelling its attempt while still generating,
 * clear a shown notice and report the end.
 */
// @spec-link [[rule_dropped_attempt_cancelled]]
function onEnd(state: EngineState, event: Extract<SessionEvent, { kind: 'end' }>): Step {
  return {
    state: { ...state, phase: 'ended', lookAhead: undefined },
    outputs: [
      ...cancelDropped(state.lookAhead),
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

/**
 * Intent: after the end, late results, ticks and controller events (a loss can race the end) are
 * dropped; any other event is a caller bug.
 */
function afterEnd(state: EngineState, event: SessionEvent): Step {
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

/** Intent: handle one event once the deadline logic has run for its time. */
function dispatch(context: EngineContext, state: EngineState, event: SessionEvent): Step {
  switch (event.kind) {
    case 'count-in-over':
      return onCountInOver(context, state, event.at)
    case 'phrase-started-sounding':
      return onPhraseStartedSounding(context, state, event.at, event.phraseNumber)
    case 'generation-result':
      return onGenerationResult(context, state, event)
    case 'generation-crashed':
      return onGenerationCrashed(context, state, event.at, event.attemptId)
    case 'fit-result':
      return onFitResult(context, state, event)
    case 'settings-change':
      return onSettingsChange(context, state, event.at, event.settings)
    case 'controller':
      return onController(state, event.attached)
    case 'tick':
      return { state, outputs: [] }
    case 'end':
      return onEnd(state, event)
  }
}

/**
 * Intent: what is due by `at`: the deadline logic, then the pending phrase's tempo, fixed once
 * its deadline is reached, so a repeat decided at that deadline is decided first.
 */
function runDue(state: EngineState, at: AudioTime): Step {
  const decided = runDeadline(state, at)
  const fixed = fixDueTempo(decided.state, at)
  return { state: fixed.state, outputs: [...decided.outputs, ...fixed.outputs] }
}

/**
 * Intent: handle one timed event. Time never runs backwards. Before the end, any event other than
 * `end` first runs what is due by its time, so a result at or after the deadline is too late;
 * `end` decides nothing more. Once the event is handled, the look-ahead's carry-in attempt still
 * generating is cut over to the standalone attempt when that attempt is due, so a carry-in result
 * arriving at or after the cutover time is handled first.
 */
function handleEvent(context: EngineContext, state: EngineState, event: SessionEvent): Step {
  assertAudioTime(event.at)
  if (state.phase === 'ended') return afterEnd(state, event)
  if (event.at < state.lastAt)
    throw new SessionEngineError(`Time ran backwards: ${event.at} s after ${state.lastAt} s.`)
  const timed = { ...state, lastAt: event.at }
  const due = event.kind === 'end' ? { state: timed, outputs: [] } : runDue(timed, event.at)
  const handled = dispatch(context, due.state, event)
  const cutover = runCutover(context, handled.state, event.at)
  return {
    state: cutover.state,
    outputs: [...due.outputs, ...handled.outputs, ...cutover.outputs],
  }
}

/**
 * Intent: start a session from its start time, chosen settings, phrase 1 (the Idle phrase) and the
 * settings it was generated under (the chosen ones when absent), session seed (one that is no
 * seed throws), mutation flag, adaptive-tempo choice, multi-phrase tension arc flag (a
 * non-boolean throws) and ready phrases (none when absent; an invalid list throws):
 * freeze the settings as the settings in effect, whose tempo stays the starting tempo, keep
 * phrase 1 as the `idle` record at the starting tempo, decided under its own settings, so phrase
 * 2's carry-in is adapted as after a change at their boundary, and request phrase 2 at once (or
 * spend its ready phrase) with its deadline at the end of the count-in. Returns the start outputs
 * and the handler of every later event; every output is deep-frozen, and attempt ids increase
 * from 1.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_mutation_lands_on_scheduled_phrase]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[req_rolling_practice_session]]
// @spec-link [[rule_session_never_pauses]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[module_tension_arc_cycle]]
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
  const { providers, viewport, display } = deps
  const mutation = deepFreeze({ ...start.mutation })
  const arcFlag = { multiPhraseTensionArc: requireTensionArcFlag(start.multiPhraseTensionArc) }
  const sessionSeed = makeSeed(start.sessionSeed)
  const context: EngineContext = {
    providers,
    viewport,
    display,
    sessionSeed,
    mutation,
    phraseOne,
    readyPhrases: requireReadyPhrases(start.readyPhrases ?? []),
    ...arcFlag,
  }
  const initial: EngineState = {
    phase: 'count-in',
    lastAt: start.at,
    soundedCount: 0,
    settings,
    lastDecided: phraseOne,
    lastDecidedSettings: phraseOneSettingsAtStart(settings, start.phraseOneSettings),
    lookAhead: undefined,
    decided: undefined,
    steppedDown: false,
    notice: NOTICE_AT_START,
    nextAttemptId: 1,
    tempo: startSessionTempo(settings, start.adaptiveTempo),
    readyRefused: false,
  }
  const phraseTwoDue = phraseTwoDeadline(start.at, settings.controls.tempo)
  const started = requestNextPhrase(context, initial, start.at, phraseTwoDue)
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
