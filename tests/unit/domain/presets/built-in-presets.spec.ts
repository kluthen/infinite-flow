// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  isRhythmSettingBlocked,
  isUnsupportedRhythmSetting,
} from '@/domain/controls/unsupported-rhythm-settings'
import {
  BUILT_IN_PRESET_IDS,
  BUILT_IN_PRESETS,
  builtInPreset,
  DEFAULT_PRESET_SELECTION,
  isBuiltInPresetId,
} from '@/domain/presets/built-in-presets'
import { FIGURE_IDS } from '@/domain/figures/figure-levels'
import { PRESET_HELD_CONTROL_KEYS } from '@/domain/presets/preset-selection'

/**
 * Master spec B6.5's table, written out by hand (never read from the module under test): one row
 * per built-in, in the spec's order.
 */
const EXPECTED_BUILT_INS = [
  {
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
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    },
    restriction: { keys: 'any', modes: 'any' },
    kind: 'builtIn',
  },
  {
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
    levels: {
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'asToday',
      chromaticEnclosure: 'asToday',
    },
    restriction: { keys: 'any', modes: 'any' },
    kind: 'builtIn',
  },
  {
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
    restriction: { keys: 'any', modes: 'any' },
    kind: 'builtIn',
  },
  {
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
    restriction: { keys: 'any', modes: 'any' },
    kind: 'builtIn',
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
] as const

// @test-link [[module_preset_model]]
// @test-link [[rule_built_in_preset_values]]
// @test-link [[rule_preset_contents]]
describe('the eight built-in presets', () => {
  it('are known by the eight fixed ids, in order, frozen', () => {
    expect(BUILT_IN_PRESET_IDS).toEqual([
      'neutral',
      'jazz',
      'gentle',
      'speed-drill',
      'reel',
      'bebop',
      'pop-song',
      'modal-dorian',
    ])
    expect(BUILT_IN_PRESETS.map((preset) => preset.id)).toEqual([...BUILT_IN_PRESET_IDS])
    expect(Object.isFrozen(BUILT_IN_PRESET_IDS)).toBe(true)
    expect(Object.isFrozen(BUILT_IN_PRESETS)).toBe(true)
  })

  it.each(EXPECTED_BUILT_INS)('$name holds exactly the B6.5 values', (expected) => {
    const preset = builtInPreset(expected.id)
    expect(preset).toStrictEqual(expected)
    expect(Object.keys(preset.controls)).toEqual([...PRESET_HELD_CONTROL_KEYS])
    expect(Object.keys(preset.levels)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(preset)).toBe(true)
    expect(Object.isFrozen(preset.controls)).toBe(true)
    expect(Object.isFrozen(preset.levels)).toBe(true)
    expect(Object.isFrozen(preset.restriction)).toBe(true)
  })

  it('list exactly the B6.5 table, field by field', () => {
    expect(BUILT_IN_PRESETS).toStrictEqual(EXPECTED_BUILT_INS)
  })

  it('tells a built-in id from any other value', () => {
    for (const id of BUILT_IN_PRESET_IDS) expect(isBuiltInPresetId(id)).toBe(true)
    for (const value of ['Neutral', 'custom', 'modal', '', undefined, 3, null]) {
      expect(isBuiltInPresetId(value)).toBe(false)
    }
  })

  it('selects Neutral at first load', () => {
    expect(DEFAULT_PRESET_SELECTION).toStrictEqual({ kind: 'preset', presetId: 'neutral' })
    expect(Object.isFrozen(DEFAULT_PRESET_SELECTION)).toBe(true)
  })
})

// @test-link [[rule_built_in_preset_values]]
describe('every built-in preset forms a phrase', () => {
  it.each(BUILT_IN_PRESETS.map((preset) => ({ name: preset.name, preset })))(
    '$name is a supported rhythm setting at its density and stepped down',
    ({ preset }) => {
      const setting = {
        noteDensity: preset.controls.noteDensity,
        rhythmicVariety: preset.controls.rhythmicVariety,
        silenceDensity: preset.controls.silenceDensity,
        syncopation: preset.controls.syncopation,
      }
      expect(isUnsupportedRhythmSetting(setting)).toBe(false)
      expect(
        isRhythmSettingBlocked(setting, { belowTabletLandscape: true, sessionSteppedDown: false }),
      ).toBe(false)
      expect(
        isRhythmSettingBlocked(setting, { belowTabletLandscape: false, sessionSteppedDown: false }),
      ).toBe(false)
      if (setting.noteDensity === 'Sixteenth') {
        expect(isUnsupportedRhythmSetting({ ...setting, noteDensity: 'Eighth' })).toBe(false)
      }
    },
  )

  it('includes a Sixteenth built-in, so the stepped-down case is covered', () => {
    expect(BUILT_IN_PRESETS.filter((p) => p.controls.noteDensity === 'Sixteenth')).toHaveLength(1)
  })
})
