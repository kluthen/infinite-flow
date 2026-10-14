// @vitest-environment node
import { IDBDatabase } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RecordVersions } from '@/storage/record-envelope'
import {
  openStoragePort,
  StorageError,
  type StorageChange,
  type StorageErrorKind,
  type StoragePort,
  type StoreName,
} from '@/storage/storage-port'

import {
  blockedOpenFactory,
  failingPutFactory,
  freshFactory,
  migrationsUpTo,
  rawGet,
  rawPut,
  sampleRecord,
  TEST_APP_VERSION,
  withRawDatabase,
} from './storage-test-doubles'

/** Intent: assert that `operation` rejects with a storage error of the given kind. */
async function expectRefusal(operation: Promise<unknown>, kind: StorageErrorKind): Promise<void> {
  const error: unknown = await operation.then(
    () => undefined,
    (refusal: unknown) => refusal,
  )
  expect(error).toBeInstanceOf(StorageError)
  expect((error as StorageError).kind).toBe(kind)
}

/** Intent: assert that `operation` rejects with a plain Error, a caller defect, not a refusal. */
async function expectDefect(operation: Promise<unknown>): Promise<void> {
  const error: unknown = await operation.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  expect(error).toBeInstanceOf(Error)
  expect(error).not.toBeInstanceOf(StorageError)
}

/** Intent: a ready port at data version 1 over `factory`, holding a theme and played notes. */
async function filledPort(factory: IDBFactory): Promise<StoragePort> {
  const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })
  await port.write('settings', 'theme', sampleRecord('Dark'))
  await port.write('playedNotes', 's1', sampleRecord([60, 62]))
  return port
}

/** Intent: assert the database still holds exactly what `filledPort` stored, read raw. */
async function expectUntouched(factory: IDBFactory): Promise<void> {
  await withRawDatabase(factory, async (database) => {
    expect(await rawGet(database, 'settings', 'theme')).toEqual(sampleRecord('Dark'))
    expect(await rawGet(database, 'playedNotes', 's1')).toEqual(sampleRecord([60, 62]))
    expect(await rawGet(database, 'sessionSummaries', 's2')).toBeUndefined()
  })
}

