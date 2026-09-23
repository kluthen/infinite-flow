import type {
  Collection,
  HarmonicMotion,
  MusicalProfile,
  PitchClass,
  TensionArc,
} from '../controls/generation-controls'

export type PitchClassNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export type CollectionDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type TriadQuality = 'major' | 'minor' | 'diminished'
export type HarmonyRole =
  'tonic' | 'tonic_prolongation' | 'predominant' | 'open_arrival' | 'modal_color'
export type TensionFigureKind =
  'diatonic_passing_or_neighbor' | 'appoggiatura' | 'two_note_diatonic_approach'

export interface DiatonicTriad {
  readonly degree: CollectionDegree
  readonly pitchClasses: readonly [PitchClassNumber, PitchClassNumber, PitchClassNumber]
  readonly quality: TriadQuality
}

export interface HarmonyCollection {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly pitchClasses: readonly PitchClassNumber[]
  readonly triads: readonly DiatonicTriad[]
}

export interface HarmonyPlannerInput {
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly harmonicMotion: HarmonicMotion
  readonly tensionArc: TensionArc
  readonly profile: MusicalProfile
}

export interface BarRole {
  readonly barIndex: 0 | 1 | 2 | 3
  readonly role: HarmonyRole
  readonly degree: CollectionDegree
}

export interface HarmonyEvent {
  readonly barIndex: 0 | 1 | 2 | 3
  readonly startBeat: 0 | 2
  /** Exact positive even beat count after adjacent identical triads are serialized together. */
  readonly durationBeats: number
  readonly triad: DiatonicTriad
  readonly role: HarmonyRole
  readonly templateId: string
  readonly barRoles: readonly BarRole[]
}

export type HarmonyEndpoint =
  | { readonly kind: 'tonal_degree_five_chord_tone'; readonly degree: 5 }
  | { readonly kind: 'tonal_static_degree_five'; readonly degree: 5 }
  | { readonly kind: 'modal_non_tonic_chord_tone'; readonly degree: 5 }

export interface AbstractTensionRequirement {
  readonly arc: TensionArc
  readonly allowedBars: readonly (0 | 1 | 2)[]
  readonly maximumResolutionDelay: 'next_strong_sounding_onset' | 'next_beat_or_bar'
  readonly permittedFigureKinds: readonly TensionFigureKind[]
  readonly requiredFigureCount: 0 | 1
  readonly maximumFigureCount: 1
  readonly resolutionPreference: 'ordinary' | 'latest_legal_before_final'
  readonly mustResolveBeforeFinalSoundingEvent: true
}

// @spec-link [[module_harmony_candidate_domain]]
export interface HarmonyCandidate {
  readonly candidateIndex: number
  readonly identity: string
  readonly templateId: string
  readonly degreeSequence: readonly CollectionDegree[]
  readonly events: readonly HarmonyEvent[]
  readonly endpoint: HarmonyEndpoint
  readonly tensionRequirement: AbstractTensionRequirement
}

export interface HarmonyCandidateDomain {
  readonly kind: 'harmony_candidate_domain'
  readonly collection: HarmonyCollection
  readonly candidates: readonly HarmonyCandidate[]
}

export interface NoLegalHarmonyPlan {
  readonly kind: 'no_legal_harmony_plan'
  readonly input: HarmonyPlannerInput
}

export type HarmonyPlanResult = HarmonyCandidateDomain | NoLegalHarmonyPlan

// @spec-link [[module_harmony_candidate_domain]]
export class HarmonyPlannerInputError extends Error {
  readonly kind = 'HarmonyPlannerInputError' as const

  constructor(message: string) {
    super(message)
    this.name = 'HarmonyPlannerInputError'
  }
}
