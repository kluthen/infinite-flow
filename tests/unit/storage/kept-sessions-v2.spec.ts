// @vitest-environment node
/**
 * The upgrade step to data version 2 over the real port and an in-memory IndexedDB: a database a
 * v3.0 tab created at data version 1 and filled with v3.0-shaped kept sessions (Neutral, Jazz,
 * customized Jazz, my instrument, played notes kept, favorites, a comment) opens at the code's
 * data version, through step 2 then step 4, each session carried over with its phrases' levels and
 * its preset label, reviewed and exported byte for byte as before; step 2 alone writes v3.1's body
 * at data version 2; the played notes and every other store are left as stored, and a session
 * kept after the upgrade keeps its label through a later change.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { notationInputFromOutcome } from '@/domain/notation/notation-input'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import type { SessionHistoryRecord } from '@/session/session-history'
import { DATABASE_DATA_VERSION } from '@/storage/database'
import { encodeControllerRecord } from '@/storage/records/controller-record'
import {
  decodeKeptSession,
  decodeKeptSessionSummary,
  encodeKeptSession,
  KEPT_SESSION_BODY_DATA_VERSION,
  KEPT_SESSION_SUMMARY_DATA_VERSION,
  rewriteKeptSummary,
  type KeptSession,
  type KeptSessionFacts,
  type KeptSessionHistory,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  encodeMyInstrumentRecord,
  MY_INSTRUMENT_RECORD_KEY,
} from '@/storage/records/my-instrument-record'
import { parseKeptSessionBodyV1, parseKeptSessionBodyV2 } from '@/storage/records/kept-session-body'
import {
  parseKeptSessionSummaryV1,
  parseKeptSessionSummaryV2,
} from '@/storage/records/kept-session-summary'
import { encodeSettingRecord } from '@/storage/records/settings-record'
import type { StorageChange, StoragePort } from '@/storage/storage-port'
import { lowHorn, recordedMyInstrumentSession } from '../session/my-instrument-session'
import {
  historyOf,
  longJazzSixteenthRecords,
  recordedKeptSession,
  storedRecords,
} from './kept-session-fixtures'
import {
  databaseState,
  openAtVersion2,
  openUpgraded,
  rawSession,
  seedVersion1,
  sessionWrites,
  storedIntents,
  UPGRADING_APP_VERSION,
  V30_APP_VERSION,
  v1Session,
} from './kept-sessions-v1-fixtures'
import { freshFactory, rawGet, withRawDatabase } from './storage-test-doubles'

/** The selections the v3.0 sessions were kept with. */
const NEUTRAL: ProfileSelection = { musicalProfile: 'Neutral', isCustom: false }
const JAZZ: ProfileSelection = { musicalProfile: 'Jazz', isCustom: false }
const CUSTOM_JAZZ: ProfileSelection = { musicalProfile: 'Jazz', isCustom: true }

/**
 * Intent: a v3.0 selection in v3.1's form, as the session histories hold it: Neutral or Jazz, or
 * Custom based on either.
 */
function presetSelectionOf(selection: ProfileSelection): PresetSelection {
  const presetId = selection.musicalProfile === 'Jazz' ? 'jazz' : 'neutral'
  return selection.isCustom ? { kind: 'custom', baseId: presetId } : { kind: 'preset', presetId }
}

/** Intent: the v3.0 selection a v3.0 tab stored for a session's v3.1 selection. */
function v30Selection(selection: PresetSelection): ProfileSelection {
  const id = selection.kind === 'preset' ? selection.presetId : selection.baseId
  return {
    musicalProfile: id === 'jazz' ? 'Jazz' : 'Neutral',
    isCustom: selection.kind === 'custom',
  }
}

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

/** One v3.0 session of the seeded database, and what v3.1 must carry it over to. */
interface V30Session {
  readonly key: string
  readonly history: KeptSessionHistory
  readonly facts: KeptSessionFacts
  readonly levels: FigureLevels
  readonly label: string
}

/** Intent: a session-shaped value over recorded phrases, kept with the given selection. */
function session(
  key: string,
  phrases: readonly SessionHistoryRecord[],
  instrument: InstrumentProfileId,
  selection: ProfileSelection,
  facts: Partial<KeptSessionFacts> = {},
): Omit<V30Session, 'levels' | 'label'> {
  return {
    key,
    history: historyOf(phrases, instrument, presetSelectionOf(selection)),
    facts: { ...PLAIN, ...facts },
  }
}

/**
 * Intent: the seven v3.0 sessions: Neutral, Jazz and customized Jazz, one played with my
 * instrument, one with its played notes kept, one with favorites, one with a comment.
 */
