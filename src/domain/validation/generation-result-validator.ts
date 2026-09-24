/**
 * The independent whole-result generation validator: reconstructs every documented fact from an
 * immutable GenerationResult, its resolved GenerationRequest, its outer GenerationIntent, and the
 * claimed GenerationProvenance, never trusting planner annotations. See
 * docs/music/pitch-planner-validation.md ("Independent whole-result validation") for the policy
 * this module implements. This module and its sibling checks file must never import the pitch
 * planner (pitch-planner.ts, pitch-policy.ts, pitch-search.ts, pitch-context.ts, pitch-advance.ts,
 * pitch-candidates.ts, etc.) — only the independent pitch-phrase validator, the independent
 * rhythm validator, and the harmony planner's public candidate-domain constructor.
 */

import { deepFreeze } from '../events/deep-freeze'
import type { GenerationIntent } from '../generation/generation-intent'
import type { GenerationRequest } from '../generation/generation-request'
import type { GenerationResult } from '../generation/generation-result'
import type { GenerationProvenance } from '../generation/orchestration/orchestration-types'
import { validatePitchMidis } from '../pitch/validation/pitch-phrase-validator'
import type { PitchValidationContext } from '../pitch/validation/pitch-validation-types'
import {
  envelopeFailures,
  flattenNotes,
  harmonyProvenanceFailures,
  rangeFailures,
  resolvedRequestFailures,
  rhythmCorrespondenceFailures,
  tieFailures,
  timelineStructureFailures,
} from './generation-result-validator-checks'

/** Stable canonical failure codes, listed in their canonical reporting order. */
// @spec-link [[service_generation_orchestration]]
export const GENERATION_RESULT_VALIDATION_CODES = [
  'request_id_mismatch',
  'seed_mismatch',
  'measure_count_mismatch',
  'meter_mismatch',
  'active_concert_range_mismatch',
  'register_not_offered',
  'register_window_mismatch',
  'register_choice_mismatch',
  'timeline_measure_count_invalid',
  'timeline_measure_order_invalid',
  'measure_duration_invalid',
  'measure_duration_not_sixteenth_aligned',
  'rhythm_event_sequence_mismatch',
  'rhythm_candidate_invalid',
  'rhythm_input_mismatch',
  'harmony_provenance_mismatch',
  'tie_continuation_invalid',
  'outside_active_range',
  'outside_register_window',
  'pitch_rule_violation',
] as const

// @spec-link [[service_generation_orchestration]]
export type GenerationResultValidationCode = (typeof GENERATION_RESULT_VALIDATION_CODES)[number]

/** One independently reconstructed failure, with an optional location/reason detail string. */
// @spec-link [[service_generation_orchestration]]
export interface GenerationResultValidationFailure {
  readonly code: GenerationResultValidationCode
  readonly detail?: string
}

/** The complete bound-input facts this validator reads; provenance is treated as a claim to verify. */
// @spec-link [[service_generation_orchestration]]
export interface GenerationResultValidationInput {
  readonly intent: GenerationIntent
  readonly request: GenerationRequest
  readonly result: GenerationResult
  readonly provenance: GenerationProvenance
}

/** The whole-result verdict: valid, or every independently reconstructed failure. */
// @spec-link [[service_generation_orchestration]]
export type GenerationResultValidation =
  | { readonly kind: 'valid_generation_result' }
  | {
      readonly kind: 'invalid_generation_result'
      readonly failures: readonly GenerationResultValidationFailure[]
    }

/** Stable report order: canonical code order, then detail string, so ties are deterministic. */
function ordered(
  failures: readonly GenerationResultValidationFailure[],
): readonly GenerationResultValidationFailure[] {
  return [...failures].sort((a, b) => {
    const codeOrder =
      GENERATION_RESULT_VALIDATION_CODES.indexOf(a.code) -
      GENERATION_RESULT_VALIDATION_CODES.indexOf(b.code)
    return codeOrder !== 0 ? codeOrder : (a.detail ?? '').localeCompare(b.detail ?? '')
  })
}

/**
 * Extract chronological attack MIDIs — every note with tieContinuation false, in measure/event
 * order — from a timeline already confirmed safe to walk. Ties are not separate pitch decisions.
 */
function chronologicalAttackMidis(input: GenerationResultValidationInput): readonly number[] {
  return flattenNotes(input.result.timeline.measures)
    .filter((ref) => !ref.event.tieContinuation)
    .map((ref) => ref.event.pitch)
}

/**
 * Re-derive every melodic whole-result rule (collection membership, ornament completeness, leap
 * caps/budgets, recovery, arpeggio runs, contour checkpoints, and the open endpoint) by delegating
 * to the independent pitch-phrase validator with a context built entirely from source controls and
 * the claimed provenance. Any thrown harmony-gap error is a planner defect and is allowed to
 * propagate rather than being swallowed.
 */
// @spec-link [[module_pitch_domain_validation]]
function melodicFailures(
  input: GenerationResultValidationInput,
): readonly GenerationResultValidationFailure[] {
  const { intent, request, provenance } = input
  const context: PitchValidationContext = {
    request: {
      activeConcertRange: request.activeConcertRange,
      registerWindow: request.registerWindow,
    },
    policy: {
      profile: intent.musicalProfile.musicalProfile,
      collection: intent.controls.collection,
      tonalCenter: intent.controls.tonalCenter,
      contour: intent.controls.contour,
      leapiness: intent.controls.leapiness,
    },
    harmony: provenance.harmony,
    rhythm: provenance.rhythm,
    tensionBinding: provenance.tensionBinding,
  }
  const midis = chronologicalAttackMidis(input)
  const result = validatePitchMidis(context, midis)
  if (result.kind === 'valid_pitch_phrase') return []
  return result.failures.map((failure) => ({
    code: 'pitch_rule_violation' as const,
    detail:
      failure.attackIndex === undefined ? failure.code : `${failure.code}@${failure.attackIndex}`,
  }))
}

/**
 * Independently validate one complete GenerationResult against its resolved request, outer
 * intent, and claimed provenance. Reconstructs every fact from immutable source values, reports
 * every applicable failure (never stopping at the first), and never repairs, reranks, or mutates
 * its input. Pure: no seed/random/time use.
 */
// @spec-link [[service_generation_orchestration]]
export function validateGenerationResult(
  input: GenerationResultValidationInput,
): GenerationResultValidation {
  const { intent, request, result, provenance } = input
  const failures: GenerationResultValidationFailure[] = [
    ...envelopeFailures(intent, request, result),
    ...resolvedRequestFailures(intent, request),
  ]

  const timelineOutcome = timelineStructureFailures(result)
  failures.push(...timelineOutcome.failures)

  const rhythmOutcome = rhythmCorrespondenceFailures(
    intent,
    result,
    provenance,
    timelineOutcome.structurallyValid,
  )
  failures.push(...rhythmOutcome.failures)
  failures.push(...harmonyProvenanceFailures(intent, provenance))

  if (timelineOutcome.structurallyValid) {
    const measures = result.timeline.measures
    failures.push(...tieFailures(measures))
    failures.push(...rangeFailures(request, measures))
  }

  if (timelineOutcome.structurallyValid && rhythmOutcome.structurallyValid)
    failures.push(...melodicFailures(input))

  return failures.length === 0
    ? deepFreeze({ kind: 'valid_generation_result' as const })
    : deepFreeze({ kind: 'invalid_generation_result' as const, failures: ordered(failures) })
}
