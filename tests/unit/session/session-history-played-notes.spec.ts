/**
 * The played notes and acknowledgements in the session history: each phrase record holds the
 * acknowledgements of its expected notes and the played notes whose onsets fall inside it, however
 * the notes, acknowledgements and engine outputs interleave. Notes played before phrase 1 starts
 * (the starting note, the count-in) belong to no phrase. Driven by real engine outputs.
 */

import { describe, expect, it } from 'vitest'

import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  SessionHistoryError,
  createSessionHistory,
  type RecordedPlayedNote,
  type SessionHistory,
} from '@/session/session-history'
import type { SessionOutput } from '@/session/session-types'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from './session-harness'

/**
 * Intent: a 240 BPM session (a 1 s measure) started at 0 whose phrases 1, 2 and 3 start sounding
 * at 1, 5 and 9, then Stop at 10.
 */
function threePhraseDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240 })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.accept(0.5)
  driver.countInOver(1)
  driver.sounding(5, 2)
  driver.accept(5.5)
  driver.sounding(9, 3)
  driver.end(10)
  return driver
}

/** Intent: the driver's outputs split into the phrase-sounding ones, in order, and its end. */
function outputsOf(driver: SessionDriver): {
  readonly sounding: readonly SessionOutput[]
  readonly ended: SessionOutput
} {
  return {
    sounding: driver.all('phrase-sounding'),
    ended: driver.all('ended')[0]!,
  }
}

/** Intent: a history for the driver's session fed every output but its end. */
function openHistory(driver: SessionDriver): SessionHistory {
  const history = createSessionHistory(driver.settings, fixedWallClock, DEFAULT_SESSION_SEED)
  for (const output of outputsOf(driver).sounding) history.record(output)
  return history
}

/** Intent: a played note at middle C (or the given pitch) with velocity 80 over the given span. */
function played(onsetAt: number, releaseAt: number, pitch = 60, velocity = 80): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity, onsetAt, releaseAt }
}

/** Intent: the identity of an expected note of the given phrase, measure 0. */
function expected(phraseNumber: number, eventIndex: number): ExpectedNoteIdentity {
  return { phraseNumber, measureIndex: 0, eventIndex }
}

/** A copy of a record type whose fields the test may overwrite after handing it in. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

/** Intent: the onsets of each recorded phrase's played notes, phrase by phrase. */
function onsetsByPhrase(history: SessionHistory): number[][] {
  return history.phrases().map((record) => record.playedNotes.map((note) => note.onsetAt))
}

