// @vitest-environment node
/**
 * The player presets' saves among the visit's saves: each writes one whole preset record, or
 * deletes one, through the visit's save policy, resolving what became of it; a save as new and a
 * save of changes ask for persistent storage, once per visit; a rename and a deletion never ask;
 * the selection is never saved here. Over a real save policy on an in-memory IndexedDB.
 */
import { describe, expect, it } from 'vitest'

import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { decodePlayerPresets, encodePresetRecord } from '@/storage/records/preset-record'
import { createSavePolicy, type SavePolicy } from '@/storage/save-policy'
import { createVisitSaves } from '@/storage/settings-saver'
import type { StoragePort } from '@/storage/storage-port'

import { PAGE_STAYS, recordingPolicy } from './recording-save-policy'
import { outdatedPort, readyPort, recordFailures, refusingPort } from './save-policy-doubles'
import { freshFactory, recordingManager, TEST_APP_VERSION } from './storage-test-doubles'

/** A player preset as a save as new makes one: Jazz's controls at Build, Dorian only. */
const LATE_NIGHT: Preset = makePreset({
  id: 'player-1',
  name: 'Late night',
  controls: { ...builtInPreset('jazz').controls, tension: 'Build' },
  levels: { ...NEUTRAL_FIGURE_LEVELS, chromaticApproach: 'favored' },
  restriction: { keys: 'any', modes: ['Dorian'] },
  kind: 'player',
})

/** A second player preset: Neutral's values, any key and mode. */
const WARM_UP: Preset = makePreset({
  id: 'player-2',
  name: 'Warm-up',
  controls: builtInPreset('neutral').controls,
  levels: NEUTRAL_FIGURE_LEVELS,
  restriction: { keys: 'any', modes: 'any' },
  kind: 'player',
})

/**
 * Intent: the visit's saves over a real policy on a ready port (refusable on demand) holding
 * `seeded`, written through the preset record's codec, and the storage manager's calls.
 */
async function visit(seeded: readonly Preset[] = []) {
  const recording = recordingManager()
  const real = await readyPort(freshFactory(), recording.manager)
  for (const preset of seeded) {
    await real.write('presets', preset.id, encodePresetRecord(preset, TEST_APP_VERSION))
  }
  const { port, refuse } = refusingPort(real)
  const policy = createSavePolicy(port)
  const saves = createVisitSaves(Promise.resolve(policy), TEST_APP_VERSION)
  return { port, refuse, policy, saves, manager: recording.calls }
}

/** Intent: the player presets the port's `presets` store holds now, as a load reads them. */
async function storedPresets(port: StoragePort): Promise<readonly Preset[]> {
  return decodePlayerPresets(await port.readKeyed('presets'))
}