async function v30Sessions(): Promise<readonly V30Session[]> {
  const jazz = (await longJazzSixteenthRecords(4, 4)).map((record) => ({
    ...record,
    playedNotes: [],
  }))
  const horn = await recordedMyInstrumentSession(lowHorn('bass'), 3)
  /** Intent: the phrases of a recorded Neutral session on the instrument. */
  const neutral = (id: InstrumentProfileId, count: number) =>
    recordedKeptSession(id, count).phrases()
  const asNeutral = { levels: NEUTRAL_FIGURE_LEVELS, label: 'Neutral' }
  return [
    { ...session('neutral', neutral('bb-tenor', 4), 'bb-tenor', NEUTRAL), ...asNeutral },
    { ...session('jazz', jazz, 'eb-alto', JAZZ), levels: JAZZ_FIGURE_LEVELS, label: 'Jazz' },
    {
      ...session('custom-jazz', jazz, 'eb-alto', CUSTOM_JAZZ),
      levels: JAZZ_FIGURE_LEVELS,
      label: 'Custom, based on Jazz',
    },
    {
      key: 'my-instrument',
      history: horn,
      facts: PLAIN,
      levels: NEUTRAL_FIGURE_LEVELS,
      label: 'Custom, based on Neutral',
    },
    {
      ...session('played-notes', neutral('eb-alto', 3), 'eb-alto', NEUTRAL, {
        playedNotesKept: true,
      }),
      ...asNeutral,
    },
    {
      ...session('favorites', neutral('c-keyboard', 4), 'c-keyboard', NEUTRAL, {
        favorites: [3, 1],
      }),
      ...asNeutral,
    },
    {
      ...session('comment', neutral('bb-tenor', 3), 'bb-tenor', NEUTRAL, {
        pinned: true,
        comment: 'Swung the second half.',
      }),
      ...asNeutral,
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

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[rule_earlier_kept_sessions_carried_over]]
describe('a data version 1 database of v3.0 kept sessions, opened by v3.1', () => {
  let factory: IDBFactory
  let sessions: readonly V30Session[]
  let seeded: Map<string, StoredKeptSession>
  let upgraded: StoragePort
  let after: Map<string, StoredKeptSession>

  beforeAll(async () => {
    factory = freshFactory()
    sessions = await v30Sessions()
    seeded = new Map(
      sessions.map(({ key, history, facts }) => [
        key,
        v1Session(
          encodeKeptSession(history, facts, V30_APP_VERSION),
          v30Selection(history.selection),
          'v3.0',
        ),
      ]),
    )
    await seedVersion1(
      factory,
      [...seeded].flatMap(([key, stored]) => sessionWrites({ key, stored })),
    )
    upgraded = await openUpgraded(factory)
    after = new Map(
      await Promise.all(
        sessions.map(async ({ key }) => [key, await rawSession(factory, key)] as const),
      ),
    )
  }, 30_000)

  /** Intent: what v3.1 would have kept of the same session: its records decoded. */
  function keptByV31({ history, facts }: V30Session): KeptSession {
    return decoded(storedRecords(encodeKeptSession(history, facts, V30_APP_VERSION)))
  }

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_on_device_database]]
  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("opens the database at the code's data version, 4, the port ready", async () => {
    expect(upgraded.status()).toBe('ready')
    expect(await databaseState(factory)).toEqual({
      version: DATABASE_DATA_VERSION,
      meta: { dataVersion: DATABASE_DATA_VERSION, appVersion: UPGRADING_APP_VERSION },
    })
    expect(DATABASE_DATA_VERSION).toBe(4)
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("holds each body at the body's data version through 2, every phrase intent with its profile's levels and no profile", () => {
    for (const { key, levels } of sessions) {
      const seededIntents = storedIntents(seeded.get(key)!.body)
      expect(
        seededIntents.some((intent) => Object.hasOwn(intent, 'figureLevels')),
        key,
      ).toBe(false)
      const { body } = after.get(key)!
      expect((body as { dataVersion: number }).dataVersion, key).toBe(
        KEPT_SESSION_BODY_DATA_VERSION,
      )
      expect(Object.hasOwn(body as object, 'doodle'), key).toBe(false)
      expect(storedIntents(body)).toHaveLength(seededIntents.length)
      for (const intent of storedIntents(body)) {
        expect(intent.figureLevels, key).toStrictEqual(levels)
        expect(Object.hasOwn(intent, 'musicalProfile'), key).toBe(false)
      }
    }
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_preset_label_kept_with_session]]
  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("holds each summary at the summary's data version through 2, with its preset label in place of the selection", () => {
    for (const { key, label } of sessions) {
      const summary = after.get(key)!.summary as Record<string, unknown>
      expect(summary.dataVersion, key).toBe(KEPT_SESSION_SUMMARY_DATA_VERSION)
      expect(summary.isJam, key).toBe(false)
      expect(summary.presetLabel, key).toBe(label)
      expect(Object.hasOwn(summary, 'musicalProfile'), key).toBe(false)
    }
    const labels = sessions
      .slice(0, 3)
      .map(({ key }) => decoded(after.get(key)!).summary.presetLabel)
    expect(labels).toEqual(['Neutral', 'Jazz', 'Custom, based on Jazz'])
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  it('decodes each carried-over session as the session v3.1 would have kept', () => {
    for (const kept of sessions) {
      const session = decoded(after.get(kept.key)!)
      expect(session, kept.key).toEqual(keptByV31(kept))
      const v1 = seeded.get(kept.key)!
      expect(session.summary, kept.key).toEqual({
        ...parseKeptSessionSummaryV1(v1.summary),
        isJam: false,
      })
      expect(session.phrases.map((phrase) => phrase.intent)).toEqual(
        parseKeptSessionBodyV1(v1.body).map((phrase) => phrase.intent),
      )
      for (const phrase of session.phrases)
        expect(phrase.intent.figureLevels, kept.key).toStrictEqual(kept.levels)
    }
    expect(decoded(after.get('favorites')!).phrases.map((phrase) => phrase.favorite)).toEqual([
      true,
      false,
      true,
      false,
    ])
    expect(decoded(after.get('comment')!).summary).toMatchObject({
      pinned: true,
      comment: 'Swung the second half.',
    })
    expect(decoded(after.get('my-instrument')!).phrases.map((phrase) => phrase.clef)).toEqual([
      'bass',
      'bass',
      'bass',
    ])
  })

  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  it("gives each session's review notation and both exports byte-identical to before the upgrade", () => {
    for (const kept of sessions) {
      const before = keptByV31(kept)
      const session = decoded(after.get(kept.key)!)
      expect(notationText(session), kept.key).toBe(notationText(before))
      const bytes = exportBytes(session)
      expect(bytes, kept.key).toHaveLength(kept.facts.playedNotesKept ? 5 : 4)
      expect(bytes, kept.key).toStrictEqual(exportBytes(before))
    }
  })

  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[rule_earlier_kept_sessions_carried_over]]
  it('decodes a carried-over session with its played notes, their record left at data version 1 as stored', () => {
    const { playedNotes } = after.get('played-notes')!
    expect(playedNotes).toStrictEqual(seeded.get('played-notes')!.playedNotes)
    expect((playedNotes as { dataVersion: number }).dataVersion).toBe(1)
    const session = decoded(after.get('played-notes')!)
    expect(session.phrases.flatMap((phrase) => phrase.playedNotes)).toHaveLength(10)
    expect(session.phrases.map((phrase) => phrase.playedNotes)).toEqual(
      keptByV31(sessions.find(({ key }) => key === 'played-notes')!).phrases.map(
        (phrase) => phrase.playedNotes,
      ),
    )
    for (const { key } of sessions.filter(({ facts }) => !facts.playedNotesKept))
      expect(after.get(key)!.playedNotes, key).toBeUndefined()
  })

  // @test-link [[module_kept_session_upgrade_step]]
  it("writes the upgrading app's version in each rewritten envelope, keeping the recording app's", () => {
    for (const { key } of sessions) {
      const { summary, body } = after.get(key)! as {
        summary: Record<string, unknown>
        body: Record<string, unknown>
      }
      expect(summary.appVersion, key).toBe(UPGRADING_APP_VERSION)
      expect(body.appVersion, key).toBe(UPGRADING_APP_VERSION)
      expect(summary.recordedByAppVersion, key).toBe(V30_APP_VERSION)
    }
  })
})

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_kept_session_jam_upgrade_step]]
describe('the upgrade step to data version 2 alone', () => {
  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_kept_session_jam_upgrade_step]]
  it("writes v3.1's session-wide record and body at data version 2, which the data version 2 readers read and the current codec does not", async () => {
    const factory = freshFactory()
    const phrases = recordedKeptSession('bb-tenor', 3).phrases()
    const records = encodeKeptSession(
      historyOf(phrases, 'bb-tenor', presetSelectionOf(NEUTRAL)),
      { ...PLAIN, favorites: [2] },
      V30_APP_VERSION,
    )
    const stored = v1Session(records, NEUTRAL, 'v3.0')
    await seedVersion1(factory, sessionWrites({ key: 'kept', stored }))

    expect((await openAtVersion2(factory)).status()).toBe('ready')

    const after = await rawSession(factory, 'kept')
    expect((await databaseState(factory)).version).toBe(2)
    expect(after.body).toMatchObject({ dataVersion: 2, appVersion: UPGRADING_APP_VERSION })
    expect(Object.keys(after.body as object).sort()).toEqual([
      'appVersion',
      'dataVersion',
      'phrases',
    ])
    expect(parseKeptSessionBodyV2(after.body)).toEqual(parseKeptSessionBodyV1(stored.body))
    expect(after.summary).toMatchObject({
      dataVersion: 2,
      appVersion: UPGRADING_APP_VERSION,
      recordedByAppVersion: V30_APP_VERSION,
      presetLabel: 'Neutral',
    })
    expect(Object.hasOwn(after.summary as object, 'isJam')).toBe(false)
    expect(parseKeptSessionSummaryV2(after.summary)).toEqual(
      parseKeptSessionSummaryV1(stored.summary),
    )
    expect(decodeKeptSession(after)).toEqual({ reading: 'unreadable' })
  })
})

