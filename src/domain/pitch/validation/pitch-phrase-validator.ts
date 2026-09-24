import { deepFreeze } from '../../events/deep-freeze'
import type { PitchPhrase } from '../pitch-types'
import { contourFailures, endpointFailures } from './contour-endpoint-rules'
import { figureFailures } from './figure-rules'
import { motionFailures } from './motion-rules'
import { reconstructPhraseFacts, soundingSpans } from './phrase-facts'
import {
  PITCH_VALIDATION_CODES,
  type PhraseFacts,
  type PitchValidationContext,
  type PitchValidationFailure,
  type PitchValidationResult,
} from './pitch-validation-types'

/** Every attack stays inside the inclusive active concert range and resolved register window. */
// @spec-link [[module_pitch_domain_validation]]
function rangeFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const { activeConcertRange: range, registerWindow: window } = facts.context.request
  return facts.attacks.flatMap((attack): PitchValidationFailure[] => [
    ...(attack.midi < range.minMidi || attack.midi > range.maxMidi
      ? [{ code: 'outside_active_range' as const, attackIndex: attack.index }]
      : []),
    ...(attack.midi < window.minMidi || attack.midi > window.maxMidi
      ? [{ code: 'outside_register_window' as const, attackIndex: attack.index }]
      : []),
  ])
}

/** Stable report order: by attack (whole-phrase facts first), then canonical code order. */
function ordered(failures: readonly PitchValidationFailure[]): readonly PitchValidationFailure[] {
  return [...failures].sort(
    (a, b) =>
      (a.attackIndex ?? -1) - (b.attackIndex ?? -1) ||
      PITCH_VALIDATION_CODES.indexOf(a.code) - PITCH_VALIDATION_CODES.indexOf(b.code),
  )
}

/**
 * Validate one MIDI value per sounding attack against the bound rhythm, harmony, request, policy,
 * and tension binding. Every fact is reconstructed here; nothing is repaired, reranked, or chosen.
 */
// @spec-link [[module_pitch_domain_validation]]
export function validatePitchMidis(
  context: PitchValidationContext,
  midis: readonly number[],
): PitchValidationResult<readonly number[]> {
  const attackCount = soundingSpans(context).length
  const shapeFailures: PitchValidationFailure[] = [
    ...(midis.length === attackCount ? [] : [{ code: 'attack_count_mismatch' as const }]),
    ...midis.flatMap((midi, attackIndex) =>
      Number.isInteger(midi) ? [] : [{ code: 'invalid_midi' as const, attackIndex }],
    ),
  ]
  if (shapeFailures.length > 0)
    return deepFreeze({ kind: 'invalid_pitch_phrase', failures: ordered(shapeFailures) })
  const facts = reconstructPhraseFacts(context, midis)
  const failures = [
    ...rangeFailures(facts),
    ...figureFailures(facts),
    ...motionFailures(facts),
    ...contourFailures(facts),
    ...endpointFailures(facts),
  ]
  return failures.length === 0
    ? Object.freeze({ kind: 'valid_pitch_phrase' as const, candidate: midis })
    : deepFreeze({ kind: 'invalid_pitch_phrase', failures: ordered(failures) })
}

/**
 * Validate a planned phrase. Only each assignment's MIDI value is read, in chronological order;
 * roles, reservations, and attack annotations are planner claims and are ignored. A valid phrase is
 * returned unchanged.
 */
// @spec-link [[module_pitch_domain_validation]]
export function validatePitchPhrase(
  context: PitchValidationContext,
  phrase: PitchPhrase,
): PitchValidationResult<PitchPhrase> {
  const result = validatePitchMidis(
    context,
    phrase.assignments.map((assignment) => assignment.candidate.midi),
  )
  return result.kind === 'valid_pitch_phrase'
    ? Object.freeze({ kind: 'valid_pitch_phrase' as const, candidate: phrase })
    : result
}
