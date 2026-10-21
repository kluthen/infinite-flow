// @vitest-environment node
/**
 * The player presets composable over a real Idle session and faked preset saves: deletion, a
 * refused save, the actions during Loading and during a session, and a visit that saves nothing,
 * with what each saves (spec D387).
 */
import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { SaveOutcome } from '@/storage/save-policy'

import { createDeferred, flushAsync } from '../../composables/fit-session-harness'
import { LATE_NIGHT, rig, WARM_UP } from './player-presets-rig'

// @test-link [[rule_deleting_base_preset_leaves_custom]]
// @test-link [[module_player_presets]]
describe('delete', () => {
  // @test-link [[rule_deleting_base_preset_leaves_custom]]
  it('of the selection leaves Custom with no base and the same values, once its record is deleted, the selection alone saved', async () => {
    for (const selection of [
      { kind: 'preset', presetId: 'player-1' },
      { kind: 'custom', baseId: 'player-1' },
    ] as const) {
      const { presets, fake, saves, state } = rig({ selection })
      const controls = state.controls
      const deleting = createDeferred<SaveOutcome>()
      fake.control.pending = deleting

      const outcome = presets.deletePreset('player-1')
      await flushAsync()
      expect(state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP])
      expect(state.selection).toEqual(selection)
      deleting.resolve('saved')

      await expect(outcome).resolves.toBe('deleted')
      expect(fake.calls).toEqual([{ method: 'deletePreset', id: 'player-1' }])
      expect(state.presets).toEqual([...BUILT_IN_PRESETS, WARM_UP])
      expect(state.selection).toEqual({ kind: 'custom', baseId: null })
      expect(state.controls).toBe(controls)
      expect(saves).toEqual([{ presetSelection: { kind: 'custom', baseId: null } }])
    }
  })

  // @test-link [[rule_deleting_base_preset_leaves_custom]]
  it('of another preset leaves the selection as it is and saves no setting', async () => {
    const { presets, saves, state } = rig()

    await expect(presets.deletePreset('player-2')).resolves.toBe('deleted')

    expect(state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT])
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
    expect(saves).toEqual([])
  })

  // @test-link [[module_player_presets]]
  it('that fails, or finds saving turned off, changes and saves nothing', async () => {
    for (const [stored, outcome] of [
      ['failed', 'failed'],
      ['skipped', 'saving-off'],
    ] as const) {
      const { presets, fake, saves, state } = rig()
      fake.control.outcome = stored

      await expect(presets.deletePreset('player-1')).resolves.toBe(outcome)

      expect(state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP])
      expect(state.selection).toEqual({ kind: 'preset', presetId: 'player-1' })
      expect(saves).toEqual([])
    }
  })

  // @test-link [[rule_preset_management_actions]]
  it('of a built-in or an id no preset has is a defect', async () => {
    const { presets, fake } = rig()

    await expect(presets.deletePreset('jazz')).rejects.toThrow(Error)
    await expect(presets.deletePreset('player-9')).rejects.toThrow(Error)
    expect(fake.calls).toEqual([])
  })
})

// @test-link [[rule_refused_preset_save_told]]
describe('a refused save', () => {
  // @test-link [[rule_refused_preset_save_told]]
  // @test-link [[module_player_presets]]
  it('keeps the preset for the visit, still saves the selection, and tells the notice its name at once', async () => {
    const { presets, fake, saves, state, refused } = rig()
    fake.control.outcome = 'failed'

    const outcome = presets.saveAsNew('Kept anyway', 'anyKeyAndMode')
    expect(refused).toEqual([])
    await flushAsync()

    expect(outcome.status).toBe('applied')
    expect(state.presets.at(-1)?.name).toBe('Kept anyway')
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
    expect(saves).toEqual([{ presetSelection: { kind: 'preset', presetId: 'new-1' } }])
    expect(refused).toEqual(['Kept anyway'])
  })

  // @test-link [[rule_refused_preset_save_told]]
  it('of changes or of a rename is told too, under the name it was saved under', async () => {
    const { presets, fake, refused } = rig({ selection: { kind: 'custom', baseId: 'player-1' } })
    fake.control.outcome = 'failed'

    presets.saveChanges()
    presets.rename('Late night blues')
    await flushAsync()

    expect(refused).toEqual(['Late night', 'Late night blues'])
  })

  // @test-link [[rule_refused_preset_save_told]]
  it('is not told for a write saved, held or skipped', async () => {
    for (const stored of ['saved', 'held', 'skipped'] as const) {
      const { presets, fake, refused } = rig()
      fake.control.outcome = stored

      presets.saveAsNew('Fine', 'anyKeyAndMode')
      await flushAsync()

      expect(refused).toEqual([])
    }
  })
})