/** A batch over three stores: a delete, then two writes. */
const MIXED_BATCH: readonly StorageChange[] = [
  { kind: 'delete', store: 'playedNotes', key: 's1' },
  { kind: 'write', store: 'sessionSummaries', key: 's2', record: sampleRecord({ notes: 12 }) },
  { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
]

/** Intent: the error a browser out of space fails with. */
function lackOfSpace(): DOMException {
  return new DOMException('quota exceeded', 'QuotaExceededError')
}

/** Intent: the error of a storage failure other than a lack of space. */
function diskFailure(): DOMException {
  return new DOMException('disk failure', 'UnknownError')
}

/** Intent: a port over a database already holding a theme and played notes, whose puts fail. */
async function portWhosePutsFail(
  failure: () => DOMException,
  path: 'request' | 'transaction',
): Promise<{ factory: IDBFactory; port: StoragePort }> {
  const factory = freshFactory()
  await filledPort(factory)
  const port = await openStoragePort({
    factory: failingPutFactory(failure, path, factory),
    appVersion: TEST_APP_VERSION,
  })
  return { factory, port }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('applying a batch of changes', () => {
  // @test-link [[module_on_device_database]]
  it('makes every write and delete of the batch visible, across stores', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)

    await port.apply(MIXED_BATCH)

    expect(await port.read('playedNotes', 's1')).toBeUndefined()
    expect(await port.read('sessionSummaries', 's2')).toEqual(sampleRecord({ notes: 12 }))
    expect(await port.read('settings', 'theme')).toEqual(sampleRecord('Light'))
    expect(port.status()).toBe('ready')
  })

  // @test-link [[module_on_device_database]]
  it('applies the changes in list order, a later change to the same key winning', async () => {
    const port = await filledPort(freshFactory())

    await port.apply([
      { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
      { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Sepia') },
      { kind: 'write', store: 'playedNotes', key: 's1', record: sampleRecord([64]) },
      { kind: 'delete', store: 'playedNotes', key: 's1' },
    ])

    expect(await port.read('settings', 'theme')).toEqual(sampleRecord('Sepia'))
    expect(await port.read('playedNotes', 's1')).toBeUndefined()
  })

  // @test-link [[module_on_device_database]]
  it('opens exactly one readwrite transaction for the whole batch', async () => {
    const port = await filledPort(freshFactory())
    const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction')

    await port.apply(MIXED_BATCH)

    const readwrite = transaction.mock.calls.filter(([, mode]) => mode === 'readwrite')
    expect(readwrite).toHaveLength(1)
  })
})

describe('a batch that fails part-way', () => {
  // @test-link [[module_on_device_database]]
  it('changes nothing and is refused with quota when a put lacks space', async () => {
    const { factory, port } = await portWhosePutsFail(lackOfSpace, 'request')

    await expectRefusal(port.apply(MIXED_BATCH), 'quota')

    await expectUntouched(factory)
    expect(port.status()).toBe('ready')
  })

  // @test-link [[module_on_device_database]]
  it('changes nothing and is refused with quota when the transaction aborts for space', async () => {
    const { factory, port } = await portWhosePutsFail(lackOfSpace, 'transaction')

    await expectRefusal(
      port.apply([
        { kind: 'delete', store: 'playedNotes', key: 's1' },
        { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
      ]),
      'quota',
    )

    await expectUntouched(factory)
  })

  // @test-link [[module_on_device_database]]
  it('changes nothing and is refused with other on another storage failure', async () => {
    const { factory, port } = await portWhosePutsFail(diskFailure, 'transaction')

    await expectRefusal(
      port.apply([
        { kind: 'delete', store: 'playedNotes', key: 's1' },
        { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light') },
      ]),
      'other',
    )

    await expectUntouched(factory)
  })
})

describe('a batch on a port that may not save', () => {
  /** Intent: rewrite meta as a newer tab does, at the same IndexedDB version. */
  async function raiseMeta(factory: IDBFactory): Promise<void> {
    await withRawDatabase(
      factory,
      (database) => rawPut(database, 'meta', 'database', { dataVersion: 2, appVersion: '3.1.0' }),
      1,
    )
  }

  // @test-link [[module_on_device_database]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('is refused with outdated, changing nothing, when meta holds a newer data version', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)
    let notices = 0
    port.onOutdated(() => {
      notices += 1
    })
    await raiseMeta(factory)

    await expectRefusal(port.apply(MIXED_BATCH), 'outdated')

    expect(port.status()).toBe('outdated')
    expect(notices).toBe(1)
    await expectUntouched(factory)
    await expectRefusal(port.apply(MIXED_BATCH), 'outdated')
    expect(notices).toBe(1)
  })

  // @test-link [[module_on_device_database]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('is refused with outdated on a port opened over a database a newer app upgraded', async () => {
    const factory = freshFactory()
    const newer = await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: migrationsUpTo(2),
    })
    await newer.write('settings', 'theme', sampleRecord('Dark'))
    const older = await openStoragePort({ factory, appVersion: '3.0.0' })

    await expectRefusal(older.apply(MIXED_BATCH), 'outdated')

    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
  })

  // @test-link [[module_on_device_database]]
  it('is refused with other on an unavailable or deleted port', async () => {
    const unavailable = await openStoragePort({
      factory: blockedOpenFactory().factory,
      appVersion: TEST_APP_VERSION,
    })
    const deleted = await filledPort(freshFactory())
    await deleted.deleteEverything()

    await expectRefusal(unavailable.apply(MIXED_BATCH), 'other')
    await expectRefusal(deleted.apply(MIXED_BATCH), 'other')
  })
})

describe('a defective batch', () => {
  // @test-link [[module_on_device_database]]
  it('throws a plain Error, touching nothing: empty, bad store or kind, or invalid versions', async () => {
    const factory = freshFactory()
    const port = await filledPort(factory)
    const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction')
    const valid: StorageChange = {
      kind: 'write',
      store: 'sessionSummaries',
      key: 's2',
      record: sampleRecord({ notes: 12 }),
    }
    const defective: readonly (readonly StorageChange[])[] = [
      [],
      [valid, { kind: 'delete', store: 'meta' as StoreName, key: 'database' }],
      [valid, { kind: 'move', store: 'settings', key: 'theme' } as unknown as StorageChange],
      [valid, { kind: 'write', store: 'settings', key: 'theme', record: sampleRecord('Light', 2) }],
      [
        valid,
        {
          kind: 'write',
          store: 'settings',
          key: 'theme',
          record: { dataVersion: 1, payload: 'Light' } as unknown as RecordVersions,
        },
      ],
    ]

    for (const changes of defective) await expectDefect(port.apply(changes))

    expect(transaction).not.toHaveBeenCalled()
    transaction.mockRestore()
    await expectUntouched(factory)
    expect(port.status()).toBe('ready')
  })
})
