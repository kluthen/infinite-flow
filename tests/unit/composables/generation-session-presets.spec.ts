/**
 * The Idle session's routing point for the preset selection: choosing a preset sets its ten
 * controls and seven levels (keeping the key and mode its restriction allows), every edit of a
 * preset-held control, of a level, or of a key or mode outside the restriction in force makes
 * Custom based on the selected preset, and every applied edit saves what it changed.
 */
import { describe, expect, it, vi } from 'vitest'

import { SessionUsageError } from '@/composables/use-generation-session'
import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
} from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { PRESET_HELD_CONTROL_KEYS, type PresetSelection } from '@/domain/presets/preset-selection'
import { createFitSession, flushAsync, type FitSessionOptions } from './fit-session-harness'

/** Intent: the ten preset-held controls of a set of controls, in the presets' order. */
function heldControls(controls: object): Record<string, unknown> {
  const values = controls as Record<string, unknown>
  return Object.fromEntries(PRESET_HELD_CONTROL_KEYS.map((key) => [key, values[key]]))
}

/** Intent: a fit session started from these controls, levels and selection. */
function sessionFrom(
  controls: Partial<typeof DEFAULT_GENERATION_CONTROLS>,
  selection: PresetSelection,
  options: FitSessionOptions = {},
) {
  return createFitSession({
    ...options,
    initialSettings: {
      controls: makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, ...controls }),
      figureLevels: NEUTRAL_FIGURE_LEVELS,
      selection,
      theme: 'System',
      myInstrument: null,
    },
  })
}

const REEL: PresetSelection = { kind: 'preset', presetId: 'reel' }

