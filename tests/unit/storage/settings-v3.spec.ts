// @vitest-environment node
/**
 * The upgrade step to data version 3 over the real port and an in-memory IndexedDB: a database a
 * v3.0 tab created at data version 1, or one v3.1 left at data version 2, opens at data version 3
 * with an empty `presets` store; v3.0's musical-profile selection becomes the preset selection and
 * the seven figure levels, and the load then reads them with the saved values winning. A selection
 * record the step cannot read is left as stored; no stored value makes the open fail.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import {
  DEFAULT_GENERATION_CONTROLS,
  PROFILE_BUNDLES,
  type ProfileSelection,
} from '@/domain/controls/profile-selection'
import {
  FIGURE_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import { PRODUCTION_MIGRATIONS, type MigrationStep, type StoreName } from '@/storage/database'
import { upgradedSelectionRecords } from '@/storage/migrations/settings-v3'
import { encodeControllerRecord } from '@/storage/records/controller-record'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import {
  decodeSettings,
  encodeSettingRecord,
  V30_PROFILE_SELECTION_KEY,
} from '@/storage/records/settings-record'
import { openStoragePort } from '@/storage/storage-port'

import { lowHorn } from '../session/my-instrument-session'
import {
  openV30Port,
  seedRaw,
  UPGRADING_APP_VERSION,
  V30_APP_VERSION,
} from './kept-sessions-v1-fixtures'
import { CONTEXT, DEFAULTS } from './settings-record-fixtures'
import { freshFactory, rawGet, withRawDatabase } from './storage-test-doubles'

/** Intent: v3.0's stored selection record of `selection`, as a v3.0 tab wrote it. */
function v30SelectionRecord(selection: ProfileSelection): Record<string, unknown> {
  return {
    key: V30_PROFILE_SELECTION_KEY,
    dataVersion: 1,
    appVersion: V30_APP_VERSION,
    value: { ...selection },
  }
}

/** Intent: v3.0's stored record of one control, at data version 1. */
function v30Control(field: string, value: unknown): readonly [string, unknown] {
  const key = `controls.${field}`
  return [key, { key, dataVersion: 1, appVersion: V30_APP_VERSION, value }]
}

/** Intent: a database a v3.0 tab created at data version 1, its settings store seeded raw. */
async function v30Database(settings: readonly (readonly [string, unknown])[]): Promise<IDBFactory> {
  const factory = freshFactory()
  await openV30Port(factory)
  await seedRaw(factory, 'settings', settings)
  return factory
}

/** The production steps of v3.1, up to the settings step: a database at data version 3. */
const V3_1_MIGRATIONS = PRODUCTION_MIGRATIONS.slice(0, 3)

/** Intent: open the database as the upgrading v3.1 tab does, with every step it has. */
function openUpgraded(factory: IDBFactory) {
  return openStoragePort({
    factory,
    appVersion: UPGRADING_APP_VERSION,
    migrations: V3_1_MIGRATIONS,
  })
}

/** Intent: every value of a store, read raw. */
function rawAll(factory: IDBFactory, store: string): Promise<unknown[]> {
  return withRawDatabase(
    factory,
    (database) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = database.transaction(store, 'readonly').objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('getAll failed'))
      }),
  )
}

/** Intent: the records the step writes for a selection and its levels, by the upgrading app. */
function expectedRecords(selection: PresetSelection, levels: FigureLevels): unknown[] {
  return [
    ...FIGURE_IDS.map((figure) =>
      encodeSettingRecord(`figureLevels.${figure}`, levels[figure], UPGRADING_APP_VERSION),
    ),
    encodeSettingRecord('presetSelection', selection, UPGRADING_APP_VERSION),
  ]
}

/** Intent: the settings records the step writes, as stored, in the order the step writes them. */
function storedSelectionRecords(factory: IDBFactory): Promise<unknown[]> {
  return withRawDatabase(factory, (database) =>
    Promise.all(
      [...FIGURE_IDS.map((figure) => `figureLevels.${figure}`), 'presetSelection'].map((key) =>
        rawGet(database, 'settings', key),
      ),
    ),
  )
}

/** Intent: v3.1's production steps, each recorded in `ran` before it runs. */
function recordedProductionSteps(ran: number[]): MigrationStep[] {
  return V3_1_MIGRATIONS.map((step) => ({
    toVersion: step.toVersion,
    migrate: (upgrade) => {
      ran.push(step.toVersion)
      step.migrate(upgrade)
    },
  }))
}

/** Every store of data version 3, `meta` included, in name order. */
const EIGHT_STORES = [
  'controller',
  'instrument',
  'meta',
  'playedNotes',
  'presets',
  'sessionBodies',
  'sessionSummaries',
  'settings',
]

