/**
 * The session engine: a pure, deterministic state machine that decides what a running session
 * requests, shows and ends, from timed events alone. It keeps immutable state in a closure, never
 * reads a clock (every event carries its audio time) and touches no browser API: its only seams
 * are the identity and seed providers, the window-width reading and the display reading. The
 * settings in effect start as the chosen ones and change only at phrase boundaries, through its
 * own seeded mutations or a settings change event; under the multi-phrase tension arc each phrase
 * is generated with its cycle step, which never reaches them. The same start and event list
 * always give the same outputs.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationOutcome } from '../domain/generation/orchestration/orchestration-types'
import {
  LADDER,
  acceptedPhrase,
  carryInAfter,
  currentAttempt,
  openLookAhead,
  repeatedPhrase,
  rungAfterFailure,
  rungsSkipped,
  type Attempt,
  type AttemptFailure,
  type LadderRung,
} from './failure-ladder'
import {
  buildAttemptIntent,
  discardSkippedRungs,
  freezeSessionSettings,
  resolvedRegister,
} from './session-intents'
import {
  decidedOf,
  lookAheadOf,
  undecide,
  type EngineContext,
  type EngineState,
  type Step,
} from './session-engine-state'
import { landingMutation } from './session-mutation-step'
import {
  attemptPlan,
  automaticChange,
  changedSettings,
  discardsPendingPhrase,
  lookAheadBasis,
  registerCandidates,
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
import {
  NOTICE_AT_START,
  noticeAtEnd,
  noticeOnDecision,
  noticeOnSounding,
} from './struggling-notice'
import { requireTensionArcFlag, settingsGeneratedUnder } from './tension-arc-cycle'

/** Intent: refuse a time that is not a finite number of seconds. */
function assertAudioTime(at: AudioTime): void {
  if (!Number.isFinite(at)) throw new SessionEngineError(`Audio time must be finite, got ${at}.`)
}

/**
 * Intent: request one rung for the look-ahead phrase: build its intent now from the look-ahead's
 * basis (the window read now, the step-down memory updated), give it the next attempt id, and make
 * it the attempt in flight.
 */
function requestRung(context: EngineContext, state: EngineState, rung: LadderRung): Step {
  const lookAhead = lookAheadOf(state)
  const { settings, source } = lookAhead.basis
  const plan = attemptPlan(rung, source, registerCandidates(lookAhead.previous))
  const { intent, steppedDown } = buildAttemptIntent(context, settings, plan, state.steppedDown)
  const attemptId = state.nextAttemptId
  const attempt: Attempt = { attemptId, rung, step: plan.step, intent, stage: 'generating' }
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
    ],
  }
}

/**
 * Intent: open the look-ahead for the phrase after the latest decided one and request it. A
 * mutation scheduled on that phrase is decided first, from the window read now, the step-down
 * memory and the register whose window the carry-in holds, and is in effect for its request; the
 * phrase is generated under those settings with its tension-arc cycle step, which never reaches
 * the settings in effect.
 */
function requestNextPhrase(context: EngineContext, state: EngineState, deadline: AudioTime): Step {
  if (state.lookAhead !== undefined)
    throw new SessionEngineError('A phrase is requested while another is still undecided.')
  const previous = state.lastDecided
  const phraseNumber = previous.phraseNumber + 1
  const carryIn = carryInAfter(previous)
  const landing = landingMutation(context.mutation, phraseNumber, state.settings, () => ({
    belowTabletLandscape: context.viewport.isBelowTabletLandscape(),
    sessionSteppedDown: state.steppedDown,
    resolvedRegister: resolvedRegister(carryIn, registerCandidates(previous)),
  }))
  const settings = landing?.settings ?? state.settings
  const under = settingsGeneratedUnder(context.multiPhraseTensionArc, phraseNumber, settings)
  const basis = lookAheadBasis(previous, state.lastDecidedSettings, under, carryIn)
  const lookAhead = openLookAhead(previous, carryIn, basis, deadline)
  const requested = requestRung(context, { ...state, settings, lookAhead }, LADDER[0]!)
  return {
    state: requested.state,
    outputs: [
      ...(landing === undefined ? [] : [landing.output]),
      ...requested.outputs,
      { kind: 'wake-at', at: deadline },
    ],
  }
}

