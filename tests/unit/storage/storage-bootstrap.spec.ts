import { describe, expect, it } from 'vitest'

import { readAudioMixDesign, type AudioMixDesign } from '@/audio/audio-mix'
import { builtInPreset } from '@/domain/presets/built-in-presets'
import {
  loadSavedData,
  type SavedDataLoad,
  type SavedDataLoadDependencies,
} from '@/storage-bootstrap'
import { defaultSettings, type SavedSettings } from '@/storage/records/setting-defaults'
import { encodeSettingRecord, encodeSettings } from '@/storage/records/settings-record'
import type { SavePolicy } from '@/storage/save-policy'
import { openStoragePort, StorageError, type StoragePort } from '@/storage/storage-port'

import { openNewerTab, readyPort, unavailablePort } from './save-policy-doubles'
import { freshFactory, sampleRecord, TEST_APP_VERSION } from './storage-test-doubles'

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

const DEFAULTS = defaultSettings(MIX_DESIGN.defaults)

/** A full set of settings in which every value differs from that setting's default. */
const SAVED: SavedSettings = {
  controls: {
    ...DEFAULTS.controls,
    tempo: 150,
    tonalCenter: 'F#',
    collection: 'Dorian',
    register: 'Low',
    instrumentProfileId: 'eb-alto',
  },
  figureLevels: { ...DEFAULTS.figureLevels, appoggiatura: 'favored', chromaticApproach: 'asToday' },
  presetSelection: { kind: 'custom', baseId: 'jazz' },
  theme: 'Dark',
  mix: { clickOn: false, clickVolume: 0.5, backingOn: false, backingVolume: 0.3 },
  sessionOptions: { varySettings: true, tensionAcrossPhrases: true, risingTempo: true },
  review: { format: 'midi', backingTrack: true, playedNotesShown: true },
  keepPlayedNotes: true,
}

/** Intent: write every setting of `settings` through `port`, one record per setting. */
async function seedSettings(port: StoragePort, settings: SavedSettings): Promise<void> {
  for (const record of encodeSettings(settings, TEST_APP_VERSION)) {
    await port.write('settings', record.key, record)
  }
}

/** A start-up wait the test ends when it chooses. */
interface ControlledWait {
  readonly wait: () => Promise<void>
  readonly end: () => void
}

/** Intent: a start-up wait that ends only when the test calls `end`. */
function controlledWait(): ControlledWait {
  let end: () => void = () => {
    throw new Error('the start-up wait was never started')
  }
  const ended = new Promise<void>((resolve) => {
    end = resolve
  })
  return { wait: () => ended, end: () => end() }
}

/** Intent: a start-up wait that never ends, so every read finishes within it. */
const neverEnds = (): Promise<void> => new Promise<void>(() => {})

/** Intent: the dependencies of a load over `openPort`, with the given start-up wait. */
function dependencies(
  openPort: () => Promise<StoragePort>,
  startupWait: () => Promise<void> = neverEnds,
): SavedDataLoadDependencies {
  return { openPort, startupWait, mixDesign: () => MIX_DESIGN }
}

/** Intent: `port` with its reads refused as a browser storage failure. */
function failingReads(port: StoragePort): StoragePort {
  const refuse = () => Promise.reject(new StorageError('other', 'the read failed'))
  return { ...port, read: refuse, readAll: refuse, readKeyed: refuse }
}

/** A promise the test settles when it chooses. */
interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

/** Intent: a promise with its resolver exposed. */
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

/** Intent: `port` with every `readAll` and keyed read held until the returned release is called. */
function heldReads(port: StoragePort): { port: StoragePort; release: () => void } {
  const gate = deferred<void>()
  return {
    port: {
      ...port,
      readAll: async (store) => {
        await gate.promise
        return port.readAll(store)
      },
      readKeyed: async (store) => {
        await gate.promise
        return port.readKeyed(store)
      },
    },
    release: () => gate.resolve(),
  }
}

