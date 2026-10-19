// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { JAZZ_FIGURE_LEVELS, NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import {
  ANY_KEY_AND_MODE,
  makeKeyAndModeRestriction,
  onlyKeyAndMode,
} from '@/domain/presets/key-and-mode-restriction'
import {
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  PresetModelError,
  type Preset,
  type PresetSelection,
  type PresetSettings,
} from '@/domain/presets/preset-selection'
import {
  presetForSaveAsNew,
  presetWithSavedChanges,
  saveAsNewChoices,
  saveChangesQuestion,
  selectionOfSavedPreset,
} from '@/domain/presets/preset-save-choices'

const ANY_CHOICE = { kind: 'anyKeyAndMode', restriction: { keys: 'any', modes: 'any' } } as const

/** Intent: the "only this key and mode" choice for one pair. */
function onlyChoice(key: string, mode: string): unknown {
  return { kind: 'onlyThisKeyAndMode', restriction: { keys: [key], modes: [mode] } }
}

/** A player preset meant for Mixolydian or Dorian in any key, like Reel. */
const MY_REEL: Preset = makePreset({
  id: 'player-reel',
  name: 'My reel',
  controls: builtInPreset('reel').controls,
  levels: builtInPreset('reel').levels,
  restriction: makeKeyAndModeRestriction({ keys: 'any', modes: ['Mixolydian', 'Dorian'] }),
  kind: 'player',
})

/** A player preset kept to the one pair G Dorian. */
const KEPT_TO_G_DORIAN: Preset = makePreset({
  ...MY_REEL,
  id: 'player-g-dorian',
  name: 'G Dorian',
  restriction: onlyKeyAndMode('G', 'Dorian'),
})

const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, MY_REEL, KEPT_TO_G_DORIAN]

/** The player's current settings: Bebop's controls at A Dorian, Jazz's levels, tempo 180. */
const SETTINGS: PresetSettings = {
  controls: makeGenerationControls({
    tempo: 180,
    tonalCenter: 'A',
    collection: 'Dorian',
    ...builtInPreset('bebop').controls,
    instrumentProfileId: 'bb-tenor',
  }),
  levels: JAZZ_FIGURE_LEVELS,
}

/** Intent: an id source handing out the given ids in turn. */
function idsFrom(...ids: string[]): () => string {
  return () => {
    const id = ids.shift()
    if (id === undefined) throw new Error('No id left.')
    return id
  }
}

/** Intent: a number of player presets, identified by their index. */
function playerPresets(count: number): readonly Preset[] {
  return Array.from({ length: count }, (_, index) =>
    makePreset({ ...MY_REEL, id: `p${index}`, name: `Preset ${index}` }),
  )
}

// @test-link [[module_preset_model]]
// @test-link [[rule_saving_preset_asks_its_restriction]]
describe('the save-as-new restriction choices', () => {
  it('offers "as now", only, any with a restriction in force holding a list', () => {
    const custom: PresetSelection = { kind: 'custom', baseId: 'reel' }
    expect(saveAsNewChoices(custom, 'A', 'Mixolydian', PRESETS)).toStrictEqual([
      { kind: 'asNow', restriction: builtInPreset('reel').restriction },
      onlyChoice('A', 'Mixolydian'),
      ANY_CHOICE,
    ])
    const reel: PresetSelection = { kind: 'preset', presetId: 'reel' }
    const [asNow] = saveAsNewChoices(reel, 'A', 'Mixolydian', PRESETS)
    expect(asNow?.restriction).toStrictEqual({ keys: 'any', modes: ['Mixolydian', 'Dorian'] })
  })

  it('keeps Dorian as now for a customised Modal (Dorian)', () => {
    const custom: PresetSelection = { kind: 'custom', baseId: 'modal-dorian' }
    expect(saveAsNewChoices(custom, 'E', 'Dorian', PRESETS)).toStrictEqual([
      { kind: 'asNow', restriction: { keys: 'any', modes: ['Dorian'] } },
      onlyChoice('E', 'Dorian'),
      ANY_CHOICE,
    ])
  })

  it('offers any, then only, with no restriction in force or one that is any', () => {
    const neutral: PresetSelection = { kind: 'preset', presetId: 'neutral' }
    const noBase: PresetSelection = { kind: 'custom', baseId: null }
    for (const selection of [neutral, noBase]) {
      expect(saveAsNewChoices(selection, 'C', 'Ionian', PRESETS)).toStrictEqual([
        ANY_CHOICE,
        onlyChoice('C', 'Ionian'),
      ])
    }
  })

  it('merges "as now" into any for Custom based on Reel with the key and mode outside', () => {
    const custom: PresetSelection = { kind: 'custom', baseId: 'reel' }
    expect(saveAsNewChoices(custom, 'A', 'Ionian', PRESETS)).toStrictEqual([
      ANY_CHOICE,
      onlyChoice('A', 'Ionian'),
    ])
  })

  it('offers only, then any, when the restriction in force is exactly the current pair', () => {
    const selection: PresetSelection = { kind: 'preset', presetId: 'player-g-dorian' }
    expect(saveAsNewChoices(selection, 'G', 'Dorian', PRESETS)).toStrictEqual([
      onlyChoice('G', 'Dorian'),
      ANY_CHOICE,
    ])
  })

  it('returns frozen choices', () => {
    const choices = saveAsNewChoices({ kind: 'custom', baseId: 'reel' }, 'D', 'Dorian', PRESETS)
    expect(Object.isFrozen(choices)).toBe(true)
    expect(Object.isFrozen(choices[1])).toBe(true)
  })
})

