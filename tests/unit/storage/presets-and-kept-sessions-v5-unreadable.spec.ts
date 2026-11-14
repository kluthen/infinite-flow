// @vitest-environment node
/**
 * The upgrade step to data version 5 over records it cannot read: a database a v3.2 tab left at
 * data version 4, holding one readable body and v3.2 bodies the data version 4 reader refuses (a
 * damaged intent, an intent holding a Seventh chords level, a harmony event or a carried chord
 * holding a seventh, a body still at data version 2), and player preset records the preset codec
 * cannot read at data version 3, opens at data version 5, the readable ones carried over and every
 * other left as stored, read as unreadable or not listed; malformed stored values of every kind
 * never make the step throw or the open fail; a v3.2 tab open meanwhile becomes outdated.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'
import type { SessionHistoryRecord } from '@/session/session-history'
import {
  upgradedKeptBodyV5,
  upgradedPresetV5,
} from '@/storage/migrations/presets-and-kept-sessions-v5'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { decodePlayerPresets } from '@/storage/records/preset-record'
import { openStoragePort } from '@/storage/storage-port'
import { edited, historyOf, recordedKeptSession, REMOVE } from './kept-session-fixtures'
import { databaseState, rawSession, seedRaw, sessionWrites } from './kept-sessions-v1-fixtures'
import {
  openV32Port,
  seedVersion4,
  V32_APP_VERSION,
  v3PresetRecord,
  v4Session,
} from './kept-sessions-v4-fixtures'
import { seventhOf } from '../domain/harmony/seventh-chord-fixtures'
import { freshFactory, rawGet, withRawDatabase } from './storage-test-doubles'

/** The app version of the v3.3 tab that upgrades the database. */
const V33_APP_VERSION = '3.3.0-test'

/** The facts of a kept session with one favorite and its played notes kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: 'A take.',
  playedNotesKept: true,
  presets: BUILT_IN_PRESETS,
}

/** Intent: a three-phrase C keyboard session's records. */
function keyboardRecords(): readonly SessionHistoryRecord[] {
  return recordedKeptSession('c-keyboard', 3).phrases()
}

/** Intent: a session's values as v3.2 kept them. */
function v32Session(records: readonly SessionHistoryRecord[]): StoredKeptSession {
  return v4Session(encodeKeptSession(historyOf(records, 'c-keyboard'), FACTS, V32_APP_VERSION))
}

/** Intent: the port of the v3.3 tab over the factory's database, every production step run. */
function openV33(factory: IDBFactory) {
  return openStoragePort({ factory, appVersion: V33_APP_VERSION })
}

/** A v3.2 player preset at Off, as every v3.2 preset was. */
const LATE_NIGHT = makePreset({
  ...builtInPreset('jazz'),
  id: 'player-1',
  name: 'Late night',
  kind: 'player',
})

/**
 * Intent: a stored copy of a body whose phrase at `index` holds `value` at `path` inside its part
 * `part` only, that part replaced whole: a stored body's request and intent share their carry-in
 * until it is written to the database.
 */
function withInPart(
  body: unknown,
  index: number,
  part: 'intent' | 'request' | 'harmony',
  path: readonly (string | number)[],
  value: unknown,
): unknown {
  const stored = (body as { phrases: Record<string, unknown>[] }).phrases[index]![part]
  return edited(body, ['phrases', index, part], edited(stored, path, value))
}

