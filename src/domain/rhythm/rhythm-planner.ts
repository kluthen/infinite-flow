import {
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { normalizedRhythmIdentity, withRhythmIdentity } from './rhythm-identity'
import { enumerateGestureDerivations } from './rhythm-skeleton'
import {
  applyTransformSet,
  enumerateAnswerTransformLists,
  enumerateSyncopationTemplates,
} from './syncopation'
import type {
  NoLegalRhythmPlan,
  NormalizedRhythmExpansionInput,
  RhythmBar,
  RhythmCandidate,
  RhythmExpansionInput,
  RhythmPlanResult,
  RhythmTransformDescriptor,
  RhythmValidationCode,
  UnindexedRhythmCandidate,
} from './rhythm-types'
import { validateRhythmCandidate } from './rhythm-validator'

export type {
  NoLegalRhythmPlan,
  RhythmCandidate,
  RhythmCandidateDomain,
  RhythmExpansionInput,
  RhythmPlanResult,
} from './rhythm-types'

/**
 * Intent: normalize a raw rhythm-expansion input to its validated, frozen canonical form (default
 * grammar version applied, every control validated against its closed catalog). Exported so the
 * Step 9 canonical-rhythm-domain memo can key its memo on exactly the same normalized shape this
 * module expands from, without duplicating validation.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function normalizeRhythmExpansionInput(
  input: RhythmExpansionInput,
): NormalizedRhythmExpansionInput {
  return normalizeInput(input)
}

function normalizeInput(input: RhythmExpansionInput): NormalizedRhythmExpansionInput {
  const grammarVersion = input.grammarVersion ?? 'rhythm-mvp-v1'
  if (
    grammarVersion !== 'rhythm-mvp-v1' ||
    !NOTE_DENSITIES.includes(input.noteDensity) ||
    !SILENCE_DENSITIES.includes(input.silenceDensity) ||
    !SYNCOPATIONS.includes(input.syncopation) ||
    !TENSION_ARCS.includes(input.tensionArc)
  )
    throw new RhythmPlannerInputError('invalid_rhythm_planner_input')
  return deepFreeze({ ...input, grammarVersion })
}

function copyBar(bar: RhythmBar, barIndex: 2 | 3): RhythmBar {
  return deepFreeze({
    barIndex,
    events: bar.events.map((event) =>
      deepFreeze({
        ...event,
        sourceCells: event.sourceCells.map((cell) =>
          deepFreeze({ ...cell, address: { ...cell.address, barIndex } }),
        ),
      }),
    ),
  })
}

function disjoint(descriptors: readonly RhythmTransformDescriptor[]): boolean {
  const seen = new Set<string>()
  for (const descriptor of descriptors)
    for (const address of descriptor.affectedAddresses) {
      const key = `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
      if (seen.has(key)) return false
      seen.add(key)
    }
  return true
}

function descriptorOrder(
  left: RhythmTransformDescriptor,
  right: RhythmTransformDescriptor,
): number {
  return (
    left.barIndex - right.barIndex ||
    left.boundaryTick - right.boundaryTick ||
    left.case.localeCompare(right.case) ||
    left.delta - right.delta
  )
}

function applyByBar(
  bars: readonly RhythmBar[],
  descriptors: readonly RhythmTransformDescriptor[],
): readonly RhythmBar[] | undefined {
  const next: RhythmBar[] = []
  for (const bar of bars) {
    const result = applyTransformSet(
      bar,
      descriptors.filter((descriptor) => descriptor.barIndex === bar.barIndex),
    )
    if (!result.ok) return undefined
    next.push(result.bar)
  }
  return next
}

/** Full v1 derivation in documented depth-first order; it has no time or count cutoff. */
function* derive(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
): IterableIterator<UnindexedRhythmCandidate> {
  let hadGesture = false
  for (const gesture of enumerateGestureDerivations(input)) {
    hadGesture = true
    const answerBase = [copyBar(gesture.bars[0], 2), copyBar(gesture.bars[1], 3)] as const
    let hadAnswerList = false
    for (const answerList of enumerateAnswerTransformLists(
      answerBase,
      input.noteDensity,
      input.tensionArc,
      input.syncopation,
    )) {
      hadAnswerList = true
      const answerOnly = answerList.filter(
        (descriptor) => descriptor.roles.length === 1 && descriptor.roles[0] === 'answer',
      )
      const afterAnswer = applyByBar(answerBase, answerOnly)
      if (!afterAnswer) {
        observed.add('transform_algebra_violation')
        continue
      }
      let hadSyncopationTemplate = false
      const phraseBeforeSync = [...gesture.bars, ...afterAnswer]
      for (const syncopationSet of enumerateSyncopationTemplates(
        phraseBeforeSync,
        input.noteDensity,
        input.syncopation,
        answerList.filter((descriptor) => descriptor.roles.includes('syncopation')),
      )) {
        hadSyncopationTemplate = true
        const syncStage = [
          ...answerList.filter((descriptor) => descriptor.roles.includes('syncopation')),
          ...syncopationSet,
        ]
        const transforms = [...answerOnly, ...syncStage.sort(descriptorOrder)]
        if (!disjoint(transforms)) {
          observed.add('transform_overlap_violation')
          continue
        }
        const phrase = applyByBar(phraseBeforeSync, syncStage)
        if (!phrase) {
          observed.add('transform_algebra_violation')
          continue
        }
        const candidate: UnindexedRhythmCandidate = deepFreeze({
          grammarVersion: input.grammarVersion,
          input,
          bars: deepFreeze(phrase),
          recurrence: gesture.recurrence,
          transforms: deepFreeze(transforms),
        })
        const failures = validateRhythmCandidate(candidate)
        if (failures.length > 0) {
          failures.forEach((failure) => observed.add(failure))
          continue
        }
        yield candidate
      }
      if (!hadSyncopationTemplate) observed.add('syncopation_count_violation')
    }
    if (!hadAnswerList) observed.add('answer_transform_count_violation')
  }
  if (!hadGesture) observed.add('silence_budget_violation')
}

function* candidates(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
): IterableIterator<RhythmCandidate> {
  const identities = new Set<string>()
  let candidateIndex = 0
  for (const candidate of derive(input, observed)) {
    const identity = normalizedRhythmIdentity(candidate)
    if (identities.has(identity)) continue
    identities.add(identity)
    yield withRhythmIdentity(candidate, candidateIndex)
    candidateIndex += 1
  }
}

/** Detect the typed no-plan branch without assuming a selected candidate exists. */
export function isNoLegalRhythmPlan(
  result: RhythmPlanResult | { readonly kind: string },
): result is NoLegalRhythmPlan {
  return result.kind === 'no_legal_rhythm_plan'
}

/** Expand the exact grammar registry entry through a fresh, replayable lazy iterator. */
// @spec-link [[api_rhythm_domain_expansion]]
export function makeRhythmCandidateDomain(input: RhythmExpansionInput): RhythmPlanResult {
  const normalized = normalizeInput(input)
  const observed = new Set<RhythmValidationCode>()
  // Exhaustion is necessary only to distinguish the typed no-plan result. A surviving
  // probe is discarded, so published domains remain lazy and replay from the grammar.
  const probe = candidates(normalized, observed).next()
  if (probe.done)
    return deepFreeze({
      kind: 'no_legal_rhythm_plan',
      input: normalized,
      codes: deepFreeze(
        [...observed].sort(
          (left, right) => VALIDATION_ORDER.indexOf(left) - VALIDATION_ORDER.indexOf(right),
        ),
      ),
    })
  return deepFreeze({
    kind: 'rhythm_candidate_domain' as const,
    grammarVersion: normalized.grammarVersion,
    input: normalized,
    candidates: function candidateIterator() {
      return candidates(normalized, new Set())
    },
  })
}

const VALIDATION_ORDER: readonly RhythmValidationCode[] = [
  'invalid_measure_count',
  'invalid_measure_tiling',
  'invalid_phrase_duration',
  'non_positive_duration',
  'invalid_nominal_provenance',
  'density_attack_band_violation',
  'mixed_duration_class_coverage_violation',
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
  'candidate_identity_duplicate',
  'candidate_index_invalid',
  'domain_replay_mismatch',
]

export class RhythmPlannerInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RhythmPlannerInputError'
  }
}
