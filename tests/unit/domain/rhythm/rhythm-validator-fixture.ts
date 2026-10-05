/**
 * Real generator output for the rhythm-validator specs: candidates drawn from the public candidate
 * domain of a default setting (or overrides of it), cloned mutable so a spec can make one
 * deliberate malformed change and check the stable failure codes the validator reports.
 */
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type {
  RhythmCandidate,
  RhythmExpansionInput,
  RhythmTransformDescriptor,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'

/** A deeply writable copy of a readonly rhythm type, so a spec can corrupt any field. */
export type Mutable<T> = { -readonly [Key in keyof T]: Mutable<T[Key]> }

/** The default setting every fixture candidate is generated from, before its overrides. */
export const baseInput = {
  grammarVersion: 'rhythm-mvp-v2',
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  silenceDensity: 'Sparse',
  syncopation: 'Straight',
  tensionArc: 'Settled',
} as const

/** Every stable candidate-level failure code the validator can report. */
export const candidateCodes = [
  'invalid_measure_count',
  'invalid_measure_tiling',
  'invalid_phrase_duration',
  'non_positive_duration',
  'invalid_nominal_provenance',
  'density_attack_band_violation',
  'rhythmic_variety_violation',
  'silence_budget_violation',
  'silence_shape_violation',
  'all_rest_measure',
  'rest_duration_limit_violation',
  'syncopation_count_violation',
  'syncopation_type_violation',
  'transform_algebra_violation',
  'transform_overlap_violation',
  'attack_count_changed',
  'rest_total_changed',
  'metrical_anchor_missing',
  'first_note_off_downbeat',
  'active_anchor_ratio_violation',
  'invalid_tie_chain',
  'recurrence_witness_invalid',
  'answer_transform_count_violation',
  'answer_similarity_violation',
  'answer_variation_missing',
  'transform_order_violation',
  'candidate_identity_mismatch',
] as const

/** The first generated candidate of the setting matching `predicate`; throws when there is none. */
export function generatedCandidate(
  overrides: Partial<RhythmExpansionInput> = {},
  predicate: (candidate: RhythmCandidate) => boolean = () => true,
): RhythmCandidate {
  const result = makeRhythmCandidateDomain({ ...baseInput, ...overrides })
  if (isNoLegalRhythmPlan(result))
    throw new Error(`Unexpected empty domain: ${result.codes.join(', ')}`)
  const candidate = [...result.candidates()].find(predicate)
  if (!candidate) throw new Error('No generated candidate matched the fixture predicate')
  return candidate
}

/** Clone public generator output so each audit case makes one deliberate malformed change. */
export function mutableCandidate(
  overrides: Partial<RhythmExpansionInput> = {},
  predicate?: (candidate: RhythmCandidate) => boolean,
): Mutable<UnindexedRhythmCandidate> {
  const candidate = structuredClone(
    generatedCandidate(overrides, predicate),
  ) as Mutable<RhythmCandidate>
  delete (candidate as Partial<Mutable<RhythmCandidate>>).candidateIndex
  delete (candidate as Partial<Mutable<RhythmCandidate>>).identity
  return candidate
}

/** The candidate's first event of the given kind, in phrase order; throws when there is none. */
export function firstEvent(candidate: Mutable<UnindexedRhythmCandidate>, kind: 'note' | 'rest') {
  const event = candidate.bars.flatMap((bar) => bar.events).find((item) => item.kind === kind)
  if (!event) throw new Error(`Fixture has no ${kind} event`)
  return event
}

/** Whether a transform descriptor plays the answer role alone (not also a syncopation). */
export function answerOnly(descriptor: RhythmTransformDescriptor): boolean {
  return descriptor.roles.length === 1 && descriptor.roles[0] === 'answer'
}
