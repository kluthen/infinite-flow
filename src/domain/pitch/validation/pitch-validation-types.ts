import type { GenerationRequest } from '../../generation/generation-request'
import type { HarmonyCandidate, HarmonyEvent } from '../../harmony/harmony-types'
import type { RhythmCandidate } from '../../rhythm/rhythm-types'
import type { ConcreteTensionBinding, PitchPolicy } from '../pitch-types'

/**
 * The only bound-input facts the validator may read. Planner state, candidate roles, reservations,
 * ranking facts, seeds, and diagnostics are deliberately absent so they cannot influence the verdict.
 * A full BoundPitchPlannerInput satisfies this shape.
 */
// @spec-link [[module_pitch_domain_validation]]
export interface PitchValidationContext {
  readonly request: Pick<GenerationRequest, 'activeConcertRange' | 'registerWindow' | 'carryIn'>
  readonly policy: Pick<
    PitchPolicy,
    'collection' | 'tonalCenter' | 'contour' | 'leapiness' | 'figureLevels'
  >
  readonly harmony: Pick<
    HarmonyCandidate,
    'identity' | 'events' | 'endpoint' | 'tensionRequirement'
  >
  readonly rhythm: Pick<RhythmCandidate, 'bars'>
  readonly tensionBinding: ConcreteTensionBinding
}

/** Stable validation failure codes, listed in their canonical reporting order. */
// @spec-link [[module_pitch_domain_validation]]
export const PITCH_VALIDATION_CODES = [
  'attack_count_mismatch',
  'invalid_midi',
  'outside_active_range',
  'outside_register_window',
  'out_of_collection',
  'unexplained_non_chord_tone',
  'invalid_chromatic_ornament',
  'tension_binding_invalid',
  'tension_figure_invalid',
  'carried_tension_unresolved',
  'interval_cap_exceeded',
  'leap_budget_exceeded',
  'large_leap_budget_exceeded',
  'unrecovered_large_leap',
  'unrecognized_wide_chain',
  'wide_chain_too_long',
  'arpeggio_run_budget_exceeded',
  'missing_contour_checkpoint',
  'contour_violation',
  'open_endpoint_violation',
] as const

export type PitchValidationCode = (typeof PITCH_VALIDATION_CODES)[number]

// @spec-link [[module_pitch_domain_validation]]
export interface PitchValidationFailure {
  readonly code: PitchValidationCode
  /** Sounding-attack index the failure is anchored to; absent for whole-phrase facts. */
  readonly attackIndex?: number
}

/** One sounding attack with every musical fact the rules need, derived only from source values. */
// @spec-link [[module_pitch_domain_validation]]
export interface SoundingFact {
  readonly index: number
  readonly barIndex: 0 | 1 | 2 | 3
  readonly startTick: number
  readonly durationTicks: number
  /** Absolute phrase tick of the onset and of the end of the whole tied sounding event. */
  readonly start: number
  readonly end: number
  readonly midi: number
  readonly pitchClass: number
  readonly harmony: HarmonyEvent
  readonly chordTone: boolean
  readonly inCollection: boolean
  readonly strongOnset: boolean
}

// @spec-link [[module_pitch_domain_validation]]
export interface PhraseFacts {
  readonly context: PitchValidationContext
  readonly attacks: readonly SoundingFact[]
  readonly collectionPitchClasses: readonly number[]
}

// @spec-link [[module_pitch_domain_validation]]
export type PitchValidationResult<T> =
  | { readonly kind: 'valid_pitch_phrase'; readonly candidate: T }
  | { readonly kind: 'invalid_pitch_phrase'; readonly failures: readonly PitchValidationFailure[] }