// @test-link [[rule_session_history_records_played_notes]]
describe('played notes in the session history', () => {
  // @test-link [[rule_session_history_records_played_notes]]
  it('puts each note in the phrase its onset falls in, a phrase start belonging to that phrase', () => {
    const history = openHistory(threePhraseDriver())
    for (const onset of [1, 4.999, 5, 8.9, 9]) history.recordPlayedNote(played(onset, onset + 0.5))

    expect(onsetsByPhrase(history)).toEqual([[1, 4.999], [5, 8.9], [9]])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('keeps the pitch, velocity, onset and release of each note', () => {
    const history = openHistory(threePhraseDriver())
    history.recordPlayedNote(played(5.25, 6.5, 67, 101))

    expect(history.phrases()[1]!.playedNotes).toEqual([played(5.25, 6.5, 67, 101)])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('gives the last recorded phrase every onset from its start on', () => {
    const history = openHistory(threePhraseDriver())
    history.recordPlayedNote(played(9.5, 10))
    history.recordPlayedNote(played(50, 51))

    expect(onsetsByPhrase(history)).toEqual([[], [], [9.5, 50]])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('orders notes by onset, not by their release order, ties in arrival order', () => {
    const history = openHistory(threePhraseDriver())
    history.recordPlayedNote(played(1.5, 1.75, 62))
    history.recordPlayedNote(played(1.25, 3, 60))
    history.recordPlayedNote(played(1.5, 3.5, 64))

    expect(history.phrases()[0]!.playedNotes.map((note) => note.pitch)).toEqual([60, 62, 64])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('moves a note to the phrase that holds it once that phrase is recorded', () => {
    const { sounding, ended } = outputsOf(threePhraseDriver())
    const history = createSessionHistory(
      sessionSettings({ tempo: 240 }),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
    )
    history.record(sounding[0]!)
    history.recordPlayedNote(played(5.5, 6))
    expect(onsetsByPhrase(history)).toEqual([[5.5]])

    history.record(sounding[1]!)
    history.record(sounding[2]!)
    history.record(ended)

    expect(onsetsByPhrase(history)).toEqual([[], [5.5], []])
  })
})

// @test-link [[rule_starting_note_only_starts_count_in]]
// @test-link [[rule_session_history_records_played_notes]]
describe('notes played before phrase 1 starts', () => {
  // @test-link [[rule_starting_note_only_starts_count_in]]
  it('puts the starting note and the count-in notes in no phrase', () => {
    const history = openHistory(threePhraseDriver())
    history.recordPlayedNote(played(0, 0.3))
    history.recordPlayedNote(played(0.9, 1.4))

    expect(onsetsByPhrase(history)).toEqual([[], [], []])
  })

  // @test-link [[rule_starting_note_only_starts_count_in]]
  it('keeps a note recorded before any phrase out of every phrase recorded later', () => {
    const { sounding, ended } = outputsOf(threePhraseDriver())
    const history = createSessionHistory(
      sessionSettings({ tempo: 240 }),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
    )
    history.recordPlayedNote(played(0.2, 0.6))
    expect(history.phrases()).toEqual([])

    for (const output of [...sounding, ended]) history.record(output)

    expect(onsetsByPhrase(history)).toEqual([[], [], []])
  })
})

// @test-link [[rule_session_history_records_played_notes]]
describe('acknowledgements in the session history', () => {
  // @test-link [[rule_session_history_records_played_notes]]
  it("puts each acknowledgement in its phrase's record, in arrival order", () => {
    const history = openHistory(threePhraseDriver())
    history.recordAcknowledgement(expected(2, 3))
    history.recordAcknowledgement(expected(1, 0))
    history.recordAcknowledgement(expected(2, 1))

    expect(history.phrases().map((record) => record.acknowledgements)).toEqual([
      [expected(1, 0)],
      [expected(2, 3), expected(2, 1)],
      [],
    ])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('shows an acknowledgement recorded before its phrase record once that record exists', () => {
    const { sounding } = outputsOf(threePhraseDriver())
    const history = createSessionHistory(
      sessionSettings({ tempo: 240 }),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
    )
    history.record(sounding[0]!)
    history.recordAcknowledgement(expected(2, 0))
    expect(history.phrases()[0]!.acknowledgements).toEqual([])

    history.record(sounding[1]!)

    expect(history.phrases()[1]!.acknowledgements).toEqual([expected(2, 0)])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('drops an acknowledgement of a phrase that never sounded', () => {
    const { sounding, ended } = outputsOf(threePhraseDriver())
    const history = createSessionHistory(
      sessionSettings({ tempo: 240 }),
      fixedWallClock,
      DEFAULT_SESSION_SEED,
    )
    for (const output of sounding) history.record(output)
    history.recordAcknowledgement(expected(4, 0))
    history.record(ended)

    expect(history.phrases().flatMap((record) => record.acknowledgements)).toEqual([])
  })
})

// @test-link [[rule_session_history_records_played_notes]]
describe('notes and acknowledgements the history refuses', () => {
  // @test-link [[rule_session_history_records_played_notes]]
  it('throws on the same acknowledgement twice', () => {
    const history = openHistory(threePhraseDriver())
    history.recordAcknowledgement(expected(1, 2))
    expect(() => history.recordAcknowledgement(expected(1, 2))).toThrow(SessionHistoryError)
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('throws on a note or an acknowledgement after the end', () => {
    const history = openHistory(threePhraseDriver())
    history.record(outputsOf(threePhraseDriver()).ended)

    expect(() => history.recordPlayedNote(played(9.5, 10))).toThrow(SessionHistoryError)
    expect(() => history.recordAcknowledgement(expected(3, 0))).toThrow(SessionHistoryError)
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it.each([
    ['a release before its onset', played(5, 4.9)],
    ['a non-finite onset', played(Number.NaN, 5)],
    ['a non-finite release', played(5, Number.POSITIVE_INFINITY)],
    ['a zero velocity', played(5, 6, 60, 0)],
    ['a velocity above 127', played(5, 6, 60, 128)],
    ['a fractional velocity', played(5, 6, 60, 80.5)],
  ])('throws on %s', (_label, note) => {
    const history = openHistory(threePhraseDriver())
    expect(() => history.recordPlayedNote(note)).toThrow(SessionHistoryError)
    expect(onsetsByPhrase(history)).toEqual([[], [], []])
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it.each([
    ['phrase 0', { phraseNumber: 0, measureIndex: 0, eventIndex: 0 }],
    ['a negative event index', { phraseNumber: 1, measureIndex: 0, eventIndex: -1 }],
  ] as const)('throws on an acknowledgement of %s', (_label, identity) => {
    const history = openHistory(threePhraseDriver())
    expect(() => history.recordAcknowledgement(identity)).toThrow(SessionHistoryError)
  })

  // @test-link [[rule_session_history_records_played_notes]]
  it('allows a note that releases at its onset', () => {
    const history = openHistory(threePhraseDriver())
    history.recordPlayedNote(played(5, 5))
    expect(onsetsByPhrase(history)).toEqual([[], [5], []])
  })
})

// @test-link [[rule_session_history_records_played_notes]]
// @test-link [[service_session_history]]
describe('the records holding played notes', () => {
  // @test-link [[rule_session_history_records_played_notes]]
  it('are deep-frozen and unaffected by later changes to the notes handed in', () => {
    const history = openHistory(threePhraseDriver())
    const note: Mutable<RecordedPlayedNote> = { ...played(5.5, 6) }
    const identity: Mutable<ExpectedNoteIdentity> = { ...expected(2, 0) }
    history.recordPlayedNote(note)
    history.recordAcknowledgement(identity)
    note.onsetAt = 9.5
    identity.eventIndex = 7

    const two = history.phrases()[1]!
    expect(Object.isFrozen(two)).toBe(true)
    expect(Object.isFrozen(two.playedNotes)).toBe(true)
    expect(Object.isFrozen(two.playedNotes[0])).toBe(true)
    expect(Object.isFrozen(two.acknowledgements)).toBe(true)
    expect(Object.isFrozen(two.acknowledgements[0])).toBe(true)
    expect(two.playedNotes[0]!.onsetAt).toBe(5.5)
    expect(two.acknowledgements[0]!.eventIndex).toBe(0)
  })

  // @test-link [[service_session_history]]
  it('are read back from a list rebuilt only after a new note or acknowledgement', () => {
    const history = openHistory(threePhraseDriver())
    const before = history.phrases()
    expect(history.phrases()).toBe(before)

    history.recordPlayedNote(played(1.5, 2))
    const afterNote = history.phrases()
    expect(afterNote).not.toBe(before)
    expect(history.phrases()).toBe(afterNote)

    history.recordAcknowledgement(expected(1, 0))
    expect(history.phrases()).not.toBe(afterNote)
    expect(history.phrases()[0]!.acknowledgements).toEqual([expected(1, 0)])
  })
})
