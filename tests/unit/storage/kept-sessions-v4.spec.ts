// @vitest-environment node
/**
 * The upgrade step to data version 4 over the real port and an in-memory IndexedDB: a database a
 * v3.1 tab left at data version 3, holding v3.1 kept sessions (plain, pinned with a comment, with
 * favorites, with played notes kept, on my instrument) and a record of every other store, opens in
 * v3.2 at data version 4; each session-wide record is carried over at data version 4 as no Jam
 * and each body with no doodle, every other field as stored; each session decodes, reviews and
 * exports exactly as before, and every other record keeps its data version. A database at data
 * version 1 goes through step 2, then step 4, its session-wide record reaching data version 4
 * through 2.
 * Sessions are carried over at the open only, never when read.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset } from '@/domain/presets/preset-selection'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import {
  DATABASE_DATA_VERSION,
  PRODUCTION_MIGRATIONS,
  type MigrationStep,
} from '@/storage/database'
import { encodeControllerRecord } from '@/storage/records/controller-record'
import { parseKeptSessionBodyV2 } from '@/storage/records/kept-session-body'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSession,
  type KeptSessionFacts,
  type KeptSessionHistory,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { encodePresetRecord } from '@/storage/records/preset-record'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import { openStoragePort, type StorageChange } from '@/storage/storage-port'
import { lowHorn, recordedMyInstrumentSession } from '../session/my-instrument-session'
import { historyOf, recordedKeptSession, storedRecords } from './kept-session-fixtures'
import {
  databaseState,
  rawSession,
  seedVersion1,
  sessionWrites,
  V30_APP_VERSION,
  v1Session,
} from './kept-sessions-v1-fixtures'
import { seedVersion3, V31_APP_VERSION, v2Session } from './kept-sessions-v2-fixtures'
import { freshFactory, rawGet, rawPut, withRawDatabase } from './storage-test-doubles'

/** The app version of the v3.2 tab that upgrades the database. */
const V32_APP_VERSION = '3.2.0-test'

/** The facts of a kept session with no favorite, no comment and its played notes not kept. */
const PLAIN: KeptSessionFacts = {
  pinned: false,
  favorites: [],
  comment: '',
  playedNotesKept: false,
  presets: BUILT_IN_PRESETS,
}

/** Every request the generated-notes export offers: both formats, backing off and on. */
const EVERY_REQUEST: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'musicxml', backingTrack: true },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/** One v3.1 session of the seeded database. */
interface V31Session {
  readonly key: string
  readonly history: KeptSessionHistory
  readonly facts: KeptSessionFacts
}

/**
 * Intent: the five v3.1 sessions: plain, pinned with a comment, with favorites, with its played
 * notes kept, and one played on my instrument.
 */
async function v31Sessions(): Promise<readonly V31Session[]> {
  /** Intent: a recorded Neutral session's history on the instrument. */
  const neutral = (id: 'bb-tenor' | 'eb-alto' | 'c-keyboard', count: number) =>
    historyOf(recordedKeptSession(id, count).phrases(), id)
  return [
    { key: 'plain', history: neutral('bb-tenor', 4), facts: PLAIN },
    {
      key: 'pinned-comment',
      history: neutral('bb-tenor', 3),
      facts: { ...PLAIN, pinned: true, comment: 'Swung the second half.' },
    },
    { key: 'favorites', history: neutral('c-keyboard', 4), facts: { ...PLAIN, favorites: [3, 1] } },
    {
      key: 'played-notes',
      history: neutral('eb-alto', 3),
      facts: { ...PLAIN, playedNotesKept: true },
    },
    {
      key: 'my-instrument',
      history: await recordedMyInstrumentSession(lowHorn('bass'), 3),
      facts: PLAIN,
    },
  ]
}

/** Intent: the session stored values decode to, failing the test unless they read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/** Intent: what v3.1 read of the same session: its records, as the codec decodes them. */
function keptByV31({ history, facts }: V31Session): KeptSession {
  return decoded(storedRecords(encodeKeptSession(history, facts, V31_APP_VERSION)))
}

/** Intent: the review's notation input of every phrase of a decoded session, as text. */
function notationText(kept: KeptSession): string {
  return JSON.stringify(
    kept.phrases.map((phrase) =>
      notationInputFromOutcome(phrase.outcome, phrase.intent, phrase.clef),
    ),
  )
}

/** Intent: the bytes of every export of a decoded session, the played notes' when it keeps them. */
function exportBytes(kept: KeptSession): readonly Uint8Array[] {
  const history = {
    /** Intent: the decoded phrases, as the exports read a history's. */
    phrases: () => kept.phrases,
    startedAt: kept.summary.startedAt,
  }
  const files = EVERY_REQUEST.map((request) => buildGeneratedNotesFile(history, request))
  if (kept.summary.playedNotesKept) files.push(buildPlayedNotesFile(history))
  return files.map((file) => file.bytes)
}