/**
 * Intent: decide the look-ahead phrase: it is the next one to show, generated under its basis's
 * settings (a repeat under those of the phrase it repeats), and the notice learns of it. Its
 * look-ahead and the notice before are kept until it sounds, for a settings change to discard it.
 */
function decide(state: EngineState, phrase: SessionPhrase): Step {
  const lookAhead = lookAheadOf(state)
  const { notice, outputs } = noticeOnDecision(state.notice, phrase.origin)
  const lastDecidedSettings =
    phrase.origin === 'repeat' ? state.lastDecidedSettings : lookAhead.basis.settings
  return {
    state: {
      ...state,
      lookAhead: undefined,
      decided: { lookAhead: { ...lookAhead, attempt: undefined }, notice: state.notice },
      lastDecided: phrase,
      lastDecidedSettings,
      notice,
    },
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

/**
 * Intent: after a failed attempt, request the rung its failure leads to, or wait for the deadline
 * once the ladder is exhausted. Rungs skipped on the way create no attempt, but their request ids
 * and seeds are drawn and discarded first, so the rung requested is built as if they had failed.
 */
function climb(
  context: EngineContext,
  state: EngineState,
  attempt: Attempt,
  failure: AttemptFailure,
): Step {
  const rung = rungAfterFailure(attempt, failure)
  if (rung !== undefined) {
    discardSkippedRungs(context, rungsSkipped(attempt.rung, rung))
    return requestRung(context, state, rung)
  }
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
  if (outcome.kind !== 'generation_success')
    return climb(context, state, attempt, { kind: 'generation-failure', code: outcome.code })
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
  return climb(context, state, attempt, { kind: 'crash' })
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
  if (!fits) return climb(context, state, attempt, { kind: 'not-fitting' })
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
  const requested = requestNextPhrase(context, sounded, nextPhraseDeadline(at, tempo))
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
 * undecided again, and either way it is requested again from the first rung with the new
 * settings (generated under them with its own tension-arc cycle step), same phrase before and
 * deadline, its attempt in flight superseded. Otherwise the change applies from the phrase after
 * it. The settings in effect and the settings-changed output never carry the step.
 */
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
  const requested = requestRung(context, { ...undecided, settings, lookAhead }, LADDER[0]!)
  const discarded: readonly SessionOutput[] =
    state.lookAhead === undefined ? [{ kind: 'phrase-discarded', phraseNumber }] : []
  return {
    state: requested.state,
    outputs: [...discarded, automaticChange(phraseNumber, settings), ...requested.outputs],
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
      return onGenerationResult(context, state, event.attemptId, event.outcome)
    case 'generation-crashed':
      return onGenerationCrashed(context, state, event.attemptId)
    case 'fit-result':
      return onFitResult(context, state, event.attemptId, event.fits)
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
 * `end` decides nothing more.
 */
function handleEvent(context: EngineContext, state: EngineState, event: SessionEvent): Step {
  assertAudioTime(event.at)
  if (state.phase === 'ended') return afterEnd(state, event)
  if (event.at < state.lastAt)
    throw new SessionEngineError(`Time ran backwards: ${event.at} s after ${state.lastAt} s.`)
  const timed = { ...state, lastAt: event.at }
  const due = event.kind === 'end' ? { state: timed, outputs: [] } : runDue(timed, event.at)
  const handled = dispatch(context, due.state, event)
  return { state: handled.state, outputs: [...due.outputs, ...handled.outputs] }
}

/**
 * Intent: start a session from its start time, chosen settings, phrase 1 (the Idle phrase),
 * mutation flag, adaptive-tempo choice and multi-phrase tension arc flag (a non-boolean throws):
 * freeze the settings as the settings in effect, whose tempo stays the starting tempo, keep
 * phrase 1 as the `idle` record at the starting tempo, and request phrase 2 at once with its
 * deadline at the end of the count-in. Returns the start outputs and the handler of every later
 * event; every output is deep-frozen, and attempt ids increase from 1.
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
  const context: EngineContext = { providers, viewport, display, mutation, phraseOne, ...arcFlag }
  const initial: EngineState = {
    phase: 'count-in',
    lastAt: start.at,
    soundedCount: 0,
    settings,
    lastDecided: phraseOne,
    lastDecidedSettings: settings,
    lookAhead: undefined,
    decided: undefined,
    steppedDown: false,
    notice: NOTICE_AT_START,
    nextAttemptId: 1,
    tempo: startSessionTempo(settings, start.adaptiveTempo),
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
