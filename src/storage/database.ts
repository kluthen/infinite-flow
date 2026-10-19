/**
 * The app's one IndexedDB database, over raw IndexedDB through a small promise wrapper: its
 * stores, its migration steps, how it is opened at the code's data version, and the read, change
 * and delete transactions the storage port runs on it.
 *
 * One data-version numbering covers the whole database: the code's data version is the IndexedDB
 * version the database is opened with, the data version held in `meta`, and the number of
 * migration steps. Opening a database a newer app upgraded gives a connection for reading only;
 * every change transaction reads `meta` first and gives up, writing nothing, when a newer app has
 * raised the data version. The IndexedDB factory is injected: the browser's in the app, an
 * in-memory one in tests.
 */

import { KEPT_SESSIONS_V2 } from './migrations/kept-sessions-v2'
import { readEnvelope } from './record-envelope'

/** The database's name; the browser scopes it to the site's origin. */
// @spec-link [[rule_saved_data_belongs_to_browser_profile]]
export const DATABASE_NAME = 'infinite-flow'

/** The internal store holding the database's own versions; the port never exposes it. */
const META_STORE = 'meta'

/** The key of the one `meta` record. */
const META_KEY = 'database'

/** The six stores the app's data lives in, one per kind of record. */
// @spec-link [[module_on_device_database]]
export const DATA_STORES = [
  'settings',
  'instrument',
  'controller',
  'sessionSummaries',
  'sessionBodies',
  'playedNotes',
] as const

/** The name of one of the stores the app's data lives in. */
// @spec-link [[module_on_device_database]]
export type StoreName = (typeof DATA_STORES)[number]

/**
 * What a migration step works with: the database being upgraded, its upgrade transaction and the
 * app version upgrading it.
 */
// @spec-link [[module_on_device_database]]
export interface MigrationUpgrade {
  readonly database: IDBDatabase
  readonly transaction: IDBTransaction
  /** The app version the database is opened with, for the envelopes a step rewrites. */
  readonly appVersion: string
}

/**
 * One migration step: the data version it brings the database to, and how. It runs inside the
 * upgrade transaction and rewrites only the stores whose record shape changes at that version.
 */
// @spec-link [[module_on_device_database]]
export interface MigrationStep {
  readonly toVersion: number
  readonly migrate: (upgrade: MigrationUpgrade) => void
}

/** Step 1, from an empty database: the seven stores, with out-of-line keys and no index. */
const CREATE_STORES: MigrationStep = {
  toVersion: 1,
  migrate: ({ database }) => {
    for (const name of [META_STORE, ...DATA_STORES]) database.createObjectStore(name)
  },
}

/** The production migration steps, from data version 1 up to the code's. */
// @spec-link [[module_on_device_database]]
export const PRODUCTION_MIGRATIONS: readonly MigrationStep[] = Object.freeze([
  CREATE_STORES,
  KEPT_SESSIONS_V2,
])

/**
 * Intent: the data version a list of migration steps brings the database to, its last step's.
 * Throws unless the steps run from 1 to N without a gap: such a list is a configuration defect.
 */
// @spec-link [[module_on_device_database]]
export function migrationsDataVersion(steps: readonly MigrationStep[]): number {
  if (steps.length === 0 || steps.some((step, index) => step.toVersion !== index + 1)) {
    const versions = steps.map((step) => step.toVersion).join(', ')
    throw new Error(`database: migration steps must run 1..N without a gap, got [${versions}]`)
  }
  return steps.length
}

/** The code's data version: 1 in v3.0, 2 from v3.1. */
// @spec-link [[module_on_device_database]]
export const DATABASE_DATA_VERSION: number = migrationsDataVersion(PRODUCTION_MIGRATIONS)

/** A migration step that threw: a defect of the step, never a storage failure. */
// @spec-link [[module_on_device_database]]
export class MigrationStepError extends Error {
  /** Intent: name the step that threw and keep what it threw. */
  constructor(toVersion: number, cause: unknown) {
    super(`database: migration step to data version ${toVersion} threw`, { cause })
    this.name = 'MigrationStepError'
  }
}

