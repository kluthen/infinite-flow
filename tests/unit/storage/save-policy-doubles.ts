/**
 * Test doubles for the save policy: ports over a fresh in-memory IndexedDB in each of the port's
 * states, spies proving which calls reach the port and the database, a port double that refuses
 * on demand, and recorders for the policy's reports.
 */

import { IDBDatabase } from 'fake-indexeddb'
import { vi } from 'vitest'

import type { SaveFailureKind, SavePolicy, SavingState } from '@/storage/save-policy'
import {
  openStoragePort,
  StorageError,
  type StorageErrorKind,
  type StorageManagerLike,
  type StoragePort,
} from '@/storage/storage-port'

import {
  blockedOpenFactory,
  migrationsUpTo,
  rawPut,
  recordingManager,
  sampleRecord,
  TEST_APP_VERSION,
  withRawDatabase,
  type RecordingManager,
} from './storage-test-doubles'

/** Intent: a ready port at data version 1 over `factory`, with an optional storage manager. */
export function readyPort(
  factory: IDBFactory,
  storageManager?: StorageManagerLike,
): Promise<StoragePort> {
  return openStoragePort({ factory, appVersion: TEST_APP_VERSION, storageManager })
}

/** Intent: a ready port over `factory` already holding a theme and played notes. */
export async function filledPort(
  factory: IDBFactory,
  storageManager?: StorageManagerLike,
): Promise<StoragePort> {
  const port = await readyPort(factory, storageManager)
  await port.write('settings', 'theme', sampleRecord('Dark'))
  await port.write('playedNotes', 's1', sampleRecord([60, 62]))
  return port
}

/** Intent: open a newer app's port over `factory`, upgrading the database to data version 2. */
export function openNewerTab(factory: IDBFactory): Promise<StoragePort> {
  return openStoragePort({ factory, appVersion: '3.1.0', migrations: migrationsUpTo(2) })
}

/** Intent: a port opened outdated, over a database a newer app upgraded first. */
export async function outdatedPort(
  factory: IDBFactory,
  storageManager?: StorageManagerLike,
): Promise<StoragePort> {
  await openNewerTab(factory)
  return openStoragePort({ factory, appVersion: '3.0.0', storageManager })
}

/** Intent: an unavailable port (its open throws) over a database already holding data. */
export async function unavailablePort(
  storageManager?: StorageManagerLike,
): Promise<{ port: StoragePort; real: IDBFactory }> {
  const { factory, real } = blockedOpenFactory()
  await filledPort(real)
  const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION, storageManager })
  return { port, real }
}

/** Intent: rewrite meta as a newer tab does at the same IndexedDB version: the next write is refused. */
export async function raiseMeta(factory: IDBFactory): Promise<void> {
  await withRawDatabase(
    factory,
    (database) => rawPut(database, 'meta', 'database', { dataVersion: 2, appVersion: '3.1.0' }),
    1,
  )
}

/** Calls counted on a port's data methods and on the database's transactions. */
export interface CallCounter {
  /** Calls made to the port's read, readAll, write, delete, apply and deleteEverything. */
  readonly portCalls: () => number
  /** Transactions opened on any database connection. */
  readonly transactions: () => number
  /** Read-write transactions opened on any database connection. */
  readonly readwriteTransactions: () => number
}

/**
 * Intent: count from now on every call to the port's data methods and every transaction opened on
 * the fake database. Call it after the setup writes, before the policy acts.
 */
export function countCalls(port: StoragePort): CallCounter {
  const spies = [
    vi.spyOn(port, 'read'),
    vi.spyOn(port, 'readAll'),
    vi.spyOn(port, 'write'),
    vi.spyOn(port, 'delete'),
    vi.spyOn(port, 'apply'),
    vi.spyOn(port, 'deleteEverything'),
  ]
  const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction')
  return {
    portCalls: () => spies.reduce((total, spy) => total + spy.mock.calls.length, 0),
    transactions: () => transaction.mock.calls.length,
    readwriteTransactions: () =>
      transaction.mock.calls.filter(([, mode]) => mode === 'readwrite').length,
  }
}

/** A port that delegates to a real one but refuses its changes while told to. */
export interface RefusingPort {
  readonly port: StoragePort
  /** Refuse every write, delete, batch and delete everything with `kind`; null to stop. */
  readonly refuse: (kind: StorageErrorKind | null) => void
}

/** Intent: wrap a real port so its changes can be refused on demand, with a refusal of any kind. */
export function refusingPort(real: StoragePort): RefusingPort {
  let refusal: StorageErrorKind | null = null
  /** Intent: run `operation` on the real port, unless told to refuse it. */
  const guarded = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (refusal !== null) throw new StorageError(refusal, 'refused by the test double')
    return operation()
  }
  const port: StoragePort = {
    ...real,
    write: (store, key, record) => guarded(() => real.write(store, key, record)),
    delete: (store, key) => guarded(() => real.delete(store, key)),
    apply: (changes) => guarded(() => real.apply(changes)),
    deleteEverything: () => guarded(() => real.deleteEverything()),
  }
  return {
    port,
    refuse: (kind) => {
      refusal = kind
    },
  }
}

/** Intent: the kinds a policy reports to its failure listener, in order. */
export function recordFailures(policy: SavePolicy): SaveFailureKind[] {
  const reported: SaveFailureKind[] = []
  policy.onFailure((kind) => reported.push(kind))
  return reported
}

/** Intent: the states a policy changes to, in order. */
export function recordStates(policy: SavePolicy): SavingState[] {
  const states: SavingState[] = []
  policy.onStateChange((state) => states.push(state))
  return states
}

/** Intent: a recording storage manager whose saved data is already persistent. */
export function protectedManager(): RecordingManager {
  const recording = recordingManager()
  const manager: StorageManagerLike = {
    ...recording.manager,
    persisted: () => {
      recording.calls.push('persisted')
      return Promise.resolve(true)
    },
  }
  return { manager, calls: recording.calls }
}

/** Intent: the error a browser out of space fails with. */
export function lackOfSpace(): DOMException {
  return new DOMException('quota exceeded', 'QuotaExceededError')
}

/** Intent: the error of a storage failure other than a lack of space. */
export function diskFailure(): DOMException {
  return new DOMException('disk failure', 'UnknownError')
}

/** Intent: assert-free capture of how a promise settles: its value, or the error it rejected with. */
export async function settled<T>(operation: Promise<T>): Promise<{ value?: T; error?: unknown }> {
  try {
    return { value: await operation }
  } catch (error) {
    return { error }
  }
}
