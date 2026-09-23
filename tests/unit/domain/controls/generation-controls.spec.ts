// @test-link [[module_generation_control_catalog]]
// @test-link [[module_generative_profile_selection]]
// @test-link [[module_profile_control_customization]]
// @test-link [[user_story_controlled_phrase_generation]]
// @test-link [[rule_selectable_generative_profiles]]
// @test-link [[rule_profile_presets_apply_defined_controls]]
// @test-link [[rule_profile_control_customization]]
import { describe, expect, it } from 'vitest'

import {
  ARPEGGIO_CHAOS_VALUES,
  COLLECTIONS,
  CONTOURS,
  HARMONIC_MOTIONS,
  INSTRUMENT_PROFILE_IDS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  TEMPO_VALUES,
  GenerationControlError,
  makeGenerationControls,
  normalizeTempo,
} from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
  PROFILE_BUNDLES,
  applyControlledCustomValue,
  applyMusicalProfile,
  applyNonProfileControlValue,
} from '@/domain/controls/profile-selection'

describe('generation control catalogs and normalization', () => {
  it('exhausts every closed selectable catalog and accepts every literal value', () => {
    expect(TEMPO_VALUES).toEqual([
      60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240,
    ])
    expect(PITCH_CLASSES).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])
    expect(COLLECTIONS).toEqual([
      'Major',
      'Minor',
      'Ionian',
      'Dorian',
      'Phrygian',
      'Lydian',
      'Mixolydian',
      'Aeolian',
      'Locrian',
    ])
    expect(HARMONIC_MOTIONS).toEqual(['Static', 'Gentle diatonic', 'Active diatonic'])
    expect(TENSION_ARCS).toEqual(['Settled', 'Lift', 'Build', 'Edge'])
    expect(NOTE_DENSITIES).toEqual(['Quarter', 'Eighth', 'Sixteenth', 'Mixed'])
    expect(SYNCOPATIONS).toEqual(['Straight', 'Occasional offbeats', 'Active displacement'])
    expect(SILENCE_DENSITIES).toEqual(['Sparse', 'Conversational', 'Breath-heavy'])
    expect(CONTOURS).toEqual(['Rising', 'Falling', 'Arch', 'Wandering'])
    expect(REGISTER_CHOICES).toEqual(['Low', 'Middle', 'High', 'Varying'])
    expect(LEAPINESS_VALUES).toEqual(['Smooth', 'Shaped', 'Leaping', 'Angular'])
    expect(ARPEGGIO_CHAOS_VALUES).toEqual(['Predictable', 'Varied', 'Chaotic'])
    expect(MUSICAL_PROFILES).toEqual(['Neutral', 'Jazz'])
    expect(INSTRUMENT_PROFILE_IDS).toEqual(['c-keyboard', 'bb-tenor', 'eb-alto'])

    for (const tempo of TEMPO_VALUES) expect(normalizeTempo(tempo)).toBe(tempo)
  })

  it('uses the literal first-load defaults', () => {
    expect(DEFAULT_GENERATION_CONTROLS).toMatchObject({
      tempo: 90,
      tonalCenter: 'C',
      collection: 'Ionian',
      tension: 'Lift',
      leapiness: 'Shaped',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
      ...PROFILE_BUNDLES.Neutral,
    })
    expect(DEFAULT_PROFILE_SELECTION).toEqual({ musicalProfile: 'Neutral', isCustom: false })
  })

  it.each([59, 61, 65, 241, 90.5, '90', null])(
    'rejects invalid tempo %j without coercion',
    (tempo) => {
      expect(() => normalizeTempo(tempo)).toThrow(GenerationControlError)
    },
  )

  it('rejects an invalid closed value rather than selecting a default', () => {
    expect(() =>
      makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, contour: 'Circle' as 'Arch' }),
    ).toThrow(GenerationControlError)
  })
})

describe('profile bundle replacement and customization', () => {
  it('applies each complete immutable bundle and reselecting replaces arbitrary custom values', () => {
    let [controls, selection] = applyMusicalProfile(DEFAULT_GENERATION_CONTROLS, 'Jazz')
    expect(controls).toMatchObject(PROFILE_BUNDLES.Jazz)
    expect(selection).toEqual({ musicalProfile: 'Jazz', isCustom: false })

    ;[controls, selection] = applyControlledCustomValue(controls, selection, 'register', 'Low')
    ;[controls, selection] = applyControlledCustomValue(controls, selection, 'contour', 'Falling')
    expect(selection).toEqual({ musicalProfile: 'Jazz', isCustom: true })
    expect(controls).toMatchObject({ register: 'Low', contour: 'Falling' })

    ;[controls, selection] = applyMusicalProfile(controls, 'Neutral')
    expect(controls).toMatchObject(PROFILE_BUNDLES.Neutral)
    expect(selection).toEqual({ musicalProfile: 'Neutral', isCustom: false })
  })

  it('retains grammar identity on controlled custom edits and never mutates preset definitions', () => {
    const before = JSON.stringify(PROFILE_BUNDLES)
    const [controls, selection] = applyControlledCustomValue(
      DEFAULT_GENERATION_CONTROLS,
      DEFAULT_PROFILE_SELECTION,
      'noteDensity',
      'Mixed',
    )

    expect(selection).toEqual({ musicalProfile: 'Neutral', isCustom: true })
    expect(controls.noteDensity).toBe('Mixed')
    expect(JSON.stringify(PROFILE_BUNDLES)).toBe(before)
    expect(Object.isFrozen(PROFILE_BUNDLES.Neutral)).toBe(true)
  })

  it('does not mark a profile custom after a non-profile-controlled edit', () => {
    const [, selection] = applyNonProfileControlValue(
      DEFAULT_GENERATION_CONTROLS,
      DEFAULT_PROFILE_SELECTION,
      'tempo',
      100,
    )
    expect(selection).toBe(DEFAULT_PROFILE_SELECTION)
  })
})
