/**
 * The seed matrix with carry-in, shared by every property test that runs session chains over it:
 * every instrument profile x register choice x four representative control sets x two seeds, in
 * a fixed order. It only lists the cells; each spec decides what to run and assert on them.
 */

import type { GenerationControls, MusicalProfile } from '@/domain/controls/generation-controls'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { RegisterChoice } from '@/domain/profile/register-intent'

/** One representative control set of the seed matrix. */
export interface ControlSet {
  readonly name: string
  readonly musicalProfile: MusicalProfile
  readonly controls: Omit<GenerationControls, 'register' | 'instrumentProfileId'>
}

export const CONTROL_SETS: readonly ControlSet[] = [
  {
    name: 'A (Neutral, C Major, gentle, settled, shaped)',
    musicalProfile: 'Neutral',
    controls: {
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
    },
  },
  {
    name: 'B (Jazz, F Dorian, active, build, leaping)',
    musicalProfile: 'Jazz',
    controls: {
      tempo: 90,
      tonalCenter: 'F',
      collection: 'Dorian',
      harmonicMotion: 'Active diatonic',
      tension: 'Build',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Rising',
      leapiness: 'Leaping',
      arpeggioChaos: 'Varied',
    },
  },
  {
    name: 'C (Neutral, A Aeolian, static, lift, angular)',
    musicalProfile: 'Neutral',
    controls: {
      tempo: 90,
      tonalCenter: 'A',
      collection: 'Aeolian',
      harmonicMotion: 'Static',
      tension: 'Lift',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Breath-heavy',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Chaotic',
    },
  },
  {
    // Varied leaves chord-tone order to the seed, so leap budget often remains for a large leap
    // into the final note: this set is where phrases most often end owing a recovery.
    name: 'D (Neutral, D Major, gentle, lift, angular, varied)',
    musicalProfile: 'Neutral',
    controls: {
      tempo: 90,
      tonalCenter: 'D',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Conversational',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Varied',
    },
  },
]

export const INSTRUMENT_PROFILE_IDS: readonly InstrumentProfileId[] = [
  'c-keyboard',
  'bb-tenor',
  'eb-alto',
]
export const REGISTER_CHOICES: readonly RegisterChoice[] = ['Low', 'Middle', 'High', 'Varying']
export const SEEDS: readonly number[] = [7, 13]

/** One matrix cell before it is run. */
export interface MatrixCell {
  readonly instrumentProfileId: InstrumentProfileId
  readonly register: RegisterChoice
  readonly set: ControlSet
  readonly seed: number
  readonly label: string
}

/** Intent: the full profile x register x control-set x seed matrix, in a fixed order. */
export function buildMatrix(): readonly MatrixCell[] {
  const cells: MatrixCell[] = []
  for (const instrumentProfileId of INSTRUMENT_PROFILE_IDS)
    for (const register of REGISTER_CHOICES)
      for (const set of CONTROL_SETS)
        for (const seed of SEEDS)
          cells.push({
            instrumentProfileId,
            register,
            set,
            seed,
            label: `${instrumentProfileId} / ${register} / ${set.name} / seed ${seed}`,
          })
  return cells
}
