/**
 * The phrases pre-generated at Idle that a session start carries, and how the session spends them:
 * the check of the list a start or a plan is given, the re-derivation of a ready phrase's intent
 * at its place (the check the engine and the pre-generation plan share), and the engine's take of
 * the ready phrase of a look-ahead it has just opened: decided at once when its intent re-derives
 * identically, otherwise refused with every later one, and that phrase requested as without
 * pre-generation.
 */

import { deepEqual } from '../domain/events/deep-equal'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import { LADDER, type LookAheadBasis } from './failure-ladder'
import {
  decide,
  lookAheadOf,
  type EngineContext,
  type EngineState,
  type Step,
} from './session-engine-state'
import type { IntentSeams } from './session-intents'
import type { PhraseRhythmLock } from './rhythm-lock-session'
import { requestFirstRung } from './session-ladder-step'
import { buildRungIntent, type RungIntent } from './session-phrase-opening'
import {
  SessionEngineError,
  type AudioTime,
  type SessionPhrase,
  type SuccessfulOutcome,
} from './session-types'

/**
 * A phrase pre-generated at Idle: its phrase number (2 to 5), the index of its ladder rung (0 the
 * first carry-in attempt, 1 to 3 the carry-in retries, 4 the standalone attempt), the intent it
 * was generated from, its own request id included, and its successful outcome, which fit.
 */
// @spec-link [[module_session_ready_phrases]]
// @spec-link [[module_session_pregeneration_plan]]
// @spec-link [[req_idle_pregeneration]]
export interface ReadyPhrase {
  readonly phraseNumber: number
  readonly rung: number
  readonly intent: GenerationIntent
  readonly outcome: SuccessfulOutcome
}

/** The most phrases pre-generated ahead of a session: phrases 2 to 5. */
// @spec-link [[req_idle_pregeneration]]
// @spec-link [[module_session_pregeneration_plan]]
export const MAX_READY_PHRASES = 4

/** The phrase number of the first ready phrase: phrase 1 is the Idle phrase itself. */
const FIRST_READY_PHRASE = 2

/** Intent: refuse one ready phrase that is not the one expected at its place in the list. */
function requireReadyPhrase(ready: ReadyPhrase, index: number): void {
  const expected = FIRST_READY_PHRASE + index
  if (ready.phraseNumber !== expected)
    throw new SessionEngineError(
      `Ready phrase ${index + 1} must be phrase ${expected}, got ${ready.phraseNumber}.`,
    )
  if (!Number.isInteger(ready.rung) || ready.rung < 0 || ready.rung >= LADDER.length)
    throw new SessionEngineError(
      `Ready phrase ${expected}'s rung must be an integer from 0 to ${LADDER.length - 1}, got ${ready.rung}.`,
    )
  if (ready.outcome.kind !== 'generation_success')
    throw new SessionEngineError(
      `Ready phrase ${expected} must be a successfully generated phrase.`,
    )
}

/**
 * Intent: the ready phrases a start or a plan is given, checked and deep-frozen: phrase numbers
 * consecutive from 2, at most four, each rung on the failure ladder and each outcome a success.
 * Anything else is a caller bug and throws.
 */
// @spec-link [[module_session_ready_phrases]]
// @spec-link [[req_idle_pregeneration]]
export function requireReadyPhrases(readyPhrases: readonly ReadyPhrase[]): readonly ReadyPhrase[] {
  if (!Array.isArray(readyPhrases))
    throw new SessionEngineError('The ready phrases must be a list.')
  if (readyPhrases.length > MAX_READY_PHRASES)
    throw new SessionEngineError(
      `At most ${MAX_READY_PHRASES} phrases can be ready, got ${readyPhrases.length}.`,
    )
  readyPhrases.forEach(requireReadyPhrase)
  return deepFreeze([...readyPhrases])
}

/**
 * Intent: re-derive a ready phrase's intent at its place, after `previous`, from the basis its
 * look-ahead was opened with: its rung's intent built through the very path a request takes, with
 * the window read now, the step-down memory given, the phrase's rhythm lock groups and the ready
 * phrase's own request id, drawing no request id. The rebuilt intent, with the step-down memory
 * building it gives and whether it carries the re-lock group, when it is identical to the ready
 * phrase's, lock group included; undefined when it differs.
 */
// @spec-link [[module_session_ready_phrases]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
// @spec-link [[module_session_rhythm_lock]]
export function rederivedReadyPhrase(
  seams: IntentSeams,
  previous: SessionPhrase,
  basis: LookAheadBasis,
  ready: ReadyPhrase,
  steppedDown: boolean,
  rhythmLock: PhraseRhythmLock | undefined,
): RungIntent | undefined {
  /** Intent: the ready phrase's own request id, so the rebuild draws none from the provider. */
  const ownRequestId = () => ready.intent.requestId
  const own = { ...seams, providers: { nextRequestId: ownRequestId } }
  const rung = LADDER[ready.rung]
  if (rung === undefined) throw new SessionEngineError(`No ladder rung ${ready.rung}.`)
  const rebuilt = buildRungIntent(own, previous, basis, rung, steppedDown, rhythmLock)
  return deepEqual(rebuilt.intent, ready.intent) ? rebuilt : undefined
}

/**
 * Intent: the session record of a spent ready phrase, with the origin its rung's step gives and
 * the re-lock mark when its intent carries the re-lock group.
 */
// @spec-link [[module_session_ready_phrases]]
// @spec-link [[rule_rhythm_lock_relocks_after_step_down]]
export function spentPhrase(
  ready: ReadyPhrase,
  step: RungIntent['step'],
  relock: boolean,
): SessionPhrase {
  return {
    phraseNumber: ready.phraseNumber,
    origin: step,
    intent: ready.intent,
    outcome: ready.outcome,
    ...(relock ? { relock: true as const } : {}),
  }
}

/**
 * Intent: the engine's step for a look-ahead it has just opened at `at`. While no ready phrase was
 * refused, a ready phrase with its number whose intent re-derives identically is decided at once,
 * with the step-down memory that building it gives and no generation request; the first one that
 * differs is refused with every later one, and the phrase is requested from its first rung, as is
 * a phrase with no ready phrase.
 */
// @spec-link [[module_session_ready_phrases]]
// @spec-link [[rule_pregenerated_phrase_matches_session]]
// @spec-link [[rule_start_never_waits_for_pregeneration]]
export function takeReadyPhrase(context: EngineContext, state: EngineState, at: AudioTime): Step {
  const lookAhead = lookAheadOf(state)
  const ready = state.readyRefused
    ? undefined
    : context.readyPhrases.find((entry) => entry.phraseNumber === lookAhead.phraseNumber)
  if (ready === undefined) return requestFirstRung(context, state, at)
  const { previous, basis, rhythmLock } = lookAhead
  const { steppedDown } = state
  const rebuilt = rederivedReadyPhrase(context, previous, basis, ready, steppedDown, rhythmLock)
  if (rebuilt === undefined) return requestFirstRung(context, { ...state, readyRefused: true }, at)
  const phrase = spentPhrase(ready, rebuilt.step, rebuilt.relock)
  return decide({ ...state, steppedDown: rebuilt.steppedDown }, phrase)
}
