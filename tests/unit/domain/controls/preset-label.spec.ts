import { describe, expect, it } from 'vitest'

import { presetLabel } from '@/domain/controls/preset-label'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'

describe('presetLabel', () => {
  // @test-link [[rule_preset_label_kept_with_session]]
  it('names each of the four selections in the kept-session form', () => {
    expect(presetLabel({ musicalProfile: 'Neutral', isCustom: false })).toBe('Neutral')
    expect(presetLabel({ musicalProfile: 'Jazz', isCustom: false })).toBe('Jazz')
    expect(presetLabel({ musicalProfile: 'Neutral', isCustom: true })).toBe(
      'Custom, based on Neutral',
    )
    expect(presetLabel({ musicalProfile: 'Jazz', isCustom: true })).toBe('Custom, based on Jazz')
  })

  // @test-link [[rule_preset_label_kept_with_session]]
  it('names a selected preset by its name', () => {
    expect(presetLabel({ kind: 'preset', presetId: 'jazz' })).toBe('Jazz')
    expect(presetLabel({ kind: 'preset', presetId: 'reel' })).toBe('Reel')
    expect(presetLabel({ kind: 'preset', presetId: 'neutral' })).toBe('Neutral')
  })

  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_preset_label_kept_with_session]]
  it('names Custom by its base, or just Custom with no base or a base no preset has', () => {
    expect(presetLabel({ kind: 'custom', baseId: 'jazz' })).toBe('Custom, based on Jazz')
    expect(presetLabel({ kind: 'custom', baseId: 'bebop' })).toBe('Custom, based on Bebop')
    expect(presetLabel({ kind: 'custom', baseId: null })).toBe('Custom')
    expect(presetLabel({ kind: 'custom', baseId: 'deleted-preset' })).toBe('Custom')
  })

  // @test-link [[rule_custom_names_its_base]]
  it('names a player preset from the presets given', () => {
    const jazz = BUILT_IN_PRESETS.find((preset) => preset.id === 'jazz')!
    const mine = makePreset({ ...jazz, id: 'player-1', name: 'My swing', kind: 'player' })
    const presets = [...BUILT_IN_PRESETS, mine]
    expect(presetLabel({ kind: 'preset', presetId: 'player-1' }, presets)).toBe('My swing')
    expect(presetLabel({ kind: 'custom', baseId: 'player-1' }, presets)).toBe(
      'Custom, based on My swing',
    )
  })

  it('throws on a selected preset id no preset has', () => {
    expect(() => presetLabel({ kind: 'preset', presetId: 'no-such-preset' })).toThrow(Error)
  })
})
