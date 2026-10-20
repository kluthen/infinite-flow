/**
 * v3.0's musical-profile shape and bundles, and the first-load controls. The session no longer
 * holds a musical profile (it holds controls, figure levels and a preset selection); v3.0's shape
 * stays here only for the storage code that reads and upgrades v3.0's data, until data version 3
 * (chunk 16). No profile switch and no customized edit is offered.
 */

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

/** The seven controls a v3.0 musical profile held: the shape of v3.0's stored bundles. */
export interface ProfileControlledValues {
  readonly harmonicMotion: HarmonicMotion
  readonly noteDensity: NoteDensity
  readonly rhythmicVariety: RhythmicVariety
  readonly syncopation: Syncopation
  readonly silenceDensity: SilenceDensity
  readonly contour: Contour
  readonly register: RegisterChoice
}

/** v3.0's musical-profile selection, as its stored settings and kept sessions hold it. */
export interface ProfileSelection {
  readonly musicalProfile: MusicalProfile
  readonly isCustom: boolean
}

/** v3.0's two profile bundles, immutable, as v3.0's stored data was read against them. */
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

/** v3.0's first-load selection, the default its stored settings record falls back to. */
export const DEFAULT_PROFILE_SELECTION: ProfileSelection = deepFreeze({
  musicalProfile: 'Neutral',
  isCustom: false,
})
