import type {
  NoteDensity,
  SilenceDensity,
  Syncopation,
  TensionArc,
} from '../controls/generation-controls'

export type RhythmGrammarVersion = 'rhythm-mvp-v1'
export type RhythmEventKind = 'note' | 'rest'
export type BarIndex = 0 | 1 | 2 | 3
export type GestureBarIndex = 0 | 1
export type V1BarForm = 'xxxx' | 'xxxy' | 'xxyy' | 'xyxy' | 'xyyx'
export type RhythmTransformCase =
  | 'note_to_note'
  | 'interior_rest'
  | 'redistribute_note_pair'
  | 'swap_final_pattern'
  | 'tied_sustain'
export type RhythmRole = 'answer' | 'syncopation'

// @spec-link [[entity_rhythm_candidate_domain]]
export interface RhythmExpansionInput {
  readonly grammarVersion?: RhythmGrammarVersion
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
}

export interface NormalizedRhythmExpansionInput {
  readonly grammarVersion: RhythmGrammarVersion
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
  readonly tensionArc: TensionArc
}

export interface NominalCell {
  readonly kind: RhythmEventKind
  readonly durationTicks: number
  /** Immutable coordinates in the version-owned source-cell lattice. */
  readonly address: NominalCellAddress
  readonly catalog: NominalCellCatalogProvenance
}
export interface NominalCellAddress {
  readonly grammarVersion: RhythmGrammarVersion
  readonly barIndex: BarIndex
  readonly beatIndex: number
  readonly cellIndex: number
}
export interface NominalCellCatalogProvenance {
  readonly grammarVersion: RhythmGrammarVersion
  readonly density: NoteDensity
  readonly catalogIndex: number
}
export interface BarFormProvenance {
  readonly grammarVersion: RhythmGrammarVersion
  readonly form: V1BarForm
  readonly catalogIndices: readonly [number] | readonly [number, number]
}
export interface RhythmEvent {
  readonly kind: RhythmEventKind
  readonly startTick: number
  readonly durationTicks: number
  readonly nominalDurationTicks: number
  readonly sourceCells: readonly NominalCell[]
  readonly tieChainId?: string
  readonly tieContinuation?: boolean
}
export interface RhythmBar {
  readonly barIndex: BarIndex
  readonly events: readonly RhythmEvent[]
}
export interface ExactRecurrenceWitness {
  readonly kind: 'exact' | 'substitute'
  readonly grammarVersion: RhythmGrammarVersion
  readonly sourceBar: 0
  readonly sourceBeat: number
  readonly sourceCellAddresses: readonly NominalCellAddress[]
  readonly targetBar: 1
  readonly targetBeat: number
}
export interface ExactRecurrence extends ExactRecurrenceWitness {
  readonly kind: 'exact'
}
export interface SubstituteRecurrence extends ExactRecurrenceWitness {
  readonly kind: 'substitute'
  readonly substitution: {
    readonly targetCellOffset: number
    readonly before: NominalTerminal
    readonly after: NominalTerminal
  }
}
export type NominalTerminal = Readonly<Pick<NominalCell, 'kind' | 'durationTicks'>>
export type RecurrenceWitness = ExactRecurrence | SubstituteRecurrence
export interface NoMergePlan {
  readonly kind: 'none'
}
export interface SingleMergePlan {
  readonly kind: 'merge'
  readonly left: NominalCellAddress
  readonly right: NominalCellAddress
}
export type GestureMergePlan = NoMergePlan | SingleMergePlan
export interface RhythmSkeletonInput {
  readonly grammarVersion: RhythmGrammarVersion
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
}
/** A transform-free bars 1-2 grammar result, ready for answer/syncopation slices. */
export interface GestureDerivation {
  readonly grammarVersion: RhythmGrammarVersion
  readonly input: RhythmSkeletonInput
  readonly provenance: BarFormProvenance
  readonly bars: readonly [RhythmBar, RhythmBar]
  readonly recurrence: RecurrenceWitness
  readonly merge: GestureMergePlan
}
interface TransformDescriptorBase {
  readonly grammarVersion: RhythmGrammarVersion
  readonly barIndex: 0 | 1 | 2 | 3
  readonly boundaryTick: number
  readonly delta: number
  readonly transformedBoundaries: readonly number[]
  readonly roles: readonly RhythmRole[]
}
export interface BoundaryTransformDescriptor<
  TCase extends 'note_to_note' | 'redistribute_note_pair',