/** Intent: a port opened outdated over `factory`, a newer app having upgraded it after `seed`. */
async function outdatedAfter(
  factory: IDBFactory,
  seed: (port: StoragePort) => Promise<void>,
): Promise<StoragePort> {
  await seed(await readyPort(factory))
  await openNewerTab(factory)
  return openStoragePort({ factory, appVersion: '3.0.0' })
}

/** Intent: the saving state of the load's policy, once it exists. */
async function savingState(load: SavedDataLoad): Promise<ReturnType<SavePolicy['state']>> {
  return (await load.savePolicy).state()
}

/** Intent: whether a promise has settled after every queued job has run. */
async function hasSettled(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  void promise.then(
    () => (settled = true),
    () => (settled = true),
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  return settled
}

// @test-link [[rule_saved_settings_load_tolerantly]]
// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[module_saved_data_loader]]
describe('loadSavedData: a read within the start-up wait', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('starts a first visit from the defaults, saving on, as a read of the saved data', async () => {
    const factory = freshFactory()
    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('saved-data-read')
    expect(await savingState(load)).toBe('on')
  })

  // @test-link [[rule_settings_saved_on_change]]
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('loads every saved setting, saving on', async () => {
    const factory = freshFactory()
    await seedSettings(await readyPort(factory), SAVED)

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.settings).toEqual(SAVED)
    expect(load.outcome).toBe('saved-data-read')
    expect(await savingState(load)).toBe('on')
  })

  // @test-link [[rule_preset_load_values_win]]
  it('judges the saved preset selection against the built-in presets', async () => {
    const reel = builtInPreset('reel')
    const savedReel: SavedSettings = {
      ...SAVED,
      controls: { ...SAVED.controls, ...reel.controls, collection: 'Mixolydian' },
      figureLevels: reel.levels,
      presetSelection: { kind: 'preset', presetId: 'reel' },
    }
    const factory = freshFactory()
    await seedSettings(await readyPort(factory), savedReel)

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.settings).toEqual(savedReel)
  })

  // @test-link [[rule_saved_settings_load_tolerantly]]
  it('loads an invalid saved value as its default, silently, and keeps every other value', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    await seedSettings(port, SAVED)
    const invalid = { ...encodeSettingRecord('theme', 'Dark', TEST_APP_VERSION), value: 'Sepia' }
    await port.write('settings', 'theme', invalid)
    const tooFast = { ...encodeSettingRecord('controls.tempo', 150, TEST_APP_VERSION), value: 999 }
    await port.write('settings', 'controls.tempo', tooFast)

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.settings.theme).toBe(DEFAULTS.theme)
    expect(load.settings.controls.tempo).toBe(DEFAULTS.controls.tempo)
    expect(load.settings).toEqual({
      ...SAVED,
      theme: DEFAULTS.theme,
      controls: { ...SAVED.controls, tempo: DEFAULTS.controls.tempo },
    })
    expect(load.outcome).toBe('saved-data-read')
    expect(await savingState(load)).toBe('on')
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[module_saved_data_loader]]
  it('hands on the kept sessions summaries with their keys and the remembered controller record as stored', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    await port.write('sessionSummaries', 's1', sampleRecord({ startedAt: 1 }))
    await port.write('sessionSummaries', 's2', sampleRecord({ startedAt: 2 }))
    await port.write('controller', 'remembered', sampleRecord({ name: 'Travel Sax' }))

    const load = await loadSavedData(dependencies(() => readyPort(factory)))

    expect(load.keptSessionSummaries).toEqual([
      { key: 's1', value: sampleRecord({ startedAt: 1 }) },
      { key: 's2', value: sampleRecord({ startedAt: 2 }) },
    ])
    expect(load.rememberedController).toEqual([sampleRecord({ name: 'Travel Sax' })])
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('a port that opened outdated and read: the saved values, off-outdated, the saved data read', async () => {
    const factory = freshFactory()
    const port = await outdatedAfter(factory, (ready) => seedSettings(ready, SAVED))
    expect(port.status()).toBe('outdated')

    const load = await loadSavedData(dependencies(() => Promise.resolve(port)))

    expect(load.settings).toEqual(SAVED)
    expect(load.outcome).toBe('saved-data-read')
    expect(await savingState(load)).toBe('off-outdated')
  })
})

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
// @test-link [[module_saved_data_loader]]
describe('loadSavedData: a read that fails or outlasts the start-up wait', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('a failing read: the defaults, saving off-unreadable, started from the defaults', async () => {
    const factory = freshFactory()
    await seedSettings(await readyPort(factory), SAVED)

    const load = await loadSavedData(
      dependencies(async () => failingReads(await readyPort(factory))),
    )

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await savingState(load)).toBe('off-unreadable')
    expect(load.keptSessionSummaries).toEqual([])
    expect(load.rememberedController).toEqual([])
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('an unavailable port: the defaults, saving off-unreadable, started from the defaults', async () => {
    const { port } = await unavailablePort()

    const load = await loadSavedData(dependencies(() => Promise.resolve(port)))

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await savingState(load)).toBe('off-unreadable')
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('a read slower than the start-up wait: the defaults, saving off, and the late read ignored', async () => {
    const factory = freshFactory()
    await seedSettings(await readyPort(factory), SAVED)
    const held = heldReads(await readyPort(factory))
    const wait = controlledWait()

    const loading = loadSavedData(dependencies(() => Promise.resolve(held.port), wait.wait))
    expect(await hasSettled(loading)).toBe(false)
    wait.end()
    const load = await loading
    held.release()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await savingState(load)).toBe('off-unreadable')
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  it('a port that opens after the start-up wait: the defaults at once, its policy then, off-unreadable', async () => {
    const factory = freshFactory()
    await seedSettings(await readyPort(factory), SAVED)
    const opening = deferred<StoragePort>()
    const wait = controlledWait()

    const loading = loadSavedData(dependencies(() => opening.promise, wait.wait))
    wait.end()
    const load = await loading

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await hasSettled(load.savePolicy)).toBe(false)
    opening.resolve(await readyPort(factory))
    expect(await savingState(load)).toBe('off-unreadable')
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('a port that opens outdated after the start-up wait: its policy starts off-outdated', async () => {
    const factory = freshFactory()
    const outdated = await outdatedAfter(factory, (ready) => seedSettings(ready, SAVED))
    const opening = deferred<StoragePort>()
    const wait = controlledWait()

    const loading = loadSavedData(dependencies(() => opening.promise, wait.wait))
    wait.end()
    const load = await loading
    opening.resolve(outdated)

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await savingState(load)).toBe('off-outdated')
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('a port that opened outdated whose read fails: the defaults, off-outdated, started from the defaults', async () => {
    const factory = freshFactory()
    const outdated = await outdatedAfter(factory, (ready) => seedSettings(ready, SAVED))

    const load = await loadSavedData(dependencies(() => Promise.resolve(failingReads(outdated))))

    expect(load.settings).toEqual(DEFAULTS)
    expect(load.outcome).toBe('started-from-defaults')
    expect(await savingState(load)).toBe('off-outdated')
  })

  it('rejects on a defect of the open, never starting from the defaults', async () => {
    const defect = new Error('storage port: the app version must not be empty')

    await expect(loadSavedData(dependencies(() => Promise.reject(defect)))).rejects.toBe(defect)
  })

  it('rejects on a defect of the read, which is no storage failure', async () => {
    const factory = freshFactory()
    const port = await readyPort(factory)
    const defect = new Error('a caller defect')
    const broken: StoragePort = { ...port, readAll: () => Promise.reject(defect) }

    await expect(loadSavedData(dependencies(() => Promise.resolve(broken)))).rejects.toBe(defect)
  })
})