// @test-link [[rule_save_changes_restriction]]
describe('saving changes into a player preset', () => {
  it('asks nothing while the key and mode are inside its restriction', () => {
    expect(saveChangesQuestion(MY_REEL, 'D', 'Mixolydian')).toStrictEqual({ asks: false })
    expect(saveChangesQuestion(KEPT_TO_G_DORIAN, 'G', 'Dorian')).toStrictEqual({ asks: false })
  })

  it('asks any (as now) then only, once the key or mode lies outside', () => {
    expect(saveChangesQuestion(MY_REEL, 'D', 'Ionian')).toStrictEqual({
      asks: true,
      choices: [ANY_CHOICE, onlyChoice('D', 'Ionian')],
    })
    expect(saveChangesQuestion(KEPT_TO_G_DORIAN, 'A', 'Dorian')).toStrictEqual({
      asks: true,
      choices: [ANY_CHOICE, onlyChoice('A', 'Dorian')],
    })
  })

  it('replaces its values and keeps its restriction when none was asked', () => {
    const saved = presetWithSavedChanges(MY_REEL, SETTINGS, null)
    expect(saved).toStrictEqual({
      id: 'player-reel',
      name: 'My reel',
      controls: builtInPreset('bebop').controls,
      levels: JAZZ_FIGURE_LEVELS,
      restriction: MY_REEL.restriction,
      kind: 'player',
    })
    expect(Object.keys(saved.controls)).toEqual([...PRESET_HELD_CONTROL_KEYS])
    expect(Object.isFrozen(saved)).toBe(true)
  })

  it('takes the restriction answered when one was asked', () => {
    const saved = presetWithSavedChanges(KEPT_TO_G_DORIAN, SETTINGS, ANY_KEY_AND_MODE)
    expect(saved.restriction).toStrictEqual(ANY_KEY_AND_MODE)
    expect(saved.id).toBe('player-g-dorian')
    expect(selectionOfSavedPreset(saved)).toStrictEqual({
      kind: 'preset',
      presetId: 'player-g-dorian',
    })
  })

  it('never saves changes into a built-in preset', () => {
    const reel = builtInPreset('reel')
    expect(() => saveChangesQuestion(reel, 'A', 'Ionian')).toThrow(PresetModelError)
    expect(() => presetWithSavedChanges(reel, SETTINGS, null)).toThrow(PresetModelError)
  })
})

// @test-link [[rule_saving_preset_asks_its_restriction]]
// @test-link [[rule_player_preset_limit]]
describe('saving a new player preset', () => {
  const input = {
    name: 'Bebop in A',
    settings: SETTINGS,
    restriction: onlyKeyAndMode('A', 'Dorian'),
  }

  it('holds the ten controls, the levels and the restriction, under an injected id', () => {
    const preset = presetForSaveAsNew(input, idsFrom('new-1'), PRESETS)
    expect(preset).toStrictEqual({
      id: 'new-1',
      name: 'Bebop in A',
      controls: builtInPreset('bebop').controls,
      levels: JAZZ_FIGURE_LEVELS,
      restriction: { keys: ['A'], modes: ['Dorian'] },
      kind: 'player',
    })
    expect(Object.isFrozen(preset)).toBe(true)
    expect(selectionOfSavedPreset(preset)).toStrictEqual({ kind: 'preset', presetId: 'new-1' })
  })

  it('refuses an empty id, a built-in id and an existing id', () => {
    for (const id of ['', 'neutral', 'modal-dorian', 'player-reel']) {
      expect(() => presetForSaveAsNew(input, idsFrom(id), PRESETS)).toThrow(PresetModelError)
    }
  })

  it('refuses a new preset with 50 player presets loaded, and with 60, but not 49', () => {
    for (const count of [50, 60]) {
      const presets = [...BUILT_IN_PRESETS, ...playerPresets(count)]
      expect(() => presetForSaveAsNew(input, idsFrom('new-1'), presets)).toThrow(PresetModelError)
    }
    const fortyNine = [...BUILT_IN_PRESETS, ...playerPresets(49)]
    expect(presetForSaveAsNew(input, idsFrom('new-1'), fortyNine).id).toBe('new-1')
  })

  it('takes the name as given and refuses none beyond an empty one', () => {
    const preset = presetForSaveAsNew({ ...input, name: 'Neutral' }, idsFrom('n'), PRESETS)
    expect(preset.name).toBe('Neutral')
    expect(() => presetForSaveAsNew({ ...input, name: '' }, idsFrom('n'), PRESETS)).toThrow(
      PresetModelError,
    )
  })

  it("takes the levels from the player's settings", () => {
    const preset = presetForSaveAsNew(
      { ...input, settings: { ...SETTINGS, levels: NEUTRAL_FIGURE_LEVELS } },
      idsFrom('n'),
      PRESETS,
    )
    expect(preset.levels).toStrictEqual(NEUTRAL_FIGURE_LEVELS)
  })
})
