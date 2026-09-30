/**
 * The failure ladder of one look-ahead phrase, as immutable values: the rungs an attempt climbs
 * (a first carry-in attempt, three carry-in retries, one standalone retry), the one attempt in
 * flight, and the phrase record the ladder ends with: the accepted phrase, or a repeat of the
 * phrase before when no valid phrase exists at the deadline.
 */

import { deriveCarryIn } from '../domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { AudioTime, SessionPhrase, SuccessfulOutcome } from './session-types'

/** One rung of the ladder: its step and how many attempts for the phrase came before it. */
// @spec-link [[rule_session_generation_failure_ladder]]
export interface LadderRung {
  readonly step: 'carry-in' | 'standalone'
  readonly retry: number
}

/** Every rung, in climbing order: the first attempt, three carry-in retries, one standalone. */
// @spec-link [[rule_session_generation_failure_ladder]]
export const LADDER: readonly LadderRung[] = Object.freeze([
  { step: 'carry-in', retry: 0 },
  { step: 'carry-in', retry: 1 },
  { step: 'carry-in', retry: 2 },
  { step: 'carry-in', retry: 3 },
  { step: 'standalone', retry: 4 },
])

/**
 * The attempt in flight: generating, or generated and waiting for its fit check. Only a phrase
 * that fits the staff can become ready.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
export type Attempt =
  | {
      readonly attemptId: number
      readonly rung: LadderRung
      readonly intent: GenerationIntent
      readonly stage: 'generating'
    }
  | {
      readonly attemptId: number
      readonly rung: LadderRung
      readonly intent: GenerationIntent
      readonly stage: 'fitting'
      readonly outcome: SuccessfulOutcome
    }

/**
 * The phrase being looked ahead for, not yet decided: its number, its deadline, the phrase before
 * and the carry-in derived from it, and the attempt in flight, if any (none once the ladder is
 * exhausted).
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[service_session_engine]]
export interface LookAhead {
  readonly phraseNumber: number
  readonly deadline: AudioTime
  readonly previous: SessionPhrase
  readonly carryIn: CarryIn
  readonly attempt: Attempt | undefined
}

/**
 * Intent: open the look-ahead for the phrase after `previous`, carrying in from that record's
 * intent and outcome with its own phrase number, whatever its origin (a standalone or a repeat
 * included).
 */
// @spec-link [[rule_session_generation_failure_ladder]]
export function openLookAhead(previous: SessionPhrase, deadline: AudioTime): LookAhead {
  return {
    phraseNumber: previous.phraseNumber + 1,
    deadline,
    previous,
    carryIn: deriveCarryIn({
      intent: previous.intent,
      outcome: previous.outcome,
      phraseNumber: previous.phraseNumber,
    }),
    attempt: undefined,
  }
}

/** Intent: the rung after a failed one, or undefined once the standalone retry has failed. */
// @spec-link [[rule_session_generation_failure_ladder]]
export function nextRung(rung: LadderRung): LadderRung | undefined {
  return LADDER[LADDER.indexOf(rung) + 1]
}

/**
 * Intent: the attempt in flight when it has this id; undefined for any other id, which is a
 * superseded, dropped or unknown attempt whose late result the worker could not cancel.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
export function currentAttempt(
  lookAhead: LookAhead | undefined,
  attemptId: number,
): Attempt | undefined {
  const attempt = lookAhead?.attempt
  return attempt?.attemptId === attemptId ? attempt : undefined
}

/** Intent: the record of an accepted attempt: generated with or without carry-in, and fitting. */
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
export function acceptedPhrase(
  lookAhead: LookAhead,
  attempt: Extract<Attempt, { stage: 'fitting' }>,
): SessionPhrase {
  return {
    phraseNumber: lookAhead.phraseNumber,
    origin: attempt.rung.step,
    intent: attempt.intent,
    outcome: attempt.outcome,
  }
}

/**
 * Intent: the repeat decided at the deadline when no valid phrase exists: the phrase before, as
 * the next phrase, marked with the internal repeat origin and the number of the phrase repeated.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_repeat_phrase_marked_internally_only]]
export function repeatedPhrase(lookAhead: LookAhead): SessionPhrase {
  return {
    phraseNumber: lookAhead.phraseNumber,
    origin: 'repeat',
    intent: lookAhead.previous.intent,
    outcome: lookAhead.previous.outcome,
    repeatOf: lookAhead.previous.phraseNumber,
  }
}