/** The remembered controller the v3.0 tab saved. */
const CONTROLLER = { id: 'port-1', name: 'Sax controller', manufacturer: 'Acme' }

/** Intent: the writes of one setting, my instrument and the remembered controller, at version 1. */
function otherStoreWrites(): StorageChange[] {
  return [
    {
      kind: 'write',
      store: 'settings',
      key: 'theme',
      record: encodeSettingRecord('theme', 'Dark', V30_APP_VERSION),
    },
    {
      kind: 'write',
      store: 'instrument',
      key: MY_INSTRUMENT_RECORD_KEY,
      record: encodeMyInstrumentRecord(lowHorn('bass'), V30_APP_VERSION),
    },
    {
      kind: 'write',
      store: 'controller',
      key: 'remembered',
      record: encodeControllerRecord(CONTROLLER, V30_APP_VERSION),
    },
  ]
}

// @test-link [[module_kept_session_upgrade_step]]
// @test-link [[module_on_device_database]]
describe('the stores the upgrade to data version 2 does not change', () => {
  // @test-link [[module_kept_session_upgrade_step]]
  // @test-link [[module_on_device_database]]
  it('keeps the settings, instrument and controller records as stored, at data version 1', async () => {
    const factory = freshFactory()
    const writes = otherStoreWrites()
    await seedVersion1(factory, writes)

    expect((await openUpgraded(factory)).status()).toBe('ready')

    const stored = await withRawDatabase(factory, (database) =>
      Promise.all(
        writes.map((write) => rawGet(database, write.store, write.key) as Promise<unknown>),
      ),
    )
    expect(stored).toStrictEqual(
      writes.map((write) => (write.kind === 'write' ? write.record : null)),
    )
    for (const record of stored) expect((record as { dataVersion: number }).dataVersion).toBe(1)
  })
})