// @test-link [[module_generative_profile_selection]]
describe('createGenerationSession: choosing a preset', () => {
  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('choosing Neutral from Tension at Build sets Lift and every Neutral value, and keeps the tempo, the instrument and the phrase on screen', async () => {
    const built = createFitSession()
    await built.session.actions.generate()
    await flushAsync()
    expect(built.session.actions.selectPreset('jazz')).toBe(true)
    expect(built.session.actions.setControl('tension', 'Build')).toBe(true)
    expect(built.session.actions.setControl('tempo', 140)).toBe(true)
    await built.session.actions.selectInstrumentProfile('eb-alto')
    await flushAsync()
    const phrase = built.session.state.result
    const generatedBefore = built.generated.length
    built.saves.length = 0

    expect(built.session.actions.selectPreset('neutral')).toBe(true)

    const neutral = builtInPreset('neutral')
    expect(built.session.state.controls.tension).toBe('Lift')
    expect(heldControls(built.session.state.controls)).toEqual(neutral.controls)
    expect(built.session.state.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
    expect(built.session.state.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
    expect(built.session.state.controls.tempo).toBe(140)
    expect(built.session.state.controls.instrumentProfileId).toBe('eb-alto')
    expect(built.session.state.result).toBe(phrase)
    await flushAsync()
    expect(built.generated).toHaveLength(generatedBefore)
    expect(
      Object.keys(built.saves[0]!).every(
        (key) => key.startsWith('controls.') || key === 'profileSelection',
      ),
    ).toBe(true)
  })

  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('choosing Jazz sets its ten controls and its seven levels, the key and mode kept', () => {
    const { session } = sessionFrom({ tonalCenter: 'F', collection: 'Lydian' }, REEL)

    expect(session.actions.setFigureLevel('passingTone', 'off')).toBe(true)
    expect(session.actions.selectPreset('jazz')).toBe(true)

    expect(heldControls(session.state.controls)).toEqual(builtInPreset('jazz').controls)
    expect(session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(session.state.controls).toMatchObject({ tonalCenter: 'F', collection: 'Lydian' })
  })

  // @test-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
  it('choosing Reel from A Aeolian lands on A Mixolydian, and from A Dorian moves nothing', () => {
    const fromAeolian = sessionFrom(
      { tonalCenter: 'A', collection: 'Aeolian' },
      { kind: 'preset', presetId: 'neutral' },
    )
    expect(fromAeolian.session.actions.selectPreset('reel')).toBe(true)
    expect(fromAeolian.session.state.controls).toMatchObject({
      tonalCenter: 'A',
      collection: 'Mixolydian',
    })
    expect(fromAeolian.session.state.selection).toEqual(REEL)

    const fromDorian = sessionFrom(
      { tonalCenter: 'A', collection: 'Dorian' },
      { kind: 'preset', presetId: 'neutral' },
    )
    expect(fromDorian.session.actions.selectPreset('reel')).toBe(true)
    expect(fromDorian.session.state.controls).toMatchObject({
      tonalCenter: 'A',
      collection: 'Dorian',
    })
  })

  // @test-link [[rule_choosing_preset_sets_its_settings]]
  // @test-link [[rule_custom_selection]]
  it('choosing a preset applies its ten controls and seven levels, and choosing it again from Custom replaces the custom values', () => {
    const { session } = createFitSession()

    expect(session.actions.selectPreset('jazz')).toBe(true)
    expect(heldControls(session.state.controls)).toEqual(builtInPreset('jazz').controls)
    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'jazz' })

    expect(session.actions.setControl('register', 'Low')).toBe(true)
    expect(session.actions.setControl('contour', 'Falling')).toBe(true)
    expect(session.actions.setFigureLevel('chromaticEnclosure', 'stronglyFavored')).toBe(true)
    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(session.state.controls).toMatchObject({ register: 'Low', contour: 'Falling' })

    expect(session.actions.selectPreset('jazz')).toBe(true)
    expect(heldControls(session.state.controls)).toEqual(builtInPreset('jazz').controls)
    expect(session.state.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'jazz' })
  })

  // @test-link [[module_profile_control_customization]]
  it('choosing the preset already selected changes, saves, warms and reacts to nothing', async () => {
    const prewarm = vi.fn<(intent: GenerationIntent) => void>()
    const built = createFitSession({ prewarm })
    await built.session.actions.generate()
    await flushAsync()
    const before = {
      controls: built.session.state.controls,
      figureLevels: built.session.state.figureLevels,
      selection: built.session.state.selection,
      result: built.session.state.result,
    }
    const generatedBefore = built.generated.length
    const prewarmsBefore = prewarm.mock.calls.length

    expect(built.session.actions.selectPreset('neutral')).toBe(true)
    await flushAsync()

    expect(built.session.state.controls).toBe(before.controls)
    expect(built.session.state.figureLevels).toBe(before.figureLevels)
    expect(built.session.state.selection).toBe(before.selection)
    expect(built.session.state.result).toBe(before.result)
    expect(built.saves).toEqual([])
    expect(prewarm.mock.calls).toHaveLength(prewarmsBefore)
    expect(built.generated).toHaveLength(generatedBefore)
  })

  it('refuses an id no known preset has, changing nothing', () => {
    const { session, saves } = createFitSession()

    expect(() => session.actions.selectPreset('no-such-preset')).toThrow(SessionUsageError)
    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
    expect(saves).toEqual([])
  })
})

