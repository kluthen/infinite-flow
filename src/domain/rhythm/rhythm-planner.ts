import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { normalizedRhythmIdentity, withRhythmIdentity } from './rhythm-identity'
import { quickRejectRhythmCandidate } from './rhythm-invariants'
import { gestureCannotReachShare } from './rhythm-variety'
import { enumerateGestureDerivations } from './rhythm-skeleton'
import {
  applyTransformSet,
  enumerateAnswerTransformLists,
  enumerateSyncopationTemplates,
  type SyncopationSelectorMemo,
  type TransformResult,
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
  const grammarVersion = input.grammarVersion ?? 'rhythm-mvp-v2'
  if (
    grammarVersion !== 'rhythm-mvp-v2' ||
    !NOTE_DENSITIES.includes(input.noteDensity) ||
    !RHYTHMIC_VARIETIES.includes(input.rhythmicVariety) ||
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

/**
 * Per-expansion memos. `applied` memoizes applying one descriptor to one bar, keyed by the immutable
 * bar and descriptor objects (shared across templates once `selectors` memoizes the syncopation
 * selectors). Cached bars are shared between candidates and never mutated.
 */
interface ExpansionMemo {
  readonly applied: WeakMap<RhythmBar, WeakMap<RhythmTransformDescriptor, TransformResult>>
  readonly selectors: SyncopationSelectorMemo
}

type Freeze = <T>(value: T) => T

/** The syncopation stage builds unfrozen bars; only yielded candidates are deep-frozen. */
const leaveUnfrozen: Freeze = (value) => value

function applyOne(
  memo: ExpansionMemo,
  bar: RhythmBar,
  descriptors: readonly RhythmTransformDescriptor[],
  freeze: Freeze,
): TransformResult {
  if (descriptors.length !== 1) return applyTransformSet(bar, descriptors, freeze)
  const descriptor = descriptors[0]!
  let byDescriptor = memo.applied.get(bar)
  if (!byDescriptor) {
    byDescriptor = new WeakMap()
    memo.applied.set(bar, byDescriptor)
  }
  let result = byDescriptor.get(descriptor)
  if (!result) {
    result = applyTransformSet(bar, descriptors, freeze)
    byDescriptor.set(descriptor, result)
  }
  return result
}

function applyByBar(
  memo: ExpansionMemo,
  bars: readonly RhythmBar[],
  descriptors: readonly RhythmTransformDescriptor[],
  freeze: Freeze = deepFreeze,
): readonly RhythmBar[] | undefined {
  const next: RhythmBar[] = []
  for (const bar of bars) {
    const result = applyOne(
      memo,
      bar,
      descriptors.filter((descriptor) => descriptor.barIndex === bar.barIndex),
      freeze,
    )
    if (!result.ok) return undefined
    next.push(result.bar)
  }
  return next
}

/**
 * Full v1 derivation in documented depth-first order; it has no time or count cutoff.
 *
 * Unless `exact`, it skips two kinds of work whose candidates the validator always rejects, so
 * the yielded sequence is unchanged: gestures whose optimistic best-case density share can never
 * reach the selected rhythmic-variety level's floor (`gestureCannotReachShare`, an
 * over-approximation of `rhythmic_variety_violation` proven safe because transforms never change a
 * source cell's duration), and candidates `quickRejectRhythmCandidate` rejects before they are
 * frozen and validated. Skipped work records no validation codes, so a no-plan result is
 * re-derived `exact` to report the complete code set.
 */
function* derive(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
  exact: boolean,
): IterableIterator<UnindexedRhythmCandidate> {
  const memo: ExpansionMemo = { applied: new WeakMap(), selectors: new WeakMap() }
  let hadGesture = false
  for (const gesture of enumerateGestureDerivations(input)) {
    hadGesture = true
    // @spec-link [[module_rhythm_variety_grammar]]
    if (!exact && gestureCannotReachShare(gesture.bars, input.noteDensity, input.rhythmicVariety))
      continue
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
      const afterAnswer = applyByBar(memo, answerBase, answerOnly)
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
        memo.selectors,
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
        const bars = applyByBar(memo, phraseBeforeSync, syncStage, leaveUnfrozen)
        if (!bars) {
          observed.add('transform_algebra_violation')
          continue
        }
        const candidate: UnindexedRhythmCandidate = {
          grammarVersion: input.grammarVersion,
          input,
          bars,
          recurrence: gesture.recurrence,
          transforms,
        }
        if (!exact && quickRejectRhythmCandidate(candidate)) continue
        const failures = validateRhythmCandidate(candidate)
        if (failures.length > 0) {
          failures.forEach((failure) => observed.add(failure))
          continue
        }
        yield deepFreeze(candidate)
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
  exact = false,
): IterableIterator<RhythmCandidate> {
  const identities = new Set<string>()
  let candidateIndex = 0
  for (const candidate of derive(input, observed, exact)) {
    const identity = normalizedRhythmIdentity(candidate)
    if (identities.has(identity)) continue
    identities.add(identity)
    yield withRhythmIdentity(candidate, candidateIndex, identity)
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
  // Exhaustion is necessary only to distinguish the typed no-plan result. A fast probe that finds
  // nothing is re-run exactly so the no-plan result reports every validation code.
  let probe = candidates(normalized, observed)
  let first = probe.next()
  if (first.done) {
    probe = candidates(normalized, observed, true)
    first = probe.next()
  }
  if (first.done)
    return deepFreeze({
      kind: 'no_legal_rhythm_plan',
      input: normalized,
      codes: deepFreeze(
        [...observed].sort(
          (left, right) => VALIDATION_ORDER.indexOf(left) - VALIDATION_ORDER.indexOf(right),
        ),
      ),
    })
  // The first replay resumes the successful probe instead of re-deriving its prefix; every later
  // replay derives afresh from the grammar, so published domains stay lazy and replayable.
  let resumable: { readonly first: RhythmCandidate; readonly rest: typeof probe } | undefined = {
    first: first.value,
    rest: probe,
  }
  return deepFreeze({
    kind: 'rhythm_candidate_domain' as const,
    grammarVersion: normalized.grammarVersion,
    input: normalized,
    candidates: function candidateIterator() {
      if (!resumable) return candidates(normalized, new Set())
      const { first: resumedFirst, rest } = resumable
      resumable = undefined
      return (function* resumeProbe() {
        yield resumedFirst
        yield* rest
      })()
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