/** Intent: let the policy's protection request and its port calls settle. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// @test-link [[module_player_presets]]
// @test-link [[rule_player_presets_saved_on_device]]
describe("the player presets' saves", () => {
  // @test-link [[rule_player_presets_saved_on_device]]
  // @test-link [[entity_player_preset_record]]
  it('write a saved preset as its one whole record, under its id, read back as it was', async () => {
    const { port, saves } = await visit()

    await expect(saves.savePreset(LATE_NIGHT)).resolves.toBe('saved')

    expect(await storedPresets(port)).toEqual([LATE_NIGHT])
    expect(await port.read('presets', 'player-1')).toEqual(
      encodePresetRecord(LATE_NIGHT, TEST_APP_VERSION),
    )
  })

  // @test-link [[rule_player_presets_saved_on_device]]
  it('replace the whole record of a preset changed or renamed, the last write winning', async () => {
    const { port, saves } = await visit([LATE_NIGHT, WARM_UP])
    const changed = makePreset({ ...LATE_NIGHT, restriction: { keys: 'any', modes: 'any' } })
    const renamed = makePreset({ ...changed, name: 'late Night' })

    await expect(saves.savePreset(changed)).resolves.toBe('saved')
    await expect(saves.saveRenamedPreset(renamed)).resolves.toBe('saved')

    expect(await storedPresets(port)).toEqual([renamed, WARM_UP])
  })

  // @test-link [[rule_player_presets_saved_on_device]]
  it('delete a preset by deleting its record, leaving every other', async () => {
    const { port, saves } = await visit([LATE_NIGHT, WARM_UP])

    await expect(saves.deletePreset('player-1')).resolves.toBe('saved')

    expect(await storedPresets(port)).toEqual([WARM_UP])
  })

  // @test-link [[rule_refused_preset_save_told]]
  // @test-link [[rule_failed_save_never_disturbs_session]]
  it('resolve a refused write or deletion as failed, the policy telling its failure listener', async () => {
    const { port, refuse, policy, saves } = await visit([WARM_UP])
    const failures = recordFailures(policy)

    refuse('quota')
    await expect(saves.savePreset(LATE_NIGHT)).resolves.toBe('failed')
    refuse('other')
    await expect(saves.saveRenamedPreset(LATE_NIGHT)).resolves.toBe('failed')
    await expect(saves.deletePreset('player-2')).resolves.toBe('failed')

    expect(failures).toEqual(['quota', 'other'])
    refuse(null)
    expect(await storedPresets(port)).toEqual([WARM_UP])
  })

  // @test-link [[rule_presets_in_visits_that_save_nothing]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('write and delete nothing, and ask nothing, in an outdated tab', async () => {
    const recording = recordingManager()
    const factory = freshFactory()
    const policy = createSavePolicy(await outdatedPort(factory, recording.manager))
    const saves = createVisitSaves(Promise.resolve(policy), TEST_APP_VERSION)

    await expect(saves.savePreset(LATE_NIGHT)).resolves.toBe('skipped')
    await expect(saves.deletePreset('player-1')).resolves.toBe('skipped')
    await flushPromises()

    expect(recording.calls).toEqual([])
  })
})

// @test-link [[rule_persistent_storage_requested]]
describe("the player presets' request for persistent storage", () => {
  // @test-link [[rule_persistent_storage_requested]]
  it('is asked once per visit, at the first save as new or save of changes', async () => {
    const { saves, manager } = await visit()

    await saves.savePreset(LATE_NIGHT)
    await saves.savePreset(WARM_UP)
    await flushPromises()

    expect(manager.filter((call) => call === 'persist')).toEqual(['persist'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('is never asked by a rename or a deletion', async () => {
    const { saves, manager } = await visit([LATE_NIGHT])

    await saves.saveRenamedPreset(makePreset({ ...LATE_NIGHT, name: 'Late' }))
    await saves.deletePreset('player-1')
    await flushPromises()

    expect(manager).toEqual([])
  })

  // @test-link [[rule_persistent_storage_requested]]
  // @test-link [[module_player_presets]]
  it('follows the record it saves, which goes before the selection naming it; nothing saves the selection', async () => {
    const { policy, calls } = recordingPolicy()
    const saves = createVisitSaves(Promise.resolve<SavePolicy>(policy), TEST_APP_VERSION)
    await flushPromises()

    void saves.savePreset(LATE_NIGHT)
    saves.saveSettings({ presetSelection: { kind: 'preset', presetId: 'player-1' } })
    void saves.saveRenamedPreset(LATE_NIGHT)
    void saves.deletePreset('player-1')
    void saves.saveSession(() => [], PAGE_STAYS)

    expect(calls.map((call) => call.method)).toEqual([
      'save',
      'requestProtection',
      'save',
      'save',
      'save',
      'saveSession',
    ])
    expect(calls[0]).toEqual({
      method: 'save',
      changes: [
        {
          kind: 'write',
          store: 'presets',
          key: 'player-1',
          record: encodePresetRecord(LATE_NIGHT, TEST_APP_VERSION),
        },
      ],
    })
    expect(calls[3]).toEqual({
      method: 'save',
      changes: [
        {
          kind: 'write',
          store: 'presets',
          key: 'player-1',
          record: encodePresetRecord(LATE_NIGHT, TEST_APP_VERSION),
        },
      ],
    })
    expect(calls[4]).toEqual({
      method: 'save',
      changes: [{ kind: 'delete', store: 'presets', key: 'player-1' }],
    })
  })
})
