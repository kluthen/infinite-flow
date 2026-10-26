/**
 * The kept-session codec over a Jam session: a fresh Jam round-trips with its doodle, its
 * played-notes clock and, when its played notes are kept, the raw doodle notes before phrase 1,
 * its phrases holding the very played notes a session that is no Jam holds; a Jam on a kept
 * doodle round-trips with its doodle and no clock; the session-wide record says whether the
 * session is a Jam and whether its suggestion was declined; records that disagree on any of it
 * are unreadable; and the encoder refuses a fresh Jam's moments out of order as caller defects.
 */

import { beforeAll, describe, expect, it } from 'vitest'

import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import type { SessionHistoryRecord } from '@/session/session-history'
import { parseKeptSessionBody } from '@/storage/records/kept-session-body-read'
import {
  decodeKeptSession,
  encodeKeptPlayedNotes,
  encodeKeptSession,
  type KeptJamFacts,
  type KeptSession,
  type KeptSessionFacts,
  type StoredKeptSession,
} from '@/storage/records/kept-session-record'
import { APP_VERSION, edited, historyOf, REMOVE, storedRecords } from './kept-session-fixtures'
import {
  freshJam,
  jamSessionRecordsWithPlayedNotes,
  JAM_COUNT_IN_AT,
  KEPT_DOODLE,
  RAW_DOODLE_NOTES,
} from './kept-session-v32-fixtures'

/** The facts of a kept session with phrase 2 a favorite, no comment, played notes kept. */
const KEPT_NOTES: KeptSessionFacts = {
  pinned: false,
  favorites: [2],
  comment: '',
  playedNotesKept: true,
  presets: BUILT_IN_PRESETS,
}

/** The same facts with the played notes not kept. */
const NOTES_NOT_KEPT: KeptSessionFacts = { ...KEPT_NOTES, playedNotesKept: false }

/** A fresh Jam whose suggestion the player declined. */
const FRESH: KeptJamFacts = { doodle: KEPT_DOODLE, suggestionDeclined: true, fresh: freshJam() }

/** A Jam on a kept doodle, its suggestion taken. */
const ON_KEPT_DOODLE: KeptJamFacts = { doodle: KEPT_DOODLE, suggestionDeclined: false, fresh: null }

/** The fresh Jam's clock: seconds from the count-in's first beat (at 0.25 s; phrase 1 at 7.25 s). */
const CLOCK = { doodleFirstBarline: 1, phraseOneStart: 7 }

/** Intent: the session stored values decode to, failing the test unless they read as current. */
function decoded(stored: StoredKeptSession): KeptSession {
  const reading = decodeKeptSession(stored)
  if (reading.reading !== 'current')
    throw new Error(`Expected a current session, got ${reading.reading}.`)
  return reading.value
}

/** Intent: the stored records of the session over `records` with the facts and Jam facts given. */
function kept(
  records: readonly SessionHistoryRecord[],
  facts: KeptSessionFacts,
  jam?: KeptJamFacts,
): StoredKeptSession {
  const all = jam === undefined ? facts : { ...facts, jam }
  return storedRecords(encodeKeptSession(historyOf(records, 'c-keyboard'), all, APP_VERSION))
}

