// @vitest-environment node
/**
 * The upgrade step to data version 4 over records it cannot read: a database a v3.1 tab left at
 * data version 3, holding one readable session and v3.1 bodies the data version 2 reader refuses
 * (a damaged intent, a stored request holding a rhythm lock group or a steering block, a doodle
 * key, a body still at data version 1), opens at data version 4, the readable one carried over and
 * every other left as stored, its session read as unreadable; so do v3.1 session-wide records the
 * data version 2 reader refuses (a damaged field, a Jam mark, a record still at data version 1);
 * malformed stored values of every kind never make the step throw or the open fail; a v3.1 tab
 * open meanwhile becomes outdated.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { DATABASE_DATA_VERSION } from '@/storage/database'
import { upgradedKeptBodyV4, upgradedKeptSummaryV4 } from '@/storage/migrations/kept-sessions-v4'
import { isKeptPhraseRefusal } from '@/storage/records/kept-phrase-parsers'
import {
  parseKeptSessionBodyV2,
  rewrittenKeptBodyRecord,
} from '@/storage/records/kept-session-body'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { edited, historyOf, recordedKeptSession, REMOVE } from './kept-session-fixtures'
import { KEPT_DOODLE } from './kept-session-v32-fixtures'
import { databaseState, rawSession, sessionWrites } from './kept-sessions-v1-fixtures'
import {
  openV31Port,
  seedVersion3,
  V31_APP_VERSION,
  v2Session,
  withRequestGroup,
} from './kept-sessions-v2-fixtures'
import { freshFactory, rawGet, rawPut, withRawDatabase } from './storage-test-doubles'
import { openStoragePort } from '@/storage/storage-port'

/** The app version of the v3.2 tab that upgrades the database. */
const V32_APP_VERSION = '3.2.0-test'

/** The facts of a kept session with one favorite and its played notes kept. */
const FACTS: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: 'A take.',
  playedNotesKept: true,
  presets: BUILT_IN_PRESETS,
}

/** Intent: a three-phrase tenor session's values as v3.1 kept them. */
function v31Session(): StoredKeptSession {
  const phrases = recordedKeptSession('bb-tenor', 3).phrases()
  return v2Session(encodeKeptSession(historyOf(phrases, 'bb-tenor'), FACTS, V31_APP_VERSION))
}

