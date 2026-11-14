/**
 * Shared inputs of the start-up measurements (M2, M3): realistic player presets, names of up to 40
 * characters, varied controls and levels, a key and mode restriction on some and, when asked, a
 * Seventh chords level cycled through its four values; and the kept-session and player-preset
 * counts a measurement runs on, which an environment variable can narrow for a quick check that
 * the measurement runs, without taking the figures.
 */

/** Two sets of the ten preset-held controls a player preset is cycled through. */
const PRESET_CONTROLS = [
  {
    harmonicMotion: 'Gentle diatonic',
    tension: 'Build',
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    syncopation: 'Occasional offbeats',
    silenceDensity: 'Conversational',
    contour: 'Wandering',
    register: 'Varying',
    leapiness: 'Shaped',
    arpeggioChaos: 'Varied',
  },
  {
    harmonicMotion: 'Gentle diatonic',
    tension: 'Lift',
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    syncopation: 'Straight',
    silenceDensity: 'Sparse',
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Varied',
  },
] as const

/** Three sets of the seven figure levels a player preset is cycled through. */
const PRESET_LEVELS = [
  {
    passingTone: 'asToday',
    accentedPassingTone: 'asToday',
    neighborTone: 'asToday',
    appoggiatura: 'off',
    diatonicEnclosure: 'off',
    chromaticApproach: 'asToday',
    chromaticEnclosure: 'asToday',
  },
  {
    passingTone: 'favored',
    accentedPassingTone: 'stronglyFavored',
    neighborTone: 'off',
    appoggiatura: 'asToday',
    diatonicEnclosure: 'favored',
    chromaticApproach: 'stronglyFavored',
    chromaticEnclosure: 'asToday',
  },
  {
    passingTone: 'asToday',
    accentedPassingTone: 'asToday',
    neighborTone: 'asToday',
    appoggiatura: 'off',
    diatonicEnclosure: 'off',
    chromaticApproach: 'off',
    chromaticEnclosure: 'off',
  },
] as const

/** The Seventh chords levels a player preset is cycled through, when it holds one. */
const PRESET_SEVENTH_CHORDS_LEVELS = ['off', 'sometimes', 'favored', 'stronglyFavored'] as const

/** The restrictions a player preset is cycled through: none, modes only, keys and modes. */
const PRESET_RESTRICTIONS: readonly WorkspaceHarnessPresetInput['restriction'][] = [
  { keys: 'any', modes: 'any' },
  { keys: 'any', modes: ['Ionian', 'Dorian'] },
  { keys: ['F', 'A#', 'D#', 'C'], modes: ['Mixolydian', 'Dorian', 'Aeolian'] },
]

/** The name stems a player preset is cycled through; numbered 10 to 60, the longest has 40 characters. */
const PRESET_NAME_STEMS = [
  'Late night',
  'Early morning long tones, slow scales',
  'Dorian warm-up before the gig',
  'Bebop lines over a medium swing',
] as const

/** The longest name a preset may have. */
const PRESET_NAME_MAX_LENGTH = 40

/**
 * Intent: player preset `index` (from 0): `player-{index + 1}`, a numbered name of at most 40
 * characters, its controls, levels and restriction cycled, so some carry a restriction; with
 * `withLevel`, its Seventh chords level cycled too, without it none given (as v3.2 stored them).
 */
export function timingPlayerPreset(index: number, withLevel: boolean): WorkspaceHarnessPresetInput {
  const name = `${PRESET_NAME_STEMS[index % PRESET_NAME_STEMS.length]!} ${index + 1}`
  if (name.length > PRESET_NAME_MAX_LENGTH) throw new Error(`the preset name "${name}" is too long`)
  const level = PRESET_SEVENTH_CHORDS_LEVELS[index % PRESET_SEVENTH_CHORDS_LEVELS.length]!
  return {
    id: `player-${index + 1}`,
    name,
    controls: PRESET_CONTROLS[index % PRESET_CONTROLS.length]!,
    levels: PRESET_LEVELS[index % PRESET_LEVELS.length]!,
    ...(withLevel ? { chordFamilies: { 'seventh-chords': level } } : {}),
    restriction: PRESET_RESTRICTIONS[index % PRESET_RESTRICTIONS.length]!,
    kind: 'player',
  }
}

/**
 * Intent: the counts a measurement runs on: `fallback`, or the comma-separated whole numbers of
 * the environment variable `name` when it is set (`MEASURE_SESSION_COUNTS=10` runs 10 kept
 * sessions only), for a quick check that the measurement runs. Anything else in it throws.
 */
export function measuredCounts(name: string, fallback: readonly number[]): readonly number[] {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  const counts = value.split(',').map((part) => Number(part.trim()))
  if (counts.some((count) => !Number.isInteger(count) || count < 0)) {
    throw new Error(`${name}=${value} is not a list of whole numbers`)
  }
  return counts
}