// @test-link [[rule_preset_label_kept_with_session]]
describe('a customized Jazz session kept after the upgrade', () => {
  // @test-link [[rule_preset_label_kept_with_session]]
  // @test-link [[module_kept_session_upgrade_step]]
  it('stores the label "Custom, based on Jazz" in the summary at the summary\'s data version, which a later change keeps', async () => {
    const factory = freshFactory()
    await seedVersion1(factory, otherStoreWrites())
    const port = await openUpgraded(factory)
    const records = (await longJazzSixteenthRecords(3, 3)).map((record) => ({
      ...record,
      playedNotes: [],
    }))
    const kept = encodeKeptSession(
      historyOf(records, 'eb-alto', presetSelectionOf(CUSTOM_JAZZ)),
      PLAIN,
      UPGRADING_APP_VERSION,
    )
    await port.apply(sessionWrites({ key: 'new', stored: storedRecords(kept) }))

    const saved = (await rawSession(factory, 'new')).summary as Record<string, unknown>
    expect(saved.presetLabel).toBe('Custom, based on Jazz')
    expect(saved.dataVersion).toBe(KEPT_SESSION_SUMMARY_DATA_VERSION)

    const rewritten = rewriteKeptSummary(saved, { pinned: true }, UPGRADING_APP_VERSION)
    expect(rewritten).not.toBeNull()
    await port.write('sessionSummaries', 'new', rewritten!)
    const read = decodeKeptSessionSummary((await rawSession(factory, 'new')).summary)
    expect(read.reading === 'current' && read.value).toMatchObject({
      pinned: true,
      presetLabel: 'Custom, based on Jazz',
    })
  }, 30_000)
})