/** What opening the database needs. */
// @spec-link [[module_on_device_database]]
export interface DatabaseOpening {
  readonly factory: IDBFactory
  readonly name: string
  readonly appVersion: string
  readonly migrations: readonly MigrationStep[]
  /** The code's data version, the version `migrations` bring the database to. */
  readonly dataVersion: number
  /** Called when a connection was closed because another one changes the database's version. */
  readonly onVersionChange: (closed: IDBDatabase) => void
}

/** An open database: its connection, and whether a newer app already wrote it. */
// @spec-link [[module_on_device_database]]
export interface OpenedDatabase {
  readonly connection: IDBDatabase
  readonly outdated: boolean
}

/** Intent: the result of one IndexedDB request, as a promise. */
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('database: the request failed'))
  })
}

/**
 * Intent: close a connection as soon as another one changes the database's version (a newer app
 * upgrading it, or Delete everything), so it never blocks that change, and report it closed.
 */
function closedOnVersionChange(
  connection: IDBDatabase,
  onVersionChange: (closed: IDBDatabase) => void,
): IDBDatabase {
  connection.onversionchange = () => {
    connection.close()
    onVersionChange(connection)
  }
  return connection
}

/**
 * Intent: run, in order, every migration step above the stored version, then write `meta`: the
 * code's data version and the app that upgraded the database.
 */
function runMigrations(upgrade: MigrationUpgrade, oldVersion: number, opening: DatabaseOpening) {
  for (const step of opening.migrations) {
    if (step.toVersion <= oldVersion) continue
    try {
      step.migrate(upgrade)
    } catch (cause) {
      throw new MigrationStepError(step.toVersion, cause)
    }
  }
  const meta = { dataVersion: opening.dataVersion, appVersion: opening.appVersion }
  upgrade.transaction.objectStore(META_STORE).put(meta, META_KEY)
}

/**
 * Intent: open the database at the code's data version, migrating it when it is older. Rejects
 * with the open's error (a `VersionError` when a newer app upgraded it), or with what a migration
 * step threw, the upgrade then being rolled back.
 */
function openAtDataVersion(opening: DatabaseOpening): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = opening.factory.open(opening.name, opening.dataVersion)
    let upgradeFailure: unknown = null
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction
      if (transaction === null) throw new Error('database: an upgrade without its transaction')
      try {
        runMigrations(
          { database: request.result, transaction, appVersion: opening.appVersion },
          event.oldVersion,
          opening,
        )
      } catch (error) {
        upgradeFailure = error
        transaction.abort()
      }
    }
    request.onsuccess = () =>
      resolve(closedOnVersionChange(request.result, opening.onVersionChange))
    request.onerror = () =>
      reject(upgradeFailure ?? request.error ?? new Error('database: the open failed'))
  })
}

/** Intent: whether an open failed because the stored database has a higher version. */
function isVersionError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'VersionError'
}

/**
 * Intent: open the database at whatever version it has, for reading only. Never creates it: when
 * it no longer exists (another tab deleted it), the creation is rolled back and the open rejects,
 * so a reload never resurrects deleted data as an empty database.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function openForReading(
  factory: IDBFactory,
  name: string,
  onVersionChange: (closed: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name)
    let absent = false
    request.onupgradeneeded = () => {
      absent = true
      request.transaction?.abort()
    }
    request.onsuccess = () => resolve(closedOnVersionChange(request.result, onVersionChange))
    request.onerror = () =>
      reject(
        absent
          ? new Error('database: it no longer exists')
          : (request.error ?? new Error('database: the open failed')),
      )
  })
}

/** Intent: the one value stored under `key`, undefined when there is none. */
// @spec-link [[module_on_device_database]]
export function readValue(connection: IDBDatabase, store: string, key: string): Promise<unknown> {
  return requestResult(connection.transaction(store, 'readonly').objectStore(store).get(key))
}

/** Intent: every value a store holds, in key order. */
// @spec-link [[module_on_device_database]]
export function readAllValues(connection: IDBDatabase, store: string): Promise<unknown[]> {
  return requestResult(connection.transaction(store, 'readonly').objectStore(store).getAll())
}

/** One entry of a store: its key and its raw value, which its codec reads. */
// @spec-link [[module_on_device_database]]
export interface StoredEntry {
  readonly key: string
  readonly value: unknown
}