/** Intent: each body step 5 cannot read, by name, over a valid v3.2 one. */
function unreadableBodies(
  body: unknown,
  records: readonly SessionHistoryRecord[],
): readonly (readonly [string, unknown])[] {
  const carried = records.findIndex((record) => record.intent.carryIn?.finalHarmony != null)
  const finalHarmony = records[carried]!.intent.carryIn!.finalHarmony!
  const collection = makeHarmonyCollection('C', 'Major')
  const carriedSeventh = seventhOf(finalHarmony.triad.degree, collection)
  const eventDegree = records[0]!.outcome.provenance.harmony.events[0]!.triad.degree
  const eventSeventh = seventhOf(eventDegree, collection)
  const level = { 'seventh-chords': 'off' }
  return [
    ['a damaged intent', edited(body, ['phrases', 1, 'intent', 'seed'], 1.5)],
    ['an intent holding the level', withInPart(body, 0, 'intent', ['chordFamilies'], level)],
    [
      'a harmony event holding its seventh',
      withInPart(body, 0, 'harmony', ['events', 0, 'seventh'], eventSeventh),
    ],
    [
      'an intent carrying a seventh',
      withInPart(body, carried, 'intent', ['carryIn', 'finalHarmony', 'seventh'], carriedSeventh),
    ],
    [
      'a request carrying a seventh',
      withInPart(body, carried, 'request', ['carryIn', 'finalHarmony', 'seventh'], carriedSeventh),
    ],
    ['a data version of 2', edited(body, ['dataVersion'], 2)],
  ]
}

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
describe('a data version 4 database holding v3.2 bodies step 5 cannot read', () => {
  let factory: IDBFactory
  let seeded: Map<string, StoredKeptSession>
  let names: readonly string[]
  let status: string

  beforeAll(async () => {
    factory = freshFactory()
    const records = keyboardRecords()
    const valid = v32Session(records)
    const bodies = unreadableBodies(valid.body, records)
    names = bodies.map(([name]) => name)
    seeded = new Map([['readable', valid]])
    for (const [name, body] of bodies) seeded.set(name, { ...valid, body })
    await seedVersion4(
      factory,
      [...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
    )
    status = (await openV33(factory)).status()
  }, 60_000)

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 5, never rejected', async () => {
    expect(status).toBe('ready')
    expect((await databaseState(factory)).version).toBe(5)
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('carries the readable session over, its body at data version 5', async () => {
    const after = await rawSession(factory, 'readable')

    expect(after.body).toMatchObject({ dataVersion: 5, appVersion: V33_APP_VERSION })
    expect(decodeKeptSession(after).reading).toBe('current')
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_read_at_off]]
  it('leaves each body it cannot read as stored, its session read as unreadable', async () => {
    for (const name of names) {
      const after = await rawSession(factory, name)
      const stored = seeded.get(name)!

      expect(after, name).toStrictEqual(stored)
      expect(decodeKeptSession(after), name).toEqual({ reading: 'unreadable' })
      expect(upgradedKeptBodyV5(stored.body, V33_APP_VERSION), name).toBeNull()
    }
  })
})

/** Intent: a value nested `depth` objects deep. */
function nested(depth: number): unknown {
  let value: unknown = 'bottom'
  for (let level = 0; level < depth; level++) value = { inner: value }
  return value
}

/** Intent: every player preset record step 5 cannot read, by key, over a valid v3.2 one. */
function unreadablePresets(
  record: Record<string, unknown>,
): readonly (readonly [string, unknown])[] {
  return [
    ['a-string', 'a preset'],
    ['a-number', 42],
    ['null', null],
    ['an-array', [record]],
    ['a-date', new Date(0)],
    ['a-map', new Map<string, unknown>([['dataVersion', 3]])],
    ['no-envelope', edited(edited(record, ['dataVersion'], REMOVE), ['appVersion'], REMOVE)],
    ['ill-typed-app-version', { ...record, id: 'ill-typed-app-version', appVersion: 3 }],
    ['data-version-2', { ...record, id: 'data-version-2', dataVersion: 2 }],
    ['data-version-4', { ...record, id: 'data-version-4', dataVersion: 4 }],
    ['another-id', record],
    ['jazz', { ...record, id: 'jazz' }],
  ]
}

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
// @test-link [[rule_player_presets_saved_on_device]]
describe('a data version 4 database holding player preset records step 5 cannot read', () => {
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 5, each left as stored and not listed, the readable one carried over', async () => {
    const factory = freshFactory()
    const record = v3PresetRecord(LATE_NIGHT, V32_APP_VERSION)
    const presets = unreadablePresets(record)
    await openV32Port(factory)
    await seedRaw(factory, 'presets', [...presets, [LATE_NIGHT.id, record]])

    expect((await openV33(factory)).status()).toBe('ready')

    const stored = await withRawDatabase(factory, async (database) =>
      Promise.all(presets.map(([key]) => rawGet(database, 'presets', key))),
    )
    expect(stored).toStrictEqual(presets.map(([, value]) => value))
    for (const [key, value] of presets) {
      expect(decodePlayerPresets([{ key, value }]), key).toEqual([])
      expect(upgradedPresetV5(value, key, V33_APP_VERSION), key).toBeNull()
    }
    const carried = await withRawDatabase(factory, (database) =>
      rawGet(database, 'presets', LATE_NIGHT.id),
    )
    expect(decodePlayerPresets([{ key: LATE_NIGHT.id, value: carried }])).toEqual([LATE_NIGHT])
  })
})

