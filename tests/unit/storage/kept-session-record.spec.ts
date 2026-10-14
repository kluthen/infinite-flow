import { beforeAll, describe, expect, it } from 'vitest'

import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import { buildGeneratedNotesFile, type GeneratedNotesRequest } from '@/export/generated-notes-file'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import type { SessionHistory, SessionHistoryRecord } from '@/session/session-history'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSession,
  type KeptSessionFacts,
  type KeptSessionRecords,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import {
  APP_VERSION,
  REMOVE,
  allKeys,
  edited,
  historyOf,
  isDeepFrozen,
  longJazzSixteenthRecords,
  recordedKeptSession,
  storedRecords,
  type Step,
} from './kept-session-fixtures'

/** Every request the generated-notes export offers: both formats, backing off and on. */
const EVERY_REQUEST: readonly GeneratedNotesRequest[] = [
  { format: 'musicxml', backingTrack: false },
  { format: 'musicxml', backingTrack: true },
  { format: 'midi', backingTrack: false },
  { format: 'midi', backingTrack: true },
]

/** The facts of a kept session whose played notes are kept, with two favorites. */
const KEPT_FACTS: KeptSessionFacts = {
  pinned: true,
  favorites: [3, 1],
  comment: 'Swung the second half.',
  playedNotesKept: true,
}

/** Keys no kept record may hold anywhere. */
const FORBIDDEN_KEYS = ['acknowledgements', 'rhythm', 'tensionBinding', 'diagnostics'] as const

/** Intent: a decoded session, failing the test unless the stored values read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/** Intent: the decoded session as the exports read a history. */
function exportable(session: KeptSession) {
  return { phrases: () => session.phrases, startedAt: session.summary.startedAt }
}

// @test-link [[entity_kept_session_record]]
// @test-link [[rule_kept_session_holds_no_acknowledgements]]
describe('encodeKeptSession on a five-phrase session with played notes and acknowledgements', () => {
  let history: SessionHistory
  let records: KeptSessionRecords

  beforeAll(() => {
    history = recordedKeptSession('bb-tenor', 5)
    records = encodeKeptSession(history, KEPT_FACTS, APP_VERSION)
  })

  // @test-link [[entity_kept_session_record]]
  it('records acknowledgements and played notes in the history it encodes', () => {
    const phrases = history.phrases()
    expect(phrases.map((phrase) => phrase.acknowledgements.length)).toEqual([2, 2, 2, 2, 2])
    expect(phrases.map((phrase) => phrase.playedNotes.length)).toEqual([4, 4, 4, 4, 2])
    expect(phrases.map((phrase) => phrase.isRepeat)).toEqual([false, true, false, false, false])
  })

  // @test-link [[entity_kept_session_record]]
  // @test-link [[rule_kept_session_holds_no_acknowledgements]]
  it('writes every record, phrase and note with exactly its allowlisted keys', () => {
    expect(Object.keys(records.summary).sort()).toEqual(
      [
        'dataVersion',
        'appVersion',
        'startedAt',
        'lengthSeconds',
        'phraseCount',
        'musicalProfile',
        'instrument',
        'startingTempo',
        'tempoReached',
        'pinned',
        'favoritesCount',
        'comment',
        'playedNotesKept',
        'recordedByAppVersion',
        'sessionSeed',
      ].sort(),
    )
    expect(Object.keys(records.summary.musicalProfile).sort()).toEqual([
      'isCustom',
      'musicalProfile',
    ])
    expect(Object.keys(records.summary.instrument).sort()).toEqual(['displayName', 'id'])
    expect(Object.keys(records.body).sort()).toEqual(['appVersion', 'dataVersion', 'phrases'])
    const phraseKeys = [
      'phraseNumber',
      'startsAt',
      'request',
      'timeline',
      'harmony',
      'intent',
      'tempo',
      'isRepeat',
      'favorite',
      'clef',
    ]
    for (const phrase of records.body.phrases) {
      const expected = phrase.isRepeat ? [...phraseKeys, 'repeatOf'] : phraseKeys
      expect(Object.keys(phrase).sort(), `phrase ${phrase.phraseNumber}`).toEqual(expected.sort())
    }
    expect(records.body.phrases[1]!.repeatOf).toBe(1)
    expect(Object.keys(records.playedNotes!).sort()).toEqual(['appVersion', 'dataVersion', 'notes'])
    for (const note of records.playedNotes!.notes)
      expect(Object.keys(note).sort()).toEqual(['onset', 'pitch', 'release', 'velocity'])
  })

  // @test-link [[rule_kept_session_holds_no_acknowledgements]]
  it('holds no acknowledgements, rhythm or tension provenance or diagnostics anywhere', () => {
    const keys = allKeys(storedRecords(records))
    for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), forbidden).toBe(false)
  })

  // @test-link [[entity_kept_session_record]]
  it('writes every record at data version 1 by the app version given, the clef treble', () => {
    for (const record of [records.summary, records.body, records.playedNotes!]) {
      expect(record.dataVersion).toBe(1)
      expect(record.appVersion).toBe(APP_VERSION)
    }
    expect(records.body.phrases.every((phrase) => phrase.clef === 'treble')).toBe(true)
  })

  // @test-link [[entity_kept_session_record]]
  it('keeps every played note of every phrase in onset order, the stray one before phrase 1 not', () => {
    const notes = records.playedNotes!.notes
    expect(notes).toHaveLength(18)
    expect(notes.map((note) => note.onset)).toEqual(
      [...notes.map((note) => note.onset)].sort((a, b) => a - b),
    )
    expect(notes.every((note) => note.onset >= 0)).toBe(true)
  })

  // @test-link [[entity_kept_session_record]]
  it('writes no played-notes record when the played notes are not kept', () => {
    const notKept = encodeKeptSession(
      history,
      { ...KEPT_FACTS, playedNotesKept: false },
      APP_VERSION,
    )

    expect(notKept.playedNotes).toBeNull()
    expect(notKept.summary.playedNotesKept).toBe(false)
  })
})

