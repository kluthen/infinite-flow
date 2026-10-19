// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { RecordVersions } from '@/storage/record-envelope'
import { openStoragePort, StorageError, type StorageErrorKind } from '@/storage/storage-port'

import {
  blockedOpenFactory,
  databaseNames,
  DATABASE,
  failingPutFactory,
  freshFactory,
  migrationsUpTo,
  NEWER_DATA_VERSION,
  rawGet,
  recordingManager,
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

/** Intent: a ready port over a fresh in-memory database. */
async function readyPort(manager = recordingManager().manager) {
  const factory = freshFactory()
  const port = await openStoragePort({
    factory,
    appVersion: TEST_APP_VERSION,
    storageManager: manager,
  })
  return { factory, port }
}

describe('writing and reading records', () => {
  // @test-link [[module_on_device_database]]
  it('reads back a written record with both its versions, raw', async () => {
    const { port } = await readyPort()
    const record = sampleRecord({ tempo: 120 })

    await port.write('settings', 'controls.tempo', record)

    expect(await port.read('settings', 'controls.tempo')).toEqual(record)
    expect(await port.readAll('settings')).toEqual([record])
  })

  // @test-link [[module_on_device_database]]
  it('reads an absent key as undefined and an empty store as no records', async () => {
    const { port } = await readyPort()

    expect(await port.read('instrument', 'my-instrument')).toBeUndefined()
    expect(await port.readAll('sessionSummaries')).toEqual([])
  })

  // @test-link [[module_on_device_database]]
  it('deletes one record', async () => {
    const { port } = await readyPort()
    await port.write('sessionBodies', 'a', sampleRecord('first'))
    await port.write('sessionBodies', 'b', sampleRecord('second'))

    await port.delete('sessionBodies', 'a')

    expect(await port.read('sessionBodies', 'a')).toBeUndefined()
    expect(await port.readAll('sessionBodies')).toEqual([sampleRecord('second')])
  })

  // @test-link [[module_on_device_database]]
  it('refuses, before anything is stored, a record without valid versions', async () => {
    const { factory, port } = await readyPort()
    const invalid: readonly unknown[] = [
      { appVersion: TEST_APP_VERSION, payload: 1 },
      { dataVersion: 1, payload: 1 },
      { dataVersion: 1, appVersion: '', payload: 1 },
      { dataVersion: 0, appVersion: TEST_APP_VERSION, payload: 1 },
      { dataVersion: NEWER_DATA_VERSION, appVersion: TEST_APP_VERSION, payload: 1 },
    ]

    for (const record of invalid) {
      const write = port.write('settings', 'theme', record as RecordVersions)
      await expect(write).rejects.toThrow(Error)
      await expect(write).rejects.not.toBeInstanceOf(StorageError)
    }
    await withRawDatabase(factory, async (database) => {
      expect(await rawGet(database, 'settings', 'theme')).toBeUndefined()
    })
    expect(port.status()).toBe('ready')
  })

  // @test-link [[module_on_device_database]]
  it('accepts a record of an older shape below the database data version', async () => {
    const factory = freshFactory()
    const port = await openStoragePort({
      factory,
      appVersion: TEST_APP_VERSION,
      migrations: migrationsUpTo(2),
    })

    await port.write('settings', 'theme', sampleRecord('Dark', 1))
    await port.write('settings', 'mix.clickOn', sampleRecord(true, 2))

    expect(await port.readAll('settings')).toHaveLength(2)
  })
})

describe('a refusal for lack of space', () => {
  // @test-link [[module_on_device_database]]
  it('is reported as quota when the transaction aborts with a QuotaExceededError', async () => {
    const factory = failingPutFactory(
      () => new DOMException('quota exceeded', 'QuotaExceededError'),
      'transaction',
    )
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    await expectRefusal(port.write('playedNotes', 's1', sampleRecord([60, 62])), 'quota')
    expect(await port.read('playedNotes', 's1')).toBeUndefined()
    expect(port.status()).toBe('ready')
  })

  // @test-link [[module_on_device_database]]
  it('is reported as quota when the request fails with a QuotaExceededError', async () => {
    const factory = failingPutFactory(
      () => new DOMException('quota exceeded', 'QuotaExceededError'),
      'request',
    )
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    await expectRefusal(port.write('playedNotes', 's1', sampleRecord([60, 62])), 'quota')
    expect(await port.read('playedNotes', 's1')).toBeUndefined()
  })

  // @test-link [[module_on_device_database]]
  it('is told apart from another storage failure, reported as other', async () => {
    const factory = failingPutFactory(
      () => new DOMException('disk failure', 'UnknownError'),
      'transaction',
    )
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    await expectRefusal(port.write('settings', 'theme', sampleRecord('Dark')), 'other')
  })

  // @test-link [[module_on_device_database]]
  it('reports a value the database cannot store as other', async () => {
    const { port } = await readyPort()

    await expectRefusal(
      port.write(
        'settings',
        'theme',
        sampleRecord(() => 'Dark'),
      ),
      'other',
    )
    expect(await port.read('settings', 'theme')).toBeUndefined()
  })
})

describe('the space estimate and persistent storage', () => {
  // @test-link [[req_your_data]]
  it('asks the injected storage manager for the space estimate', async () => {
    const { manager, calls } = recordingManager()
    const { port } = await readyPort(manager)

    expect(await port.estimate()).toEqual({ usage: 1200, quota: 50_000_000 })
    expect(calls).toEqual(['estimate'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('asks the injected storage manager whether storage is persistent, and to make it so', async () => {
    const { manager, calls } = recordingManager()
    const { port } = await readyPort(manager)

    expect(await port.persisted()).toBe(false)
    expect(await port.persist()).toBe(true)
    expect(calls).toEqual(['persisted', 'persist'])
  })

  // @test-link [[rule_persistent_storage_requested]]
  it('refuses all three with other when there is no storage manager', async () => {
    const port = await openStoragePort({ factory: freshFactory(), appVersion: TEST_APP_VERSION })

    await expectRefusal(port.estimate(), 'other')
    await expectRefusal(port.persisted(), 'other')
    await expectRefusal(port.persist(), 'other')
  })
})

describe('delete everything', () => {
  // @test-link [[rule_delete_everything]]
  it('removes the whole database', async () => {
    const { factory, port } = await readyPort()
    await port.write('settings', 'theme', sampleRecord('Dark'))

    await port.deleteEverything()

    expect(await databaseNames(factory)).not.toContain(DATABASE)
    const fresh = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })
    expect(await fresh.readAll('settings')).toEqual([])
  })

  // @test-link [[rule_delete_everything]]
  it('leaves a port that refuses every later call with other', async () => {
    const { port } = await readyPort()
    await port.deleteEverything()

    await expectRefusal(port.read('settings', 'theme'), 'other')
    await expectRefusal(port.readAll('settings'), 'other')
    await expectRefusal(port.write('settings', 'theme', sampleRecord('Dark')), 'other')
    await expectRefusal(port.delete('settings', 'theme'), 'other')
    await expectRefusal(port.deleteEverything(), 'other')
    await expectRefusal(port.estimate(), 'other')
    await expectRefusal(port.persisted(), 'other')
    await expectRefusal(port.persist(), 'other')
  })
})

describe('a port whose database could not be opened', () => {
  // @test-link [[module_on_device_database]]
  it('opens as unavailable instead of rejecting, and refuses reads and writes with other', async () => {
    const { factory } = blockedOpenFactory()
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    expect(port.status()).toBe('unavailable')
    await expectRefusal(port.read('settings', 'theme'), 'other')
    await expectRefusal(port.readAll('settings'), 'other')
    await expectRefusal(port.write('settings', 'theme', sampleRecord('Dark')), 'other')
    await expectRefusal(port.delete('settings', 'theme'), 'other')
  })

  // @test-link [[rule_delete_everything]]
  it('still runs delete everything, which needs no open connection', async () => {
    const { factory, real } = blockedOpenFactory()
    const earlier = await openStoragePort({ factory: real, appVersion: TEST_APP_VERSION })
    await earlier.write('settings', 'theme', sampleRecord('Dark'))
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    await port.deleteEverything()

    expect(await databaseNames(real)).not.toContain(DATABASE)
  })
})
