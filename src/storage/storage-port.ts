/**
 * The storage port: the one way the app reaches its saved data. It reads and writes the records of
 * the database's stores, one at a time or as a batch applied in one transaction, deletes
 * everything, and reports the space used and whether storage is persistent, through an injected
 * IndexedDB factory and storage manager.
 *
 * The port is `ready`, `outdated` (a newer version of the app has written data: it still reads,
 * never writes) or `unavailable` (the database could not be opened: it still deletes everything).
 * Every refusal is a `StorageError` of kind `quota`, `outdated` or `other`; a record written
 * without valid versions is a caller defect and throws a plain Error instead. The port holds no
 * save policy: when to save, hold or ask for persistence is decided by its callers.
 */

import {
  changeStores,
  DATA_STORES,
  DATABASE_NAME,
  deleteDatabase,
  migrationsDataVersion,
  MigrationStepError,
  openDatabase,
  openForReading,
  PRODUCTION_MIGRATIONS,
  readAllValues,
  readKeyedValues,
  readValue,
  type MigrationStep,
  type StoredEntry,
  type StoreName,
} from './database'
import { assertWritableVersions, type RecordVersions } from './record-envelope'

export type { StoredEntry, StoreName }

/** Why the port refused: lack of space, an outdated tab, or any other storage failure. */
// @spec-link [[module_on_device_database]]
export type StorageErrorKind = 'quota' | 'outdated' | 'other'

/** A refusal of the port, of one of three kinds. */
// @spec-link [[module_on_device_database]]
export class StorageError extends Error {
  readonly kind: StorageErrorKind

  /** Intent: a refusal of the given kind, keeping the browser's error as its cause if any. */
  constructor(kind: StorageErrorKind, message: string, cause?: unknown) {
    super(`storage (${kind}): ${message}`, cause === undefined ? undefined : { cause })
    this.name = 'StorageError'
    this.kind = kind
  }
}

/** The port's state: usable, outdated (reads only), or unavailable (the open failed). */
// @spec-link [[module_on_device_database]]
export type StoragePortStatus = 'ready' | 'outdated' | 'unavailable'

/** The part of the browser's storage manager the port uses. */
// @spec-link [[req_your_data]]
// @spec-link [[rule_persistent_storage_requested]]
export interface StorageManagerLike {
  readonly estimate: () => Promise<StorageEstimate>
  readonly persisted: () => Promise<boolean>
  readonly persist: () => Promise<boolean>
}

/** What the port is opened with. */
// @spec-link [[module_on_device_database]]
export interface StoragePortOptions {
  /** The IndexedDB factory: the browser's in the app, an in-memory one in tests. */
  readonly factory: IDBFactory
  /** The browser's storage manager; absent in an insecure context. */
  readonly storageManager?: StorageManagerLike | undefined
  /** The version of the running app, written into `meta` when it upgrades the database. */
  readonly appVersion: string
  /** The migration steps; the production list by default. */
  readonly migrations?: readonly MigrationStep[]
  /** The database's name; `infinite-flow` by default. */
  readonly databaseName?: string
}

/** One change of a batch: store a record under a key, or remove the record under a key. */
// @spec-link [[module_on_device_database]]
export type StorageChange =
  | {
      readonly kind: 'write'
      readonly store: StoreName
      readonly key: string
      readonly record: RecordVersions
    }
  | { readonly kind: 'delete'; readonly store: StoreName; readonly key: string }

