// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  COLLECTIONS,
  makeGenerationControls,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
} from '@/domain/figures/figure-levels'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import {
  ANY_KEY_AND_MODE,
  makeKeyAndModeRestriction,
  onlyKeyAndMode,
  type KeyAndModeRestriction,
} from '@/domain/presets/key-and-mode-restriction'
import {
  choosePreset,
  findPreset,
  makePreset,
  PRESET_HELD_CONTROL_KEYS,
  PresetModelError,
  restrictionInForce,
  selectionAfterChange,
  selectionAfterDeleting,
  type Preset,
  type PresetSelection,
  type PresetSettings,
  type SettingChange,
} from '@/domain/presets/preset-selection'
import { createMulberry32, type Mulberry32Generator } from '@/domain/random/prng'

/** A player preset kept to the one pair G Dorian (B6.3's last example). */
const KEPT_TO_G_DORIAN: Preset = makePreset({
  id: 'player-g-dorian',
  name: 'Kept to G Dorian',
  controls: builtInPreset('bebop').controls,
  levels: JAZZ_FIGURE_LEVELS,
  restriction: onlyKeyAndMode('G', 'Dorian'),
  kind: 'player',
})

/** A player preset restricting keys only, a form no built-in uses. */
const KEYS_D_OR_A: Preset = makePreset({
  id: 'player-d-or-a',
  name: 'D or A',
  controls: builtInPreset('gentle').controls,
  levels: NEUTRAL_FIGURE_LEVELS,
  restriction: makeKeyAndModeRestriction({ keys: ['D', 'A'], modes: 'any' }),
  kind: 'player',
})

const PRESETS: readonly Preset[] = [...BUILT_IN_PRESETS, KEPT_TO_G_DORIAN, KEYS_D_OR_A]

/** Intent: the player's settings at a written key and collection, other controls at Neutral's. */
function settingsAt(key: PitchClass, mode: Collection): PresetSettings {
  return {
    controls: makeGenerationControls({
      tempo: 120,
      tonalCenter: key,
      collection: mode,
      ...builtInPreset('neutral').controls,
      instrumentProfileId: 'bb-tenor',
    }),
    levels: NEUTRAL_FIGURE_LEVELS,
  }
}

/** Intent: the written key and collection of settings, as "G Dorian". */
function keyAndMode(settings: PresetSettings): string {
  return `${settings.controls.tonalCenter} ${settings.controls.collection}`
}

/** Intent: one entry picked from a list by the seeded generator. */
function pick<T>(random: Mulberry32Generator, list: readonly T[]): T {
  const entry = list[random.nextUint32() % list.length]
  if (entry === undefined) throw new Error('Cannot pick from an empty list.')
  return entry
}

/** Intent: whether a restriction half allows a value, worked out independently of the module. */
function halfAllows<T>(half: 'any' | readonly T[], value: T): boolean {
  return half === 'any' || half.includes(value)
}

/** Intent: the reference model's restriction in force, from the selection, key and mode alone. */
function modelInForce(
  selection: PresetSelection,
  key: PitchClass,
  mode: Collection,
): KeyAndModeRestriction | null {
  const id = selection.kind === 'preset' ? selection.presetId : selection.baseId
  const preset = PRESETS.find((candidate) => candidate.id === id)
  if (preset === undefined) return null
  const inside =
    halfAllows(preset.restriction.keys, key) && halfAllows(preset.restriction.modes, mode)
  return inside ? preset.restriction : null
}

/** One step of a random sequence: choosing a preset, or a change and the settings after it. */
type Step =
  | { readonly kind: 'choose'; readonly preset: Preset }
  | { readonly kind: 'change'; readonly change: SettingChange; readonly after: PresetSettings }

