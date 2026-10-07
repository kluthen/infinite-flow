/**
 * The failure ladder of one look-ahead phrase, as immutable values: the rungs an attempt climbs
 * (a first carry-in attempt, three carry-in retries, one standalone retry), the one attempt in
 * flight, and the phrase record the ladder ends with: the accepted phrase, or a repeat of the
 * phrase before when no valid phrase exists at the deadline. A phrase whose carry-in a settings
 * change left unusable climbs the same rungs, every attempt standalone.
 */

import { deriveCarryIn } from '../domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import type { GenerationFailureCode } from '../domain/generation/orchestration/orchestration-types'
import type { CarryInAdaptation } from './carry-in-adaptation'
import type { AudioTime, SessionPhrase, SessionSettings, SuccessfulOutcome } from './session-types'

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
      /** The step actually taken: the rung's, or standalone for every rung of a standalone phrase. */
      readonly step: 'carry-in' | 'standalone'
      readonly intent: GenerationIntent
      readonly stage: 'generating'
    }
  | {
      readonly attemptId: number
      readonly rung: LadderRung
      readonly step: 'carry-in' | 'standalone'
      readonly intent: GenerationIntent
      readonly stage: 'fitting'
      readonly outcome: SuccessfulOutcome
    }

/**
 * What every attempt of one look-ahead phrase is built from: the settings it is generated under
 * (those in effect when it was opened, with its multi-phrase tension arc step), the settings its
 * phrase before was generated under, and its source: the carry-in, as adapted to the change
 * between the two, or a standalone generation with this register.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @spec-link [[module_session_carry_in_after_change]]
export interface LookAheadBasis {
  readonly settings: SessionSettings
  readonly previousSettings: SessionSettings
  readonly source: CarryInAdaptation
}

/**
 * The phrase being looked ahead for, not yet decided: its number, its deadline, the phrase before
 * and the carry-in derived from it, what its attempts are built from, and the attempt in flight,
 * if any (none once the ladder is exhausted).
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[module_session_failure_ladder]]
export interface LookAhead {
  readonly phraseNumber: number
  readonly deadline: AudioTime
  readonly previous: SessionPhrase
  readonly carryIn: CarryIn
  readonly basis: LookAheadBasis
  readonly attempt: Attempt | undefined
}

/**
 * Intent: the carry-in of the phrase after `previous`, from that record's intent and outcome with
 * its own phrase number, whatever its origin (a standalone or a repeat included).
 */
// @spec-link [[rule_session_generation_failure_ladder]]
export function carryInAfter(previous: SessionPhrase): CarryIn {
  return deriveCarryIn({
    intent: previous.intent,
    outcome: previous.outcome,
    phraseNumber: previous.phraseNumber,
  })
}

/** Intent: open the look-ahead for the phrase after `previous`, with its carry-in and basis. */
// @spec-link [[rule_session_generation_failure_ladder]]
export function openLookAhead(
  previous: SessionPhrase,
  carryIn: CarryIn,
  basis: LookAheadBasis,
  deadline: AudioTime,
): LookAhead {
  return {
    phraseNumber: previous.phraseNumber + 1,
    deadline,
    previous,
    carryIn,
    basis,
    attempt: undefined,
  }
}

/** Intent: the rung after a failed one, or undefined once the standalone retry has failed. */
// @spec-link [[rule_session_generation_failure_ladder]]
export function nextRung(rung: LadderRung): LadderRung | undefined {
  return LADDER[LADDER.indexOf(rung) + 1]
}

/**
 * Why an attempt failed: a generation that found no phrase, with its failure code; a generate
 * request that was rejected, by a worker crash on it or a dead worker; or a phrase that does not
 * fit the staff.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[module_session_failure_ladder]]
export type AttemptFailure =
  | { readonly kind: 'generation-failure'; readonly code: GenerationFailureCode }
  | { readonly kind: 'crash' }
  | { readonly kind: 'not-fitting' }

/** What the next rung depends on in a failed attempt: its rung and the step it actually took. */
// @spec-link [[module_session_failure_ladder]]
export interface FailedRung {
  readonly rung: LadderRung
  readonly step: 'carry-in' | 'standalone'
}

/**
 * Intent: whether a failed attempt searched its carry-in window to exhaustion: a carry-in attempt
 * whose generation failed with no_legal_pitch_plan. Its one window holds the same candidates
 * whatever the seed, which only orders them, so every carry-in retry would fail the same way.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[module_session_failure_ladder]]
function exhaustedCarryInSearch(failed: FailedRung, failure: AttemptFailure): boolean {
  return (
    failed.step === 'carry-in' &&
    failure.kind === 'generation-failure' &&
    failure.code === 'no_legal_pitch_plan'
  )
}

/**
 * Intent: the rung after a failed attempt, or undefined once the standalone retry has failed. A
 * carry-in attempt that exhausted its search goes straight to the standalone rung; every other
 * failure (a search allowance cutoff, a validation failure, a crash, a phrase that does not fit,
 * and any failure of a standalone attempt) goes to the next rung.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[module_session_failure_ladder]]
export function rungAfterFailure(
  failed: FailedRung,
  failure: AttemptFailure,
): LadderRung | undefined {
  if (exhaustedCarryInSearch(failed, failure)) return LADDER[LADDER.length - 1]
  return nextRung(failed.rung)
}

/** Intent: how many rungs lie strictly between a failed rung and the rung requested after it. */
// @spec-link [[module_session_failure_ladder]]
export function rungsSkipped(failed: LadderRung, next: LadderRung): number {
  return LADDER.indexOf(next) - LADDER.indexOf(failed) - 1
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
    origin: attempt.step,
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