/** Intent: the writes of one record of each store but the kept sessions', by v3.1. */
function otherStoreWrites(): StorageChange[] {
  const lateNight = makePreset({
    ...builtInPreset('jazz'),
    id: 'player-1',
    name: 'Late night',
    kind: 'player',
  })
  return [
    {
      kind: 'write',
      store: 'settings',
      key: 'theme',
      record: encodeSettingRecord('theme', 'Dark', V31_APP_VERSION),
    },
    {
      kind: 'write',
      store: 'instrument',
      key: MY_INSTRUMENT_RECORD_KEY,
      record: encodeMyInstrumentRecord(lowHorn('bass'), V31_APP_VERSION),
    },
    {
      kind: 'write',
      store: 'controller',
      key: 'remembered',
      record: encodeControllerRecord(
        { id: 'port-1', name: 'Sax controller', manufacturer: 'Acme' },
        V31_APP_VERSION,
      ),
    },
    {
      kind: 'write',
      store: 'presets',
      key: 'player-1',
      record: encodePresetRecord(lateNight, V31_APP_VERSION),
    },
  ]
}

/** Intent: the port of the v3.2 tab over the factory's database, every production step run. */
function openV32(factory: IDBFactory) {
  return openStoragePort({ factory, appVersion: V32_APP_VERSION })
}

