// @vitest-environment node
/**
 * The player presets composable over a real Idle session and faked preset saves: the list, what
 * the actions row offers, save as new, save changes and rename by the preset model's rules, and
 * what each saves (spec D387: the selection alone, and only when it changed).
 */
import { describe, expect, it } from 'vitest'

import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { ANY_KEY_AND_MODE, onlyKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import { makePreset, type Preset, type PresetSelection } from '@/domain/presets/preset-selection'

import {
  controlsOf,
  heldControls,
  LATE_NIGHT,
  manyPresets,
  rig,
  WARM_UP,
} from './player-presets-rig'

// @test-link [[module_player_presets]]
// @test-link [[rule_preset_management_actions]]
describe('the list and what the actions row offers', () => {
  // @test-link [[module_player_presets]]
  it('lists the built-ins, then the player presets', () => {
    const { presets } = rig()

    expect(presets.presets.value).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP])
  })

  // @test-link [[rule_preset_management_actions]]
  it('offers Save changes, Rename and Delete by selection, a built-in offering none', () => {
    const cases: [PresetSelection, boolean, boolean, Preset | null][] = [
      [{ kind: 'preset', presetId: 'jazz' }, false, false, null],
      [{ kind: 'preset', presetId: 'player-1' }, false, true, LATE_NIGHT],
      [{ kind: 'custom', baseId: 'jazz' }, false, false, null],
      [{ kind: 'custom', baseId: 'player-1' }, true, true, LATE_NIGHT],
      [{ kind: 'custom', baseId: null }, false, false, null],
    ]
    for (const [selection, saveChanges, renameAndDelete, actedOn] of cases) {
      const { presets } = rig({ selection })

      expect(presets.actedOn.value).toEqual(actedOn)
      expect(presets.canSaveChanges.value).toBe(saveChanges)
      expect(presets.canRename.value).toBe(renameAndDelete)
      expect(presets.canDelete.value).toBe(renameAndDelete)
    }
  })

  // @test-link [[rule_player_preset_limit]]
  it('refuses save as new at 50 player presets and more, 60 kept all listed', () => {
    const below = rig({
      playerPresets: manyPresets(49),
      selection: { kind: 'custom', baseId: null },
    })
    expect(below.presets.limitReached.value).toBe(false)

    for (const count of [50, 60]) {
      const kept = manyPresets(count)
      const { presets, fake, saves, state } = rig({
        playerPresets: kept,
        selection: { kind: 'custom', baseId: null },
      })

      expect(presets.presets.value).toEqual([...BUILT_IN_PRESETS, ...kept])
      expect(presets.limitReached.value).toBe(true)
      expect(presets.saveAsNew('One more', 'anyKeyAndMode')).toEqual({ status: 'limit-reached' })
      expect(state.presets).toHaveLength(8 + count)
      expect(fake.calls).toEqual([])
      expect(saves).toEqual([])
    }
  })
})

