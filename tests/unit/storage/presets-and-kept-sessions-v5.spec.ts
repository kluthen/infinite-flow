// @vitest-environment node
/**
 * The upgrade step to data version 5 over the real port and an in-memory IndexedDB: a database a
 * v3.2 tab left at data version 4, holding v3.2's settings, player presets and kept sessions (a
 * pinned one with favorites and its played notes kept, and a fresh Jam with its doodle and its
 * played-notes clock) and a record of every other store, opens in v3.3 at data version 5; each
 * player preset record and each kept body is carried over at data version 5 with the Seventh
 * chords level at Off, every other field as stored; the session-wide records stay at data version
 * 4, the played notes at 1 and every settings record at its own; each preset loads, and each
 * session decodes, reviews and exports, exactly as before; a v3.2 reader leaves each carried-over
 * record unread as newer. A database at data version 0 to 3 reaches 5 through every step. Records
 * are carried over at the open only, never when read.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { OFF_CHORD_FAMILIES } from '@/domain/chords/chord-families'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset } from '@/domain/presets/preset-selection'
import type { SessionHistoryRecord } from '@/session/session-history'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import { PRODUCTION_MIGRATIONS, type MigrationStep, type StoreName } from '@/storage/database'
import { readEnvelope, type RecordVersions } from '@/storage/record-envelope'
import { encodeControllerRecord } from '@/storage/records/controller-record'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSession,
  type KeptSessionFacts,
  type KeptSessionHistory,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { decodePlayerPresets } from '@/storage/records/preset-record'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import { openStoragePort, type StorageChange } from '@/storage/storage-port'
import { historyOf, recordedKeptSession, storedRecords } from './kept-session-fixtures'
import {
  freshJam,
  jamSessionRecordsWithPlayedNotes,
  KEPT_DOODLE,
} from './kept-session-v32-fixtures'
import {
  databaseState,
  openAtVersion2,
  rawSession,
  seedVersion1,
  sessionWrites,
  V30_APP_VERSION,
  v1Session,
} from './kept-sessions-v1-fixtures'
import { seedVersion3, V31_APP_VERSION, v2Session } from './kept-sessions-v2-fixtures'
import {
  seedVersion4,
  V32_APP_VERSION,
  v3PresetRecord,
  v4Session,
} from './kept-sessions-v4-fixtures'
import { freshFactory, rawGet, withRawDatabase } from './storage-test-doubles'

/** The app version of the v3.3 tab that upgrades the database. */
const V33_APP_VERSION = '3.3.0-test'

/** Every request the generated-notes export offers: both formats, backing off and on. */
const EVERY_REQUEST: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'musicxml', backingTrack: true },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/** One v3.2 session of the seeded database: its key, history and facts. */
interface V32Session {
  readonly key: string
  readonly history: KeptSessionHistory
  readonly facts: KeptSessionFacts
}

/** Intent: a C keyboard history over recorded phrases. */
function keyboardHistory(records: readonly SessionHistoryRecord[]): KeptSessionHistory {
  return historyOf(records, 'c-keyboard')
}

/**
 * Intent: the two v3.2 sessions: a pinned one with a comment, favorites and its played notes
 * kept, and a fresh Jam with its doodle, its played-notes clock and its played notes kept.
 */
function v32Sessions(): readonly V32Session[] {
  const facts: KeptSessionFacts = {
    pinned: true,
    favorites: [3, 1],
    comment: 'Swung the second half.',
    playedNotesKept: true,
    presets: BUILT_IN_PRESETS,
  }
  return [
    {
      key: 'pinned',
      history: keyboardHistory(recordedKeptSession('c-keyboard', 4).phrases()),
      facts,
    },
    {
      key: 'fresh-jam',
      history: keyboardHistory(jamSessionRecordsWithPlayedNotes()),
      facts: {
        ...facts,
        pinned: false,
        favorites: [2],
        jam: { doodle: KEPT_DOODLE, suggestionDeclined: true, fresh: freshJam() },
      },
    },
  ]
}

/** The two player presets v3.2 kept, both at Off, as every v3.2 preset was. */
const V32_PRESETS: readonly Preset[] = [
  makePreset({ ...builtInPreset('jazz'), id: 'player-1', name: 'Late night', kind: 'player' }),
  makePreset({
    ...builtInPreset('reel'),
    id: 'player-2',
    name: 'Early morning',
    restriction: { keys: ['D'], modes: ['Dorian'] },
    kind: 'player',
  }),
]