> extends TransformDescriptorBase {
  readonly case: TCase
  /** Source cells adjacent to the recorded pre-transform boundary, in time order. */
  readonly affectedAddresses: readonly [NominalCellAddress, NominalCellAddress]
}
export interface InteriorRestTransformDescriptor extends TransformDescriptorBase {
  readonly case: 'interior_rest'
  /** Every source cell whose timing changes in the note-rest-note translation. */
  readonly affectedAddresses: readonly [NominalCellAddress, NominalCellAddress, NominalCellAddress]
}
export interface FinalPatternSwapDescriptor extends TransformDescriptorBase {
  readonly case: 'swap_final_pattern'
  readonly sourceAddresses: readonly [NominalCellAddress, NominalCellAddress]
  readonly affectedAddresses: readonly [NominalCellAddress, NominalCellAddress]
}
export interface TiedSustainDescriptor extends TransformDescriptorBase {
  readonly case: 'tied_sustain'
  readonly sourceSpan: readonly [NominalCellAddress, NominalCellAddress]
  readonly affectedAddresses: readonly [NominalCellAddress, NominalCellAddress]
  readonly strongTick: 4 | 8 | 12
  readonly tieChainId: string
}
/** Versioned, identity-bearing transform data. Cases cannot omit their source coordinates. */
export type RhythmTransformDescriptor =
  | BoundaryTransformDescriptor<'note_to_note'>
  | InteriorRestTransformDescriptor
  | BoundaryTransformDescriptor<'redistribute_note_pair'>
  | FinalPatternSwapDescriptor
  | TiedSustainDescriptor
/** A transform-stage value, deliberately distinct from a final rhythm candidate. */
export interface RhythmTransformSet {
  readonly grammarVersion: RhythmGrammarVersion
  readonly descriptors: readonly RhythmTransformDescriptor[]
}
export interface UnindexedRhythmCandidate {
  readonly grammarVersion: RhythmGrammarVersion
  readonly input: NormalizedRhythmExpansionInput
  readonly bars: readonly RhythmBar[]
  readonly recurrence: RecurrenceWitness
  readonly transforms: readonly RhythmTransformDescriptor[]
}
export interface RhythmCandidate extends UnindexedRhythmCandidate {
  readonly candidateIndex: number
  readonly identity: string
}
export interface RhythmCandidateDomain {
  readonly kind: 'rhythm_candidate_domain'
  readonly grammarVersion: RhythmGrammarVersion
  readonly input: NormalizedRhythmExpansionInput
  readonly candidates: () => IterableIterator<RhythmCandidate>
}
export type RhythmValidationCode =
  | 'invalid_measure_count'
  | 'invalid_measure_tiling'
  | 'invalid_phrase_duration'
  | 'non_positive_duration'
  | 'invalid_nominal_provenance'
  | 'density_attack_band_violation'
  | 'mixed_duration_class_coverage_violation'
  | 'silence_budget_violation'
  | 'silence_shape_violation'
  | 'all_rest_measure'
  | 'rest_duration_limit_violation'
  | 'syncopation_count_violation'
  | 'syncopation_type_violation'
  | 'transform_algebra_violation'
  | 'transform_overlap_violation'
  | 'attack_count_changed'
  | 'rest_total_changed'
  | 'metrical_anchor_missing'
  | 'first_note_off_downbeat'
  | 'active_anchor_ratio_violation'
  | 'invalid_tie_chain'
  | 'recurrence_witness_invalid'
  | 'answer_transform_count_violation'
  | 'answer_similarity_violation'
  | 'answer_variation_missing'
  | 'transform_order_violation'
  | 'candidate_identity_mismatch'
  | 'candidate_identity_duplicate'
  | 'candidate_index_invalid'
  | 'domain_replay_mismatch'
export interface NoLegalRhythmPlan {
  readonly kind: 'no_legal_rhythm_plan'
  readonly input: NormalizedRhythmExpansionInput
  readonly codes: readonly RhythmValidationCode[]
}
export type RhythmPlanResult = RhythmCandidateDomain | NoLegalRhythmPlan
