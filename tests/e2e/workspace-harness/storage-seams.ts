/**
 * The workspace harness's saved-data seams: the page loads the saved data with the app's own
 * loader (`src/storage-bootstrap.ts`) over the browser's real IndexedDB, before it mounts the app,
 * keeping the port the load opened so a spec can seed records through it and read what is stored.
 *
 * - `?storageLoad=held` holds the load until `window.__workspaceHarnessHeldLoad.release()`, so a
 *   spec can see the page before the load ends: only its background;
 * - `seedSettings` writes settings records through the settings codec, valid or not, for the next
 *   load (the spec reloads the page); `records` reads a store back;
 * - `seedTimingSessions` writes sized kept-session records for the start-up read measurement (M2);
 * - `keyedRecords` reads a store back with each record's key; `pinKeptSession` pins a kept session
 *   the app saved, as the review's pin will, and `seedUnreadableKeptSession` writes a kept session
 *   whose session-wide record the codec cannot read;
 * - `settingsNotReadBack` names each stored settings record the settings codec does not read back
 *   as the value it holds, read as a load reads them all (with the mix design of the page's tokens,
 *   and my instrument not loaded);
 * - `loadOutcome`, `savingState` and `loadMs` report the load;
 * - `?storageRead=fail` makes every read of the app's port fail, and `?storageRead=slow` delays
 *   each past the start-up wait, so the visit starts from the defaults;
 * - `refuseSaves(kind)` makes the app's port refuse every write, delete and batch as `quota` or
 *   `other` (null to stop), and `portChanges()` counts the changes that reached the app's port,
 *   refused or not: the write spy;
 * - `openNewerVersion()` opens the database as a newer version of the app would, one data version
 *   up: the open tab is outdated at once, and a reload finds data written by a newer version.
 *
 * Seeds go to the port directly, never through the save policy, and at the running app's version.
 * The app's port is the opened port wrapped by these injections; the seeds bypass them.
 */
import {
  browserSavedDataLoad,
  loadSavedData,
  STARTUP_WAIT_MS,
  type SavedDataLoad,
} from '../../../src/storage-bootstrap'
import { PRODUCTION_MIGRATIONS } from '../../../src/storage/database'
import { APP_VERSION } from '../../../src/storage/app-version'
import { KEPT_SESSION_DATA_VERSION } from '../../../src/storage/records/kept-reading'
import { readAudioMixDesign } from '../../../src/audio/audio-mix'
import {
  decodeSettings,
  encodeSettingRecord,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from '../../../src/storage/records/settings-record'
import type { RecordVersions } from '../../../src/storage/record-envelope'
import type { SavingState } from '../../../src/storage/save-policy'
import {
  browserStorage,
  openStoragePort,
  StorageError,
  type StorageChange,
  type StoragePort,
} from '../../../src/storage/storage-port'

/** How the harness runs the load: at once, or held until the spec releases it. */
export type HarnessStorageLoadMode = 'immediate' | 'held'

/** Intent: the load mode the page URL asks for; an unknown value throws. */
export function harnessStorageLoadMode(search: string): HarnessStorageLoadMode {
  const value = new URLSearchParams(search).get('storageLoad')
  if (value === null) return 'immediate'
  if (value === 'held') return 'held'
  throw new Error(`Workspace harness: ?storageLoad=${value} is not a load mode (held)`)
}

/** How the app's port reads: as the browser does, failing every read, or slower than the wait. */
export type HarnessStorageReadMode = 'real' | 'fail' | 'slow'

/** Intent: the read mode the page URL asks for; an unknown value throws. */
export function harnessStorageReadMode(search: string): HarnessStorageReadMode {
  const value = new URLSearchParams(search).get('storageRead')
  if (value === null) return 'real'
  if (value === 'fail' || value === 'slow') return value
  throw new Error(`Workspace harness: ?storageRead=${value} is not a read mode (fail, slow)`)
}

/** How far past the start-up wait a slow read ends, in milliseconds. */
const SLOW_READ_PAST_WAIT_MS = 1000

/** The injections on the app's port, set by the spec. */
interface PortInjections {
  readonly readMode: HarnessStorageReadMode
  refusal: 'quota' | 'other' | null
  changes: number
}

/**
 * Intent: the app's port over `real`: each read failed or delayed per the read mode, each change
 * counted, then refused when a refusal is set.
 */
function injectedPort(real: StoragePort, injections: PortInjections): StoragePort {
  const read = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (injections.readMode === 'fail') throw new StorageError('other', 'read failed (harness)')
    if (injections.readMode === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, STARTUP_WAIT_MS + SLOW_READ_PAST_WAIT_MS))
    }
    return operation()
  }
  const change = async (operation: () => Promise<void>): Promise<void> => {
    injections.changes += 1
    if (injections.refusal !== null) {
      throw new StorageError(injections.refusal, 'save refused (harness)')
    }
    return operation()
  }
  return {
    ...real,
    read: (store, key) => read(() => real.read(store, key)),
    readAll: (store) => read(() => real.readAll(store)),
    readKeyed: (store) => read(() => real.readKeyed(store)),
    write: (store, key, record) => change(() => real.write(store, key, record)),
    delete: (store, key) => change(() => real.delete(store, key)),
    apply: (changes) => change(() => real.apply(changes)),
  }
}