/** Intent: one random step from the current settings, every kind about as likely. */
function randomStep(random: Mulberry32Generator, { controls, levels }: PresetSettings): Step {
  /** Intent: a change step, the settings after it being the current ones with `after` laid over. */
  const change = (change: SettingChange, after: Partial<PresetSettings>): Step => ({
    kind: 'change',
    change,
    after: { controls, levels, ...after },
  })
  const key = pick(random, PITCH_CLASSES)
  const mode = pick(random, COLLECTIONS)
  switch (random.nextUint32() % 7) {
    case 0:
      return { kind: 'choose', preset: pick(random, PRESETS) }
    case 1: {
      const control = pick(random, PRESET_HELD_CONTROL_KEYS)
      const value = pick(random, PRESETS).controls[control]
      return change(
        { kind: 'presetHeldControl', control },
        { controls: { ...controls, [control]: value } },
      )
    }
    case 2: {
      const figure = pick(random, FIGURE_IDS)
      const level = pick(random, FIGURE_LEVEL_IDS)
      return change({ kind: 'figureLevel', figure }, { levels: { ...levels, [figure]: level } })
    }
    case 3:
      return change(
        { kind: 'notPresetHeld' },
        { controls: { ...controls, tempo: pick(random, [60, 140, 240]) } },
      )
    case 4:
      return change(
        { kind: 'notPresetHeld' },
        { controls: { ...controls, instrumentProfileId: 'eb-alto' } },
      )
    case 5:
      return change(
        { kind: 'keyOrMode', key, mode: controls.collection },
        { controls: { ...controls, tonalCenter: key } },
      )
    default:
      return change(
        { kind: 'keyOrMode', key: controls.tonalCenter, mode },
        { controls: { ...controls, collection: mode } },
      )
  }
}

/** Intent: the reference model's selection after a change, never comparing values. */
function modelSelectionAfter(selection: PresetSelection, change: SettingChange): PresetSelection {
  if (selection.kind === 'custom' || change.kind === 'notPresetHeld') return selection
  const custom: PresetSelection = { kind: 'custom', baseId: selection.presetId }
  if (change.kind !== 'keyOrMode') return custom
  return modelInForce(selection, change.key, change.mode) === null ? custom : selection
}

/** Intent: check what choosing a preset did against the reference model. */
function expectChosen(
  before: { readonly settings: PresetSettings; readonly selection: PresetSelection },
  preset: Preset,
  after: { readonly settings: PresetSettings; readonly selection: PresetSelection },
): void {
  if (before.selection.kind === 'preset' && before.selection.presetId === preset.id) {
    expect(after.settings).toBe(before.settings)
    expect(after.selection).toBe(before.selection)
    return
  }
  const { keys, modes } = preset.restriction
  const key = before.settings.controls.tonalCenter
  const mode = before.settings.controls.collection
  expect(after.selection).toStrictEqual({ kind: 'preset', presetId: preset.id })
  expect(after.settings.controls).toStrictEqual({
    ...before.settings.controls,
    ...preset.controls,
    tonalCenter: keys === 'any' || keys.includes(key) ? key : keys[0],
    collection: modes === 'any' || modes.includes(mode) ? mode : modes[0],
  })
  expect(after.settings.levels).toStrictEqual(preset.levels)
}

// @test-link [[module_preset_model]]
// @test-link [[rule_preset_contents]]
describe('making a preset', () => {
  const valid: Preset = {
    id: 'player-1',
    name: 'Warm-up',
    controls: builtInPreset('gentle').controls,
    levels: NEUTRAL_FIGURE_LEVELS,
    restriction: ANY_KEY_AND_MODE,
    kind: 'player',
  }

  it('holds the ten preset-held controls, in order, frozen', () => {
    expect(PRESET_HELD_CONTROL_KEYS).toEqual([
      'harmonicMotion',
      'tension',
      'noteDensity',
      'rhythmicVariety',
      'syncopation',
      'silenceDensity',
      'contour',
      'register',
      'leapiness',
      'arpeggioChaos',
    ])
    expect(Object.isFrozen(PRESET_HELD_CONTROL_KEYS)).toBe(true)
  })

  it('returns a deep-frozen preset holding exactly its six fields', () => {
    const preset = makePreset(valid)
    expect(preset).toStrictEqual(valid)
    expect(Object.keys(preset)).toEqual(['id', 'name', 'controls', 'levels', 'restriction', 'kind'])
    expect(Object.isFrozen(preset)).toBe(true)
    expect(Object.isFrozen(preset.controls)).toBe(true)
  })

  it('carries over no other setting: no tempo, key, mode or instrument, no extra field', () => {
    const settings = settingsAt('G', 'Dorian')
    const preset = makePreset({
      ...valid,
      controls: settings.controls,
      ...{ tempo: 120, extra: true },
    } as Preset)
    expect(Object.keys(preset)).toEqual(['id', 'name', 'controls', 'levels', 'restriction', 'kind'])
    expect(Object.keys(preset.controls)).toEqual([...PRESET_HELD_CONTROL_KEYS])
  })

  it('refuses an unknown or missing control value', () => {
    const unknown = { ...valid, controls: { ...valid.controls, tension: 'Huge' } }
    expect(() => makePreset(unknown as Preset)).toThrow(PresetModelError)
    expect(() => makePreset(unknown as Preset)).toThrow(/Tension/u)
    const { contour, ...missing } = valid.controls
    void contour
    expect(() => makePreset({ ...valid, controls: missing } as Preset)).toThrow(PresetModelError)
    expect(() => makePreset({ ...valid, controls: null } as unknown as Preset)).toThrow(
      PresetModelError,
    )
  })

  it('refuses bad figure levels and a bad restriction', () => {
    const levels = { ...NEUTRAL_FIGURE_LEVELS, passingTone: 'always' }
    expect(() => makePreset({ ...valid, levels } as unknown as Preset)).toThrow(PresetModelError)
    const restriction = { keys: 'any', modes: [] }
    expect(() => makePreset({ ...valid, restriction } as unknown as Preset)).toThrow(
      PresetModelError,
    )
  })

  it('refuses an empty id or name and an unknown kind', () => {
    expect(() => makePreset({ ...valid, id: '' })).toThrow(PresetModelError)
    expect(() => makePreset({ ...valid, name: '' })).toThrow(PresetModelError)
    expect(() => makePreset({ ...valid, name: 3 } as unknown as Preset)).toThrow(PresetModelError)
    expect(() => makePreset({ ...valid, kind: 'shared' } as unknown as Preset)).toThrow(
      PresetModelError,
    )
  })

  it('finds a preset by its id', () => {
    expect(findPreset(PRESETS, 'reel')).toBe(builtInPreset('reel'))
    expect(findPreset(PRESETS, 'player-g-dorian')).toBe(KEPT_TO_G_DORIAN)
    expect(findPreset(PRESETS, 'Reel')).toBeUndefined()
  })
})