/**
 * Intent: every entry of a store with its key, in key order, read in one read-only transaction;
 * an entry whose key is not a string is left out. Keys and values come from the same transaction,
 * so they pair up one to one.
 */
// @spec-link [[module_on_device_database]]
export async function readKeyedValues(
  connection: IDBDatabase,
  store: string,
): Promise<StoredEntry[]> {
  const objectStore = connection.transaction(store, 'readonly').objectStore(store)
  const [keys, values] = await Promise.all([
    requestResult(objectStore.getAllKeys()),
    requestResult(objectStore.getAll()),
  ])
  return keys.flatMap((key, index) =>
    typeof key === 'string' ? [{ key, value: values[index] }] : [],
  )
}

/**
 * Intent: the key of every record of a store, in key order, read in one read-only transaction
 * without reading a value; a key that is not a string is left out.
 */
// @spec-link [[module_on_device_database]]
export async function readKeys(connection: IDBDatabase, store: string): Promise<string[]> {
  const objectStore = connection.transaction(store, 'readonly').objectStore(store)
  const keys = await requestResult(objectStore.getAllKeys())
  return keys.filter((key): key is string => typeof key === 'string')
}

/**
 * Intent: open the database for the port. A database a newer app upgraded is reopened without a
 * version, for reading; a `meta` data version above the code's also makes it outdated. A missing
 * or damaged `meta` rejects. Throws a `MigrationStepError` when a step throws.
 */
// @spec-link [[module_on_device_database]]
// @spec-link [[rule_outdated_tab_stops_saving]]
export async function openDatabase(opening: DatabaseOpening): Promise<OpenedDatabase> {
  let connection: IDBDatabase
  try {
    connection = await openAtDataVersion(opening)
  } catch (error) {
    if (!isVersionError(error)) throw error
    const reading = await openForReading(opening.factory, opening.name, opening.onVersionChange)
    return { connection: reading, outdated: true }
  }
  try {
    const meta = readEnvelope(
      await readValue(connection, META_STORE, META_KEY),
      opening.dataVersion,
    )
    if (meta === 'unreadable') throw new Error('database: the meta record is missing or damaged')
    return { connection, outdated: meta === 'newer' }
  } catch (error) {
    connection.close()
    throw error
  }
}

/** How a change transaction ended: done, or given up because a newer app raised the version. */
// @spec-link [[rule_outdated_tab_stops_saving]]
export type ChangeOutcome = 'done' | 'outdated'

/**
 * Intent: change one or more stores in a single transaction spanning `meta` and those stores,
 * reading `meta` first: when a newer app has raised the data version above the code's, the
 * transaction aborts and touches nothing. `change` reaches each store through `objectStore`, which
 * gives one of `stores`. All or none: rejects with what the change threw, or with the
 * transaction's error (a `QuotaExceededError` when the browser lacks space), having written nothing.
 */
// @spec-link [[module_on_device_database]]
// @spec-link [[rule_outdated_tab_stops_saving]]
export function changeStores(
  connection: IDBDatabase,
  stores: readonly StoreName[],
  dataVersion: number,
  change: (objectStore: (store: StoreName) => IDBObjectStore) => void,
): Promise<ChangeOutcome> {
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction([META_STORE, ...stores], 'readwrite')
    let outdated = false
    let failure: unknown = null
    const meta = transaction.objectStore(META_STORE).get(META_KEY)
    meta.onsuccess = () => {
      const reading = readEnvelope(meta.result, dataVersion)
      try {
        if (reading === 'unreadable') throw new Error('database: the meta record is damaged')
        if (reading === 'newer') outdated = true
        else change((name) => transaction.objectStore(name))
      } catch (error) {
        failure = error
      }
      if (outdated || failure !== null) transaction.abort()
    }
    transaction.oncomplete = () => resolve('done')
    transaction.onabort = () => {
      if (outdated) resolve('outdated')
      else reject(failure ?? transaction.error ?? new Error('database: the transaction aborted'))
    }
  })
}

/** Intent: delete the whole database, once every other connection to it has closed. */
// @spec-link [[rule_delete_everything]]
export function deleteDatabase(factory: IDBFactory, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('database: the delete failed'))
  })
}