/** A no-op migration step one data version above the code's: a newer app's upgrade. */
const NEWER_VERSION_STEP = { toVersion: PRODUCTION_MIGRATIONS.length + 1, migrate: () => {} }

/** The harness's saved data: its load, and the spec's API over the port it opened. */
export interface HarnessStorage {
  /** Run the load (once the spec releases it, when held); resolves with what the app mounts. */
  readonly load: () => Promise<SavedDataLoad>
  readonly api: WorkspaceHarnessStorageApi
}

/** How many kept sessions one seeding batch writes. */
const TIMING_BATCH = 50

/** Intent: a sized kept session for the start-up read measurement: its summary and its body. */
function timingSession(index: number, bodyBytes: number): StorageChange[] {
  const key = `timing-${String(index).padStart(4, '0')}`
  const versions = { dataVersion: KEPT_SESSION_DATA_VERSION, appVersion: APP_VERSION }
  const summary = {
    ...versions,
    startedAt: Date.UTC(2026, 0, 1) + index * 60_000,
    lengthSeconds: 600,
    phraseCount: 75,
    musicalProfile: { musicalProfile: 'Jazz', isCustom: false },
    instrument: { id: 'bb-tenor', displayName: 'B-flat tenor saxophone' },
    startingTempo: 120,
    tempoReached: 120,
    pinned: index > 0,
    favoritesCount: 3,
    comment: 'x'.repeat(500),
    playedNotesKept: false,
    recordedByAppVersion: APP_VERSION,
    sessionSeed: index,
  }
  const body = { ...versions, phrases: ['x'.repeat(bodyBytes)] }
  return [
    { kind: 'write', store: 'sessionSummaries', key, record: summary },
    { kind: 'write', store: 'sessionBodies', key, record: body },
  ]
}

/** Intent: a value with every object's keys sorted, so equal values compare equal as JSON. */
function canonical(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  if (Array.isArray(value)) return value.map(canonical)
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
  return Object.fromEntries(entries.map(([key, field]) => [key, canonical(field)]))
}

/** Intent: whether two stored or decoded values are the same value. */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
}

/** Intent: the value a decoded set of settings holds at one record key. */
function decodedAt(settings: object, key: string): unknown {
  return key.split('.').reduce<unknown>((value, name) => {
    if (typeof value !== 'object' || value === null) return undefined
    return (value as Record<string, unknown>)[name]
  }, settings)
}

/**
 * Intent: the key of each settings record the codec does not read back as the value it holds:
 * the records are decoded together, as a load decodes them, and each record's value compared with
 * the decoded value at its key. A record with no string key is reported as `(no key)`.
 */
function notReadBack(records: readonly unknown[]): string[] {
  const decoded = decodeSettings(records, {
    mixDesign: readAudioMixDesign(getComputedStyle(document.documentElement)),
    myInstrumentLoaded: false,
  })
  return records.flatMap((record) => {
    const { key, value } = (record ?? {}) as { key?: unknown; value?: unknown }
    if (typeof key !== 'string') return ['(no key)']
    return sameValue(decodedAt(decoded, key), value) ? [] : [key]
  })
}