/** Intent: every malformed body, by name, over a valid v3.2 one. */
function malformedBodies(body: unknown): readonly (readonly [string, unknown])[] {
  const envelope = { dataVersion: 4, appVersion: V32_APP_VERSION }
  return [
    ['a string', 'a kept session'],
    ['a number', 42],
    ['null', null],
    ['an array', [1, 2]],
    ['a Date', new Date(0)],
    ['a Map', new Map<string, unknown>([['dataVersion', 4]])],
    ['no envelope', edited(edited(body, ['dataVersion'], REMOVE), ['appVersion'], REMOVE)],
    ['an ill-typed app version', edited(body, ['appVersion'], 4)],
    ['an extra field', edited(body, ['diagnostics'], {})],
    ['a missing field', edited(body, ['phrases'], REMOVE)],
    ['phrases that are no array', { ...envelope, phrases: 'phrases' }],
    ['phrases that are all holes', { ...envelope, phrases: new Array(3) }],
    ['phrases with a hole', edited(body, ['phrases', 1], REMOVE)],
    ['an intent that is a Date', edited(body, ['phrases', 0, 'intent'], new Date(0))],
    ['a deeply nested timeline', edited(body, ['phrases', 0, 'timeline'], nested(300))],
    ['a level that is a Map', edited(body, ['phrases', 0, 'intent', 'chordFamilies'], new Map())],
    ['a doodle of no shape', edited(body, ['doodle'], 7)],
  ]
}

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
describe('the upgrade step to data version 5 over malformed stored values', () => {
  let valid: StoredKeptSession

  beforeAll(() => {
    valid = v32Session(keyboardRecords())
  }, 60_000)

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('reads the valid body and preset record they are built over, so each malformed one differs only as named', () => {
    const record = v3PresetRecord(LATE_NIGHT, V32_APP_VERSION)
    expect(upgradedKeptBodyV5(valid.body, V33_APP_VERSION)).not.toBeNull()
    expect(upgradedPresetV5(record, LATE_NIGHT.id, V33_APP_VERSION)).not.toBeNull()
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('gives no rewrite of a malformed body, never throwing', () => {
    for (const [name, value] of malformedBodies(valid.body))
      expect(upgradedKeptBodyV5(value, V33_APP_VERSION), name).toBeNull()
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('gives no rewrite of a malformed preset record, never throwing', () => {
    const record = v3PresetRecord(LATE_NIGHT, V32_APP_VERSION)
    const cyclic: Record<string, unknown> = { ...record }
    cyclic.self = cyclic
    expect(upgradedPresetV5(cyclic, LATE_NIGHT.id, V33_APP_VERSION)).toMatchObject({
      dataVersion: 5,
    })
    expect(
      upgradedPresetV5({ ...record, name: nested(300) }, LATE_NIGHT.id, V33_APP_VERSION),
    ).toMatchObject({ dataVersion: 5 })
    for (const [key, value] of unreadablePresets(record))
      expect(upgradedPresetV5(value, key, V33_APP_VERSION), key).toBeNull()
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('gives no rewrite when the rewrite fails with an error that is no refusal', () => {
    const record = v3PresetRecord(LATE_NIGHT, V32_APP_VERSION)

    expect(upgradedKeptBodyV5(valid.body, '')).toBeNull()
    expect(upgradedPresetV5(record, LATE_NIGHT.id, '')).toBeNull()
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens a database seeded with all of them at data version 5, each left as stored', async () => {
    const factory = freshFactory()
    const bodies = malformedBodies(valid.body)
    await openV32Port(factory)
    await seedRaw(factory, 'sessionBodies', bodies)

    expect((await openV33(factory)).status()).toBe('ready')
    expect((await databaseState(factory)).version).toBe(5)
    await withRawDatabase(factory, async (database) => {
      for (const [name, value] of bodies)
        expect(await rawGet(database, 'sessionBodies', name), name).toStrictEqual(value)
    })
  })
})

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
// @test-link [[module_on_device_database]]
describe('a v3.2 tab open while v3.3 upgrades the database to data version 5', () => {
  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('becomes outdated, the upgrade not blocked and the records carried over', async () => {
    const factory = freshFactory()
    const older = await seedVersion4(factory, [
      ...sessionWrites({ key: 'kept', stored: v32Session(keyboardRecords()) }),
      {
        kind: 'write',
        store: 'presets',
        key: LATE_NIGHT.id,
        record: v3PresetRecord(LATE_NIGHT, V32_APP_VERSION),
      },
    ])
    let notices = 0
    older.onOutdated(() => {
      notices += 1
    })

    const newer = await openV33(factory)

    expect(newer.status()).toBe('ready')
    expect(older.status()).toBe('outdated')
    expect(notices).toBe(1)
    expect((await databaseState(factory)).version).toBe(5)
    expect(decodeKeptSession(await rawSession(factory, 'kept')).reading).toBe('current')
    const preset = await withRawDatabase(factory, (database) =>
      rawGet(database, 'presets', LATE_NIGHT.id),
    )
    expect(preset).toMatchObject({ dataVersion: 5, appVersion: V33_APP_VERSION })
  }, 30_000)
})