describe('opening an earlier database at data version 3', () => {
  // @test-link [[module_settings_upgrade_step]]
  it('opens a data version 2 database at 3 with an empty presets store', async () => {
    const factory = freshFactory()
    await openStoragePort({
      factory,
      appVersion: '3.1.0-early',
      migrations: PRODUCTION_MIGRATIONS.slice(0, 2),
    })
    const ran: number[] = []

    const port = await openStoragePort({
      factory,
      appVersion: UPGRADING_APP_VERSION,
      migrations: recordedProductionSteps(ran),
    })

    expect(port.status()).toBe('ready')
    expect(ran).toEqual([3])
    expect(await port.readAll('presets')).toEqual([])
    await withRawDatabase(factory, async (database) => {
      expect(database.version).toBe(3)
      expect([...database.objectStoreNames].sort()).toEqual(EIGHT_STORES)
      expect(await rawGet(database, 'meta', 'database')).toEqual({
        dataVersion: 3,
        appVersion: UPGRADING_APP_VERSION,
      })
    })
  })

  // @test-link [[module_settings_upgrade_step]]
  it('runs steps 1, 2 and 3 in order on an absent database, and 2 and 3 on one at data version 1', async () => {
    const absent = freshFactory()
    const fromNothing: number[] = []
    await openStoragePort({
      factory: absent,
      appVersion: UPGRADING_APP_VERSION,
      migrations: recordedProductionSteps(fromNothing),
    })
    const v30 = await v30Database([])
    const fromV30: number[] = []
    await openStoragePort({
      factory: v30,
      appVersion: UPGRADING_APP_VERSION,
      migrations: recordedProductionSteps(fromV30),
    })

    expect(fromNothing).toEqual([1, 2, 3])
    expect(fromV30).toEqual([2, 3])
    for (const factory of [absent, v30]) {
      await withRawDatabase(factory, (database) => {
        expect(database.version).toBe(3)
        expect([...database.objectStoreNames].sort()).toEqual(EIGHT_STORES)
      })
    }
  })
})

describe("carrying v3.0's selection over", () => {
  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[rule_saved_profile_becomes_preset]]
  it('makes Neutral, Jazz and customized Jazz Neutral, Jazz and Custom based on Jazz, each with its levels', async () => {
    const cases: readonly [ProfileSelection, PresetSelection, FigureLevels][] = [
      [
        { musicalProfile: 'Neutral', isCustom: false },
        { kind: 'preset', presetId: 'neutral' },
        NEUTRAL_FIGURE_LEVELS,
      ],
      [
        { musicalProfile: 'Jazz', isCustom: false },
        { kind: 'preset', presetId: 'jazz' },
        JAZZ_FIGURE_LEVELS,
      ],
      [
        { musicalProfile: 'Jazz', isCustom: true },
        { kind: 'custom', baseId: 'jazz' },
        JAZZ_FIGURE_LEVELS,
      ],
    ]

    for (const [saved, selection, levels] of cases) {
      // The controls a v3.0 tab saved with that profile picked: its bundle.
      const bundle = Object.entries(PROFILE_BUNDLES[saved.musicalProfile])
      const factory = await v30Database([
        [V30_PROFILE_SELECTION_KEY, v30SelectionRecord(saved)],
        ...bundle.map(([field, value]) => v30Control(field, value)),
      ])

      expect((await openUpgraded(factory)).status()).toBe('ready')

      const label = JSON.stringify(saved)
      expect(await storedSelectionRecords(factory), label).toStrictEqual(
        expectedRecords(selection, levels),
      )
      await withRawDatabase(factory, async (database) => {
        expect(await rawGet(database, 'settings', V30_PROFILE_SELECTION_KEY), label).toBeUndefined()
      })
      const loaded = decodeSettings(await rawAll(factory, 'settings'), CONTEXT)
      expect(loaded.presetSelection, label).toEqual(selection)
      expect(loaded.figureLevels, label).toEqual(levels)
    }
  })

  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[rule_saved_profile_becomes_preset]]
  // @test-link [[rule_preset_load_values_win]]
  it('writes Jazz saved with Tension at Build as Jazz, which then loads as Custom based on Jazz', async () => {
    const jazzControls = { ...PROFILE_BUNDLES.Jazz, tension: 'Build' } as const
    const factory = await v30Database([
      [V30_PROFILE_SELECTION_KEY, v30SelectionRecord({ musicalProfile: 'Jazz', isCustom: false })],
      ...Object.entries(jazzControls).map(([field, value]) => v30Control(field, value)),
    ])

    await openUpgraded(factory)

    const records = await storedSelectionRecords(factory)
    expect(records.at(-1)).toEqual(
      encodeSettingRecord(
        'presetSelection',
        { kind: 'preset', presetId: 'jazz' },
        UPGRADING_APP_VERSION,
      ),
    )
    const loaded = decodeSettings(await rawAll(factory, 'settings'), CONTEXT)
    expect(loaded.presetSelection).toEqual({ kind: 'custom', baseId: 'jazz' })
    expect(loaded.figureLevels).toEqual(JAZZ_FIGURE_LEVELS)
    expect(loaded.controls).toEqual(
      makeGenerationControls({ ...DEFAULT_GENERATION_CONTROLS, ...jazzControls }),
    )
  })

  // @test-link [[module_settings_upgrade_step]]
  it('leaves an unreadable v3.0 selection as stored, writing nothing in its place', async () => {
    const jazz = v30SelectionRecord({ musicalProfile: 'Jazz', isCustom: false })
    const unreadable: readonly unknown[] = [
      { ...jazz, appVersion: '' },
      { ...jazz, dataVersion: 'one' },
      { ...jazz, extra: true },
      { ...jazz, key: 'theme' },
      { ...jazz, value: { musicalProfile: 'Blues', isCustom: false } },
      { ...jazz, value: { musicalProfile: 'Jazz' } },
      { ...jazz, value: 'Jazz' },
      { ...jazz, dataVersion: 2 },
      { ...jazz, dataVersion: 3 },
      'Jazz',
      null,
      [jazz],
    ]

    for (const stored of unreadable) {
      const factory = await v30Database([[V30_PROFILE_SELECTION_KEY, stored]])

      expect((await openUpgraded(factory)).status()).toBe('ready')

      const label = JSON.stringify(stored)
      await withRawDatabase(factory, async (database) => {
        expect(await rawGet(database, 'settings', V30_PROFILE_SELECTION_KEY), label).toStrictEqual(
          stored,
        )
      })
      expect(await rawAll(factory, 'settings'), label).toStrictEqual([stored])
      expect(decodeSettings(await rawAll(factory, 'settings'), CONTEXT), label).toEqual(DEFAULTS)
    }
  })

  // @test-link [[module_settings_upgrade_step]]
  it('gives nothing for any value it cannot read, never throwing', () => {
    const throwing = {
      /** Intent: a stored value whose reading throws. */
      get key(): string {
        throw new Error('a getter that throws')
      },
    }
    const circular: Record<string, unknown> = { key: V30_PROFILE_SELECTION_KEY }
    circular.value = circular
    for (const stored of [undefined, null, 0, 10n, '', [], {}, throwing, circular]) {
      expect(upgradedSelectionRecords(stored, UPGRADING_APP_VERSION)).toBeNull()
    }
    expect(
      upgradedSelectionRecords(
        v30SelectionRecord({ musicalProfile: 'Neutral', isCustom: false }),
        '',
      ),
    ).toBeNull()
  })
})