/** The port the app reaches its saved data through. */
// @spec-link [[module_on_device_database]]
export interface StoragePort {
  /** The raw value stored under `key`, undefined when there is none; its codec reads it. */
  read(store: StoreName, key: string): Promise<unknown>
  /** Every raw value a store holds. */
  readAll(store: StoreName): Promise<readonly unknown[]>
  /**
   * Every entry a store holds, its key and its raw value, in key order, in one read-only
   * transaction; an entry whose key is not a string is left out. Refused as `readAll` is.
   */
  readKeyed(store: StoreName): Promise<readonly StoredEntry[]>
  /** Store a record under `key`, replacing any; refused when outdated or out of space. */
  write(store: StoreName, key: string, record: RecordVersions): Promise<void>
  /** Remove the record under `key`; refused when outdated. */
  delete(store: StoreName, key: string): Promise<void>
  /**
   * Apply every change, in list order, in one transaction: all or none. Refused like `write` when
   * outdated, unavailable or deleted, or out of space.
   */
  apply(changes: readonly StorageChange[]): Promise<void>
  /** Remove the whole database; refused when outdated. Every later call is refused. */
  deleteEverything(): Promise<void>
  /** The browser's estimate of the space used and available. */
  estimate(): Promise<StorageEstimate>
  /** Whether the browser keeps the saved data under storage pressure. */
  persisted(): Promise<boolean>
  /** Ask the browser to keep the saved data under storage pressure; whether it agreed. */
  persist(): Promise<boolean>
  /** The port's current state. */
  status(): StoragePortStatus
  /** Be told once when the port becomes outdated later in the visit; returns an unsubscribe. */
  onOutdated(listener: () => void): () => void
}

/** The port's state, with `opening` before the open settles and `deleted` after delete everything. */
type PortState = StoragePortStatus | 'opening' | 'deleted'

/** Intent: whether a browser error reports a lack of space. */
function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

/** Intent: a refusal for whatever a storage operation threw, quota when it lacked space. */
function asStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error
  if (isQuotaError(error)) return new StorageError('quota', 'the browser lacks space', error)
  return new StorageError('other', 'the storage operation failed', error)
}

/** Intent: run a storage operation, its failure turned into a refusal of the right kind. */
async function refusingAs<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw asStorageError(error)
  }
}

/** Intent: throw unless `store` names one of the data stores: anything else is a caller defect. */
function assertDataStore(store: string): asserts store is StoreName {
  if (!(DATA_STORES as readonly string[]).includes(store)) {
    throw new Error(`storage port: "${store}" is not a data store`)
  }
}

/**
 * Intent: throw unless a change of a batch names a data store, a known kind and, for a write, a
 * record with valid versions: anything else is a caller defect.
 */
function assertChange(change: StorageChange, dataVersion: number): void {
  assertDataStore(change.store)
  const kind: string = change.kind
  if (kind !== 'write' && kind !== 'delete') {
    throw new Error(`storage port: "${kind}" is not a kind of change`)
  }
  if (change.kind === 'write') assertWritableVersions(change.record, dataVersion)
}

/**
 * Intent: open the port. Never rejects for a storage failure: a database that cannot be opened
 * gives an `unavailable` port, one a newer app wrote an `outdated` one. Rejects only for a defect:
 * an empty app version, migration steps with a gap, or a step that throws.
 */