// @test-link [[rule_choosing_preset_sets_its_settings]]
// @test-link [[rule_choosing_preset_keeps_allowed_key_and_mode]]
describe('choosing a preset', () => {
  const fromJazz: PresetSelection = { kind: 'preset', presetId: 'jazz' }

  it.each([
    { from: ['G', 'Ionian'], preset: builtInPreset('modal-dorian'), to: 'G Dorian' },
    { from: ['A', 'Aeolian'], preset: builtInPreset('reel'), to: 'A Mixolydian' },
    { from: ['A', 'Dorian'], preset: builtInPreset('reel'), to: 'A Dorian' },
    { from: ['C', 'Ionian'], preset: builtInPreset('pop-song'), to: 'C Major' },
    { from: ['E', 'Ionian'], preset: KEPT_TO_G_DORIAN, to: 'G Dorian' },
  ] as const)('gives B6.3: $from.0 $from.1 and $preset.name give $to', ({ from, preset, to }) => {
    const chosen = choosePreset(settingsAt(from[0], from[1]), fromJazz, preset)
    expect(keyAndMode(chosen.settings)).toBe(to)
    expect(chosen.selection).toStrictEqual({ kind: 'preset', presetId: preset.id })
  })

  it('never moves the key or mode for a preset whose restriction is any', () => {
    for (const id of ['neutral', 'jazz', 'gentle', 'speed-drill'] as const) {
      const preset = builtInPreset(id)
      for (const key of PITCH_CLASSES) {
        for (const mode of COLLECTIONS) {
          const chosen = choosePreset(settingsAt(key, mode), fromJazz, preset)
          expect(keyAndMode(chosen.settings)).toBe(`${key} ${mode}`)
        }
      }
    }
  })

  it('sets all ten controls and seven levels, never the tempo or the instrument', () => {
    const settings = settingsAt('D', 'Lydian')
    const before = {
      settings: {
        controls: { ...settings.controls, tempo: 200, instrumentProfileId: 'eb-alto' as const },
        levels: JAZZ_FIGURE_LEVELS,
      },
      selection: fromJazz,
    }
    const speed = builtInPreset('speed-drill')
    const chosen = choosePreset(before.settings, before.selection, speed)
    expectChosen(before, speed, chosen)
    expect(chosen.settings.controls.tempo).toBe(200)
    expect(chosen.settings.controls.instrumentProfileId).toBe('eb-alto')
    expect(Object.isFrozen(chosen)).toBe(true)
    expect(Object.isFrozen(chosen.settings.controls)).toBe(true)
  })

  it('changes nothing when the preset is already selected, outside Custom', () => {
    const settings = { ...settingsAt('B', 'Locrian'), levels: JAZZ_FIGURE_LEVELS }
    const selection: PresetSelection = { kind: 'preset', presetId: 'reel' }
    const chosen = choosePreset(settings, selection, builtInPreset('reel'))
    expect(chosen.settings).toBe(settings)
    expect(chosen.selection).toBe(selection)
    expect(Object.isFrozen(settings)).toBe(false)
    expect(Object.isFrozen(selection)).toBe(false)
  })

  it("applies Custom's base when it is chosen from Custom, like any other preset", () => {
    const settings = settingsAt('C', 'Ionian')
    const changed = { ...settings, controls: { ...settings.controls, tension: 'Edge' as const } }
    const fromCustom = { settings: changed, selection: { kind: 'custom', baseId: 'reel' } as const }
    const chosen = choosePreset(changed, fromCustom.selection, builtInPreset('reel'))
    expectChosen(fromCustom, builtInPreset('reel'), chosen)
    expect(keyAndMode(chosen.settings)).toBe('C Mixolydian')
    expect(chosen.settings.controls.tension).toBe('Settled')
  })
})