/** Intent: the stored played notes' onsets, in stored order. */
function storedOnsets(stored: StoredKeptSession): readonly number[] {
  return (stored.playedNotes as { notes: readonly { onset: number }[] }).notes.map((n) => n.onset)
}

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_kept_session_content]]
describe('a kept fresh Jam', () => {
  let records: readonly SessionHistoryRecord[]
  let noJam: KeptSession

  beforeAll(() => {
    records = jamSessionRecordsWithPlayedNotes()
    noJam = decoded(kept(records, KEPT_NOTES))
  }, 60_000)

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('round-trips with its doodle, its clock and the raw doodle notes before phrase 1, its phrases as a session that is no Jam', () => {
    const stored = kept(records, KEPT_NOTES, FRESH)
    const session = decoded(stored)

    expect(session.summary).toMatchObject({ isJam: true, suggestionDeclined: true })
    expect(session.jam).toEqual({
      doodle: KEPT_DOODLE,
      playedNotesClock: CLOCK,
      rawDoodleNotes: RAW_DOODLE_NOTES.map((note) => ({
        ...note,
        onsetAt: note.onsetAt - JAM_COUNT_IN_AT,
        releaseAt: note.releaseAt - JAM_COUNT_IN_AT,
      })),
    })
    expect(session.phrases).toEqual(noJam.phrases)
    expect(session.phrases.map((phrase) => phrase.startedAt)[0]).toBe(0)
    expect(session.phrases.flatMap((phrase) => phrase.playedNotes)).toHaveLength(4)
  })

  // @test-link [[entity_kept_session_record]]
  it('stores the clock in its body and every played note from the count-in, in onset order', () => {
    const stored = kept(records, KEPT_NOTES, FRESH)

    expect((stored.body as { playedNotesClock: unknown }).playedNotesClock).toEqual(CLOCK)
    expect(parseKeptSessionBody(stored.body).playedNotesClock).toEqual(CLOCK)
    const phraseOnsets = storedOnsets(kept(records, KEPT_NOTES)).map((onset) => onset + 7)
    expect(storedOnsets(stored)).toEqual([0.5, 1.25, 3.5, ...phraseOnsets])
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('keeps the clock but no raw doodle note when its played notes are not kept', () => {
    const stored = kept(records, NOTES_NOT_KEPT, FRESH)
    const session = decoded(stored)

    expect(stored.playedNotes).toBeUndefined()
    expect((stored.body as { playedNotesClock: unknown }).playedNotesClock).toEqual(CLOCK)
    expect(session.jam).toEqual({
      doodle: KEPT_DOODLE,
      playedNotesClock: CLOCK,
      rawDoodleNotes: [],
    })
    expect(session.phrases.flatMap((phrase) => phrase.playedNotes)).toEqual([])
  })

  // @test-link [[module_kept_session_changes]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('keeps after its save the very played notes its save writes when they are kept', () => {
    const history = {
      /** Intent: the recorded phrases, as a finished session's history hands them. */
      phrases: () => records,
    }
    const later = structuredClone(encodeKeptPlayedNotes(history, APP_VERSION, freshJam()))
    const stored = kept(records, KEPT_NOTES, FRESH)
    const notKept = kept(records, NOTES_NOT_KEPT, FRESH)

    expect(later).toEqual(stored.playedNotes)
    const summary = edited(notKept.summary, ['playedNotesKept'], true)
    expect(decoded({ ...notKept, summary, playedNotes: later }).jam?.rawDoodleNotes).toHaveLength(3)
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[rule_kept_session_content]]
describe('a kept Jam on a kept doodle', () => {
  let records: readonly SessionHistoryRecord[]

  beforeAll(() => {
    records = jamSessionRecordsWithPlayedNotes()
  }, 60_000)

  // @test-link [[module_kept_session_codec]]
  // @test-link [[rule_kept_session_content]]
  it('round-trips with its doodle, no clock, its played notes counted from phrase 1', () => {
    const stored = kept(records, KEPT_NOTES, ON_KEPT_DOODLE)
    const session = decoded(stored)

    expect(session.summary).toMatchObject({ isJam: true, suggestionDeclined: false })
    expect(session.jam).toEqual({ doodle: KEPT_DOODLE, playedNotesClock: null, rawDoodleNotes: [] })
    expect(Object.hasOwn(stored.body as object, 'playedNotesClock')).toBe(false)
    expect(storedOnsets(stored)).toEqual(storedOnsets(kept(records, KEPT_NOTES)))
    expect(session.phrases).toEqual(decoded(kept(records, KEPT_NOTES)).phrases)
  })

  // @test-link [[entity_kept_session_record]]
  it('says in the session-wide record of a session that is no Jam that it is none, and nothing of a suggestion', () => {
    const stored = kept(records, KEPT_NOTES)

    expect(stored.summary).toMatchObject({ isJam: false })
    expect(Object.hasOwn(stored.summary as object, 'suggestionDeclined')).toBe(false)
    expect(decoded(stored).jam).toBeNull()
  })
})

// @test-link [[module_kept_session_codec]]
// @test-link [[entity_kept_session_record]]
describe('kept Jam records that disagree or break the clock', () => {
  let records: readonly SessionHistoryRecord[]
  let noJam: StoredKeptSession
  let fresh: StoredKeptSession
  let onKeptDoodle: StoredKeptSession

  beforeAll(() => {
    records = jamSessionRecordsWithPlayedNotes()
    noJam = kept(records, KEPT_NOTES)
    fresh = kept(records, KEPT_NOTES, FRESH)
    onKeptDoodle = kept(records, KEPT_NOTES, ON_KEPT_DOODLE)
  }, 60_000)

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['no Jam', () => noJam],
    ['a Jam on a kept doodle', () => onKeptDoodle],
  ])(
    'reads a session of %s without the clock holding a played note before phrase 1 as unreadable',
    (_, session) => {
      const stored = session()
      const playedNotes = edited(stored.playedNotes, ['notes', 0, 'onset'], -0.25)

      expect(decodeKeptSession(stored).reading).toBe('current')
      expect(decodeKeptSession({ ...stored, playedNotes })).toEqual({ reading: 'unreadable' })
    },
  )

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['a phrase 1 start equal to the first barline', ['phraseOneStart'], 1],
    ['a phrase 1 start before the first barline', ['phraseOneStart'], 0.5],
    ['a negative first barline', ['doodleFirstBarline'], -1],
    ['a first barline that is no number', ['doodleFirstBarline'], '1'],
    ['a phrase 1 start that is not finite', ['phraseOneStart'], Infinity],
    ['a missing phrase 1 start', ['phraseOneStart'], REMOVE],
    ['an extra key', ['countIn'], 0],
  ] as const)('reads a fresh Jam whose clock has %s as unreadable', (_, path, replacement) => {
    const body = edited(fresh.body, ['playedNotesClock', ...path], replacement)

    expect(decodeKeptSession({ ...fresh, body })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  it('reads a clock without a doodle as unreadable, the summary saying no Jam', () => {
    const body = edited(fresh.body, ['doodle'], REMOVE)
    const summary = edited(edited(fresh.summary, ['isJam'], false), ['suggestionDeclined'], REMOVE)

    expect(decodeKeptSession({ ...fresh, body, summary })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('reads a summary saying Jam over a body with no doodle as unreadable', () => {
    const summary = edited(edited(noJam.summary, ['isJam'], true), ['suggestionDeclined'], false)

    expect(decodeKeptSession({ ...noJam, summary })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[module_kept_session_codec]]
  // @test-link [[entity_kept_session_record]]
  it('reads a body with a doodle under a summary saying no Jam as unreadable', () => {
    const summary = edited(
      edited(onKeptDoodle.summary, ['isJam'], false),
      ['suggestionDeclined'],
      REMOVE,
    )

    expect(decodeKeptSession({ ...onKeptDoodle, summary })).toEqual({ reading: 'unreadable' })
  })

  // @test-link [[entity_kept_session_record]]
  it.each([
    [
      'a declined suggestion on a session that is no Jam',
      () => noJam,
      ['suggestionDeclined'],
      false,
    ],
    ['no declined suggestion on a Jam', () => onKeptDoodle, ['suggestionDeclined'], REMOVE],
    ['a declined suggestion that is no boolean', () => onKeptDoodle, ['suggestionDeclined'], 0],
    ['no Jam mark', () => noJam, ['isJam'], REMOVE],
    ['a Jam mark that is no boolean', () => noJam, ['isJam'], 'false'],
  ] as const)('reads a summary with %s as unreadable', (_, session, path, replacement) => {
    const stored = session()
    const summary = edited(stored.summary, path, replacement)

    expect(decodeKeptSession({ ...stored, summary })).toEqual({ reading: 'unreadable' })
  })
})

// @test-link [[module_kept_session_codec]]
describe("the encoder over a fresh Jam's moments out of order", () => {
  let records: readonly SessionHistoryRecord[]

  beforeAll(() => {
    records = jamSessionRecordsWithPlayedNotes()
  }, 60_000)

  /** Intent: encode the session as a fresh Jam with `fresh`'s moments, its notes kept or not. */
  function encodeFresh(fresh: KeptJamFacts['fresh'], facts: KeptSessionFacts): unknown {
    const jam = { ...FRESH, fresh }
    return encodeKeptSession(historyOf(records, 'c-keyboard'), { ...facts, jam }, APP_VERSION)
  }

  // @test-link [[module_kept_session_codec]]
  it.each([
    ['a first barline before the count-in', { ...freshJam(), doodleFirstBarlineAt: 0.125 }],
    ['phrase 1 starting at the first barline', { ...freshJam(), doodleFirstBarlineAt: 7.25 }],
    ['phrase 1 starting before the first barline', { ...freshJam(), doodleFirstBarlineAt: 8 }],
    ['a raw note before the count-in', freshJam([{ ...RAW_DOODLE_NOTES[0]!, onsetAt: 0.125 }])],
    ['a raw note at phrase 1', freshJam([{ ...RAW_DOODLE_NOTES[0]!, onsetAt: 7.25 }])],
  ])('throws on %s, played notes kept or not', (_, fresh) => {
    expect(() => encodeFresh(fresh, KEPT_NOTES)).toThrow(Error)
    expect(() => encodeFresh(fresh, NOTES_NOT_KEPT)).toThrow(Error)
    expect(() => encodeKeptPlayedNotes({ phrases: () => records }, APP_VERSION, fresh)).toThrow(
      Error,
    )
  })
})
