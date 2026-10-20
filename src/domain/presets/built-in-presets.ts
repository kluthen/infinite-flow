/**
 * The eight built-in presets (master spec B6.5), known by fixed ids that never change, and the
 * selection at first load. Values are written out literally. Pure data and functions: no storage,
 * interface, clock or random source.
 */

import { deepFreeze } from '../events/deep-freeze'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '../figures/figure-levels'
import { ANY_KEY_AND_MODE } from './key-and-mode-restriction'
import { makePreset, PresetModelError, type Preset, type PresetSelection } from './preset-selection'

/** Intent: the built-ins' fixed ids, in order; a later rename of a built-in keeps its id. */
// @spec-link [[module_preset_model]]
// @spec-link [[req_presets]]
export const BUILT_IN_PRESET_IDS = deepFreeze([
  'neutral',
  'jazz',
  'gentle',
  'speed-drill',
  'reel',
  'bebop',
  'pop-song',
  'modal-dorian',
] as const)

/** Intent: one built-in preset's fixed id. */
// @spec-link [[module_preset_model]]
export type BuiltInPresetId = (typeof BUILT_IN_PRESET_IDS)[number]

/**
 * Intent: the eight built-in presets in id order, each holding exactly its B6.5 values: the ten
 * controls, the seven figure levels and the restriction ("any" except Reel, Bebop, Pop song and
 * Modal (Dorian), which restrict the modes only).
 */
// @spec-link [[rule_built_in_preset_values]]
// @spec-link [[rule_preset_contents]]
// @spec-link [[rule_profile_presets_apply_defined_controls]]
export const BUILT_IN_PRESETS: readonly Preset[] = deepFreeze([
  makePreset({
    id: 'neutral',
    name: 'Neutral',
    controls: {
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
    levels: NEUTRAL_FIGURE_LEVELS,
    restriction: ANY_KEY_AND_MODE,
    kind: 'builtIn',
  }),
  makePreset({
    id: 'jazz',
    name: 'Jazz',
    controls: {
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Wandering',
      register: 'Varying',
      leapiness: 'Shaped',
      arpeggioChaos: 'Varied',
    },
    levels: JAZZ_FIGURE_LEVELS,
    restriction: ANY_KEY_AND_MODE,
    kind: 'builtIn',
  }),
  makePreset({
    id: 'gentle',
    name: 'Gentle',
    controls: {
      harmonicMotion: 'Static',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Smooth',
      arpeggioChaos: 'Predictable',
    },
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'off',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: ANY_KEY_AND_MODE,
    kind: 'builtIn',
  }),
  makePreset({
    id: 'speed-drill',
    name: 'Speed drill',
    controls: {
      harmonicMotion: 'Active diatonic',
      tension: 'Lift',
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Sparse',
      contour: 'Wandering',
      register: 'Varying',
      leapiness: 'Leaping',
      arpeggioChaos: 'Chaotic',
    },
    levels: {
      passingTone: 'favored',
      accentedPassingTone: 'favored',
      neighborTone: 'favored',
      appoggiatura: 'favored',
      diatonicEnclosure: 'favored',
      chromaticApproach: 'favored',
      chromaticEnclosure: 'asToday',
    },
    restriction: ANY_KEY_AND_MODE,
    kind: 'builtIn',
  }),
  makePreset({
    id: 'reel',
    name: 'Reel',
    controls: {
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Strict',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Varied',
    },
    levels: {
      passingTone: 'favored',
      accentedPassingTone: 'asToday',
      neighborTone: 'favored',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: { keys: 'any', modes: ['Mixolydian', 'Dorian'] },
    kind: 'builtIn',
  }),
  makePreset({
    id: 'bebop',
    name: 'Bebop',
    controls: {
      harmonicMotion: 'Active diatonic',
      tension: 'Build',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Strict',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Sparse',
      contour: 'Wandering',
      register: 'Varying',
      leapiness: 'Leaping',
      arpeggioChaos: 'Varied',
    },
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'favored',
      chromaticApproach: 'stronglyFavored',
      chromaticEnclosure: 'stronglyFavored',
    },
    restriction: { keys: 'any', modes: ['Major'] },
    kind: 'builtIn',
  }),
  makePreset({
    id: 'pop-song',
    name: 'Pop song',
    controls: {
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Heavily varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Arch',
      register: 'Middle',
      leapiness: 'Shaped',
      arpeggioChaos: 'Varied',
    },
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'favored',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: { keys: 'any', modes: ['Major'] },
    kind: 'builtIn',
  }),
  makePreset({
    id: 'modal-dorian',
    name: 'Modal (Dorian)',
    controls: {
      harmonicMotion: 'Gentle diatonic',
      tension: 'Lift',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Occasional offbeats',
      silenceDensity: 'Conversational',
      contour: 'Wandering',
      register: 'Varying',
      leapiness: 'Leaping',
      arpeggioChaos: 'Varied',
    },
    levels: {
      passingTone: 'favored',
      accentedPassingTone: 'asToday',
      neighborTone: 'favored',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: { keys: 'any', modes: ['Dorian'] },
    kind: 'builtIn',
  }),
])

/** Intent: whether a value is one of the eight built-in ids. */
// @spec-link [[module_preset_model]]
export function isBuiltInPresetId(value: unknown): value is BuiltInPresetId {
  return BUILT_IN_PRESET_IDS.some((id) => id === value)
}

/** Intent: the built-in preset with a fixed id. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_built_in_preset_values]]
export function builtInPreset(id: BuiltInPresetId): Preset {
  const preset = BUILT_IN_PRESETS.find((candidate) => candidate.id === id)
  if (preset === undefined) throw new PresetModelError(`No built-in preset has the id "${id}".`)
  return preset
}

/** Intent: the selection at first load: Neutral, whose "any" restriction never moves C Ionian. */
// @spec-link [[req_presets]]
export const DEFAULT_PRESET_SELECTION: PresetSelection = deepFreeze({
  kind: 'preset',
  presetId: 'neutral',
})
