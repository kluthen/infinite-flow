import { deepFreeze } from '../events/deep-freeze'
import {
  type Contour,
  type GenerationControls,
  type HarmonicMotion,
  type MusicalProfile,
  type NoteDensity,
  type RhythmicVariety,
  type SilenceDensity,
  type Syncopation,
  makeGenerationControls,
} from './generation-controls'
import type { RegisterChoice } from '../profile/register-intent'

export interface ProfileControlledValues {
  readonly harmonicMotion: HarmonicMotion
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly syncopation: Syncopation
  readonly silenceDensity: SilenceDensity
  readonly contour: Contour
  readonly register: RegisterChoice
}

export interface ProfileSelection {
  readonly musicalProfile: MusicalProfile
  readonly isCustom: boolean
}

/** Named capabilities a musical profile declares as data, read by planner and validator checks. */
export interface MusicalProfileCapabilities {
  readonly allowsChromaticApproach: boolean
}

/**
 * Each musical profile's declared capabilities. Adding a profile or capability means adding a data
 * entry here; no planner or validator code should compare a profile's name instead.
 */
// @spec-link [[module_musical_profile_capabilities]]
export const MUSICAL_PROFILE_CAPABILITIES: Readonly<
  Record<MusicalProfile, MusicalProfileCapabilities>
> = deepFreeze({
  Neutral: { allowsChromaticApproach: false },
  Jazz: { allowsChromaticApproach: true },
})

/** Complete, immutable bundles; callers receive replacement values and cannot mutate a preset. */
// @spec-link [[module_generative_profile_selection]]
export const PROFILE_BUNDLES: Readonly<Record<MusicalProfile, ProfileControlledValues>> =
  deepFreeze({
    Neutral: {
      harmonicMotion: 'Gentle diatonic',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
    },
    Jazz: {
      harmonicMotion: 'Gentle diatonic',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Wandering',
      register: 'Varying',
    },
  })

/** Apply or reselect a profile by replacing every controlled value, never merging with custom data. */
// @spec-link [[module_generative_profile_selection]]
export function applyMusicalProfile(
  controls: GenerationControls,
  musicalProfile: MusicalProfile,
): readonly [GenerationControls, ProfileSelection] {
  return deepFreeze([
    makeGenerationControls({ ...controls, ...PROFILE_BUNDLES[musicalProfile] }),
    { musicalProfile, isCustom: false },
  ])
}

/** First-load defaults: Neutral bundle plus C Ionian, 90 BPM, Lift, Shaped, B-flat tenor, Varied. */
// @spec-link [[module_generation_control_catalog]]
export const DEFAULT_GENERATION_CONTROLS: GenerationControls = makeGenerationControls({
  tempo: 90,
  tonalCenter: 'C',
  collection: 'Ionian',
  tension: 'Lift',
  leapiness: 'Shaped',
  arpeggioChaos: 'Varied',
  instrumentProfileId: 'bb-tenor',
  ...PROFILE_BUNDLES.Neutral,
})

export const DEFAULT_PROFILE_SELECTION: ProfileSelection = deepFreeze({
  musicalProfile: 'Neutral',
  isCustom: false,
})

/** A manual preset-controlled edit preserves grammar identity but marks only the current values custom. */
// @spec-link [[module_profile_control_customization]]
// @spec-link [[rule_profile_control_customization]]
export function applyControlledCustomValue<K extends keyof ProfileControlledValues>(
  controls: GenerationControls,
  selection: ProfileSelection,
  key: K,
  value: ProfileControlledValues[K],
): readonly [GenerationControls, ProfileSelection] {
  return deepFreeze([
    makeGenerationControls({ ...controls, [key]: value }),
    { musicalProfile: selection.musicalProfile, isCustom: true },
  ])
}

/** A non-profile-controlled edit keeps the current profile/custom transition unchanged. */
// @spec-link [[module_profile_control_customization]]
export function applyNonProfileControlValue<
  K extends Exclude<keyof GenerationControls, keyof ProfileControlledValues>,
>(
  controls: GenerationControls,
  selection: ProfileSelection,
  key: K,
  value: GenerationControls[K],
): readonly [GenerationControls, ProfileSelection] {
  return deepFreeze([makeGenerationControls({ ...controls, [key]: value }), selection])
}
