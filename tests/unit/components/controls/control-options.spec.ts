import { describe, expect, it } from 'vitest'

import {
  collectionOptions,
  controlSummaryText,
  keyAndModeMarks,
  tonalCenterOptions,
  withMarks,
} from '@/components/controls/control-options'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  DEFAULT_PRESET_SELECTION,
} from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'

// @test-link [[module_generation_control_catalog]]
describe('controlSummaryText', () => {
  it('reads the default load as tonal center, collection, Neutral, tension, leapiness', () => {
    expect(
      controlSummaryText(DEFAULT_GENERATION_CONTROLS, DEFAULT_PRESET_SELECTION, BUILT_IN_PRESETS),
    ).toBe('C Ionian · Neutral · Lift · Shaped')
  })

  it('shows the applied preset name when the Jazz preset is selected', () => {
    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'preset', presetId: 'jazz' },
        BUILT_IN_PRESETS,
      ),
    ).toBe('C Ionian · Jazz · Lift · Shaped')
  })

  it('names any selected preset by its name, not its id', () => {
    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'preset', presetId: 'speed-drill' },
        BUILT_IN_PRESETS,
      ),
    ).toBe('C Ionian · Speed drill · Lift · Shaped')
  })

  // @test-link [[rule_custom_names_its_base]]
  it("names Custom's base, and Custom alone when it has none", () => {
    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'custom', baseId: 'jazz' },
        BUILT_IN_PRESETS,
      ),
    ).toBe('C Ionian · Custom, based on Jazz · Lift · Shaped')
    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'custom', baseId: null },
        BUILT_IN_PRESETS,
      ),
    ).toBe('C Ionian · Custom · Lift · Shaped')
  })

  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_presets_read_at_start_up]]
  it("names a player preset the session knows, selected or as Custom's base", () => {
    const presets = [
      ...BUILT_IN_PRESETS,
      makePreset({ ...builtInPreset('jazz'), id: 'player-1', name: 'Late night', kind: 'player' }),
    ]

    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'preset', presetId: 'player-1' },
        presets,
      ),
    ).toBe('C Ionian · Late night · Lift · Shaped')
    expect(
      controlSummaryText(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'custom', baseId: 'player-1' },
        presets,
      ),
    ).toBe('C Ionian · Custom, based on Late night · Lift · Shaped')
  })

  it('uses the tonal-center control label, not the raw pitch class, for an enharmonic value', () => {
    const controls: GenerationControls = {
      ...DEFAULT_GENERATION_CONTROLS,
      tonalCenter: 'C#',
      collection: 'Dorian',
    }
    expect(controlSummaryText(controls, DEFAULT_PRESET_SELECTION, BUILT_IN_PRESETS)).toBe(
      'C-sharp/D-flat Dorian · Neutral · Lift · Shaped',
    )
  })
})

// @test-link [[module_key_and_mode_marks]]
describe('keyAndModeMarks', () => {
  const NO_MARKS = { marked: [], note: null }

  // @test-link [[module_key_and_mode_marks]]
  it("marks Reel's two modes on Collection, with its note, and nothing on Written key", () => {
    expect(keyAndModeMarks(builtInPreset('reel').restriction, 'Reel')).toEqual({
      writtenKey: NO_MARKS,
      collection: {
        marked: ['Mixolydian', 'Dorian'],
        note: 'Reel is meant for Mixolydian or Dorian, marked. Any mode works; another one makes your settings Custom.',
      },
    })
  })

  // @test-link [[module_key_and_mode_marks]]
  it("names the keys in Written key's own labels, a sharp key by its enharmonic label", () => {
    const marks = keyAndModeMarks({ keys: ['F#'], modes: 'any' }, 'Late night')
    expect(marks.writtenKey).toEqual({
      marked: ['F#'],
      note: 'Late night is meant for F-sharp/G-flat, marked. Any key works; another one makes your settings Custom.',
    })
    expect(marks.collection).toEqual(NO_MARKS)
  })

  // @test-link [[module_key_and_mode_marks]]
  it('joins three values as "A, B or C", in the restriction\'s own order', () => {
    const marks = keyAndModeMarks({ keys: ['G', 'C', 'D#'], modes: ['Dorian'] }, 'Mine')
    expect(marks.writtenKey).toEqual({
      marked: ['G', 'C', 'D#'],
      note: 'Mine is meant for G, C or D-sharp/E-flat, marked. Any key works; another one makes your settings Custom.',
    })
    expect(marks.collection.note).toBe(
      'Mine is meant for Dorian, marked. Any mode works; another one makes your settings Custom.',
    )
  })

  // @test-link [[module_key_and_mode_marks]]
  // @test-link [[rule_restriction_highlight_never_blocks]]
  it('marks nothing and gives no note for any key and mode, or no restriction', () => {
    const none = { writtenKey: NO_MARKS, collection: NO_MARKS }
    expect(keyAndModeMarks(ANY_KEY_AND_MODE, 'Neutral')).toEqual(none)
    expect(keyAndModeMarks(null, 'Neutral')).toEqual(none)
  })

  // @test-link [[module_key_and_mode_marks]]
  it('gives the same marks and notes for the same restriction and preset name', () => {
    const restriction = builtInPreset('bebop').restriction
    expect(keyAndModeMarks(restriction, 'Bebop')).toEqual(keyAndModeMarks(restriction, 'Bebop'))
  })
})

// @test-link [[module_key_and_mode_marks]]
describe('withMarks', () => {
  // @test-link [[rule_restriction_highlight_never_blocks]]
  it('flags exactly the marked values, keeping every option and disabling none', () => {
    const marked = withMarks(collectionOptions(), ['Mixolydian', 'Dorian'])
    expect(marked.map((option) => option.value)).toEqual(
      collectionOptions().map((option) => option.value),
    )
    expect(marked.filter((option) => option.marked === true).map((option) => option.value)).toEqual(
      ['Dorian', 'Mixolydian'],
    )
    expect(marked.some((option) => option.disabled === true)).toBe(false)
  })

  it('returns the options unflagged when nothing is marked', () => {
    expect(withMarks(tonalCenterOptions(), [])).toEqual(tonalCenterOptions())
  })
})