// @test-link [[module_kept_session_codec]]
describe('decodeKeptSession of a stored session, for each built-in instrument', () => {
  const INSTRUMENTS: readonly InstrumentProfileId[] = ['c-keyboard', 'bb-tenor', 'eb-alto']

  // @test-link [[module_kept_session_codec]]
  it.each(INSTRUMENTS)('%s: exports byte-identical MusicXML, MIDI and played-notes MIDI', (id) => {
    const history = recordedKeptSession(id, 6)
    const session = decoded(storedRecords(encodeKeptSession(history, KEPT_FACTS, APP_VERSION)))

    for (const request of EVERY_REQUEST) {
      expect(
        buildGeneratedNotesFile(exportable(session), request),
        `${request.format}, backing ${request.backingTrack}`,
      ).toEqual(buildGeneratedNotesFile(history, request))
    }
    expect(buildPlayedNotesFile(exportable(session))).toEqual(buildPlayedNotesFile(history))
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('gives phrase starts and played-note times in seconds from phrase 1, notes in their phrase', () => {
    const history = recordedKeptSession('eb-alto', 4)
    const session = decoded(storedRecords(encodeKeptSession(history, KEPT_FACTS, APP_VERSION)))
    const records = history.phrases()
    const origin = records[0]!.startedAt

    expect(origin).toBeGreaterThan(0)
    expect(session.phrases[0]!.startedAt).toBe(0)
    session.phrases.forEach((phrase, index) => {
      const record = records[index]!
      expect(phrase.startedAt).toBe(record.startedAt - origin)
      expect(phrase.playedNotes).toEqual(
        record.playedNotes.map((note) => ({
          pitch: note.pitch,
          velocity: note.velocity,
          onsetAt: note.onsetAt - origin,
          releaseAt: note.releaseAt - origin,
        })),
      )
    })
  })

  // @test-link [[module_kept_session_codec]]
  it('gives each phrase as reviewed, with its marks, its clef and nothing the records do not hold', () => {
    const history = recordedKeptSession('bb-tenor', 4)
    const session = decoded(storedRecords(encodeKeptSession(history, KEPT_FACTS, APP_VERSION)))
    const records = history.phrases()

    session.phrases.forEach((phrase, index) => {
      const record = records[index]!
      expect(phrase.outcome).toEqual({
        result: record.outcome.result,
        provenance: { harmony: record.outcome.provenance.harmony },
      })
      expect(phrase.intent).toEqual(record.intent)
      expect(phrase.tempo).toBe(record.tempo)
      expect(phrase.isRepeat).toBe(record.isRepeat)
      expect(phrase.repeatOf).toBe(record.repeatOf)
      expect(phrase.favorite).toBe(KEPT_FACTS.favorites.includes(record.phraseNumber))
      expect(phrase.clef).toBe('treble')
    })
    const keys = allKeys(session)
    for (const forbidden of [...FORBIDDEN_KEYS, 'request'])
      expect(keys.has(forbidden), forbidden).toBe(false)
    expect(isDeepFrozen(session)).toBe(true)
  })

  // @test-link [[module_kept_session_codec]]
  it('decodes a session whose played notes are not kept with no note in any phrase', () => {
    const history = recordedKeptSession('c-keyboard', 3)
    const facts = { ...KEPT_FACTS, playedNotesKept: false }
    const session = decoded(storedRecords(encodeKeptSession(history, facts, APP_VERSION)))

    expect(session.phrases.map((phrase) => phrase.playedNotes)).toEqual([[], [], []])
  })

  // @test-link [[module_kept_session_codec]]
  it("reads each phrase's instrument profile from the data it holds, never by its id", () => {
    const stored = storedRecords(
      encodeKeptSession(recordedKeptSession('bb-tenor', 3), KEPT_FACTS, APP_VERSION),
    )
    let body = stored.body
    for (const index of [0, 1, 2])
      body = edited(
        body,
        ['phrases', index, 'intent', 'instrumentProfile', 'displayName'],
        'My old tenor',
      )

    const session = decoded({ ...stored, body })

    for (const phrase of session.phrases)
      expect(phrase.intent.instrumentProfile.displayName).toBe('My old tenor')
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_outdated_tab_reads_what_it_can]]
describe('decodeKeptSession of newer or invalid stored values', () => {
  let stored: StoredKeptSession

  beforeAll(() => {
    stored = storedRecords(
      encodeKeptSession(recordedKeptSession('bb-tenor', 3), KEPT_FACTS, APP_VERSION),
    )
  })

  // @test-link [[rule_outdated_tab_reads_what_it_can]]
  it.each(['summary', 'body', 'playedNotes'] as const)(
    'reports a newer %s record as newer and reads nothing, whatever else is stored',
    (which) => {
      const newer = { ...stored, [which]: edited(stored[which], ['dataVersion'], 2) }

      expect(decodeKeptSession(newer)).toEqual({ reading: 'newer' })
      expect(
        decodeKeptSession({
          ...newer,
          ...(which === 'body' ? { summary: null } : { body: 'garbage' }),
        }),
      ).toEqual({
        reading: 'newer',
      })
    },
  )

  /** Each invalid stored session: which record, the path edited and its replacement. */
  const INVALID: readonly (readonly [
    string,
    'summary' | 'body' | 'playedNotes',
    readonly Step[],
    unknown,
  ])[] = [
    ['an older data version', 'summary', ['dataVersion'], 0],
    ['a summary missing a key', 'summary', ['comment'], REMOVE],
    ['a summary with an extra key', 'summary', ['acknowledgements'], []],
    ['a comment over 500 characters', 'summary', ['comment'], 'x'.repeat(501)],
    ['a phrase count the body does not hold', 'summary', ['phraseCount'], 4],
    ['a favorites count the body does not hold', 'summary', ['favoritesCount'], 1],
    ['another instrument than the phrases', 'summary', ['instrument', 'id'], 'eb-alto'],
    ['a session seed that is no seed', 'summary', ['sessionSeed'], -1],
    ['a body with an extra key', 'body', ['diagnostics'], {}],
    ['a phrase with acknowledgements', 'body', ['phrases', 0, 'acknowledgements'], []],
    ['a phrase missing its clef', 'body', ['phrases', 0, 'clef'], REMOVE],
    ['a clef that is no instrument clef', 'body', ['phrases', 0, 'clef'], 'alto'],
    ['a timeline of no measure', 'body', ['phrases', 0, 'timeline', 'measures'], []],
    ['a harmony with no identity', 'body', ['phrases', 0, 'harmony', 'identity'], ''],
    ['a harmony with rhythm provenance', 'body', ['phrases', 0, 'harmony', 'rhythm'], {}],
    ['an intent with a bad seed', 'body', ['phrases', 0, 'intent', 'seed'], 1.5],
    [
      'a request of another request id',
      'body',
      ['phrases', 0, 'request', 'requestId'],
      'other-request',
    ],
    ['a request of another seed', 'body', ['phrases', 2, 'request', 'seed'], 7],
    ['a favorite mark the count does not hold', 'body', ['phrases', 1, 'favorite'], true],
    ['a repeat naming no phrase', 'body', ['phrases', 1, 'repeatOf'], REMOVE],
    ['a repeat of a later phrase', 'body', ['phrases', 1, 'repeatOf'], 2],
    ['a repeat mark on a phrase no repeat', 'body', ['phrases', 2, 'repeatOf'], 1],
    ['phrase 1 not starting at 0', 'body', ['phrases', 0, 'startsAt'], 0.5],
    ['starts out of order', 'body', ['phrases', 2, 'startsAt'], 1],
    ['no phrase', 'body', ['phrases'], []],
    ['a note velocity of 0', 'playedNotes', ['notes', 0, 'velocity'], 0],
    ['a note pitch above MIDI', 'playedNotes', ['notes', 0, 'pitch'], 128],
    ['a note released before its onset', 'playedNotes', ['notes', 0, 'release'], 0],
    ['a note before phrase 1', 'playedNotes', ['notes', 0, 'onset'], -0.1],
    ['notes out of onset order', 'playedNotes', ['notes', 1, 'onset'], 0],
    ['a note with an extra key', 'playedNotes', ['notes', 0, 'channel'], 1],
  ]

  // @test-link [[module_kept_session_codec]]
  it.each(INVALID)(
    'reports %s as unreadable, never partly decoded',
    (_, which, path, replacement) => {
      const invalid = { ...stored, [which]: edited(stored[which], path, replacement) }

      expect(decodeKeptSession(invalid)).toEqual({ reading: 'unreadable' })
    },
  )

  // @test-link [[module_kept_session_codec]]
  it.each([null, 'session', [], 3])('reports a stored body of %j as unreadable', (body) => {
    expect(decodeKeptSession({ ...stored, body })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  it('reports played notes missing while kept, or present while not kept, as unreadable', () => {
    expect(decodeKeptSession({ ...stored, playedNotes: undefined })).toEqual({
      reading: 'unreadable',
    })
    const notKept = { ...stored, summary: edited(stored.summary, ['playedNotesKept'], false) }
    expect(decodeKeptSession(notKept)).toEqual({ reading: 'unreadable' })
    expect(decodeKeptSession({ ...notKept, playedNotes: undefined }).reading).toBe('current')
  })
})

// @test-link [[module_kept_session_codec]]
describe('encodeKeptSession refusals', () => {
  let records: readonly SessionHistoryRecord[]

  beforeAll(() => {
    records = recordedKeptSession('bb-tenor', 3).phrases()
  })

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['an empty app version', KEPT_FACTS, ''],
    ['a comment over 500 characters', { ...KEPT_FACTS, comment: 'x'.repeat(501) }, APP_VERSION],
    ['an unknown favorite', { ...KEPT_FACTS, favorites: [4] }, APP_VERSION],
    ['a favorite listed twice', { ...KEPT_FACTS, favorites: [2, 2] }, APP_VERSION],
  ] as const)('throws for %s', (_, facts, appVersion) => {
    expect(() => encodeKeptSession(historyOf(records, 'bb-tenor'), facts, appVersion)).toThrow()
  })

  // @test-link [[module_kept_session_codec]]
  it('throws for a session with no phrase, or phrases of another instrument', () => {
    expect(() => encodeKeptSession(historyOf([], 'bb-tenor'), KEPT_FACTS, APP_VERSION)).toThrow()
    expect(() =>
      encodeKeptSession(historyOf(records, 'eb-alto'), KEPT_FACTS, APP_VERSION),
    ).toThrow()
  })

  // @test-link [[module_kept_session_codec]]
  it('keeps a comment of exactly 500 characters', () => {
    const facts = { ...KEPT_FACTS, comment: 'x'.repeat(500) }

    expect(
      encodeKeptSession(historyOf(records, 'bb-tenor'), facts, APP_VERSION).summary.comment,
    ).toHaveLength(500)
  })
})

/** Bytes of UTF-8 text, and a megabyte (10^6 bytes). */
const utf8Bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length
const MEGABYTE = 1_000_000

/**
 * The bound on a 30-minute 240 BPM Jazz Sixteenth session's session-wide record and body. The spec
 * estimates about 3.5 MB (3 to 8 KB a phrase); data version 1 keeps each phrase's timeline, harmony
 * and intent in their domain form, about 9 KB a phrase at this tempo and density, and measures
 * 4.07 MB. The bound keeps that figure from growing unnoticed.
 */
const LONG_SESSION_BOUND_MB = 4.25

// @test-link [[entity_kept_session_record]]
describe('the size of a 30-minute 240 BPM Jazz Sixteenth session', () => {
  // @test-link [[entity_kept_session_record]]
  it('stays within the measured bound for its session-wide record and body', async () => {
    const records = await longJazzSixteenthRecords(450, 12)
    const kept = encodeKeptSession(historyOf(records, 'eb-alto'), KEPT_FACTS, APP_VERSION)
    const sessionBytes = utf8Bytes(kept.summary) + utf8Bytes(kept.body)

    expect(kept.summary.lengthSeconds).toBe(1800)
    expect(sessionBytes).toBeLessThanOrEqual(LONG_SESSION_BOUND_MB * MEGABYTE)
  })
})
