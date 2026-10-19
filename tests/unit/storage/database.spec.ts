// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  DATABASE_DATA_VERSION,
  PRODUCTION_MIGRATIONS,
  type MigrationStep,
} from '@/storage/database'
import { openStoragePort } from '@/storage/storage-port'

import {
  databaseNames,
  freshFactory,
  rawGet,
  sampleRecord,
  syntheticStep,
  TEST_APP_VERSION,
  withRawDatabase,
} from './storage-test-doubles'

/** The seven stores the first step creates, `meta` included, in name order. */
const SEVEN_STORES = [
  'controller',
  'instrument',
  'meta',
  'playedNotes',
  'sessionBodies',
  'sessionSummaries',
  'settings',
]

/** The production migration steps of v3.0: step 1 only, a database at data version 1. */
const V3_0_MIGRATIONS = PRODUCTION_MIGRATIONS.slice(0, 1)

/** The number of production migration steps, the code's data version. */
const STEP_COUNT = PRODUCTION_MIGRATIONS.length

/** Intent: the production step 1, recorded in `ran` before it runs. */
function recordedStepOne(ran: number[]): MigrationStep {
  const [stepOne] = PRODUCTION_MIGRATIONS
  if (stepOne === undefined) throw new Error('the production migrations have no step 1')
  return {
    toVersion: 1,
    migrate: (upgrade) => {
      ran.push(1)
      stepOne.migrate(upgrade)
    },
  }
}

describe('the database data version', () => {
  // @test-link [[module_on_device_database]]
  it('is 2 from v3.1, the number of production migration steps', () => {
    expect(DATABASE_DATA_VERSION).toBe(2)
    expect(PRODUCTION_MIGRATIONS.map((step) => step.toVersion)).toEqual([1, 2])
  })
})

describe('opening a database at data version 0', () => {
  // @test-link [[module_on_device_database]]
  it('migrates it to 2: the seven stores exist and meta holds the data and app versions', async () => {
    const factory = freshFactory()
    const port = await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    expect(port.status()).toBe('ready')
    await withRawDatabase(factory, async (database) => {
      expect(database.version).toBe(2)
      expect([...database.objectStoreNames].sort()).toEqual(SEVEN_STORES)
      expect(await rawGet(database, 'meta', 'database')).toEqual({
        dataVersion: 2,
        appVersion: TEST_APP_VERSION,
      })
    })
  })

  // @test-link [[module_on_device_database]]
  it('creates the stores with keys outside the record and no index', async () => {
    const factory = freshFactory()
    await openStoragePort({ factory, appVersion: TEST_APP_VERSION })

    await withRawDatabase(factory, (database) => {
      const names = [...database.objectStoreNames]
      const transaction = database.transaction(names, 'readonly')
      for (const name of names) {
        const store = transaction.objectStore(name)
        expect(store.keyPath, name).toBeNull()
        expect(store.autoIncrement, name).toBe(false)
        expect(store.indexNames.length, name).toBe(0)
      }
    })
  })

  // @test-link [[module_on_device_database]]
  it('runs a further step passed through the open options after step 1, in order', async () => {
    const factory = freshFactory()
    const ran: number[] = []
    const port = await openStoragePort({
      factory,
      appVersion: TEST_APP_VERSION,
      migrations: [recordedStepOne(ran), syntheticStep(2, ran)],
    })

    expect(port.status()).toBe('ready')
    expect(ran).toEqual([1, 2])
    await withRawDatabase(factory, async (database) => {
      expect(database.version).toBe(2)
      expect(await rawGet(database, 'meta', 'database')).toEqual({
        dataVersion: 2,
        appVersion: TEST_APP_VERSION,
      })
    })
  })
})

describe('opening a database at data version 1 with a step 1 -> 2', () => {
  // @test-link [[module_on_device_database]]
  it('runs only step 2 and raises meta to 2, written by the upgrading app', async () => {
    const factory = freshFactory()
    await openStoragePort({ factory, appVersion: '3.0.0', migrations: V3_0_MIGRATIONS })
    const ran: number[] = []

    await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: [recordedStepOne(ran), syntheticStep(2, ran)],
    })

    expect(ran).toEqual([2])
    await withRawDatabase(factory, async (database) => {
      expect(await rawGet(database, 'meta', 'database')).toEqual({
        dataVersion: 2,
        appVersion: '3.1.0',
      })
    })
  })

  // @test-link [[module_on_device_database]]
  it('leaves the records of a store the step does not change at their own data version', async () => {
    const factory = freshFactory()
    const older = await openStoragePort({
      factory,
      appVersion: TEST_APP_VERSION,
      migrations: V3_0_MIGRATIONS,
    })
    await older.write('settings', 'theme', sampleRecord('Dark'))

    const newer = await openStoragePort({
      factory,
      appVersion: '3.1.0',
      migrations: [...V3_0_MIGRATIONS, syntheticStep(2)],
    })

    expect(await newer.read('settings', 'theme')).toEqual(sampleRecord('Dark'))
  })
})

describe('migration steps with a gap', () => {
  // @test-link [[module_on_device_database]]
  it('make the open fail as a configuration defect, before any database is created', async () => {
    const factory = freshFactory()
    const gaps: readonly (readonly MigrationStep[])[] = [
      [],
      [syntheticStep(2)],
      [...PRODUCTION_MIGRATIONS, syntheticStep(STEP_COUNT + 2)],
      [...PRODUCTION_MIGRATIONS, syntheticStep(STEP_COUNT + 1), syntheticStep(STEP_COUNT + 1)],
    ]

    for (const migrations of gaps) {
      await expect(
        openStoragePort({ factory, appVersion: TEST_APP_VERSION, migrations }),
      ).rejects.toThrow(/migration steps/)
    }
    expect(await databaseNames(factory)).toEqual([])
  })

  // @test-link [[module_on_device_database]]
  it('a step that throws makes the open fail as a defect, rolling the upgrade back', async () => {
    const factory = freshFactory()
    const throwing: MigrationStep = {
      toVersion: STEP_COUNT + 1,
      migrate: () => {
        throw new TypeError('broken step')
      },
    }

    await expect(
      openStoragePort({
        factory,
        appVersion: TEST_APP_VERSION,
        migrations: [...PRODUCTION_MIGRATIONS, throwing],
      }),
    ).rejects.toThrow(`migration step to data version ${STEP_COUNT + 1}`)
    expect(await databaseNames(factory)).toEqual([])
  })

  // @test-link [[module_on_device_database]]
  it('an empty app version makes the open fail as a configuration defect', async () => {
    await expect(openStoragePort({ factory: freshFactory(), appVersion: '' })).rejects.toThrow(
      /app version/,
    )
  })
})
