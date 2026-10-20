import { describe, expect, it } from 'vitest'

import { controlSummaryText } from '@/components/controls/control-options'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  DEFAULT_PRESET_SELECTION,
} from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'

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