/** Intent: the production steps, each recorded in `ran` before it runs. */
function recordedProductionSteps(ran: number[]): MigrationStep[] {
  return PRODUCTION_MIGRATIONS.map((step) => ({
    toVersion: step.toVersion,
    migrate: (upgrade) => {
      ran.push(step.toVersion)
      step.migrate(upgrade)
    },
  }))
}

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[rule_earlier_sessions_open_without_doodle]]
describe('a data version 3 database of v3.1 kept sessions, opened by v3.2', () => {
  let factory: IDBFactory
  let sessions: readonly V31Session[]
  let seeded: Map<string, StoredKeptSession>
  let others: StorageChange[]
  let status: string
  let after: Map<string, StoredKeptSession>

  beforeAll(async () => {
    factory = freshFactory()
    sessions = await v31Sessions()
    seeded = new Map(
      sessions.map(({ key, history, facts }) => [
        key,
        v2Session(encodeKeptSession(history, facts, V31_APP_VERSION)),
      ]),
    )
    others = otherStoreWrites()
    await seedVersion3(factory, [
      ...[...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
      ...others,
    ])
    status = (await openV32(factory)).status()
    after = new Map(
      await Promise.all(
        sessions.map(async ({ key }) => [key, await rawSession(factory, key)] as const),
      ),
    )
  }, 60_000)

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 4, the port ready, meta naming the upgrading app', async () => {
    expect(status).toBe('ready')
    expect(DATABASE_DATA_VERSION).toBe(4)
    expect(await databaseState(factory)).toEqual({
      version: 4,
      meta: { dataVersion: 4, appVersion: V32_APP_VERSION },
    })
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it('holds each body at data version 4 with no doodle, every phrase and field as stored, written by the upgrading app', () => {
    for (const { key } of sessions) {
      const before = seeded.get(key)!.body as Record<string, unknown>
      const body = after.get(key)!.body as Record<string, unknown>
      expect(before.dataVersion, key).toBe(2)
      expect(body.dataVersion, key).toBe(4)
      expect(body.appVersion, key).toBe(V32_APP_VERSION)
      expect(Object.keys(body).sort(), key).toEqual(['appVersion', 'dataVersion', 'phrases'])
      expect(body.phrases, key).toStrictEqual(before.phrases)
    }
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it('holds each session-wide record at data version 4 as no Jam, every other field as stored, the recording app version unchanged', () => {
    for (const { key } of sessions) {
      const before = seeded.get(key)!.summary as Record<string, unknown>
      const summary = after.get(key)!.summary as Record<string, unknown>
      expect(before.dataVersion, key).toBe(2)
      expect(Object.hasOwn(before, 'isJam'), key).toBe(false)
      expect(summary, key).toStrictEqual({
        ...before,
        dataVersion: 4,
        appVersion: V32_APP_VERSION,
        isJam: false,
      })
      expect(Object.hasOwn(summary, 'suggestionDeclined'), key).toBe(false)
      expect(summary.recordedByAppVersion, key).toBe(V31_APP_VERSION)
    }
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it('decodes each session as v3.1 read it, with its pins, favorites, comment and clefs', () => {
    for (const kept of sessions) {
      const session = decoded(after.get(kept.key)!)
      expect(session, kept.key).toEqual(keptByV31(kept))
      expect(session.phrases.map((phrase) => phrase.intent)).toEqual(
        parseKeptSessionBodyV2(seeded.get(kept.key)!.body).map((phrase) => phrase.intent),
      )
    }
    expect(decoded(after.get('favorites')!).phrases.map((phrase) => phrase.favorite)).toEqual([
      true,
      false,
      true,
      false,
    ])
    expect(decoded(after.get('pinned-comment')!).summary).toMatchObject({
      pinned: true,
      comment: 'Swung the second half.',
    })
    expect(decoded(after.get('my-instrument')!).phrases.map((phrase) => phrase.clef)).toEqual([
      'bass',
      'bass',
      'bass',
    ])
  })

  // @test-link [[rule_earlier_sessions_open_without_doodle]]
  it("gives each session's review notation and every export byte-identical to before the upgrade", () => {
    for (const kept of sessions) {
      const before = keptByV31(kept)
      const session = decoded(after.get(kept.key)!)
      expect(notationText(session), kept.key).toBe(notationText(before))
      const bytes = exportBytes(session)
      expect(bytes, kept.key).toHaveLength(kept.facts.playedNotesKept ? 5 : 4)
      expect(bytes, kept.key).toStrictEqual(exportBytes(before))
    }
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('keeps the played notes at data version 1 as stored, and every other store record as stored', async () => {
    const { playedNotes } = after.get('played-notes')!
    expect(playedNotes).toStrictEqual(seeded.get('played-notes')!.playedNotes)
    expect((playedNotes as { dataVersion: number }).dataVersion).toBe(1)
    expect(decoded(after.get('played-notes')!).phrases.flatMap((p) => p.playedNotes)).toHaveLength(
      10,
    )
    const stored = await withRawDatabase(factory, (database) =>
      Promise.all(others.map((write) => rawGet(database, write.store, write.key))),
    )
    expect(stored).toStrictEqual(others.map((write) => (write.kind === 'write' ? write.record : 0)))
  })

  // @test-link [[module_kept_session_jam_upgrade_step]]
  it('rewrites no session when it is read or the database opened again', async () => {
    const port = await openV32(factory)
    for (const { key } of sessions) {
      decodeKeptSession({
        summary: await port.read('sessionSummaries', key),
        body: await port.read('sessionBodies', key),
        playedNotes: await port.read('playedNotes', key),
      })
    }
    const v31Body = seeded.get('plain')!.body
    await withRawDatabase(factory, (database) => rawPut(database, 'sessionBodies', 'late', v31Body))
    expect(decodeKeptSession({ ...seeded.get('plain')!, body: v31Body })).toEqual({
      reading: 'unreadable',
    })
    await openV32(factory)

    for (const { key } of sessions)
      expect(await rawSession(factory, key), key).toStrictEqual(after.get(key))
    expect(
      await withRawDatabase(factory, (database) => rawGet(database, 'sessionBodies', 'late')),
    ).toStrictEqual(v31Body)
  })
})

// @test-link [[module_kept_session_jam_upgrade_step]]
// @test-link [[module_kept_session_upgrade_step]]
describe('a data version 1 database of a v3.0 kept session, opened by v3.2', () => {
  // @test-link [[module_kept_session_jam_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('runs steps 2, 3 and 4 in order, the session-wide record and the body reaching data version 4 through 2', async () => {
    const factory = freshFactory()
    const kept: V31Session = {
      key: 'v30',
      history: historyOf(recordedKeptSession('bb-tenor', 3).phrases(), 'bb-tenor'),
      facts: { ...PLAIN, favorites: [2] },
    }
    const records = encodeKeptSession(kept.history, kept.facts, V30_APP_VERSION)
    await seedVersion1(
      factory,
      sessionWrites({
        key: kept.key,
        stored: v1Session(records, { musicalProfile: 'Neutral', isCustom: false }, 'v3.0'),
      }),
    )
    const ran: number[] = []

    const port = await openStoragePort({
      factory,
      appVersion: V32_APP_VERSION,
      migrations: recordedProductionSteps(ran),
    })

    expect(port.status()).toBe('ready')
    expect(ran).toEqual([2, 3, 4])
    expect((await databaseState(factory)).version).toBe(4)
    const after = await rawSession(factory, kept.key)
    expect(after.body).toMatchObject({ dataVersion: 4, appVersion: V32_APP_VERSION })
    expect(after.summary).toMatchObject({
      dataVersion: 4,
      appVersion: V32_APP_VERSION,
      recordedByAppVersion: V30_APP_VERSION,
      isJam: false,
    })
    expect(Object.hasOwn(after.summary as object, 'suggestionDeclined')).toBe(false)
    const session = decoded(after)
    expect(session.phrases).toEqual(keptByV31(kept).phrases)
    expect(notationText(session)).toBe(notationText(keptByV31(kept)))
    expect(exportBytes(session)).toStrictEqual(exportBytes(keptByV31(kept)))
  }, 30_000)
})
