import type {
  ArpeggioChaos,
  Collection,
  Contour,
  Leapiness,
  MusicalProfile,
  PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type { ConcertPitch } from '../events/concert-pitch'
import type { PhraseEndingDebtAllowance } from '../generation/carry-in/phrase-ending-debt'
import type { GenerationRequest } from '../generation/generation-request'
import type { HarmonyCandidate, TensionFigureKind } from '../harmony/harmony-types'
import type { RhythmCandidate } from '../rhythm/rhythm-types'
import type { MusicalProfileCapabilities } from '../controls/profile-selection'
import type { ContourPlan, ContourState } from './pitch-contour'
import type { FigureState } from './pitch-figures'
import type { MotionLimits, MotionState } from './pitch-motion'

// @spec-link [[entity_pitch_candidate_domain]]
export type PitchSearchPolicyVersion = 'pitch-search-v1'
// @spec-link [[entity_pitch_candidate_domain]]
export type PitchRole =
  | 'chord_tone'
  | 'passing_or_neighbor'
  | 'appoggiatura'
  | 'diatonic_approach_one'
  | 'diatonic_approach_two'
  | 'chromatic_approach'
  | 'chromatic_enclosure_upper'
  | 'chromatic_enclosure_lower'

/** Every figure a reservation can realize: the bound tension kinds plus the Jazz ornaments. */
// @spec-link [[entity_pitch_candidate_domain]]
export type PitchFigureKind = TensionFigureKind | 'chromatic_approach' | 'chromatic_enclosure'

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchPolicy {
  readonly version: PitchSearchPolicyVersion
  readonly profile: MusicalProfile
  readonly collection: Collection
  readonly tonalCenter: PitchClass
  readonly contour: Contour
  readonly leapiness: Leapiness
  readonly arpeggioChaos: ArpeggioChaos
  readonly searchFuel: number
  // @spec-link [[module_musical_profile_capabilities]]
  readonly capabilities: MusicalProfileCapabilities
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface ConcreteTensionBinding {
  readonly identity: string
  readonly bindingIndex: number
  readonly figureKind?: TensionFigureKind
  readonly attackIndices: readonly number[]
  readonly targetAttackIndex?: number
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface TensionBindingDomain {
  readonly kind: 'tension_binding_domain'
  readonly harmonyIdentity: string
  readonly rhythmIdentity: string
  readonly bindings: readonly ConcreteTensionBinding[]
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface NoLegalTensionBinding {
  readonly kind: 'no_legal_tension_binding'
  readonly harmonyIdentity: string
  readonly rhythmIdentity: string
  readonly requiredFigureCount: 1
}

// @spec-link [[entity_pitch_candidate_domain]]
export type TensionBindingResult = TensionBindingDomain | NoLegalTensionBinding

// @spec-link [[entity_pitch_candidate_domain]]
export interface BoundPitchPlannerInput {
  readonly kind: 'bound_pitch_planner_input'
  readonly request: GenerationRequest
  readonly policy: PitchPolicy
  readonly harmony: HarmonyCandidate
  readonly rhythm: RhythmCandidate
  readonly tensionBinding: ConcreteTensionBinding
  readonly searchPolicyVersion: PitchSearchPolicyVersion
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchAttack {
  readonly attackIndex: number
  readonly identity: string
  readonly barIndex: 0 | 1 | 2 | 3
  readonly startTick: number
  /** Sounding length including every tie continuation. */
  readonly durationTicks: number
  /** Absolute phrase ticks of the sounding span; `end` includes tie continuations. */
  readonly start: number
  readonly end: number
  readonly chordPitchClasses: readonly number[]
  /** Index of the harmony event sounding at `start`, found by absolute beat. */
  readonly harmonyIndex: number
  readonly harmonyIdentity: string
  readonly isCheckpoint: boolean
  readonly isBeatOne: boolean
  readonly isFirstUnderHarmonyChange: boolean
  readonly isFinal: boolean
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchCandidate {
  readonly identity: string
  readonly role: PitchRole
  readonly midi: ConcertPitch
  readonly pitchClass: number
  readonly octaveIndex: number
  readonly obligationIdentity: string
  readonly enumerationIndex: number
  readonly reservation?: PitchReservation
}

/**
 * A concrete figure path fixed when its first member is chosen: every member MIDI and the target
 * MIDI are part of the reservation, so later members only confirm the path.
 */
// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchReservation {
  readonly identity: string
  /** Present only when this reservation discharges the selected concrete tension binding. */
  readonly bindingIdentity?: string
  readonly figureKind: PitchFigureKind
  readonly attackIndices: readonly number[]
  readonly targetAttackIndex: number
  readonly targetPitchClass: number
  readonly memberPosition: number
  /** Member MIDI values followed by the target MIDI value. */
  readonly path: readonly number[]
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchAssignment {
  readonly attack: PitchAttack
  readonly candidate: PitchCandidate
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchPhrase {
  readonly kind: 'pitch_phrase'
  readonly assignments: readonly PitchAssignment[]
}

/** Immutable facts after the latest sounding attack; the whole key of the dead-state memo. */
// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchSearchState {
  readonly nextAttackIndex: number
  readonly prior?: PitchNoteFacts
  readonly motion: MotionState
  readonly figure: FigureState
  readonly contour: ContourState
}

/** The facts of one chosen sounding pitch that figure rules read. */
// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchNoteFacts {
  readonly midi: number
  readonly chordTone: boolean
  readonly inCollection: boolean
}

// @spec-link [[entity_pitch_candidate_domain]]
export interface PitchSearchContext {
  readonly kind: 'pitch_search_context'
  readonly input: BoundPitchPlannerInput
  readonly attacks: readonly PitchAttack[]
  readonly candidateDomains: readonly (readonly PitchCandidate[])[]
  readonly checkpointAttackIndices: readonly number[]
  readonly checkpointDomains: readonly (readonly ConcertPitch[])[]
  readonly collectionPitchClasses: readonly number[]
  readonly limits: MotionLimits
  readonly contourPlan: ContourPlan
  /**
   * MIDI values allowed on the final attack: open-endpoint chord tones, plus, when the phrase may
   * end owing a resolution, tense scale tones the next phrase's first note can resolve.
   */
  readonly finalMidis: readonly number[]
  /** What the final note may still owe; nothing for a phrase generated without carry-in. */
  readonly endingDebt: PhraseEndingDebtAllowance
  /** The carried pitch, when it is a tense note that the first attack must resolve. */
  readonly carriedTenseMidi?: number
}

// @spec-link [[entity_pitch_candidate_domain]]
export type PitchAdvanceResult =
  | { readonly kind: 'rejected'; readonly reason: string }
  | {
      readonly kind: 'accepted'
      readonly nextState: PitchSearchState
      readonly rankingFacts: readonly number[]
    }

// @spec-link [[entity_pitch_candidate_domain]]
export type PitchPlanResult =
  | { readonly kind: 'pitch_plan'; readonly phrase: PitchPhrase; readonly fuelUsed: number }
  | { readonly kind: 'no_legal_pitch_plan'; readonly fuelUsed: number }
  | { readonly kind: 'search_limit_exceeded'; readonly fuelUsed: number }

// @spec-link [[entity_pitch_candidate_domain]]
export class PitchPlannerInputError extends Error {
  readonly kind = 'PitchPlannerInputError' as const
  constructor(message: string) {
    super(message)
    this.name = 'PitchPlannerInputError'
  }
}

/**
 * Validate and freeze the pitch planner's input, stamping its kind and the search policy version,
 * so the planner only ever runs with a positive whole search fuel and a policy it implements.
 * Throws PitchPlannerInputError otherwise.
 */
// @spec-link [[entity_pitch_candidate_domain]]
export function makeBoundPitchPlannerInput(
  input: Omit<BoundPitchPlannerInput, 'kind' | 'searchPolicyVersion'>,
): BoundPitchPlannerInput {
  if (input.policy.searchFuel < 1 || !Number.isInteger(input.policy.searchFuel)) {
    throw new PitchPlannerInputError('Pitch search fuel must be a positive integer.')
  }
  if (input.policy.version !== 'pitch-search-v1')
    throw new PitchPlannerInputError('Unsupported pitch search policy.')
  return deepFreeze({
    ...input,
    kind: 'bound_pitch_planner_input' as const,
    searchPolicyVersion: input.policy.version,
  })
}