/** Intent: the session stored values decode to, failing the test unless they read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/**
 * Intent: what v3.2 read of the same session: its records as the codec decodes them, every phrase
 * at Off as v3.2 played it.
 */
function keptByV32({ history, facts }: V32Session): KeptSession {
  return decoded(storedRecords(encodeKeptSession(history, facts, V32_APP_VERSION)))
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

/** Intent: the writes of v3.2's settings, presets and one record of each other store. */
function otherStoreWrites(): StorageChange[] {
  /** Intent: the write of one record under its key. */
  const write = (store: StoreName, key: string, record: RecordVersions): StorageChange => ({
    kind: 'write',
    store,
    key,
    record,
  })
  return [
    write('settings', 'theme', encodeSettingRecord('theme', 'Dark', V32_APP_VERSION)),
    write(
      'settings',
      'presetSelection',
      encodeSettingRecord(
        'presetSelection',
        { kind: 'preset', presetId: 'player-1' },
        V32_APP_VERSION,
      ),
    ),
    write(
      'settings',
      'figureLevels.passingTone',
      encodeSettingRecord('figureLevels.passingTone', 'favored', V32_APP_VERSION),
    ),
    write(
      'controller',
      'remembered',
      encodeControllerRecord({ id: 'port-1', name: 'Sax', manufacturer: 'Acme' }, V32_APP_VERSION),
    ),
  ]
}

/** Intent: the writes of v3.2's player preset records. */
function presetWrites(): StorageChange[] {
  return V32_PRESETS.map((preset) => ({
    kind: 'write',
    store: 'presets',
    key: preset.id,
    record: v3PresetRecord(preset, V32_APP_VERSION),
  }))
}

/** Intent: the port of the v3.3 tab over the factory's database, every production step run. */
function openV33(factory: IDBFactory, migrations?: readonly MigrationStep[]) {
  return openStoragePort({
    factory,
    appVersion: V33_APP_VERSION,
    ...(migrations === undefined ? {} : { migrations }),
  })
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

/** Intent: the raw values stored under each write's store and key. */
function rawValues(factory: IDBFactory, writes: readonly StorageChange[]): Promise<unknown[]> {
  return withRawDatabase(factory, (database) =>
    Promise.all(writes.map((write) => rawGet(database, write.store, write.key))),
  )
}

/** Intent: a stored intent without its Seventh chords level, as v3.2 stored it. */
function withoutLevel(intent: Record<string, unknown>): Record<string, unknown> {
  const { chordFamilies, ...earlier } = intent
  void chordFamilies
  return earlier
}

/** A stored body's phrases, each with its intent as a plain record. */
type StoredPhrases = readonly { readonly intent: Record<string, unknown> }[]

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
// @test-link [[rule_earlier_kept_sessions_carried_over]]
describe('a data version 4 database of v3.2 records, opened by v3.3', () => {
  let factory: IDBFactory
  let sessions: readonly V32Session[]
  let seeded: Map<string, StoredKeptSession>
  let others: StorageChange[]
  let presets: StorageChange[]
  let status: string
  let after: Map<string, StoredKeptSession>

  beforeAll(async () => {
    factory = freshFactory()
    sessions = v32Sessions()
    seeded = new Map(
      sessions.map(({ key, history, facts }) => [
        key,
        v4Session(encodeKeptSession(history, facts, V32_APP_VERSION)),
      ]),
    )
    others = otherStoreWrites()
    presets = presetWrites()
    await seedVersion4(factory, [
      ...[...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
      ...others,
      ...presets,
    ])
    status = (await openV33(factory)).status()
    after = new Map(
      await Promise.all(
        sessions.map(async ({ key }) => [key, await rawSession(factory, key)] as const),
      ),
    )
  }, 60_000)

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('opens at data version 5, the port ready, meta naming the upgrading app', async () => {
    expect(status).toBe('ready')
    expect(await databaseState(factory)).toEqual({
      version: 5,
      meta: { dataVersion: 5, appVersion: V33_APP_VERSION },
    })
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_read_at_off]]
  it("holds each body at data version 5, each phrase's intent at Off right after its figure levels, every other field as stored", () => {
    for (const { key } of sessions) {
      const before = seeded.get(key)!.body as Record<string, unknown>
      const body = after.get(key)!.body as Record<string, unknown>
      expect(before.dataVersion, key).toBe(4)
      const { phrases, ...rest } = body
      const { phrases: storedPhrases, ...storedRest } = before
      expect(rest, key).toStrictEqual({
        ...storedRest,
        dataVersion: 5,
        appVersion: V33_APP_VERSION,
      })
      for (const { intent } of phrases as StoredPhrases) {
        expect(intent.chordFamilies, key).toStrictEqual(OFF_CHORD_FAMILIES)
        const keys = Object.keys(intent)
        expect(keys.indexOf('chordFamilies'), key).toBe(keys.indexOf('figureLevels') + 1)
      }
      const withoutLevels = (phrases as StoredPhrases).map((phrase) => ({
        ...phrase,
        intent: withoutLevel(phrase.intent),
      }))
      expect(withoutLevels, key).toStrictEqual(storedPhrases)
    }
    expect(Object.keys(after.get('fresh-jam')!.body as object)).toEqual(
      expect.arrayContaining(['doodle', 'playedNotesClock']),
    )
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_player_presets_saved_on_device]]
  it('holds each player preset record at data version 5 with the level at Off, every other field as stored, each loading as before', async () => {
    const stored = await rawValues(factory, presets)

    stored.forEach((record, index) => {
      const write = presets[index]!
      const before = write.kind === 'write' ? write.record : null
      expect(record).toStrictEqual({
        ...before,
        dataVersion: 5,
        appVersion: V33_APP_VERSION,
        chordFamilies: OFF_CHORD_FAMILIES,
      })
    })
    const loaded = decodePlayerPresets(
      presets.map((write, index) => ({ key: write.key, value: stored[index] })),
    )
    expect(loaded).toEqual(V32_PRESETS)
    for (const preset of loaded) expect(preset.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('keeps the session-wide records at 4, the played notes at 1 and every settings and other record as stored', async () => {
    for (const { key } of sessions) {
      expect(after.get(key)!.summary, key).toStrictEqual(seeded.get(key)!.summary)
      expect((after.get(key)!.summary as { dataVersion: number }).dataVersion).toBe(4)
      expect(after.get(key)!.playedNotes, key).toStrictEqual(seeded.get(key)!.playedNotes)
      expect((after.get(key)!.playedNotes as { dataVersion: number }).dataVersion).toBe(1)
    }
    expect(await rawValues(factory, others)).toStrictEqual(
      others.map((write) => (write.kind === 'write' ? write.record : 0)),
    )
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  // @test-link [[rule_earlier_kept_sessions_read_at_off]]
  it('decodes each session as v3.2 read it, every phrase at Off, its review notation and every export byte-identical', () => {
    for (const kept of sessions) {
      const before = keptByV32(kept)
      const session = decoded(after.get(kept.key)!)

      expect(session, kept.key).toEqual(before)
      for (const phrase of session.phrases)
        expect(phrase.intent.chordFamilies).toStrictEqual(OFF_CHORD_FAMILIES)
      expect(notationText(session), kept.key).toBe(notationText(before))
      expect(exportBytes(session), kept.key).toHaveLength(5)
      expect(exportBytes(session), kept.key).toStrictEqual(exportBytes(before))
    }
    expect(decoded(after.get('fresh-jam')!).jam).toMatchObject({ doodle: KEPT_DOODLE })
    expect(decoded(after.get('fresh-jam')!).jam!.playedNotesClock).not.toBeNull()
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it('leaves each carried-over body and preset record unread as newer by a v3.2 reader', async () => {
    for (const { key } of sessions) expect(readEnvelope(after.get(key)!.body, 4)).toBe('newer')
    for (const record of await rawValues(factory, presets))
      expect(readEnvelope(record, 3)).toBe('newer')
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('rewrites no record when it is read or the database opened again', async () => {
    const presetsBefore = await rawValues(factory, presets)
    const port = await openV33(factory)
    for (const { key } of sessions) {
      decodeKeptSession({
        summary: await port.read('sessionSummaries', key),
        body: await port.read('sessionBodies', key),
        playedNotes: await port.read('playedNotes', key),
      })
    }
    await openV33(factory)

    for (const { key } of sessions)
      expect(await rawSession(factory, key), key).toStrictEqual(after.get(key))
    expect(await rawValues(factory, presets)).toStrictEqual(presetsBefore)
  })
})

/** Intent: a v3.0 kept session's history and facts on the tenor, phrase 2 a favorite. */
function v30Session(): V32Session {
  return {
    key: 'v30',
    history: historyOf(recordedKeptSession('bb-tenor', 3).phrases(), 'bb-tenor'),
    facts: {
      pinned: false,
      favorites: [2],
      comment: '',
      playedNotesKept: false,
      presets: BUILT_IN_PRESETS,
    },
  }
}

/** Intent: expect a session reached data version 5 at Off and decodes as v3.2 read it. */
async function expectCarriedToV5(factory: IDBFactory, kept: V32Session): Promise<void> {
  const after = await rawSession(factory, kept.key)
  expect(after.body).toMatchObject({ dataVersion: 5, appVersion: V33_APP_VERSION })
  expect(after.summary).toMatchObject({ dataVersion: 4 })
  const session = decoded(after)
  expect(session.phrases).toEqual(keptByV32(kept).phrases)
  expect(exportBytes(session)).toStrictEqual(exportBytes(keptByV32(kept)))
}

// @test-link [[module_presets_and_kept_sessions_upgrade_step]]
// @test-link [[module_on_device_database]]
describe('a database at data version 0 to 3, opened by v3.3', () => {
  // @test-link [[module_on_device_database]]
  it('runs every step from an empty database, reaching data version 5', async () => {
    const factory = freshFactory()
    const ran: number[] = []

    expect((await openV33(factory, recordedProductionSteps(ran))).status()).toBe('ready')
    expect(ran).toEqual([1, 2, 3, 4, 5])
    expect((await databaseState(factory)).version).toBe(5)
  })

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  it('runs steps 2 to 5 in order over a v3.0 session at data version 1, its body reaching 5', async () => {
    const factory = freshFactory()
    const kept = v30Session()
    const records = encodeKeptSession(kept.history, kept.facts, V30_APP_VERSION)
    const stored = v1Session(records, { musicalProfile: 'Neutral', isCustom: false }, 'v3.0')
    await seedVersion1(factory, sessionWrites({ key: kept.key, stored }))
    const ran: number[] = []

    expect((await openV33(factory, recordedProductionSteps(ran))).status()).toBe('ready')
    expect(ran).toEqual([2, 3, 4, 5])
    await expectCarriedToV5(factory, kept)
  }, 30_000)

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  it('runs steps 3 to 5 in order over a session at data version 2', async () => {
    const factory = freshFactory()
    const kept = v30Session()
    const records = encodeKeptSession(kept.history, kept.facts, V30_APP_VERSION)
    const stored = v1Session(records, { musicalProfile: 'Neutral', isCustom: false }, 'chunk 8')
    await seedVersion1(factory, sessionWrites({ key: kept.key, stored }))
    expect((await openAtVersion2(factory)).status()).toBe('ready')
    const ran: number[] = []

    expect((await openV33(factory, recordedProductionSteps(ran))).status()).toBe('ready')
    expect(ran).toEqual([3, 4, 5])
    await expectCarriedToV5(factory, kept)
  }, 30_000)

  // @test-link [[module_presets_and_kept_sessions_upgrade_step]]
  // @test-link [[rule_player_presets_saved_on_device]]
  it('runs steps 4 and 5 in order over a v3.1 session and player preset at data version 3', async () => {
    const factory = freshFactory()
    const kept = v30Session()
    const records = encodeKeptSession(kept.history, kept.facts, V31_APP_VERSION)
    const preset = V32_PRESETS[0]!
    await seedVersion3(factory, [
      ...sessionWrites({ key: kept.key, stored: v2Session(records) }),
      {
        kind: 'write',
        store: 'presets',
        key: preset.id,
        record: v3PresetRecord(preset, V31_APP_VERSION),
      },
    ])
    const ran: number[] = []

    expect((await openV33(factory, recordedProductionSteps(ran))).status()).toBe('ready')
    expect(ran).toEqual([4, 5])
    await expectCarriedToV5(factory, kept)
    const record = await withRawDatabase(factory, (database) =>
      rawGet(database, 'presets', preset.id),
    )
    expect(record).toMatchObject({ dataVersion: 5, chordFamilies: OFF_CHORD_FAMILIES })
    expect(decodePlayerPresets([{ key: preset.id, value: record }])).toEqual([preset])
  }, 30_000)
})
