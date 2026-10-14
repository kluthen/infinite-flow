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
 * - `loadOutcome`, `savingState` and `loadMs` report the load.
 *
 * Seeds go to the port directly, never through the save policy, and at the running app's version.
 */
import {
  browserSavedDataLoad,
  loadSavedData,
  type SavedDataLoad,
} from '../../../src/storage-bootstrap'
import { APP_VERSION } from '../../../src/storage/app-version'
import { KEPT_SESSION_DATA_VERSION } from '../../../src/storage/records/kept-reading'
import {
  encodeSettingRecord,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from '../../../src/storage/records/settings-record'
import type { SavingState } from '../../../src/storage/save-policy'
import type { StorageChange, StoragePort } from '../../../src/storage/storage-port'

/** How the harness runs the load: at once, or held until the spec releases it. */
export type HarnessStorageLoadMode = 'immediate' | 'held'

/** Intent: the load mode the page URL asks for; an unknown value throws. */
export function harnessStorageLoadMode(search: string): HarnessStorageLoadMode {
  const value = new URLSearchParams(search).get('storageLoad')
  if (value === null) return 'immediate'
  if (value === 'held') return 'held'
  throw new Error(`Workspace harness: ?storageLoad=${value} is not a load mode (held)`)
}

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

/** Intent: the harness's saved data, loaded in `mode`. */
export function createHarnessStorage(mode: HarnessStorageLoadMode): HarnessStorage {
  const production = browserSavedDataLoad()
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
        return port
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

  return {
    load,
    api: {
      seedSettings,
      seedTimingSessions,
      records: async (store) => [...(await openedPort().readAll(store))],
      loadOutcome: () => finishedLoad().outcome,
      savingState: () => (policyState === null ? null : policyState()),
      loadMs: () => {
        if (loadMs === null) throw new Error('Workspace harness: the load has not ended yet')
        return loadMs
      },
    },
  }
}