describe('the records data version 3 does not change', () => {
  // @test-link [[module_settings_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('keeps every other settings record and every other store record at its data version', async () => {
    const factory = freshFactory()
    await openStoragePort({
      factory,
      appVersion: V30_APP_VERSION,
      migrations: PRODUCTION_MIGRATIONS.slice(0, 2),
    })
    const seeded: readonly (readonly [StoreName, string, unknown])[] = [
      ['settings', 'theme', encodeSettingRecord('theme', 'Dark', V30_APP_VERSION)],
      ['settings', 'controls.tempo', encodeSettingRecord('controls.tempo', 150, V30_APP_VERSION)],
      [
        'instrument',
        MY_INSTRUMENT_RECORD_KEY,
        encodeMyInstrumentRecord(lowHorn('bass'), V30_APP_VERSION),
      ],
      [
        'controller',
        'remembered',
        encodeControllerRecord(
          { id: 'port-1', name: 'Pad', manufacturer: 'Acme' },
          V30_APP_VERSION,
        ),
      ],
      ['sessionSummaries', 'kept', { dataVersion: 2, appVersion: V30_APP_VERSION, label: 'x' }],
      ['playedNotes', 'kept', { dataVersion: 1, appVersion: V30_APP_VERSION, notes: [] }],
    ]
    for (const [store, key, value] of seeded) await seedRaw(factory, store, [[key, value]])

    expect((await openUpgraded(factory)).status()).toBe('ready')

    await withRawDatabase(factory, async (database) => {
      for (const [store, key, value] of seeded) {
        expect(await rawGet(database, store, key), `${store}/${key}`).toStrictEqual(value)
      }
    })
  })

  // @test-link [[module_settings_upgrade_step]]
  it('never fails the open on a stored settings value', async () => {
    const odd: readonly unknown[] = [undefined, 10n, new Date(0), new Map([[1, 2]]), [1, [2]], {}]

    for (const stored of odd) {
      const factory = await v30Database([
        [V30_PROFILE_SELECTION_KEY, stored],
        ['controls.tempo', stored],
        ['theme', stored],
      ])

      expect((await openUpgraded(factory)).status(), String(stored)).toBe('ready')
      await withRawDatabase(factory, (database) => {
        expect(database.version).toBe(3)
      })
    }
  })
})