// @test-link [[rule_saving_preset_asks_its_restriction]]
// @test-link [[module_player_presets]]
describe('save as new', () => {
  // @test-link [[rule_saving_preset_asks_its_restriction]]
  // @test-link [[rule_preset_management_actions]]
  it('saves the preset-held settings under the trimmed name, a fresh id, selected, its record written and the selection alone saved', () => {
    const controls = controlsOf(builtInPreset('jazz'), { tension: 'Build', tempo: 150 })
    const { presets, fake, saves, state } = rig({
      controls,
      selection: { kind: 'preset', presetId: 'jazz' },
    })
    expect(presets.suggestedName.value).toBe('My preset')
    expect(presets.saveAsNewChoices.value.map((choice) => choice.kind)).toEqual([
      'anyKeyAndMode',
      'onlyThisKeyAndMode',
    ])

    const outcome = presets.saveAsNew('  Bebop practice  ', 'onlyThisKeyAndMode')

    const saved = makePreset({
      id: 'new-1',
      name: 'Bebop practice',
      controls: heldControls(controls) as unknown as Preset['controls'],
      levels: LATE_NIGHT.levels,
      restriction: onlyKeyAndMode('D', 'Dorian'),
      kind: 'player',
    })
    expect(outcome).toEqual({ status: 'applied', preset: saved })
    expect(state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP, saved])
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
    expect(state.controls).toBe(controls)
    expect(fake.calls).toEqual([{ method: 'savePreset', preset: saved }])
    expect(saves).toEqual([{ presetSelection: { kind: 'preset', presetId: 'new-1' } }])
  })

  // @test-link [[rule_saving_preset_asks_its_restriction]]
  it('from Custom based on Reel, "as now" keeps Mixolydian or Dorian', () => {
    const controls = controlsOf(builtInPreset('reel'), { tension: 'Build' })
    const { presets, state } = rig({ controls, selection: { kind: 'custom', baseId: 'reel' } })
    expect(presets.saveAsNewChoices.value.map((choice) => choice.kind)).toEqual([
      'asNow',
      'onlyThisKeyAndMode',
      'anyKeyAndMode',
    ])

    const outcome = presets.saveAsNew('Reel at Build', 'asNow')

    expect(outcome.status).toBe('applied')
    if (outcome.status !== 'applied') return
    expect(outcome.preset.restriction).toEqual(builtInPreset('reel').restriction)
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
  })

  // @test-link [[rule_player_preset_names]]
  it('refuses each refused name with its reason, changing and writing nothing', () => {
    const { presets, fake, saves, state } = rig()
    const refusals = [
      ['   ', { ok: false, reason: 'empty' }],
      ['x'.repeat(41), { ok: false, reason: 'tooLong' }],
      ['cUSTOM', { ok: false, reason: 'reserved' }],
      ['jazz', { ok: false, reason: 'taken', existingName: 'Jazz' }],
      [' late NIGHT ', { ok: false, reason: 'taken', existingName: 'Late night' }],
    ] as const

    for (const [typed, refusal] of refusals) {
      expect(presets.checkName(typed, 'new')).toEqual(refusal)
      expect(presets.saveAsNew(typed, 'anyKeyAndMode')).toEqual({
        status: 'name-refused',
        refusal,
      })
    }
    expect(presets.checkName('x'.repeat(40), 'new')).toEqual({ ok: true, name: 'x'.repeat(40) })
    expect(state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP])
    expect(fake.calls).toEqual([])
    expect(saves).toEqual([])
  })

  // @test-link [[rule_saving_preset_asks_its_restriction]]
  it('refuses a restriction choice it does not offer, a defect', () => {
    const { presets, state } = rig({ selection: { kind: 'custom', baseId: null } })

    expect(() => presets.saveAsNew('Mine', 'asNow')).toThrow(Error)
    expect(state.presets).toHaveLength(10)
  })

  // @test-link [[rule_player_preset_may_hold_unsupported_rhythm]]
  it('stores an unsupported rhythm combination unchanged; choosing it later sets it and blocks generation', async () => {
    const blocked = controlsOf(builtInPreset('neutral'), {
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
    })
    const { presets, session, state } = rig({
      controls: blocked,
      selection: { kind: 'custom', baseId: 'neutral' },
    })

    const outcome = presets.saveAsNew('Stuck', 'anyKeyAndMode')
    expect(outcome.status).toBe('applied')
    if (outcome.status !== 'applied') return
    expect(outcome.preset.controls).toEqual(heldControls(blocked))

    expect(session.actions.selectPreset('neutral')).toBe(true)
    expect(session.actions.selectPreset('new-1')).toBe(true)
    expect(heldControls(state.controls)).toEqual(heldControls(blocked))
    await expect(session.actions.generate()).resolves.toBe(false)
  })
})

