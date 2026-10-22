// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  presetBarCustomOption,
  presetBarFullText,
  presetBarGroups,
  presetDescription,
  playerPresetsInBoxOrder,
  type SessionStartSettings,
} from '@/components/controls/preset-bar-model'
import { presetLabel } from '@/domain/controls/preset-label'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { onlyKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import { makePreset, type Preset, type PresetSelection } from '@/domain/presets/preset-selection'
import type { SessionSettings } from '@/session/session-types'
import { ALL_GROUPS_ALLOWED } from '@/session/settings-mutation'

/** Intent: a player preset with `id` and `name`, Jazz's values, and an "any" restriction. */
function playerPreset(id: string, name: string, restriction = builtInPreset('jazz').restriction) {
  return makePreset({ ...builtInPreset('jazz'), id, name, restriction, kind: 'player' })
}

const PLAYER_PRESETS: readonly Preset[] = [
  playerPreset('p-zed', 'zed'),
  playerPreset('p-alpha', 'Alpha'),
  playerPreset('p-late-1', 'Late night'),
  playerPreset('p-beta', 'beta'),
  playerPreset('p-late-2', 'late night'),
]

const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, ...PLAYER_PRESETS]

/** Intent: the groups as label and option values, for a compact comparison. */
function groupValues(presets: readonly Preset[]) {
  return presetBarGroups(presets).map((group) => ({
    label: group.label,
    values: group.options.map((option) => option.value),
  }))
}

// @test-link [[module_preset_bar_model]]
describe('presetBarGroups', () => {
  // @test-link [[module_preset_bar_model]]
  // @test-link [[rule_player_preset_names]]
  // @test-link [[req_presets]]
  it('lists Practice, Styles, then Your presets alphabetical ignoring case, duplicates kept in order', () => {
    expect(groupValues(PRESETS)).toEqual([
      { label: 'Practice', values: ['neutral', 'gentle', 'speed-drill'] },
      { label: 'Styles', values: ['jazz', 'bebop', 'pop-song', 'reel', 'modal-dorian'] },
      {
        label: 'Your presets',
        values: ['p-alpha', 'p-beta', 'p-late-1', 'p-late-2', 'p-zed'],
      },
    ])
    const practice = presetBarGroups(PRESETS)[0]!
    expect(practice.options.map((option) => option.label)).toEqual([
      'Neutral',
      'Gentle',
      'Speed drill',
    ])
    const yours = presetBarGroups(PRESETS)[2]!
    expect(yours.options.map((option) => option.label)).toEqual([
      'Alpha',
      'beta',
      'Late night',
      'late night',
      'zed',
    ])
  })

  // @test-link [[module_preset_bar_model]]
  it('has no Your presets group while there are no player presets', () => {
    expect(presetBarGroups(BUILT_IN_PRESETS).map((group) => group.label)).toEqual([
      'Practice',
      'Styles',
    ])
  })

  // @test-link [[module_preset_bar_model]]
  it('places a built-in by its id, never its name, and throws when one is missing', () => {
    const renamed = BUILT_IN_PRESETS.map((preset) =>
      preset.id === 'jazz' ? makePreset({ ...preset, name: 'Swing' }) : preset,
    )
    expect(presetBarGroups(renamed)[1]!.options[0]).toEqual({ value: 'jazz', label: 'Swing' })
    const withoutReel = BUILT_IN_PRESETS.filter((preset) => preset.id !== 'reel')
    expect(() => presetBarGroups(withoutReel)).toThrow(/reel/)
  })
})

// @test-link [[module_preset_bar_model]]
describe('playerPresetsInBoxOrder', () => {
  // @test-link [[module_preset_bar_model]]
  // @test-link [[rule_player_preset_names]]
  it('gives the player presets alphabetical ignoring case, duplicates in their given order, no built-in', () => {
    expect(playerPresetsInBoxOrder(PRESETS).map((preset) => preset.id)).toEqual([
      'p-alpha',
      'p-beta',
      'p-late-1',
      'p-late-2',
      'p-zed',
    ])
    const swapped = [...BUILT_IN_PRESETS, PLAYER_PRESETS[4]!, PLAYER_PRESETS[2]!]
    expect(playerPresetsInBoxOrder(swapped).map((preset) => preset.id)).toEqual([
      'p-late-2',
      'p-late-1',
    ])
    expect(playerPresetsInBoxOrder(BUILT_IN_PRESETS)).toEqual([])
  })
})

// @test-link [[rule_custom_names_its_base]]
// @test-link [[rule_custom_selection]]
describe('presetBarCustomOption and presetBarFullText', () => {
  /** Intent: Custom based on `baseId`. */
  const custom = (baseId: string | null): PresetSelection => ({ kind: 'custom', baseId })

  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_custom_selection]]
  it('labels the Custom option with the preset label: a built-in base, a player base, no base, a deleted base', () => {
    for (const selection of [custom('jazz'), custom('p-alpha'), custom(null), custom('gone')]) {
      expect(presetBarCustomOption(selection, PRESETS)).toBe(presetLabel(selection, PRESETS))
      expect(presetBarFullText(selection, PRESETS)).toBe(presetLabel(selection, PRESETS))
    }
    expect(presetBarCustomOption(custom('jazz'), PRESETS)).toBe('Custom, based on Jazz')
    expect(presetBarCustomOption(custom('p-alpha'), PRESETS)).toBe('Custom, based on Alpha')
    expect(presetBarCustomOption(custom(null), PRESETS)).toBe('Custom')
    expect(presetBarCustomOption(custom('gone'), PRESETS)).toBe('Custom')
  })

  // @test-link [[rule_custom_selection]]
  it("gives no Custom option outside Custom, and the selected preset's name as the full text", () => {
    const reel: PresetSelection = { kind: 'preset', presetId: 'reel' }
    expect(presetBarCustomOption(reel, PRESETS)).toBeNull()
    expect(presetBarFullText(reel, PRESETS)).toBe('Reel')
    const mine: PresetSelection = { kind: 'preset', presetId: 'p-late-2' }
    expect(presetBarCustomOption(mine, PRESETS)).toBeNull()
    expect(presetBarFullText(mine, PRESETS)).toBe('late night')
  })
})