/** Intent: the harness's saved data, loaded in `mode`. */
export function createHarnessStorage(
  mode: HarnessStorageLoadMode,
  readMode: HarnessStorageReadMode,
): HarnessStorage {
  const production = browserSavedDataLoad()
  const injections: PortInjections = { readMode, refusal: null, changes: 0 }
  // The newer app's port, kept open as a newer tab would keep it.
  let newerPort: StoragePort | null = null
  let port: StoragePort | null = null
  let loaded: SavedDataLoad | null = null
  let policyState: (() => SavingState) | null = null
  let loadMs: number | null = null

  /** Intent: the port the load opened; throws before it has opened. */
  function openedPort(): StoragePort {
    if (port === null) throw new Error('Workspace harness: the storage port has not opened yet')
    return port
  }

  /** Intent: what the load gave; throws before it has ended. */
  function finishedLoad(): SavedDataLoad {
    if (loaded === null) throw new Error('Workspace harness: the load has not ended yet')
    return loaded
  }

  /** Intent: wait for the spec's release, publishing it, when the load is held. */
  function released(): Promise<void> {
    if (mode === 'immediate') return Promise.resolve()
    return new Promise((resolve) => {
      window.__workspaceHarnessHeldLoad = { release: () => resolve() }
    })
  }

  /** Intent: run the app's load, timed, keeping the port it opens, even late. */
  async function load(): Promise<SavedDataLoad> {
    await released()
    const startedAt = performance.now()
    const result = await loadSavedData({
      ...production,
      openPort: async () => {
        port = await production.openPort()
        return injectedPort(port, injections)
      },
    })
    loadMs = performance.now() - startedAt
    loaded = result
    void result.savePolicy.then((policy) => {
      policyState = () => policy.state()
    })
    return result
  }

  /** Intent: write one settings record per entry through the settings codec, valid or not. */
  async function seedSettings(values: Readonly<Record<string, unknown>>): Promise<void> {
    const target = openedPort()
    for (const [key, value] of Object.entries(values)) {
      if (!(SETTING_KEYS as readonly string[]).includes(key)) {
        throw new Error(`Workspace harness: "${key}" names no setting`)
      }
      // A seeded value may be invalid on purpose: the load must refuse it, so it is not checked.
      const record = encodeSettingRecord(
        key as SettingKey,
        value as SettingValue<SettingKey>,
        APP_VERSION,
      )
      await target.write('settings', key, record)
    }
  }

  /** Intent: write `count` sized kept sessions, in batches. */
  async function seedTimingSessions(count: number, bodyBytes: number): Promise<void> {
    if (!Number.isInteger(count) || count < 0 || !Number.isInteger(bodyBytes) || bodyBytes < 0) {
      throw new Error(`Workspace harness: seedTimingSessions(${count}, ${bodyBytes}) is invalid`)
    }
    const target = openedPort()
    for (let first = 0; first < count; first += TIMING_BATCH) {
      const last = Math.min(count, first + TIMING_BATCH)
      const changes: StorageChange[] = []
      for (let index = first; index < last; index++) {
        changes.push(...timingSession(index, bodyBytes))
      }
      await target.apply(changes)
    }
  }

  /** Intent: rewrite a kept session's session-wide record as pinned; throws when there is none. */
  async function pinKeptSession(key: string): Promise<void> {
    const target = openedPort()
    const summary: unknown = await target.read('sessionSummaries', key)
    if (typeof summary !== 'object' || summary === null) {
      throw new Error(`Workspace harness: no kept session is stored under "${key}"`)
    }
    const pinned: RecordVersions & { readonly pinned: true } = {
      ...(summary as RecordVersions),
      pinned: true,
    }
    await target.write('sessionSummaries', key, pinned)
  }

  /** Intent: a kept session under `key` whose session-wide record no codec reads, and a body. */
  async function seedUnreadableKeptSession(key: string): Promise<void> {
    const versions = { dataVersion: KEPT_SESSION_DATA_VERSION, appVersion: APP_VERSION }
    const summary: RecordVersions & { readonly startedAt: string } = {
      ...versions,
      startedAt: 'not a time',
    }
    const body: RecordVersions & { readonly phrases: readonly unknown[] } = {
      ...versions,
      phrases: [],
    }
    await openedPort().apply([
      { kind: 'write', store: 'sessionSummaries', key, record: summary },
      { kind: 'write', store: 'sessionBodies', key, record: body },
    ])
  }

  return {
    load,
    api: {
      seedSettings,
      seedTimingSessions,
      pinKeptSession,
      seedUnreadableKeptSession,
      records: async (store) => [...(await openedPort().readAll(store))],
      keyedRecords: async (store) => [...(await openedPort().readKeyed(store))],
      settingsNotReadBack: async () => notReadBack(await openedPort().readAll('settings')),
      refuseSaves: (kind) => {
        injections.refusal = kind
      },
      portChanges: () => injections.changes,
      openNewerVersion: async () => {
        if (newerPort !== null) throw new Error('Workspace harness: a newer version is open')
        newerPort = await openStoragePort({
          ...browserStorage(),
          appVersion: `${APP_VERSION}-newer`,
          migrations: [...PRODUCTION_MIGRATIONS, NEWER_VERSION_STEP],
        })
        if (newerPort.status() !== 'ready') {
          throw new Error(`Workspace harness: the newer version opened ${newerPort.status()}`)
        }
      },
      loadOutcome: () => finishedLoad().outcome,
      savingState: () => (policyState === null ? null : policyState()),
      loadMs: () => {
        if (loadMs === null) throw new Error('Workspace harness: the load has not ended yet')
        return loadMs
      },
    },
  }
}
