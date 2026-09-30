import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { withRhythmIdentity } from './rhythm-identity'
import { createRhythmIdentityFragments, fragmentRhythmIdentity } from './rhythm-identity-fragments'
import {
  answerStageBars,
  createExpansionMemo,
  descriptorOrder,
  disjointFromList,
  failsAnswerSimilarity,
  listAddressKeys,
  rejectsBeforeAssembly,
  syncStageBars,
  type ExpansionMemo,
} from './rhythm-expansion-memo'
import { attackBandViolated } from './rhythm-invariants'
import { gestureCannotReachShare, varietyViolated } from './rhythm-variety'
import { enumerateGestureDerivations } from './rhythm-skeleton'
import { answerTransformLists, syncopationTemplateLists } from './syncopation'
import { activeTemplateMask } from './syncopation-templates'
import type {
  GestureDerivation,
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

/**
 * Copy a gesture bar as answer bar 3 or 4, re-addressing every source cell to the new bar. The copy
 * is left unfrozen and never mutated; a candidate that publishes it deep-freezes it then.
 */
function copyBar(bar: RhythmBar, barIndex: 2 | 3): RhythmBar {
  return {
    barIndex,
    events: bar.events.map((event) => ({
      ...event,
      sourceCells: event.sourceCells.map((cell) => ({
        ...cell,
        address: { ...cell.address, barIndex },
      })),
    })),
  }
}

/** The fixed arguments of one derivation, shared by its per-list and per-template steps. */
interface DeriveContext {
  readonly input: NormalizedRhythmExpansionInput
  readonly observed: Set<RhythmValidationCode>
  readonly exact: boolean
  readonly memo: ExpansionMemo
}

/**
 * Marks the end of one gesture unit (one gesture with all its answer lists and templates) in the
 * derivation stream, so a stepping builder can stop between units; `candidates` filters it out.
 */
const GESTURE_END: unique symbol = Symbol('gesture_end')
type GestureEnd = typeof GESTURE_END

/**
 * Full v1 derivation in documented depth-first order, one gesture per outer iteration, each
 * gesture's unit (skipped or not) followed by `GESTURE_END`; it has no time or count cutoff.
 *
 * Unless `exact`, it skips work whose candidates the validator always rejects or that yields no
 * candidate at all, so the yielded sequence is unchanged: gestures with a bar outside the attack
 * band (`attackBandViolated`, exact per gesture because transforms never change a bar's attack
 * count and bars 3-4 copy bars 1-2); gestures whose optimistic best-case density share can never
 * reach the selected rhythmic-variety level's floor (`gestureCannotReachShare`, an
 * over-approximation of `rhythmic_variety_violation` proven safe because transforms never change a
 * source cell's duration); under Active displacement, gestures and answer lists whose bars admit
 * no syncopation template (`activeTemplateMask`); candidates `quickRejectRhythmCandidate` rejects,
 * tested as `rejectsBeforeAssembly` then `varietyViolated`; and candidates that fail answer
 * similarity (`failsAnswerSimilarity`). With those checks the fast path no longer calls
 * `validateRhythmCandidate`: every other validation code holds by construction for the candidates
 * it reaches, which the exhaustive per-setting validation specs guard by validating every published
 * candidate of all 324 settings. Skipped work records no validation codes, so a no-plan result is
 * re-derived `exact` (every shortcut off, every candidate validated) to report the complete code
 * set.
 */
// @spec-link [[api_rhythm_domain_expansion]]
function* derive(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
  exact: boolean,
): IterableIterator<UnindexedRhythmCandidate | GestureEnd> {
  const context: DeriveContext = { input, observed, exact, memo: createExpansionMemo() }
  let hadGesture = false
  for (const gesture of enumerateGestureDerivations(input)) {
    hadGesture = true
    yield* gestureCandidates(context, gesture)
    yield GESTURE_END
  }
  if (!hadGesture) observed.add('silence_budget_violation')
}

/** The candidates of one gesture, over every answer list, in canonical order: one gesture unit. */
// @spec-link [[api_rhythm_domain_expansion]]
function* gestureCandidates(
  context: DeriveContext,
  gesture: GestureDerivation,
): IterableIterator<UnindexedRhythmCandidate> {
  const { input, observed, exact, memo } = context
  if (
    !exact &&
    gesture.bars.some((bar) => attackBandViolated(bar, input.noteDensity, input.rhythmicVariety))
  )
    return
  // @spec-link [[module_rhythm_variety_grammar]]
  if (!exact && gestureCannotReachShare(gesture.bars, input.noteDensity, input.rhythmicVariety))
    return
  if (
    !exact &&
    input.syncopation === 'Active displacement' &&
    activeTemplateMask(gesture.bars, input.noteDensity, memo.selectors) === 0
  )
    return
  const answerBase = [copyBar(gesture.bars[0], 2), copyBar(gesture.bars[1], 3)] as const
  let hadAnswerList = false
  for (const answerList of answerTransformLists(
    answerBase,
    input.noteDensity,
    input.tensionArc,
    input.syncopation,
  )) {
    hadAnswerList = true
    yield* answerListCandidates(context, gesture, answerBase, answerList)
  }
  if (!hadAnswerList) observed.add('answer_transform_count_violation')
}

/** The candidates of one answer list, over every syncopation template, in canonical order. */
// @spec-link [[api_rhythm_domain_expansion]]
function* answerListCandidates(
  context: DeriveContext,
  gesture: GestureDerivation,
  answerBase: readonly RhythmBar[],
  answerList: readonly RhythmTransformDescriptor[],
): IterableIterator<UnindexedRhythmCandidate> {
  const { input, observed, exact, memo } = context
  const answerOnly = answerList.filter(
    (descriptor) => descriptor.roles.length === 1 && descriptor.roles[0] === 'answer',
  )
  const afterAnswer = answerStageBars(memo, answerBase, answerOnly)
  if (!afterAnswer) {
    observed.add('transform_algebra_violation')
    return
  }
  const phraseBeforeSync = [...gesture.bars, ...afterAnswer]
  if (
    !exact &&
    input.syncopation === 'Active displacement' &&
    activeTemplateMask(phraseBeforeSync, input.noteDensity, memo.selectors) === 0
  ) {
    observed.add('syncopation_count_violation')
    return
  }
  const duals = answerList.filter((descriptor) => descriptor.roles.includes('syncopation'))
  const listKeys = listAddressKeys(memo, [answerOnly, duals])
  let hadSyncopationTemplate = false
  for (const template of syncopationTemplateLists(
    phraseBeforeSync,
    input.noteDensity,
    input.syncopation,
    duals,
    memo.selectors,
  )) {
    hadSyncopationTemplate = true
    const candidate = templateCandidate(context, gesture, phraseBeforeSync, answerOnly, duals, {
      listKeys,
      template,
    })
    if (candidate) yield candidate
  }
  if (!hadSyncopationTemplate) observed.add('syncopation_count_violation')
}

/**
 * The legal candidate of one template, or undefined when the transforms overlap or fail to apply,
 * when (unless `exact`) the prefilter or the answer-similarity check rejects it, or when (only if
 * `exact`) it fails `validateRhythmCandidate`. The fast path does not validate: its checks reject
 * exactly the candidates the validator would, as the exhaustive validation specs guard. The
 * prefilter runs on the applied bars before the four-bar candidate and its transform list are
 * built. The candidate is not frozen here: `candidates` deep-freezes it once when it publishes it,
 * and never freezes a duplicate.
 */
// @spec-link [[api_rhythm_domain_expansion]]
function templateCandidate(
  context: DeriveContext,
  gesture: GestureDerivation,
  phraseBeforeSync: readonly RhythmBar[],
  answerOnly: readonly RhythmTransformDescriptor[],
  duals: readonly RhythmTransformDescriptor[],
  stage: {
    readonly listKeys: ReadonlySet<string> | undefined
    readonly template: readonly RhythmTransformDescriptor[]
  },
): UnindexedRhythmCandidate | undefined {
  const { input, observed, exact, memo } = context
  const { listKeys, template } = stage
  if (!disjointFromList(memo, listKeys, template)) {
    observed.add('transform_overlap_violation')
    return undefined
  }
  const bars = syncStageBars(memo, phraseBeforeSync, duals, template)
  if (!bars) {
    observed.add('transform_algebra_violation')
    return undefined
  }
  const syncopated = duals.length === 0 ? template : [...duals, ...template]
  if (
    !exact &&
    (rejectsBeforeAssembly(memo, input.syncopation, bars, syncopated) ||
      failsAnswerSimilarity(memo, bars))
  )
    return undefined
  const candidate: UnindexedRhythmCandidate = {
    grammarVersion: input.grammarVersion,
    input,
    bars,
    recurrence: gesture.recurrence,
    transforms: [...answerOnly, ...[...syncopated].sort(descriptorOrder)],
  }
  if (!exact && varietyViolated(candidate)) return undefined
  if (exact) {
    const failures = validateRhythmCandidate(candidate)
    if (failures.length > 0) {
      failures.forEach((failure) => observed.add(failure))
      return undefined
    }
  }
  return candidate
}

/**
 * The deduplicated, indexed candidates of one derivation, with each gesture unit's `GESTURE_END`
 * passed through. Each identity is spliced from cached per-part JSON fragments (the same text as
 * `normalizedRhythmIdentity`), and `withRhythmIdentity` deep-freezes each published candidate with
 * every bar it shares with later ones.
 */
// @spec-link [[api_rhythm_domain_expansion]]
// @spec-link [[entity_rhythm_candidate_domain]]
function* candidateUnits(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
  exact: boolean,
): IterableIterator<RhythmCandidate | GestureEnd> {
  const identities = new Set<string>()
  const fragments = createRhythmIdentityFragments()
  let candidateIndex = 0
  for (const candidate of derive(input, observed, exact)) {
    if (candidate === GESTURE_END) {
      yield candidate
      continue
    }
    const identity = fragmentRhythmIdentity(fragments, candidate)
    if (identities.has(identity)) continue
    identities.add(identity)
    yield withRhythmIdentity(candidate, candidateIndex, identity)
    candidateIndex += 1
  }
}

/** The deduplicated, indexed candidates of one derivation, without gesture-unit markers. */
function* candidates(
  input: NormalizedRhythmExpansionInput,
  observed: Set<RhythmValidationCode>,
  exact = false,
): IterableIterator<RhythmCandidate> {
  for (const item of candidateUnits(input, observed, exact)) if (item !== GESTURE_END) yield item
}

/** The typed no-plan result of one setting, reporting every observed code in validation order. */
function noLegalRhythmPlan(
  input: NormalizedRhythmExpansionInput,
  observed: ReadonlySet<RhythmValidationCode>,
): NoLegalRhythmPlan {
  return deepFreeze({
    kind: 'no_legal_rhythm_plan',
    input,
    codes: deepFreeze(
      [...observed].sort(
        (left, right) => VALIDATION_ORDER.indexOf(left) - VALIDATION_ORDER.indexOf(right),
      ),
    ),
  })
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
  if (first.done) return noLegalRhythmPlan(normalized, observed)
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

/**
 * The complete result of a stepped build: the typed no-plan result, or every candidate of the
 * domain in canonical iterator order (what a full drain of the domain's first replay yields).
 */
export type RhythmDomainBuildResult =
  | NoLegalRhythmPlan
  | {
      readonly kind: 'rhythm_candidate_list'
      readonly input: NormalizedRhythmExpansionInput
      readonly candidates: readonly RhythmCandidate[]
    }

/** A resumable build of one setting's complete domain, advanced one gesture unit at a time. */
export interface RhythmDomainBuilder {
  /**
   * Runs one step: the rest of the current gesture unit up to its end, or the end of a pass (which
   * either completes the build or starts the exact re-run of a pass that found nothing). Returns
   * true once the build is complete; later calls do nothing and return true.
   */
  readonly step: () => boolean
  /** The complete result; throws before the build is complete. */
  readonly result: () => RhythmDomainBuildResult
}

/**
 * Intent: build what `makeRhythmCandidateDomain` plus a full drain of its first replay produce, in
 * steps of at most one gesture unit, over the same derivation: the fast pass, then, if it found
 * nothing, the exact re-run (also stepped per gesture unit) that reports the complete code set. A
 * setting with G gestures completes in G + 1 steps, or 2 (G + 1) when it has no plan.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function createRhythmDomainBuilder(input: RhythmExpansionInput): RhythmDomainBuilder {
  const normalized = normalizeInput(input)
  const observed = new Set<RhythmValidationCode>()
  const found: RhythmCandidate[] = []
  let exact = false
  let units = candidateUnits(normalized, observed, exact)
  let complete: RhythmDomainBuildResult | undefined

  function step(): boolean {
    if (complete) return true
    for (let next = units.next(); next.done !== true; next = units.next()) {
      if (next.value === GESTURE_END) return false
      found.push(next.value)
    }
    if (found.length === 0 && !exact) {
      exact = true
      units = candidateUnits(normalized, observed, exact)
      return false
    }
    complete =
      found.length === 0
        ? noLegalRhythmPlan(normalized, observed)
        : { kind: 'rhythm_candidate_list', input: normalized, candidates: found }
    return true
  }

  function result(): RhythmDomainBuildResult {
    if (!complete) throw new Error('The rhythm domain build is not complete.')
    return complete
  }

  return { step, result }
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
