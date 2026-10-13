/**
 * The session pre-generation plan: a pure, deadline-free state machine that builds, one attempt at
 * a time, the phrases 2 to 5 a session would generate after a given phrase 1, so that what is made
 * at Idle is exactly what the session would ask for at each place. Every request is built through
 * the session engine's own functions (the mutation landing, the tension-arc step, the look-ahead
 * basis from the carry-in, each rung's intent with its planned seed), and the step-down memory and
 * the settings in effect carry from phrase to phrase as they do in the engine. It reads no clock,
 * touches no page and posts nothing: its only seams are the request-identity provider, from which
 * each attempt's request id is drawn, and the window-width reading. Each plan value is immutable;
 * stepping it gives the next one.
 */

import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import { makeSeed, type Seed } from '../domain/random/seed'
import {
  LADDER,
  firstRung,
  rungAfterFailure,
  rungsSkipped,
  type AttemptFailure,
  type LadderRung,
} from './failure-ladder'
import { discardSkippedRungs, freezeSessionSettings, type IntentSeams } from './session-intents'
import {
  buildRungIntent,
  openNextPhrase,
  type OpenedPhrase,
  type PhraseCourse,
  type PhraseOpeningSeams,
} from './session-phrase-opening'
import {
  MAX_READY_PHRASES,
  rederivedReadyPhrase,
  requireReadyPhrases,
  spentPhrase,
  type ReadyPhrase,
} from './session-ready-phrases'
import {
  SessionEngineError,
  type SessionEngineDependencies,
  type SessionPhrase,
  type SessionSettings,
  type SessionStart,
  type SuccessfulOutcome,
} from './session-types'
import type { SettingsMutationFlag } from './settings-mutation'
import { requireTensionArcFlag } from './tension-arc-cycle'

/** The plan's seams: the page-wide request-identity provider and the window-width reading. */
// @spec-link [[module_session_pregeneration_plan]]
export type PregenerationSeams = Pick<SessionEngineDependencies, 'providers' | 'viewport'>

/**
 * What the plan starts from, as a session would: the chosen settings, phrase 1 (the Idle result's
 * intent and successful outcome), the session seed published with it, the settings-mutation flag
 * (the workspace builds it from the Vary settings choice and the session seed) and the
 * multi-phrase tension arc flag. Tempo and Rising tempo change no request.
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[req_idle_pregeneration]]
export interface PregenerationStart {
  readonly settings: SessionSettings
  readonly phraseOne: SessionStart['phraseOne']
  readonly sessionSeed: Seed
  readonly mutation: SettingsMutationFlag
  readonly multiPhraseTensionArc: boolean
}

/** One attempt to request: its phrase, its ladder rung's index, its step and its intent. */
// @spec-link [[module_session_pregeneration_plan]]
export interface PregenerationAttempt {
  readonly phraseNumber: number
  readonly rung: number
  readonly step: 'carry-in' | 'standalone'
  readonly intent: GenerationIntent
}

/**
 * An attempt's result: a successful outcome that fits, or a failure (a generation failure with its
 * code, a crashed generate request, or a phrase that does not fit).
 */
// @spec-link [[module_session_pregeneration_plan]]
export type PregenerationResult =
  { readonly kind: 'fits'; readonly outcome: SuccessfulOutcome } | AttemptFailure

/** Why a plan stopped: four phrases are ready, or a phrase's standalone attempt failed. */
// @spec-link [[module_session_pregeneration_plan]]
export type PregenerationStop = 'four-ready' | 'ladder-exhausted'

/**
 * A plan, as an immutable value: the phrases ready so far, the attempt to request next (none once
 * it stopped) and why it stopped. `after` takes back the result of that attempt and gives the plan
 * after it; calling it on a stopped plan is a caller bug and throws.
 */
// @spec-link [[module_session_pregeneration_plan]]
export interface PregenerationPlan {
  readonly readyPhrases: readonly ReadyPhrase[]
  readonly attempt: PregenerationAttempt | undefined
  readonly stopped: PregenerationStop | undefined
  after(result: PregenerationResult): PregenerationPlan
}

