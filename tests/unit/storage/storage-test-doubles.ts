/**
 * Test doubles for the on-device database: a fresh in-memory IndexedDB per test (fake-indexeddb,
 * injected, never the global shim), raw access to it for inspecting and tampering with what is
 * stored, factories that fail the way a browser does, and a recording storage manager.
 */

import { IDBFactory } from 'fake-indexeddb'

import { PRODUCTION_MIGRATIONS, type MigrationStep } from '@/storage/database'
import type { RecordVersions } from '@/storage/record-envelope'
import type { StorageManagerLike } from '@/storage/storage-port'

/** The app version the tests write records with. */
export const TEST_APP_VERSION = '3.0.0-test'

/** The database name the port opens by default. */
export const DATABASE = 'infinite-flow'

/** Intent: a fresh, empty in-memory IndexedDB, so no test sees another's data. */
export function freshFactory(): IDBFactory {
  return new IDBFactory()
}

/** Intent: a record a store would hold, with valid versions and a payload. */
export function sampleRecord(
  payload: unknown,
  dataVersion = 1,
): RecordVersions & { readonly payload: unknown } {
  return { dataVersion, appVersion: TEST_APP_VERSION, payload }
}

/** Intent: a synthetic step 1 -> 2 that rewrites nothing, recorded in `ran` when it runs. */
export function syntheticStep(toVersion: number, ran: number[] = []): MigrationStep {
  return {
    toVersion,
    migrate: () => {
      ran.push(toVersion)
    },
  }
}

/** Intent: the production steps followed by synthetic steps up to `version`. */
export function migrationsUpTo(version: number): MigrationStep[] {
  const steps: MigrationStep[] = [...PRODUCTION_MIGRATIONS]
  for (let next = steps.length + 1; next <= version; next += 1) steps.push(syntheticStep(next))
  return steps
}

/** Intent: the result of one raw IndexedDB request, as a promise. */
function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('request failed'))
  })
}

/**
 * Intent: run `inspect` on a raw connection to an existing database, opened without a version,
 * and close it afterwards so it never blocks a later upgrade.
 */
export async function withRawDatabase<T>(
  factory: IDBFactory,
  inspect: (database: IDBDatabase) => Promise<T> | T,
  version?: number,
): Promise<T> {
  const request = version === undefined ? factory.open(DATABASE) : factory.open(DATABASE, version)
  const database = await settle(request)
  try {
    return await inspect(database)
  } finally {
    database.close()
  }
}

/** Intent: one value read straight from a store, bypassing the port. */
export function rawGet(database: IDBDatabase, store: string, key: string): Promise<unknown> {
  return settle(database.transaction(store, 'readonly').objectStore(store).get(key))
}

/** Intent: one value written straight to a store, bypassing the port, once committed. */
export function rawPut(
  database: IDBDatabase,
  store: string,
  key: string,
  value: unknown,
): Promise<void> {
  const transaction = database.transaction(store, 'readwrite')
  transaction.objectStore(store).put(value, key)
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('transaction aborted'))
  })
}

/** Intent: the names of the databases the factory holds. */
export async function databaseNames(factory: IDBFactory): Promise<string[]> {
  const databases = await factory.databases()
  return databases.map((database) => database.name ?? '')
}

/** How an injected `put` fails: thrown by the request call, or as the transaction's error. */
export type PutFailurePath = 'request' | 'transaction'

/**
 * Intent: make every `put` of one transaction fail with `failure`, the way a browser out of space
 * does: thrown at the call, or by aborting the transaction with that error.
 */
function failPuts(transaction: IDBTransaction, failure: DOMException, path: PutFailurePath): void {
  const objectStore = transaction.objectStore.bind(transaction)
  Object.defineProperty(transaction, 'objectStore', {
    value: (name: string) => {
      const store = objectStore(name)
      const put = store.put.bind(store)
      Object.defineProperty(store, 'put', {
        value: (value: unknown, key?: IDBValidKey) => {
          if (path === 'request') throw failure
          const request = put(value, key)
          transaction.abort()
          Object.defineProperty(transaction, 'error', { value: failure })
          return request
        },
      })
      return store
    },
  })
}

/**
 * Intent: a factory over a fresh in-memory IndexedDB whose connections' `put` always fails with
 * the error `makeFailure` gives, through `path`. Everything else is the real fake database.
 */
export function failingPutFactory(
  makeFailure: () => DOMException,
  path: PutFailurePath,
): IDBFactory {
  const real = freshFactory()
  return {
    open: (name: string, version?: number) => {
      const request = version === undefined ? real.open(name) : real.open(name, version)
      request.addEventListener('success', () => {
        const connection = request.result
        const transaction = connection.transaction.bind(connection)
        Object.defineProperty(connection, 'transaction', {
          value: (...args: Parameters<IDBDatabase['transaction']>) => {
            const opened = transaction(...args)
            failPuts(opened, makeFailure(), path)
            return opened
          },
        })
      })
      return request
    },
    deleteDatabase: (name: string) => real.deleteDatabase(name),
    databases: () => real.databases(),
    cmp: (first: unknown, second: unknown) => real.cmp(first, second),
  }
}

/**
 * Intent: a factory whose `open` throws, as a browser with storage blocked does, over a fresh
 * in-memory IndexedDB that still deletes databases.
 */
export function blockedOpenFactory(): { factory: IDBFactory; real: IDBFactory } {
  const real = freshFactory()
  const factory: IDBFactory = {
    open: () => {
      throw new DOMException('storage is blocked', 'SecurityError')
    },
    deleteDatabase: (name: string) => real.deleteDatabase(name),
    databases: () => real.databases(),
    cmp: (first: unknown, second: unknown) => real.cmp(first, second),
  }
  return { factory, real }
}

/** A storage manager that answers fixed values and records which of its calls were made. */
export interface RecordingManager {
  readonly manager: StorageManagerLike
  readonly calls: string[]
}

/** Intent: a storage manager answering fixed values and recording each call by name. */
export function recordingManager(): RecordingManager {
  const calls: string[] = []
  const manager: StorageManagerLike = {
    estimate: () => {
      calls.push('estimate')
      return Promise.resolve({ usage: 1200, quota: 50_000_000 })
    },
    persisted: () => {
      calls.push('persisted')
      return Promise.resolve(false)
    },
    persist: () => {
      calls.push('persist')
      return Promise.resolve(true)
    },
  }
  return { manager, calls }
}
