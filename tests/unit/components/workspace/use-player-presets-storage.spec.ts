// @vitest-environment node
/**
 * The player presets composable over the visit's real saves, a real save policy and an in-memory
 * IndexedDB, the session started from what the load read: the request for persistent storage a
 * save makes, and what a reload finds after a refused save as new (spec D387).
 */
import { describe, expect, it } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { usePlayerPresets } from '@/components/workspace/use-player-presets'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { loadSavedData, type SavedDataLoad } from '@/storage-bootstrap'
import { encodePresetRecord } from '@/storage/records/preset-record'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import { encodeSettings } from '@/storage/records/settings-record'
import { createSavePolicy } from '@/storage/save-policy'
import { createVisitSaves } from '@/storage/settings-saver'
import { openStoragePort, StorageError, type StoragePort } from '@/storage/storage-port'

import { createFitSession, flushAsync } from '../../composables/fit-session-harness'
import { readyPort } from '../../storage/save-policy-doubles'
import {
  freshFactory,
  recordingManager,
  TEST_APP_VERSION,
} from '../../storage/storage-test-doubles'

/** The mix design as the stylesheet's `--mix-*` tokens give it today. */
const MIX_DESIGN: AudioMixDesign = readAudioMixDesign({
  getPropertyValue: (name: string) =>
    ({
      '--mix-click-volume-default': '0.8',
      '--mix-backing-volume-default': '0.8',
      '--mix-click-volume-min': '0.2',
      '--mix-backing-volume-min': '0',
      '--mix-volume-max': '1',
    })[name] ?? '',
})

/** A player preset: Jazz's controls with Tension at Build, Dorian only. */
const LATE_NIGHT: Preset = makePreset({
  id: 'player-1',
  name: 'Late night',
  controls: { ...builtInPreset('jazz').controls, tension: 'Build' },
  levels: { ...NEUTRAL_FIGURE_LEVELS, chromaticApproach: 'favored' },
  restriction: { keys: 'any', modes: ['Dorian'] },
  kind: 'player',
})

const DEFAULTS = defaultSettings(MIX_DESIGN.defaults)

/** Saved settings: Custom based on Late night, in D Dorian, its Register at High. */
const SAVED: SavedSettings = {
  ...DEFAULTS,
  controls: {
    ...DEFAULTS.controls,
    ...LATE_NIGHT.controls,
    register: 'High',
    tonalCenter: 'D',
    collection: 'Dorian',
  },
  figureLevels: LATE_NIGHT.levels,
  presetSelection: { kind: 'custom', baseId: 'player-1' },
}

/** Intent: a port refusing every batch that touches the presets store while `refusing` says. */
function refusingPresetWrites(real: StoragePort, refusing: () => boolean): StoragePort {
  return {
    ...real,
    apply: (changes) =>
      refusing() && changes.some((change) => change.store === 'presets')
        ? Promise.reject(new StorageError('other', 'presets refused by the test double'))
        : real.apply(changes),
  }
}

/** Intent: load the saved data of the database `factory` holds, as a page opening does. */
function load(factory: IDBFactory): Promise<SavedDataLoad> {
  return loadSavedData({
    openPort: () => openStoragePort({ factory, appVersion: TEST_APP_VERSION }),
    startupWait: () => new Promise<void>(() => undefined),
    mixDesign: () => MIX_DESIGN,
  })
}

/**
 * Intent: a visit over a database seeded with `SAVED` and Late night: the session started from
 * what the load read, saving its settings through the visit's saves, the composable over them,
 * and the storage manager's calls; preset writes refused while `refusePresets` is true.
 */
async function visit() {
  const factory = freshFactory()
  const manager = recordingManager()
  const seeding = await readyPort(factory)
  for (const record of encodeSettings(SAVED, TEST_APP_VERSION)) {
    await seeding.write('settings', record.key, record)
  }
  await seeding.write('presets', LATE_NIGHT.id, encodePresetRecord(LATE_NIGHT, TEST_APP_VERSION))
  const loaded = await load(factory)
  const flags = { refusePresets: false }
  const port = refusingPresetWrites(
    await openStoragePort({
      factory,
      appVersion: TEST_APP_VERSION,
      storageManager: manager.manager,
    }),
    () => flags.refusePresets,
  )
  const saves = createVisitSaves(Promise.resolve(createSavePolicy(port)), TEST_APP_VERSION)
  const fit = createFitSession({
    initialSettings: {
      controls: loaded.settings.controls,
      figureLevels: loaded.settings.figureLevels,
      selection: loaded.settings.presetSelection,
      playerPresets: loaded.playerPresets,
      theme: loaded.settings.theme,
      myInstrument: null,
    },
    onSave: (changes) => saves.saveSettings(changes),
  })
  const refused: string[] = []
  let ids = 0
  const presets = usePlayerPresets({
    session: fit.session,
    controllerPhase: () => 'idle',
    savingOff: () => false,
    saves,
    nextPresetId: () => `new-${String(++ids)}`,
    tellRefusedSave: (name) => refused.push(name),
  })
  return { factory, flags, fit, presets, refused, persistCalls: () => manager.calls }
}

/** Intent: the requests for persistent storage the storage manager was made. */
function persistRequests(calls: readonly string[]): readonly string[] {
  return calls.filter((call) => call === 'persist')
}

// @test-link [[rule_persistent_storage_requested]]
// @test-link [[module_player_presets]]
describe('the persistent-storage request of the preset actions', () => {
  // @test-link [[rule_persistent_storage_requested]]
  it('is never made by a rename or a deletion, and once by the first save as new of the visit', async () => {
    const { presets, persistCalls } = await visit()

    expect(presets.rename('Late night blues').status).toBe('applied')
    await expect(presets.deletePreset('player-1')).resolves.toBe('deleted')
    await flushAsync()
    expect(persistRequests(persistCalls())).toEqual([])

    expect(presets.saveAsNew('Fresh', 'anyKeyAndMode').status).toBe('applied')
    expect(presets.saveChanges().status).toBe('applied')
    await flushAsync()
    expect(persistRequests(persistCalls())).toEqual(['persist'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('is made once by the first save changes of the visit', async () => {
    const { presets, persistCalls } = await visit()

    expect(presets.saveChanges().status).toBe('applied')
    expect(presets.saveAsNew('Fresh', 'anyKeyAndMode').status).toBe('applied')
    await flushAsync()

    expect(persistRequests(persistCalls())).toEqual(['persist'])
  })
})

// @test-link [[rule_refused_preset_save_told]]
// @test-link [[module_player_presets]]
describe('a reload after a refused save as new', () => {
  // @test-link [[rule_refused_preset_save_told]]
  // @test-link [[rule_preset_load_values_win]]
  it('loads Custom with no base and the same values, the selection having been saved', async () => {
    const { factory, flags, fit, presets, refused } = await visit()
    flags.refusePresets = true

    expect(presets.saveAsNew('Kept anyway', 'anyKeyAndMode').status).toBe('applied')
    await flushAsync()
    expect(refused).toEqual(['Kept anyway'])
    expect(fit.session.state.selection).toEqual({ kind: 'preset', presetId: 'new-1' })

    const reloaded = await load(factory)

    expect(reloaded.playerPresets).toEqual([LATE_NIGHT])
    expect(reloaded.settings.presetSelection).toEqual({ kind: 'custom', baseId: null })
    expect(reloaded.settings.controls).toEqual(fit.session.state.controls)
    expect(reloaded.settings.figureLevels).toEqual(fit.session.state.figureLevels)
  })
})