/** Everything fixed for a whole plan: the seams, the session seed and both session flags. */
type PlanContext = IntentSeams & PhraseOpeningSeams

/** The attempt in flight: the phrase it is for, its rung, the step it takes and its intent. */
interface PendingAttempt {
  readonly opened: OpenedPhrase
  readonly rung: LadderRung
  readonly step: 'carry-in' | 'standalone'
  readonly intent: GenerationIntent
}

/** The plan's state between results. */
interface PlanState {
  readonly course: PhraseCourse
  readonly readyPhrases: readonly ReadyPhrase[]
  readonly pending: PendingAttempt | undefined
  readonly stopped: PregenerationStop | undefined
}

/** Intent: the plan's fixed context from its seams and start, each part checked. */
function planContext(seams: PregenerationSeams, start: PregenerationStart): PlanContext {
  return {
    providers: seams.providers,
    viewport: seams.viewport,
    sessionSeed: makeSeed(start.sessionSeed),
    mutation: deepFreeze({ ...start.mutation }),
    multiPhraseTensionArc: requireTensionArcFlag(start.multiPhraseTensionArc),
  }
}

/** Intent: the course at the start, as the engine's: phrase 1 decided under the chosen settings. */
function initialCourse(start: PregenerationStart): PhraseCourse {
  if (start.phraseOne.outcome.kind !== 'generation_success')
    throw new SessionEngineError('Phrase 1 must be a successfully generated phrase.')
  const settings = freezeSessionSettings(start.settings)
  const phraseOne: SessionPhrase = deepFreeze({
    phraseNumber: 1,
    origin: 'idle',
    intent: start.phraseOne.intent,
    outcome: start.phraseOne.outcome,
  })
  return { settings, lastDecided: phraseOne, lastDecidedSettings: settings, steppedDown: false }
}

/**
 * Intent: the course once an opened phrase is decided: its settings in effect, the phrase as the
 * latest decided one under its basis's settings, and the step-down memory as it now stands.
 */
function decidedCourse(
  opened: OpenedPhrase,
  phrase: SessionPhrase,
  steppedDown: boolean,
): PhraseCourse {
  return {
    settings: opened.settings,
    lastDecided: phrase,
    lastDecidedSettings: opened.basis.settings,
    steppedDown,
  }
}

/**
 * Intent: walk a ready list from the course at the start, as the session would spend it: each
 * phrase opened in turn and its intent re-derived with the window read now. The longest prefix
 * whose intents re-derive identically, and the course after it.
 */
function replayReady(
  context: PlanContext,
  start: PhraseCourse,
  readyPhrases: readonly ReadyPhrase[],
): { readonly course: PhraseCourse; readonly spent: readonly ReadyPhrase[] } {
  let course = start
  const spent: ReadyPhrase[] = []
  for (const ready of readyPhrases) {
    const opened = openNextPhrase(context, course)
    const { lastDecided, steppedDown } = course
    const rebuilt = rederivedReadyPhrase(context, lastDecided, opened.basis, ready, steppedDown)
    if (rebuilt === undefined) break
    course = decidedCourse(opened, spentPhrase(ready, rebuilt.step), rebuilt.steppedDown)
    spent.push(ready)
  }
  return { course, spent }
}

/**
 * Intent: request one rung of an opened phrase: the request ids of the `skipped` rungs are drawn
 * and discarded first, then its intent is built with its own rung's planned seed, the window read
 * now and the step-down memory updated.
 */
function requestRung(
  context: PlanContext,
  state: PlanState,
  opened: OpenedPhrase,
  rung: LadderRung,
  skipped: number,
): PlanState {
  discardSkippedRungs(context, skipped)
  const { course } = state
  const built = buildRungIntent(context, course.lastDecided, opened.basis, rung, course.steppedDown)
  const pending: PendingAttempt = { opened, rung, step: built.step, intent: built.intent }
  return { ...state, course: { ...course, steppedDown: built.steppedDown }, pending }
}

/**
 * Intent: plan the phrase after the course's latest decided one from its first carry-in rung (no
 * deadline ever makes the standalone attempt due), or stop once four phrases are ready.
 */