// @test-link [[module_preset_bar_model]]
describe('presetDescription', () => {
  /** Intent: the preset with `presetId` selected. */
  const preset = (presetId: string): PresetSelection => ({ kind: 'preset', presetId })

  // @test-link [[module_preset_bar_model]]
  it.each([
    ['neutral', "Plain lines in the key, in quarter notes: the app's starting point."],
    [
      'gentle',
      'One chord, quarter notes, steps only, nothing tense. A warm-up, or a first try at improvising.',
    ],
    [
      'speed-drill',
      'Dense, changing rhythms with most embellishments favored, to read fast in any key.',
    ],
    ['jazz', 'Eighth notes and offbeats, now and then with a short note from outside the key.'],
    [
      'bebop',
      'Fast jazz lines that circle chord notes from outside the key. It uses Major rather than Ionian: the same notes, with chords that lead home through the chord on the 5th note.',
    ],
    [
      'pop-song',
      'Song-like phrases over familiar chords. It uses Major rather than Ionian: the same notes, with chords that lead home the way songs do.',
    ],
    [
      'reel',
      'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).',
    ],
    ['modal-dorian', 'A steady two-chord bed in Dorian, so its color note is heard in the melody.'],
  ])('gives the built-in %s its own sentence', (id, sentence) => {
    expect(presetDescription(preset(id), BUILT_IN_PRESETS)).toBe(sentence)
  })

  // @test-link [[module_preset_bar_model]]
  it('gives a player preset "Your preset." and, unless any, what its restriction is meant for', () => {
    const presets = [
      ...BUILT_IN_PRESETS,
      playerPreset('any', 'Open'),
      playerPreset('modes', 'Folk', { keys: 'any', modes: ['Mixolydian', 'Dorian'] }),
      playerPreset('pair', 'G tune', onlyKeyAndMode('G', 'Dorian')),
      playerPreset('sharp', 'F-sharp tune', onlyKeyAndMode('F#', 'Mixolydian')),
    ]
    expect(presetDescription(preset('any'), presets)).toBe('Your preset.')
    expect(presetDescription(preset('modes'), presets)).toBe(
      'Your preset. Meant for Mixolydian or Dorian in any key.',
    )
    expect(presetDescription(preset('pair'), presets)).toBe('Your preset. Meant for G Dorian.')
    expect(presetDescription(preset('sharp'), presets)).toBe(
      'Your preset. Meant for F-sharp/G-flat Mixolydian.',
    )
  })

  // @test-link [[module_preset_bar_model]]
  // @test-link [[rule_custom_names_its_base]]
  it('gives the three Custom descriptions: a built-in base, a player base, no base or a deleted one', () => {
    expect(presetDescription({ kind: 'custom', baseId: 'reel' }, PRESETS)).toBe(
      'Changed from Reel. Save as a new preset to keep these settings under a name.',
    )
    expect(presetDescription({ kind: 'custom', baseId: 'p-alpha' }, PRESETS)).toBe(
      'Changed from Alpha. Save as a new preset to keep these settings under a name, or save the changes into Alpha.',
    )
    const noBase = 'Your own settings. Save them as a preset to keep them under a name.'
    expect(presetDescription({ kind: 'custom', baseId: null }, PRESETS)).toBe(noBase)
    expect(presetDescription({ kind: 'custom', baseId: 'gone' }, PRESETS)).toBe(noBase)
  })

  // @test-link [[module_preset_bar_model]]
  it('gives the same result for the same presets and selection', () => {
    const selections: PresetSelection[] = [
      preset('bebop'),
      preset('p-zed'),
      { kind: 'custom', baseId: 'p-beta' },
      { kind: 'custom', baseId: null },
    ]
    for (const selection of selections) {
      expect(presetDescription(selection, PRESETS)).toBe(presetDescription(selection, PRESETS))
      expect(presetBarCustomOption(selection, PRESETS)).toBe(
        presetBarCustomOption(selection, PRESETS),
      )
      expect(presetBarFullText(selection, PRESETS)).toBe(presetBarFullText(selection, PRESETS))
    }
    expect(presetBarGroups(PRESETS)).toEqual(presetBarGroups(PRESETS))
  })

  it("accepts a session's settings as its start settings", () => {
    const settings: SessionSettings = {
      controls: DEFAULT_GENERATION_CONTROLS,
      figureLevels: builtInPreset('neutral').levels,
      selection: { kind: 'preset', presetId: 'neutral' },
      allowedGroups: ALL_GROUPS_ALLOWED,
      rhythmLockOn: false,
    }
    const start: SessionStartSettings = settings
    expect(presetDescription(start.selection, PRESETS)).toBe(
      "Plain lines in the key, in quarter notes: the app's starting point.",
    )
  })
})
