// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE } from '@/domain/presets/key-and-mode-restriction'
import {
  checkPresetName,
  isPlayerPresetLimitReached,
  PLAYER_PRESET_LIMIT,
  PRESET_NAME_MAX_LENGTH,
  RESERVED_PRESET_NAME,
  suggestedPresetName,
} from '@/domain/presets/preset-names'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'

/** Intent: a player preset with a given id and name, its settings Gentle's. */
function playerPreset(id: string, name: string): Preset {
  return makePreset({
    id,
    name,
    controls: builtInPreset('gentle').controls,
    levels: NEUTRAL_FIGURE_LEVELS,
    restriction: ANY_KEY_AND_MODE,
    kind: 'player',
  })
}

/** Intent: a number of player presets, named and identified by their index. */
function playerPresets(count: number): readonly Preset[] {
  return Array.from({ length: count }, (_, index) => playerPreset(`p${index}`, `Preset ${index}`))
}

const WARM_UP = playerPreset('warm-up', 'Warm-Up')
const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, WARM_UP]

// @test-link [[module_preset_model]]
// @test-link [[rule_player_preset_names]]
describe('checking a preset name', () => {
  it('holds the name limits', () => {
    expect(PRESET_NAME_MAX_LENGTH).toBe(40)
    expect(RESERVED_PRESET_NAME).toBe('Custom')
  })

  it('refuses an empty name, and one of spaces only', () => {
    expect(checkPresetName('', PRESETS)).toStrictEqual({ ok: false, reason: 'empty' })
    expect(checkPresetName('   \t ', PRESETS)).toStrictEqual({ ok: false, reason: 'empty' })
  })

  it('accepts 40 characters after trimming and refuses 41', () => {
    const forty = 'a'.repeat(40)
    expect(checkPresetName(`  ${forty}  `, PRESETS)).toStrictEqual({ ok: true, name: forty })
    expect(checkPresetName('a'.repeat(41), PRESETS)).toStrictEqual({
      ok: false,
      reason: 'tooLong',
    })
  })

  it('refuses "Custom" in any letter case, spaces around included', () => {
    for (const typed of ['Custom', 'cUSTOM', ' custom ']) {
      expect(checkPresetName(typed, PRESETS)).toStrictEqual({ ok: false, reason: 'reserved' })
    }
  })

  it('refuses a name taken, ignoring case, built-in names included, saying it as written', () => {
    expect(checkPresetName('Speed DRILL', PRESETS)).toStrictEqual({
      ok: false,
      reason: 'taken',
      existingName: 'Speed drill',
    })
    expect(checkPresetName('  modal (dorian)', PRESETS)).toStrictEqual({
      ok: false,
      reason: 'taken',
      existingName: 'Modal (Dorian)',
    })
    expect(checkPresetName('warm-up', PRESETS)).toStrictEqual({
      ok: false,
      reason: 'taken',
      existingName: 'Warm-Up',
    })
  })

  it('compares the existing names trimmed, naming the first such preset in list order', () => {
    const presets = [playerPreset('a', ' Loose '), playerPreset('b', 'LOOSE')]
    expect(checkPresetName('loose', presets)).toStrictEqual({
      ok: false,
      reason: 'taken',
      existingName: ' Loose ',
    })
  })

  it('excepts the preset being renamed, a case-only rename of itself included', () => {
    expect(checkPresetName('WARM-UP', PRESETS, 'warm-up')).toStrictEqual({
      ok: true,
      name: 'WARM-UP',
    })
    expect(checkPresetName('Reel', PRESETS, 'warm-up')).toStrictEqual({
      ok: false,
      reason: 'taken',
      existingName: 'Reel',
    })
  })

  it('gives the trimmed name when accepted', () => {
    expect(checkPresetName('  Morning scales  ', PRESETS)).toStrictEqual({
      ok: true,
      name: 'Morning scales',
    })
  })

  it('gives the first reason that applies: reserved before taken', () => {
    const presets = [...PRESETS, playerPreset('loaded', 'custom')]
    expect(checkPresetName('Custom', presets)).toStrictEqual({ ok: false, reason: 'reserved' })
  })
})

// @test-link [[rule_player_preset_names]]
describe('the suggested name', () => {
  it('suggests "My preset" when no preset has it', () => {
    expect(suggestedPresetName(PRESETS)).toBe('My preset')
  })

  it('numbers on, skipping names taken in any letter case', () => {
    const presets = [...PRESETS, playerPreset('a', 'my preset'), playerPreset('b', 'MY PRESET 2')]
    expect(suggestedPresetName(presets)).toBe('My preset 3')
  })

  it('trims the existing names and takes the first free number', () => {
    const presets = [playerPreset('a', ' My preset '), playerPreset('b', 'My preset 3')]
    expect(suggestedPresetName(presets)).toBe('My preset 2')
  })
})

// @test-link [[rule_player_preset_limit]]
describe('the player preset limit', () => {
  it('is 50 player presets, built-ins not counted', () => {
    expect(PLAYER_PRESET_LIMIT).toBe(50)
    expect(isPlayerPresetLimitReached([...BUILT_IN_PRESETS, ...playerPresets(49)])).toBe(false)
    expect(isPlayerPresetLimitReached([...BUILT_IN_PRESETS, ...playerPresets(50)])).toBe(true)
    expect(isPlayerPresetLimitReached(playerPresets(60))).toBe(true)
    expect(isPlayerPresetLimitReached(BUILT_IN_PRESETS)).toBe(false)
  })
})
