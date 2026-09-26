import { deepFreeze } from '../events/deep-freeze'
import {
  ADOPTED_INSTRUMENT_PROFILE_IDS,
  type InstrumentProfileId,
} from '../profile/instrument-profiles'
import type { RegisterChoice } from '../profile/register-intent'

export const TEMPO_VALUES = deepFreeze(Array.from({ length: 19 }, (_, index) => 60 + index * 10))
export const PITCH_CLASSES = deepFreeze([
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const)
export const COLLECTIONS = deepFreeze([
  'Major',
  'Minor',
  'Ionian',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian',
  'Locrian',
] as const)
export const HARMONIC_MOTIONS = deepFreeze([
  'Static',
  'Gentle diatonic',
  'Active diatonic',
] as const)
export const TENSION_ARCS = deepFreeze(['Settled', 'Lift', 'Build', 'Edge'] as const)
export const NOTE_DENSITIES = deepFreeze(['Quarter', 'Eighth', 'Sixteenth'] as const)
export const RHYTHMIC_VARIETIES = deepFreeze([
  'Strict',
  'Slightly varied',
  'Heavily varied',
] as const)
export const SYNCOPATIONS = deepFreeze([
  'Straight',
  'Occasional offbeats',
  'Active displacement',
] as const)
export const SILENCE_DENSITIES = deepFreeze(['Sparse', 'Conversational', 'Breath-heavy'] as const)
export const CONTOURS = deepFreeze(['Rising', 'Falling', 'Arch', 'Wandering'] as const)
export const LEAPINESS_VALUES = deepFreeze(['Smooth', 'Shaped', 'Leaping', 'Angular'] as const)
export const ARPEGGIO_CHAOS_VALUES = deepFreeze(['Predictable', 'Varied', 'Chaotic'] as const)
export const MUSICAL_PROFILES = deepFreeze(['Neutral', 'Jazz'] as const)
/**
 * The catalog of selectable instrument-profile identities, derived from the single declarative
 * profile table (`../profile/instrument-profiles.ts`) rather than hand-maintained here: adding a
 * profile to that table is enough for it to appear as a control option with no parallel edit.
 */
// @spec-link [[entity_instrument_profile]]
export const INSTRUMENT_PROFILE_IDS: readonly InstrumentProfileId[] = ADOPTED_INSTRUMENT_PROFILE_IDS
export const REGISTER_CHOICES = deepFreeze([
  'Low',
  'Middle',
  'High',
  'Varying',
] as const satisfies readonly RegisterChoice[])

export type PitchClass = (typeof PITCH_CLASSES)[number]
export type Collection = (typeof COLLECTIONS)[number]
export type HarmonicMotion = (typeof HARMONIC_MOTIONS)[number]
export type TensionArc = (typeof TENSION_ARCS)[number]
export type NoteDensity = (typeof NOTE_DENSITIES)[number]
export type RhythmicVariety = (typeof RHYTHMIC_VARIETIES)[number]
export type Syncopation = (typeof SYNCOPATIONS)[number]
export type SilenceDensity = (typeof SILENCE_DENSITIES)[number]
export type Contour = (typeof CONTOURS)[number]
export type Leapiness = (typeof LEAPINESS_VALUES)[number]
export type ArpeggioChaos = (typeof ARPEGGIO_CHAOS_VALUES)[number]
export type MusicalProfile = (typeof MUSICAL_PROFILES)[number]

export interface GenerationControls {
  readonly tempo: number
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly harmonicMotion: HarmonicMotion
  readonly tension: TensionArc
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly syncopation: Syncopation
  readonly silenceDensity: SilenceDensity
  readonly contour: Contour
  readonly register: RegisterChoice
  readonly leapiness: Leapiness
  readonly arpeggioChaos: ArpeggioChaos
  readonly instrumentProfileId: InstrumentProfileId
}

// @spec-link [[module_generation_control_catalog]]
export class GenerationControlError extends Error {
  readonly kind = 'GenerationControlError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationControlError'
  }
}

function hasValue<T extends string | number>(catalog: readonly T[], value: unknown): value is T {
  return catalog.includes(value as T)
}

/** Reject invalid BPM values rather than rounding, clamping, or silently applying a default. */
// @spec-link [[module_generation_control_catalog]]
export function normalizeTempo(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || !hasValue(TEMPO_VALUES, value)) {
    throw new GenerationControlError(
      'Tempo must be an integer from 60 through 240 in 10 BPM increments.',
    )
  }
  return value
}

/** Validate one closed catalog value without substituting a fallback value. */
// @spec-link [[module_generation_control_catalog]]
export function validateControlValue<T extends string>(
  catalog: readonly T[],
  value: unknown,
  name: string,
): T {
  if (!hasValue(catalog, value)) {
    throw new GenerationControlError(`${name} has an unsupported value ${JSON.stringify(value)}.`)
  }
  return value
}

/** Construct the normalized, immutable control policy consumed at the generation boundary. */
// @spec-link [[module_generation_control_catalog]]
export function makeGenerationControls(input: GenerationControls): GenerationControls {
  return deepFreeze({
    tempo: normalizeTempo(input.tempo),
    tonalCenter: validateControlValue(PITCH_CLASSES, input.tonalCenter, 'Written tonal center'),
    collection: validateControlValue(COLLECTIONS, input.collection, 'Collection'),
    harmonicMotion: validateControlValue(HARMONIC_MOTIONS, input.harmonicMotion, 'Harmonic motion'),
    tension: validateControlValue(TENSION_ARCS, input.tension, 'Tension arc'),
    noteDensity: validateControlValue(NOTE_DENSITIES, input.noteDensity, 'Note density'),
    rhythmicVariety: validateControlValue(
      RHYTHMIC_VARIETIES,
      input.rhythmicVariety,
      'Rhythmic variety',
    ),
    syncopation: validateControlValue(SYNCOPATIONS, input.syncopation, 'Syncopation'),
    silenceDensity: validateControlValue(
      SILENCE_DENSITIES,
      input.silenceDensity,
      'Silence density',
    ),
    contour: validateControlValue(CONTOURS, input.contour, 'Contour'),
    register: validateControlValue(REGISTER_CHOICES, input.register, 'Register'),
    leapiness: validateControlValue(LEAPINESS_VALUES, input.leapiness, 'Leapiness'),
    arpeggioChaos: validateControlValue(
      ARPEGGIO_CHAOS_VALUES,
      input.arpeggioChaos,
      'Arpeggio chaos',
    ),
    instrumentProfileId: validateControlValue(
      INSTRUMENT_PROFILE_IDS,
      input.instrumentProfileId,
      'Instrument profile',
    ),
  })
}
