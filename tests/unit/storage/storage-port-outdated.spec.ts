// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  openStoragePort,
  StorageError,
  type StorageErrorKind,
  type StoragePort,
} from '@/storage/storage-port'

import {
  databaseNames,
  DATABASE,
  freshFactory,
  migrationsUpTo,
  rawGet,
  rawPut,
  sampleRecord,
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

/** Intent: assert that an outdated port refuses every write, delete and delete everything. */
async function expectNoWriteOfAnyKind(port: StoragePort): Promise<void> {
  await expectRefusal(port.write('settings', 'theme', sampleRecord('Light')), 'outdated')
  await expectRefusal(port.delete('settings', 'theme'), 'outdated')
  await expectRefusal(port.deleteEverything(), 'outdated')
}

/** Intent: count the outdated notices a port gives. */
function countOutdated(port: StoragePort): { readonly count: () => number } {
  let count = 0
  port.onOutdated(() => {
    count += 1
  })
  return { count: () => count }
}

/** Intent: an older port at data version 1 holding a saved theme, and its outdated counter. */
async function olderTabWithTheme(factory: IDBFactory) {
  const older = await openStoragePort({ factory, appVersion: '3.0.0' })
  await older.write('settings', 'theme', sampleRecord('Dark'))
  return { older, notices: countOutdated(older) }
}

describe('a newer tab upgrading the database while an older tab is open', () => {
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('makes the older tab close, report outdated once and never write again', async () => {
    const factory = freshFactory()
    const { older, notices } = await olderTabWithTheme(factory)

    const newer = await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: migrationsUpTo(2),
    })

    expect(newer.status()).toBe('ready')
    expect(older.status()).toBe('outdated')
    expect(notices.count()).toBe(1)
    await expectNoWriteOfAnyKind(older)
    expect(await newer.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
    expect(await databaseNames(factory)).toContain(DATABASE)
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('leaves the older tab reading through a connection reopened without a version', async () => {
    const factory = freshFactory()
    const { older } = await olderTabWithTheme(factory)
    const newer = await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: migrationsUpTo(2),
    })
    await newer.write('settings', 'mix.clickOn', sampleRecord(false))

    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
    expect(await older.readAll('settings')).toHaveLength(2)
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('tells the listeners only once, though later upgrades close the reopened connection too', async () => {
    const factory = freshFactory()
    const { older, notices } = await olderTabWithTheme(factory)
    await openStoragePort({ factory, appVersion: '3.1.0', migrations: migrationsUpTo(2) })
    await older.read('settings', 'theme')

    const newest = await openStoragePort({
      factory,
      appVersion: '3.2.0',
      migrations: migrationsUpTo(3),
    })

    expect(newest.status()).toBe('ready')
    expect(notices.count()).toBe(1)
    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('stops telling a listener that unsubscribed', async () => {
    const factory = freshFactory()
    const older = await openStoragePort({ factory, appVersion: '3.0.0' })
    let told = 0
    const unsubscribe = older.onOutdated(() => {
      told += 1
    })

    unsubscribe()
    await openStoragePort({ factory, appVersion: '3.1.0', migrations: migrationsUpTo(2) })

    expect(older.status()).toBe('outdated')
    expect(told).toBe(0)
  })
})

describe('another tab deleting everything while this tab is open', () => {
  // @test-link [[rule_outdated_tab_stops_saving]]
  // @test-link [[rule_delete_everything]]
  it('makes this tab outdated, saving nothing, and its reads never bring the data back', async () => {
    const factory = freshFactory()
    const { older, notices } = await olderTabWithTheme(factory)
    const other = await openStoragePort({ factory, appVersion: '3.0.0' })

    await other.deleteEverything()

    expect(older.status()).toBe('outdated')
    expect(notices.count()).toBe(1)
    await expectNoWriteOfAnyKind(older)
    await expectRefusal(older.read('settings', 'theme'), 'other')
    expect(await databaseNames(factory)).not.toContain(DATABASE)
  })
})

describe('a newer tab raising the data version in meta without an upgrade', () => {
  /** Intent: rewrite meta as a newer tab does, at the same IndexedDB version. */
  async function raiseMeta(factory: IDBFactory): Promise<void> {
    await withRawDatabase(
      factory,
      (database) => rawPut(database, 'meta', 'database', { dataVersion: 2, appVersion: '3.1.0' }),
      1,
    )
  }

  // @test-link [[rule_outdated_tab_stops_saving]]
  it("aborts this tab's next write with outdated, writing nothing, outdated from then on", async () => {
    const factory = freshFactory()
    const { older, notices } = await olderTabWithTheme(factory)
    await raiseMeta(factory)

    await expectRefusal(older.write('settings', 'theme', sampleRecord('Light')), 'outdated')

    expect(older.status()).toBe('outdated')
    expect(notices.count()).toBe(1)
    await expectNoWriteOfAnyKind(older)
    await withRawDatabase(factory, async (database) => {
      expect(await rawGet(database, 'settings', 'theme')).toEqual(sampleRecord('Dark'))
    })
    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it("aborts this tab's next delete with outdated, deleting nothing", async () => {
    const factory = freshFactory()
    const { older, notices } = await olderTabWithTheme(factory)
    await raiseMeta(factory)

    await expectRefusal(older.delete('settings', 'theme'), 'outdated')

    expect(older.status()).toBe('outdated')
    expect(notices.count()).toBe(1)
    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
  })

  // @test-link [[rule_outdated_tab_stops_saving]]
  it('makes a tab opened afterwards outdated from the start', async () => {
    const factory = freshFactory()
    await olderTabWithTheme(factory)
    await raiseMeta(factory)

    const later = await openStoragePort({ factory, appVersion: '3.0.0' })

    expect(later.status()).toBe('outdated')
    expect(await later.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
    await expectNoWriteOfAnyKind(later)
  })
})

describe('opening a database a newer app already upgraded', () => {
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  // @test-link [[rule_outdated_tab_stops_saving]]
  it('gives a read-only connection and the status outdated', async () => {
    const factory = freshFactory()
    const newer = await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: migrationsUpTo(2),
    })
    await newer.write('settings', 'theme', sampleRecord('Dark'))

    const older = await openStoragePort({ factory, appVersion: '3.0.0' })
    const notices = countOutdated(older)

    expect(older.status()).toBe('outdated')
    expect(await older.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
    expect(await older.readAll('settings')).toEqual([sampleRecord('Dark')])
    await expectNoWriteOfAnyKind(older)
    expect(notices.count()).toBe(0)
    expect(await newer.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
    expect(await databaseNames(factory)).toContain(DATABASE)
  })
})