// @test-link [[rule_custom_selection]]
// @test-link [[rule_restriction_in_force]]
describe('Custom and the restriction in force over random action sequences', () => {
  it.each([1, 42, 2026, 0xdecaf])('follows the reference model, seed %i', (seed) => {
    const random = createMulberry32(seed)
    let settings = settingsAt('C', 'Ionian')
    let selection: PresetSelection = { kind: 'preset', presetId: 'neutral' }
    let customsSeen = 0
    for (let index = 0; index < 300; index += 1) {
      const step = randomStep(random, settings)
      const before = { settings, selection }
      if (step.kind === 'choose') {
        const chosen = choosePreset(settings, selection, step.preset)
        expectChosen(before, step.preset, chosen)
        ;({ settings, selection } = chosen)
      } else {
        settings = step.after
        selection = selectionAfterChange(selection, step.change, PRESETS)
        const expected = modelSelectionAfter(before.selection, step.change)
        expect(selection).toStrictEqual(expected)
        if (before.selection.kind === 'custom' || expected === before.selection) {
          expect(selection).toBe(before.selection)
        }
      }
      if (selection.kind === 'custom') customsSeen += 1
      const { tonalCenter, collection } = settings.controls
      expect(restrictionInForce(selection, tonalCenter, collection, PRESETS)).toStrictEqual(
        modelInForce(selection, tonalCenter, collection),
      )
    }
    expect(customsSeen).toBeGreaterThan(0)
  })
})

