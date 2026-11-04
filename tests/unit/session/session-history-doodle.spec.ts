/**
 * A fresh Jam's doodle in the session history: the quantized doodle with its capture tempo and
 * barlines, and its raw notes kept as played notes marked as the doodle's, in no phrase. The
 * notes before phrase 1 that are not the doodle's (the count-in's, those after the doodle's end)
 * stay in nothing. Driven by real engine outputs of a session started with phrase 1, whose records
 * the doodle never touches.
 */

import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  SessionHistoryError,
  createSessionHistory,
  type RecordedDoodle,
  type RecordedPlayedNote,
  type SessionHistory,
} from '@/session/session-history'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  fixedWallClock,
  phraseOneFor,
  sessionSettings,
} from './session-harness'

/** Intent: a 240 BPM session started at 0 whose phrase 1 starts sounding at 9, then Stop at 12. */
function onePhraseDriver(): SessionDriver {
  const settings = sessionSettings({ tempo: 240 })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.countInOver(9)
  driver.end(12)
  return driver
}

/** Intent: an empty history for the driver's session. */
function historyOf(driver: SessionDriver): SessionHistory {
  return createSessionHistory(driver.settings, fixedWallClock, DEFAULT_SESSION_SEED, 'treble')
}

/** Intent: a played note at the given pitch, velocity 80, over the given span. */
function played(onsetAt: number, releaseAt: number, pitch = 60): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity: 80, onsetAt, releaseAt }
}

/** A one-measure doodle of two notes, captured at 240 BPM between the barlines at 1 and 2. */
const DOODLE: RecordedDoodle = {
  doodle: makeQuantizedDoodle({
    measureCount: 1,
    notes: [
      { startTick: 0, lengthTicks: 4, pitch: 60 },
      { startTick: 8, lengthTicks: 8, pitch: 62 },
    ],
  }),
  captureTempo: 240,
  firstBarlineAt: 1,
  endBarlineAt: 2,
  notes: [
    { pitch: makeConcertPitch(60), onsetAt: 1 },
    { pitch: makeConcertPitch(61), onsetAt: 1.3 },
    { pitch: makeConcertPitch(62), onsetAt: 1.5 },
  ],
}

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
// @test-link [[rule_session_history_records_played_notes]]
describe('a fresh Jam doodle in the session history', () => {
  it('holds no doodle until one is recorded', () => {
    expect(historyOf(onePhraseDriver()).doodle()).toBeNull()
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('keeps the quantized doodle with its capture tempo and barlines', () => {
    const history = historyOf(onePhraseDriver())
    history.recordDoodle(DOODLE)
    expect(history.doodle()).toEqual({
      doodle: DOODLE.doodle,
      captureTempo: 240,
      firstBarlineAt: 1,
      endBarlineAt: 2,
      playedNotes: [],
    })
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_notes_after_doodle_belong_nowhere]]
  it('marks the raw doodle notes, very short ones included, and no other note before phrase 1', () => {
    const driver = onePhraseDriver()
    const history = historyOf(driver)
    history.recordPlayedNote(played(0.5, 0.6, 55))
    history.recordPlayedNote(played(1, 1.2, 60))
    history.recordPlayedNote(played(1.3, 1.31, 61))
    history.recordDoodle(DOODLE)
    history.recordPlayedNote(played(1.5, 2.4, 62))
    history.recordPlayedNote(played(3, 3.5, 64))
    for (const output of driver.all('phrase-sounding')) history.record(output)
    history.recordPlayedNote(played(9.5, 9.7, 65))
    expect(history.doodle()?.playedNotes).toEqual([
      played(1, 1.2, 60),
      played(1.3, 1.31, 61),
      played(1.5, 2.4, 62),
    ])
    expect(history.phrases().map((record) => record.playedNotes)).toEqual([[played(9.5, 9.7, 65)]])
  })

  it('reads a doodle back deep-frozen, unaffected by later changes to what was handed in', () => {
    const history = historyOf(onePhraseDriver())
    const notes = [...DOODLE.notes]
    history.recordDoodle({ ...DOODLE, notes })
    history.recordPlayedNote(played(1, 1.2, 60))
    notes.length = 0
    const doodle = history.doodle()
    expect(doodle?.playedNotes).toEqual([played(1, 1.2, 60)])
    expect(Object.isFrozen(doodle)).toBe(true)
    expect(Object.isFrozen(doodle?.playedNotes)).toBe(true)
  })
})

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe('doodles the history refuses', () => {
  it('throws on a second doodle', () => {
    const history = historyOf(onePhraseDriver())
    history.recordDoodle(DOODLE)
    expect(() => history.recordDoodle(DOODLE)).toThrow(SessionHistoryError)
  })

  it('throws on a doodle after phrase 1 started sounding, or after the end', () => {
    const driver = onePhraseDriver()
    const sounding = historyOf(driver)
    for (const output of driver.all('phrase-sounding')) sounding.record(output)
    expect(() => sounding.recordDoodle(DOODLE)).toThrow(SessionHistoryError)
    const ended = historyOf(driver)
    ended.record({ kind: 'ended', at: 1, cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
    expect(() => ended.recordDoodle(DOODLE)).toThrow(SessionHistoryError)
  })

  it.each<[string, Partial<RecordedDoodle>]>([
    ['a capture tempo that is no whole positive BPM', { captureTempo: 120.5 }],
    ['an end barline not after the first', { endBarlineAt: 1 }],
    ['a barline that is not finite', { firstBarlineAt: Number.NaN }],
    [
      'a note over a tick before the first barline',
      { notes: [{ pitch: makeConcertPitch(60), onsetAt: 0.9 }] },
    ],
    ['a note at the end barline', { notes: [{ pitch: makeConcertPitch(60), onsetAt: 2 }] }],
  ])('throws on %s', (_, change) => {
    const history = historyOf(onePhraseDriver())
    expect(() => history.recordDoodle({ ...DOODLE, ...change })).toThrow(SessionHistoryError)
  })
})