// @spec-link [[module_on_device_database]]
// @spec-link [[rule_outdated_tab_stops_saving]]
// @spec-link [[rule_delete_everything]]
export async function openStoragePort(options: StoragePortOptions): Promise<StoragePort> {
  const migrations = options.migrations ?? PRODUCTION_MIGRATIONS
  const dataVersion = migrationsDataVersion(migrations)
  if (options.appVersion === '') throw new Error('storage port: the app version must not be empty')
  const { factory, storageManager } = options
  const name = options.databaseName ?? DATABASE_NAME
  const listeners = new Set<() => void>()
  let state: PortState = 'opening'
  let connection: IDBDatabase | null = null
  let reopening: Promise<IDBDatabase> | null = null

  /** Intent: turn outdated for good, telling the listeners once if it happens after the open. */
  const becomeOutdated = (): void => {
    if (state !== 'ready' && state !== 'opening') return
    const afterOpen = state === 'ready'
    state = 'outdated'
    if (afterOpen) for (const listener of [...listeners]) listener()
  }

  /** Intent: forget a connection closed by a version change; the tab is outdated from now on. */
  const onVersionChange = (closed: IDBDatabase): void => {
    if (connection === closed) connection = null
    becomeOutdated()
  }

  try {
    const opened = await openDatabase({
      factory,
      name,
      appVersion: options.appVersion,
      migrations,
      dataVersion,
      onVersionChange,
    })
    if (state === 'opening') {
      connection = opened.connection
      state = opened.outdated ? 'outdated' : 'ready'
    }
  } catch (error) {
    if (error instanceof MigrationStepError) throw error
    state = 'unavailable'
  }

  /** Intent: the refusal for a call on a port that was deleted or never opened. */
  const unusable = (): StorageError =>
    new StorageError(
      'other',
      state === 'deleted' ? 'the database was deleted' : 'the database is unavailable',
    )

  /** Intent: a connection to read through, reopened without a version after a version change. */
  const readingConnection = async (): Promise<IDBDatabase> => {
    if (state === 'unavailable' || state === 'deleted') throw unusable()
    if (connection !== null) return connection
    reopening ??= openForReading(factory, name, onVersionChange).finally(() => {
      reopening = null
    })
    connection = await reopening
    return connection
  }

  /**
   * Intent: change some stores in one transaction on a ready port; refused with `outdated` on an
   * outdated one, and when the transaction finds a newer data version in `meta`, the port then
   * turning outdated.
   */
  // @spec-link [[rule_outdated_tab_stops_saving]]
  const changeSome = async (
    stores: readonly StoreName[],
    change: (objectStore: (store: StoreName) => IDBObjectStore) => void,
  ) => {
    if (state === 'outdated') throw new StorageError('outdated', 'a newer version saves now')
    if (state !== 'ready' || connection === null) throw unusable()
    const open = connection
    const outcome = await refusingAs(() => changeStores(open, stores, dataVersion, change))
    if (outcome === 'done') return
    becomeOutdated()
    throw new StorageError('outdated', 'a newer version of the app has written data')
  }

  /** Intent: the storage manager, refused with `other` when there is none or after deletion. */
  const manager = (): StorageManagerLike => {
    if (state === 'deleted') throw unusable()
    if (storageManager === undefined) {
      throw new StorageError('other', 'the browser offers no storage manager here')
    }
    return storageManager
  }

  return {
    read: async (store, key) => {
      assertDataStore(store)
      return refusingAs(async () => readValue(await readingConnection(), store, key))
    },
    readAll: async (store) => {
      assertDataStore(store)
      return refusingAs(async () => readAllValues(await readingConnection(), store))
    },
    // @spec-link [[module_on_device_database]]
    readKeyed: async (store) => {
      assertDataStore(store)
      return refusingAs(async () => readKeyedValues(await readingConnection(), store))
    },
    write: async (store, key, record) => {
      assertDataStore(store)
      assertWritableVersions(record, dataVersion)
      await changeSome([store], (objectStore) => objectStore(store).put(record, key))
    },
    delete: async (store, key) => {
      assertDataStore(store)
      await changeSome([store], (objectStore) => objectStore(store).delete(key))
    },
    // @spec-link [[module_on_device_database]]
    apply: async (changes) => {
      if (changes.length === 0) throw new Error('storage port: a batch must hold a change')
      for (const change of changes) assertChange(change, dataVersion)
      const stores = [...new Set(changes.map((change) => change.store))]
      await changeSome(stores, (objectStore) => {
        for (const change of changes) {
          if (change.kind === 'write') objectStore(change.store).put(change.record, change.key)
          else objectStore(change.store).delete(change.key)
        }
      })
    },
    // @spec-link [[rule_delete_everything]]
    deleteEverything: async () => {
      if (state === 'outdated') throw new StorageError('outdated', 'a newer version saves now')
      if (state === 'deleted') throw unusable()
      connection?.close()
      connection = null
      state = 'unavailable'
      await refusingAs(() => deleteDatabase(factory, name))
      state = 'deleted'
    },
    // @spec-link [[req_your_data]]
    estimate: () => refusingAs(() => manager().estimate()),
    // @spec-link [[rule_persistent_storage_requested]]
    persisted: () => refusingAs(() => manager().persisted()),
    // @spec-link [[rule_persistent_storage_requested]]
    persist: () => refusingAs(() => manager().persist()),
    status: () => (state === 'ready' || state === 'outdated' ? state : 'unavailable'),
    onOutdated: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * Intent: the browser's own IndexedDB factory and storage manager, for the app to open the port
 * with; the storage manager is absent in an insecure context.
 */
// @spec-link [[module_on_device_database]]
export function browserStorage(): Pick<StoragePortOptions, 'factory' | 'storageManager'> {
  return {
    factory: indexedDB,
    storageManager: 'storage' in navigator ? navigator.storage : undefined,
  }
}