function planNext(
  context: PlanContext,
  course: PhraseCourse,
  readyPhrases: readonly ReadyPhrase[],
): PlanState {
  const state: PlanState = { course, readyPhrases, pending: undefined, stopped: undefined }
  if (readyPhrases.length >= MAX_READY_PHRASES) return { ...state, stopped: 'four-ready' }
  const rung = firstRung(false)
  return requestRung(context, state, openNextPhrase(context, course), rung, LADDER.indexOf(rung))
}

/**
 * Intent: take back the pending attempt's result. A fitting success makes its phrase ready and
 * plans the next one from it; a failure climbs the ladder with no time rule, to the standalone rung
 * only after every carry-in rung failed or straight after an exhausted carry-in search, and stops
 * the plan, deciding no repeat, once the standalone attempt fails.
 */
function takeResult(
  context: PlanContext,
  state: PlanState,
  result: PregenerationResult,
): PlanState {
  const { pending } = state
  if (pending === undefined)
    throw new SessionEngineError(`The pre-generation plan has stopped (${state.stopped}).`)
  const { opened, rung, step, intent } = pending
  if (result.kind === 'fits') {
    if (result.outcome.kind !== 'generation_success')
      throw new SessionEngineError('A fitting attempt must have a successful outcome.')
    const ready: ReadyPhrase = deepFreeze({
      phraseNumber: opened.phraseNumber,
      rung: LADDER.indexOf(rung),
      intent,
      outcome: result.outcome,
    })
    const course = decidedCourse(opened, spentPhrase(ready, step), state.course.steppedDown)
    return planNext(context, course, [...state.readyPhrases, ready])
  }
  const next = rungAfterFailure({ rung, step }, result, false)
  if (next === undefined) return { ...state, pending: undefined, stopped: 'ladder-exhausted' }
  return requestRung(context, state, opened, next, rungsSkipped(rung, next))
}

/** Intent: the plan value of a state, whose `after` steps it with the same context. */
function planOf(context: PlanContext, state: PlanState): PregenerationPlan {
  const { pending } = state
  const attempt: PregenerationAttempt | undefined =
    pending === undefined
      ? undefined
      : {
          phraseNumber: pending.opened.phraseNumber,
          rung: LADDER.indexOf(pending.rung),
          step: pending.step,
          intent: pending.intent,
        }
  return Object.freeze({
    readyPhrases: deepFreeze([...state.readyPhrases]),
    attempt: deepFreeze(attempt),
    stopped: state.stopped,
    after: (result: PregenerationResult) => planOf(context, takeResult(context, state, result)),
  })
}

/**
 * Intent: start a pre-generation plan from a session's start, or resume it after the last phrase
 * of an existing ready list (empty to start afresh). The list is checked as a session start's is,
 * and every phrase of it must still re-derive identically with the window read now: the caller
 * re-validates it first, so one that does not is a caller bug and throws. No request id is drawn
 * for the listed phrases; the first attempt of the next phrase is built at once.
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[req_idle_pregeneration]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
export function createPregenerationPlan(
  seams: PregenerationSeams,
  start: PregenerationStart,
  readyPhrases: readonly ReadyPhrase[],
): PregenerationPlan {
  const context = planContext(seams, start)
  const listed = requireReadyPhrases(readyPhrases)
  const { course, spent } = replayReady(context, initialCourse(start), listed)
  if (spent.length !== listed.length)
    throw new SessionEngineError(
      `Ready phrase ${spent.length + 2} no longer re-derives at its place; re-validate the list before resuming.`,
    )
  return planOf(context, planNext(context, course, listed))
}

/**
 * Intent: the longest prefix of a ready list whose intents still re-derive identically, in order,
 * with the window read now: the very check the session engine makes when it spends them. Draws no
 * request id; the list is checked as a session start's is.
 */
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
export function revalidatedReadyPhrases(
  seams: PregenerationSeams,
  start: PregenerationStart,
  readyPhrases: readonly ReadyPhrase[],
): readonly ReadyPhrase[] {
  const context = planContext(seams, start)
  const listed = requireReadyPhrases(readyPhrases)
  return deepFreeze([...replayReady(context, initialCourse(start), listed).spent])
}