// @test-link [[rule_save_changes_restriction]]
// @test-link [[module_player_presets]]
describe('save changes', () => {
  // @test-link [[rule_save_changes_restriction]]
  it('inside the base restriction saves in one click, keeping it, the base selected and the selection alone saved', () => {
    const controls = controlsOf(LATE_NIGHT, { register: 'High', collection: 'Dorian' })
    const { presets, fake, saves, state } = rig({
      controls,
      selection: { kind: 'custom', baseId: 'player-1' },
    })
    expect(presets.saveChangesChoices.value).toBeNull()

    const outcome = presets.saveChanges()

    const changed = makePreset({
      ...LATE_NIGHT,
      controls: heldControls(controls) as unknown as Preset['controls'],
    })
    expect(outcome).toEqual({ status: 'applied', preset: changed })
    expect(state.presets).toEqual([...BUILT_IN_PRESETS, changed, WARM_UP])
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
    expect(fake.calls).toEqual([{ method: 'savePreset', preset: changed }])
    expect(saves).toEqual([{ presetSelection: { kind: 'preset', presetId: 'player-1' } }])
  })

  // @test-link [[rule_save_changes_restriction]]
  it('outside it asks, "Any key and mode" first, and replaces the restriction with the answer', () => {
    for (const [choice, restriction] of [
      ['anyKeyAndMode', ANY_KEY_AND_MODE],
      ['onlyThisKeyAndMode', onlyKeyAndMode('G', 'Ionian')],
    ] as const) {
      const controls = controlsOf(LATE_NIGHT, { tonalCenter: 'G', collection: 'Ionian' })
      const { presets, state } = rig({
        controls,
        selection: { kind: 'custom', baseId: 'player-1' },
      })
      expect(presets.saveChangesChoices.value?.map((offered) => offered.kind)).toEqual([
        'anyKeyAndMode',
        'onlyThisKeyAndMode',
      ])
      expect(() => presets.saveChanges()).toThrow(Error)

      const outcome = presets.saveChanges(choice)

      expect(outcome.status).toBe('applied')
      if (outcome.status !== 'applied') return
      expect(outcome.preset.restriction).toEqual(restriction)
      expect(state.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
    }
  })

  // @test-link [[rule_save_changes_restriction]]
  it('of the selected preset saves no setting', () => {
    const { presets, fake, saves } = rig()

    expect(presets.saveChanges().status).toBe('applied')

    expect(fake.calls.map((call) => call.method)).toEqual(['savePreset'])
    expect(saves).toEqual([])
  })

  // @test-link [[rule_preset_management_actions]]
  it('never saves into a built-in: with no player preset acted on it is a defect', () => {
    const { presets, fake } = rig({ selection: { kind: 'custom', baseId: 'jazz' } })

    expect(() => presets.saveChanges()).toThrow(Error)
    expect(() => presets.rename('Jazzier')).toThrow(Error)
    expect(fake.calls).toEqual([])
  })
})

// @test-link [[rule_player_preset_names]]
// @test-link [[rule_custom_names_its_base]]
describe('rename', () => {
  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_player_presets_saved_on_device]]
  it("keeps the selection and Custom's base, writes the record and saves no setting", () => {
    for (const selection of [
      { kind: 'preset', presetId: 'player-1' },
      { kind: 'custom', baseId: 'player-1' },
    ] as const) {
      const { presets, fake, saves, state } = rig({ selection })

      const outcome = presets.rename(' Late night blues ')

      const renamed = makePreset({ ...LATE_NIGHT, name: 'Late night blues' })
      expect(outcome).toEqual({ status: 'applied', preset: renamed })
      expect(state.presets).toEqual([...BUILT_IN_PRESETS, renamed, WARM_UP])
      expect(state.selection).toEqual(selection)
      expect(fake.calls).toEqual([{ method: 'saveRenamedPreset', preset: renamed }])
      expect(saves).toEqual([])
    }
  })

  // @test-link [[rule_player_preset_names]]
  it('takes a change of letter case alone as a rename; the same name changes and writes nothing', () => {
    const { presets, fake, state } = rig()

    expect(presets.checkName('late night', 'rename')).toEqual({ ok: true, name: 'late night' })
    expect(presets.rename('Late night ')).toEqual({ status: 'unchanged' })
    expect(fake.calls).toEqual([])

    expect(presets.rename('LATE NIGHT').status).toBe('applied')
    expect(state.presets.at(8)?.name).toBe('LATE NIGHT')
  })

  // @test-link [[rule_player_preset_names]]
  it("refuses another preset's name, a built-in's included, with its reason", () => {
    const { presets, fake } = rig()

    expect(presets.rename('warm-UP')).toEqual({
      status: 'name-refused',
      refusal: { ok: false, reason: 'taken', existingName: 'Warm-up' },
    })
    expect(presets.rename('Bebop')).toEqual({
      status: 'name-refused',
      refusal: { ok: false, reason: 'taken', existingName: 'Bebop' },
    })
    expect(fake.calls).toEqual([])
  })
})