// @test-link [[rule_custom_selection]]
// @test-link [[rule_restriction_in_force]]
describe('Custom and the restriction in force, case by case', () => {
  const reelSelected: PresetSelection = { kind: 'preset', presetId: 'reel' }
  const customOfReel: PresetSelection = { kind: 'custom', baseId: 'reel' }
  const reel = builtInPreset('reel')

  it('stays Custom when a value is changed back by hand', () => {
    const afterBuild = selectionAfterChange(
      { kind: 'preset', presetId: 'neutral' },
      { kind: 'presetHeldControl', control: 'tension' },
      PRESETS,
    )
    expect(afterBuild).toStrictEqual({ kind: 'custom', baseId: 'neutral' })
    const backToLift = selectionAfterChange(
      afterBuild,
      { kind: 'presetHeldControl', control: 'tension' },
      PRESETS,
    )
    expect(backToLift).toBe(afterBuild)
  })

  it('makes Custom for a figure level, never for tempo or instrument', () => {
    expect(
      selectionAfterChange(reelSelected, { kind: 'figureLevel', figure: 'appoggiatura' }, PRESETS),
    ).toStrictEqual(customOfReel)
    expect(selectionAfterChange(reelSelected, { kind: 'notPresetHeld' }, PRESETS)).toBe(
      reelSelected,
    )
  })

  it('makes Custom for a key or mode outside the restriction, never inside', () => {
    const inside = { kind: 'keyOrMode', key: 'F#', mode: 'Dorian' } as const
    const outside = { kind: 'keyOrMode', key: 'A', mode: 'Ionian' } as const
    expect(selectionAfterChange(reelSelected, inside, PRESETS)).toBe(reelSelected)
    expect(selectionAfterChange(reelSelected, outside, PRESETS)).toStrictEqual(customOfReel)
    expect(selectionAfterChange(customOfReel, inside, PRESETS)).toBe(customOfReel)
  })

  it('keeps the restriction in force through an edit, drops it outside, brings it back inside', () => {
    expect(restrictionInForce(reelSelected, 'A', 'Mixolydian', PRESETS)).toBe(reel.restriction)
    expect(restrictionInForce(customOfReel, 'A', 'Mixolydian', PRESETS)).toBe(reel.restriction)
    expect(restrictionInForce(customOfReel, 'A', 'Ionian', PRESETS)).toBeNull()
    const backInside = selectionAfterChange(
      customOfReel,
      { kind: 'keyOrMode', key: 'A', mode: 'Dorian' },
      PRESETS,
    )
    expect(backInside).toBe(customOfReel)
    expect(restrictionInForce(backInside, 'A', 'Dorian', PRESETS)).toBe(reel.restriction)
  })

  it('has none in force once either half is left', () => {
    const selection: PresetSelection = { kind: 'preset', presetId: 'player-g-dorian' }
    expect(restrictionInForce(selection, 'G', 'Dorian', PRESETS)).toBe(KEPT_TO_G_DORIAN.restriction)
    expect(restrictionInForce(selection, 'A', 'Dorian', PRESETS)).toBeNull()
    expect(restrictionInForce(selection, 'G', 'Aeolian', PRESETS)).toBeNull()
    const keysOnly: PresetSelection = { kind: 'custom', baseId: 'player-d-or-a' }
    expect(restrictionInForce(keysOnly, 'A', 'Locrian', PRESETS)).toBe(KEYS_D_OR_A.restriction)
    expect(restrictionInForce(keysOnly, 'E', 'Locrian', PRESETS)).toBeNull()
  })

  it('has none in force for Custom with no base, or an id not found', () => {
    const noBase: PresetSelection = { kind: 'custom', baseId: null }
    expect(restrictionInForce(noBase, 'C', 'Ionian', PRESETS)).toBeNull()
    expect(restrictionInForce({ kind: 'custom', baseId: 'gone' }, 'C', 'Ionian', PRESETS)).toBe(
      null,
    )
    expect(restrictionInForce({ kind: 'preset', presetId: 'gone' }, 'C', 'Ionian', PRESETS)).toBe(
      null,
    )
    expect(
      selectionAfterChange(noBase, { kind: 'presetHeldControl', control: 'contour' }, PRESETS),
    ).toBe(noBase)
  })

  it('with a selected id not found, keeps it for a key or mode, makes Custom for a held setting', () => {
    const gone: PresetSelection = { kind: 'preset', presetId: 'gone' }
    const keyChange = { kind: 'keyOrMode', key: 'D', mode: 'Phrygian' } as const
    expect(selectionAfterChange(gone, keyChange, PRESETS)).toBe(gone)
    expect(
      selectionAfterChange(gone, { kind: 'presetHeldControl', control: 'register' }, PRESETS),
    ).toStrictEqual({ kind: 'custom', baseId: 'gone' })
  })
})

// @test-link [[rule_deleting_base_preset_leaves_custom]]
describe('deleting a preset', () => {
  it('leaves Custom with no base when the selected preset is deleted', () => {
    const selection: PresetSelection = { kind: 'preset', presetId: 'player-g-dorian' }
    const after = selectionAfterDeleting(selection, 'player-g-dorian')
    expect(after).toStrictEqual({ kind: 'custom', baseId: null })
    expect(Object.isFrozen(after)).toBe(true)
  })

  it("leaves Custom with no base when Custom's base is deleted", () => {
    const selection: PresetSelection = { kind: 'custom', baseId: 'player-g-dorian' }
    expect(selectionAfterDeleting(selection, 'player-g-dorian')).toStrictEqual({
      kind: 'custom',
      baseId: null,
    })
  })

  it('changes nothing when another preset is deleted', () => {
    for (const selection of [
      { kind: 'preset', presetId: 'player-g-dorian' },
      { kind: 'custom', baseId: 'reel' },
      { kind: 'custom', baseId: null },
    ] as const satisfies readonly PresetSelection[]) {
      expect(selectionAfterDeleting(selection, 'player-d-or-a')).toBe(selection)
    }
    const unfrozen: PresetSelection = { kind: 'custom', baseId: 'reel' }
    selectionAfterDeleting(unfrozen, 'player-d-or-a')
    selectionAfterChange(unfrozen, { kind: 'notPresetHeld' }, PRESETS)
    expect(Object.isFrozen(unfrozen)).toBe(false)
  })
})