// @test-link [[module_player_presets]]
// @test-link [[rule_preset_management_actions]]
describe('when the actions apply', () => {
  // @test-link [[rule_preset_management_actions]]
  it('refuses every action while a session runs, count-in included, changing and writing nothing', async () => {
    for (const phase of ['count-in', 'running'] as const) {
      const built = rig({ selection: { kind: 'custom', baseId: 'player-1' } })
      built.phase.value = phase

      expect(built.presets.sessionActive.value).toBe(true)
      expect(built.presets.saveAsNew('New', 'anyKeyAndMode')).toEqual({
        status: 'session-running',
      })
      expect(built.presets.saveChanges()).toEqual({ status: 'session-running' })
      expect(built.presets.rename('Renamed')).toEqual({ status: 'session-running' })
      await expect(built.presets.deletePreset('player-1')).resolves.toBe('session-running')

      expect(built.state.presets).toEqual([...BUILT_IN_PRESETS, LATE_NIGHT, WARM_UP])
      expect(built.state.selection).toEqual({ kind: 'custom', baseId: 'player-1' })
      expect(built.fake.calls).toEqual([])
      expect(built.saves).toEqual([])
    }
  })

  // @test-link [[rule_preset_management_actions]]
  it('applies at Idle, the controller not yet loaded counting as no session', () => {
    const built = rig()
    built.phase.value = null

    expect(built.presets.sessionActive.value).toBe(false)
    expect(built.presets.rename('Renamed').status).toBe('applied')
  })

  // @test-link [[module_player_presets]]
  // @test-link [[service_idle_generation_session]]
  it('works during Loading, changes no setting and leaves the generation in flight to finish', async () => {
    const pending = createDeferred<GenerationIntent>()
    const built = rig({
      selection: { kind: 'custom', baseId: 'player-1' },
      generate: () => pending.promise,
    })
    const generating = built.session.actions.generate()
    expect(built.state.operation).toBe('generating')
    const controls = built.state.controls
    const levels = built.state.figureLevels

    expect(built.presets.saveChanges().status).toBe('applied')
    expect(built.presets.rename('Late night blues').status).toBe('applied')
    expect(built.presets.saveAsNew('Loading idea', 'anyKeyAndMode').status).toBe('applied')
    await expect(built.presets.deletePreset('player-2')).resolves.toBe('deleted')

    expect(built.state.controls).toBe(controls)
    expect(built.state.figureLevels).toBe(levels)
    expect(built.saves).toEqual([
      { presetSelection: { kind: 'preset', presetId: 'player-1' } },
      { presetSelection: { kind: 'preset', presetId: 'new-1' } },
    ])
    expect(built.generated).toHaveLength(1)
    const [intent] = built.generated
    if (intent === undefined) throw new Error('no generation started')
    pending.resolve(intent)
    await expect(generating).resolves.toBe(true)
    expect(built.state.result).toBe(intent)
    expect(built.generated).toHaveLength(1)
  })
})

// @test-link [[rule_presets_in_visits_that_save_nothing]]
describe('a visit that saves nothing', () => {
  // @test-link [[rule_presets_in_visits_that_save_nothing]]
  it('makes, changes and renames presets for the page, writing nothing and offering no deletion', async () => {
    const { presets, fake, savingOff, state } = rig({
      selection: { kind: 'custom', baseId: 'player-1' },
    })
    savingOff.value = true

    expect(presets.savingOff.value).toBe(true)
    expect(presets.canDelete.value).toBe(false)
    expect(presets.canRename.value).toBe(true)
    expect(presets.saveChanges().status).toBe('applied')
    expect(presets.rename('Late night blues').status).toBe('applied')
    expect(presets.saveAsNew('Page only', 'anyKeyAndMode').status).toBe('applied')
    await expect(presets.deletePreset('player-2')).rejects.toThrow(Error)

    expect(state.presets.map((preset) => preset.name).slice(8)).toEqual([
      'Late night blues',
      'Warm-up',
      'Page only',
    ])
    expect(state.selection).toEqual({ kind: 'preset', presetId: 'new-1' })
    expect(fake.calls).toEqual([])
  })
})