/** Intent: the port of the v3.2 tab over the factory's database, every production step run. */
function openV32(factory: IDBFactory) {
  return openStoragePort({ factory, appVersion: V32_APP_VERSION })
}

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[rule_earlier_sessions_open_without_doodle]]
describe('a data version 3 database holding v3.1 bodies step 4 cannot read', () => {
  /** Each unreadable body, by name, over a valid v3.1 one. */
  const UNREADABLE: readonly (readonly [string, (body: unknown) => unknown])[] = [
    ['a damaged intent', (body) => edited(body, ['phrases', 1, 'intent', 'seed'], 1.5)],
    ['a request holding a rhythm lock group', (body) => withRequestGroup(body, 1, 'rhythmLock')],
    ['a request holding a steering block', (body) => withRequestGroup(body, 0, 'steering')],
    ['a doodle key', (body) => edited(body, ['doodle'], structuredClone(KEPT_DOODLE))],
    ['a data version of 1', (body) => edited(body, ['dataVersion'], 1)],
  ]
  let factory: IDBFactory
  let seeded: Map<string, StoredKeptSession>
  let status: string

  beforeAll(async () => {
    factory = freshFactory()
    const valid = v31Session()
    seeded = new Map([['readable', valid]])
    for (const [name, damage] of UNREADABLE)
      seeded.set(name, { ...valid, body: damage(valid.body) })
    await seedVersion3(
      factory,
      [...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
    )
    status = (await openV32(factory)).status()
  }, 30_000)

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 4, never rejected', async () => {
    expect(status).toBe('ready')
    expect((await databaseState(factory)).version).toBe(DATABASE_DATA_VERSION)
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('carries the readable session over, its body at data version 4', async () => {
    const after = await rawSession(factory, 'readable')

    expect(after.body).toMatchObject({ dataVersion: 4, appVersion: V32_APP_VERSION })
    expect(decodeKeptSession(after).reading).toBe('current')
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it.each(UNREADABLE.map(([name]) => name))(
    'leaves the body with %s as stored, the summary carried over, its session read as unreadable',
    async (name) => {
      const after = await rawSession(factory, name)
      const stored = seeded.get(name)!

      expect(after.body).toStrictEqual(stored.body)
      expect(after.playedNotes).toStrictEqual(stored.playedNotes)
      expect(after.summary).toMatchObject({ dataVersion: 4, isJam: false })
      expect(decodeKeptSession(after)).toEqual({ reading: 'unreadable' })
      expect(upgradedKeptBodyV4(stored.body, V32_APP_VERSION)).toBeNull()
    },
  )
})

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[rule_earlier_sessions_open_without_doodle]]
describe('a data version 3 database holding v3.1 session-wide records step 4 cannot read', () => {
  /** Each unreadable session-wide record, by name, over a valid v3.1 one. */
  const UNREADABLE: readonly (readonly [string, (summary: unknown) => unknown])[] = [
    ['a damaged field', (summary) => edited(summary, ['favoritesCount'], -1)],
    ['a Jam mark', (summary) => edited(summary, ['isJam'], false)],
    ['a declined suggestion', (summary) => edited(summary, ['suggestionDeclined'], false)],
    ['a data version of 1', (summary) => edited(summary, ['dataVersion'], 1)],
  ]
  let factory: IDBFactory
  let seeded: Map<string, StoredKeptSession>

  beforeAll(async () => {
    factory = freshFactory()
    const valid = v31Session()
    seeded = new Map(
      UNREADABLE.map(([name, damage]) => [name, { ...valid, summary: damage(valid.summary) }]),
    )
    await seedVersion3(
      factory,
      [...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
    )
    expect((await openV32(factory)).status()).toBe('ready')
  }, 30_000)

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it.each(UNREADABLE.map(([name]) => name))(
    'leaves the session-wide record with %s as stored, its session read as unreadable',
    async (name) => {
      const after = await rawSession(factory, name)
      const stored = seeded.get(name)!

      expect(after.summary).toStrictEqual(stored.summary)
      expect(after.body).toMatchObject({ dataVersion: 4, appVersion: V32_APP_VERSION })
      expect(decodeKeptSession(after)).toEqual({ reading: 'unreadable' })
      expect(upgradedKeptSummaryV4(stored.summary, V32_APP_VERSION)).toBeNull()
    },
  )
})

/** Intent: a value nested `depth` objects deep. */
function nested(depth: number): unknown {
  let value: unknown = 'bottom'
  for (let level = 0; level < depth; level++) value = { inner: value }
  return value
}

/** Intent: the envelope of a data version 2 record around the given fields. */
function v2Envelope(fields: Record<string, unknown>): Record<string, unknown> {
  return { dataVersion: 2, appVersion: V31_APP_VERSION, ...fields }
}

/** Intent: every malformed body, by name, over a valid v3.1 one. */
function malformedBodies(body: unknown): readonly (readonly [string, unknown])[] {
  return [
    ['a string', 'a kept session'],
    ['a number', 42],
    ['null', null],
    ['an array', [1, 2]],
    ['a Date', new Date(0)],
    ['a Map', new Map<string, unknown>([['dataVersion', 2]])],
    ['no envelope', edited(edited(body, ['dataVersion'], REMOVE), ['appVersion'], REMOVE)],
    ['an ill-typed app version', edited(body, ['appVersion'], 3)],
    ['an extra field', edited(body, ['diagnostics'], {})],
    ['a missing field', edited(body, ['phrases'], REMOVE)],
    ['phrases that are no array', v2Envelope({ phrases: 'phrases' })],
    ['phrases that are a Map', v2Envelope({ phrases: new Map([[0, {}]]) })],
    ['phrases that are all holes', v2Envelope({ phrases: new Array(3) })],
    ['phrases with a hole', edited(body, ['phrases', 1], REMOVE)],
    ['an intent that is a Date', edited(body, ['phrases', 0, 'intent'], new Date(0))],
    ['a deeply nested timeline', edited(body, ['phrases', 0, 'timeline'], nested(300))],
    ['a request with a group of no shape', edited(body, ['phrases', 0, 'request', 'steering'], 1)],
  ]
}

// @test-link [[module_kept_session_jam_upgrade_step]]
describe('the upgrade step to data version 4 over malformed stored bodies', () => {
  const valid = v31Session()
  const bodies = malformedBodies(valid.body)

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('reads the valid session-wide record, and gives no rewrite of malformed ones, never throwing', () => {
    expect(upgradedKeptSummaryV4(valid.summary, V32_APP_VERSION)).not.toBeNull()
    const malformed: readonly (readonly [string, unknown])[] = [
      ['a string', 'a kept session'],
      ['null', null],
      ['a Map', new Map<string, unknown>([['dataVersion', 2]])],
      ['an ill-typed app version', edited(valid.summary, ['appVersion'], 3)],
      ['a missing field', edited(valid.summary, ['sessionSeed'], REMOVE)],
      ['a deeply nested comment', edited(valid.summary, ['comment'], nested(300))],
    ]
    for (const [name, value] of malformed)
      expect(upgradedKeptSummaryV4(value, V32_APP_VERSION), name).toBeNull()
    expect(upgradedKeptSummaryV4(valid.summary, '')).toBeNull()
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('reads the valid body it is built over, so each malformed one differs only as named', () => {
    expect(upgradedKeptBodyV4(valid.body, V32_APP_VERSION)).not.toBeNull()
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it.each(bodies)('gives no rewrite of a body with %s, never throwing', (_, value) => {
    expect(upgradedKeptBodyV4(value, V32_APP_VERSION)).toBeNull()
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('gives no rewrite when the rewrite fails with an error that is no refusal', () => {
    let failure: unknown = null
    try {
      rewrittenKeptBodyRecord(
        { phrases: parseKeptSessionBodyV2(valid.body), doodle: null, playedNotesClock: null },
        () => false,
        '',
      )
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(Error)
    expect(isKeptPhraseRefusal(failure)).toBe(false)
    expect(upgradedKeptBodyV4(valid.body, '')).toBeNull()
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens a database seeded with all of them at data version 4, each left as stored', async () => {
    const factory = freshFactory()
    await openV31Port(factory)
    await withRawDatabase(factory, async (database) => {
      for (const [name, value] of bodies) await rawPut(database, 'sessionBodies', name, value)
    })

    const port = await openV32(factory)

    expect(port.status()).toBe('ready')
    expect((await databaseState(factory)).version).toBe(DATABASE_DATA_VERSION)
    await withRawDatabase(factory, async (database) => {
      for (const [name, value] of bodies)
        expect(await rawGet(database, 'sessionBodies', name), name).toStrictEqual(value)
    })
  })
})

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[module_on_device_database]]
describe('a v3.1 tab open while v3.2 upgrades the database to data version 4', () => {
  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('becomes outdated, the upgrade not blocked and the session carried over', async () => {
    const factory = freshFactory()
    const older = await seedVersion3(factory, sessionWrites({ key: 'kept', stored: v31Session() }))
    let notices = 0
    older.onOutdated(() => {
      notices += 1
    })

    const newer = await openV32(factory)

    expect(newer.status()).toBe('ready')
    expect(older.status()).toBe('outdated')
    expect(notices).toBe(1)
    expect((await databaseState(factory)).version).toBe(4)
    expect(decodeKeptSession(await rawSession(factory, 'kept')).reading).toBe('current')
  })
})