// @test-link [[module_profile_control_customization]]
// @test-link [[rule_custom_selection]]
describe('createGenerationSession: when the selection becomes Custom', () => {
  it('a preset-held edit makes Custom based on the selected preset and never changes the preset itself', () => {
    const before = JSON.stringify(BUILT_IN_PRESETS)
    const { session } = createFitSession()

    expect(session.actions.setControl('noteDensity', 'Sixteenth')).toBe(true)

    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(session.state.controls.noteDensity).toBe('Sixteenth')
    expect(JSON.stringify(BUILT_IN_PRESETS)).toBe(before)
    expect(Object.isFrozen(builtInPreset('neutral').controls)).toBe(true)
  })

  it('a level edit makes Custom based on the selected preset and changes that one level', () => {
    const { session } = createFitSession()

    expect(session.actions.setFigureLevel('appoggiatura', 'favored')).toBe(true)

    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'neutral' })
    expect(session.state.figureLevels).toEqual({
      ...NEUTRAL_FIGURE_LEVELS,
      appoggiatura: 'favored',
    })
  })

  it('a tempo edit leaves the selected preset selected', () => {
    const { session } = createFitSession()
    const selection = session.state.selection

    expect(session.actions.setControl('tempo', 100)).toBe(true)

    expect(session.state.selection).toBe(selection)
  })

  it('an instrument switch leaves the selected preset selected', async () => {
    const { session } = createFitSession()
    const selection = session.state.selection

    await expect(session.actions.selectInstrumentProfile('eb-alto')).resolves.toBe('applied')

    expect(session.state.selection).toBe(selection)
  })

  // @test-link [[rule_restriction_in_force]]
  it('a mode outside the restriction in force makes Custom; a mode inside it, or any key, does not', () => {
    const { session } = sessionFrom({ tonalCenter: 'A', collection: 'Mixolydian' }, REEL)

    expect(session.actions.setControl('collection', 'Dorian')).toBe(true)
    expect(session.state.selection).toEqual(REEL)
    for (const key of ['C', 'F#', 'B'] as const) {
      expect(session.actions.setControl('tonalCenter', key)).toBe(true)
      expect(session.state.selection).toEqual(REEL)
    }

    expect(session.actions.setControl('collection', 'Ionian')).toBe(true)
    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'reel' })
    expect(session.state.controls).toMatchObject({ tonalCenter: 'B', collection: 'Ionian' })
    expect(heldControls(session.state.controls)).toEqual(heldControls(DEFAULT_GENERATION_CONTROLS))
  })

  it('a key or mode under a preset whose restriction is any never makes Custom', () => {
    const { session } = createFitSession()

    expect(session.actions.setControl('collection', 'Locrian')).toBe(true)
    expect(session.actions.setControl('tonalCenter', 'G#')).toBe(true)

    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
  })

  it('a value changed back by hand stays Custom, and only choosing a preset leaves it', () => {
    const { session } = createFitSession()

    expect(session.actions.setControl('contour', 'Rising')).toBe(true)
    expect(session.actions.setControl('contour', 'Arch')).toBe(true)
    expect(session.actions.setFigureLevel('passingTone', 'off')).toBe(true)
    expect(session.actions.setFigureLevel('passingTone', NEUTRAL_FIGURE_LEVELS.passingTone)).toBe(
      true,
    )
    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'neutral' })

    expect(session.actions.selectPreset('neutral')).toBe(true)
    expect(session.state.selection).toEqual({ kind: 'preset', presetId: 'neutral' })
  })

  it('refuses a figure or a level that is not one', () => {
    const { session, saves } = createFitSession()

    expect(() => session.actions.setFigureLevel('trill' as FigureId, 'off')).toThrow(
      SessionUsageError,
    )
    expect(() => session.actions.setFigureLevel('passingTone', 'often' as FigureLevel)).toThrow(
      SessionUsageError,
    )
    expect(session.state.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
    expect(saves).toEqual([])
  })
})

// @test-link [[rule_settings_saved_on_change]]
// @test-link [[module_profile_control_customization]]
describe('createGenerationSession: what a preset choice or a key edit saves', () => {
  it('saves a Reel choice as the controls it changed, writing no selection', () => {
    const { session, saves } = sessionFrom(
      { tonalCenter: 'A', collection: 'Aeolian' },
      { kind: 'preset', presetId: 'neutral' },
    )

    expect(session.actions.selectPreset('reel')).toBe(true)

    expect(saves).toEqual([
      {
        'controls.collection': 'Mixolydian',
        'controls.tension': 'Settled',
        'controls.noteDensity': 'Eighth',
        'controls.rhythmicVariety': 'Strict',
      },
    ])
  })

  it('saves a mode leaving Reel as the mode alone, Custom based on Reel writing no selection', () => {
    const { session, saves } = sessionFrom({ tonalCenter: 'A', collection: 'Dorian' }, REEL)

    expect(session.actions.setControl('collection', 'Ionian')).toBe(true)

    expect(session.state.selection).toEqual({ kind: 'custom', baseId: 'reel' })
    expect(saves).toEqual([{ 'controls.collection': 'Ionian' }])
  })

  it('saves choosing the base from Custom as the selection, the values unchanged', () => {
    const { session, saves } = createFitSession()
    expect(session.actions.setFigureLevel('passingTone', 'off')).toBe(true)
    saves.length = 0

    expect(session.actions.selectPreset('neutral')).toBe(true)

    expect(session.state.figureLevels).toEqual(NEUTRAL_FIGURE_LEVELS)
    expect(saves).toEqual([{ profileSelection: { musicalProfile: 'Neutral', isCustom: false } }])
  })
})
