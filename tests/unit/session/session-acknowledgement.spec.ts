/**
 * The session's acknowledgement tracker: phrases added in order, windows placed over every expected
 * note known so far, each played note compensated for latency and matched once, and nothing ever
 * reported for a note that matches nothing.
 */

import { describe, expect, it } from 'vitest'

import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { LatencyCorrection } from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { MeasureIndex } from '@/domain/events/measure'
import {
  createSessionAcknowledgement,
  SessionAcknowledgementError,
  type SessionAcknowledgement,
} from '@/session/session-acknowledgement'
import { phraseFromBars } from '../domain/acknowledgement/acknowledgement-fixtures'

/** At 120 BPM a quarter note lasts 0.5 s and a phrase of four 4/4 measures 8 s. */
const TEMPO = 120
const QUARTERS = ['q q q q', 'q q q q', 'q q q q', 'q q q q'] as const
/** Phrase 1: sixteen quarters cycling C4 D4 E4 F4, first downbeat at 1 s; the last (F4) at 8.5 s. */
const PHRASE_ONE = phraseFromBars(QUARTERS, [60, 62, 64, 65])
const PHRASE_ONE_AT = 1
/** Phrase 2: sixteen quarters cycling G4 A4, first downbeat at 9 s, right after phrase 1. */
const PHRASE_TWO = phraseFromBars(QUARTERS, [67, 69])
const PHRASE_TWO_AT = 9
const NO_CORRECTION: LatencyCorrection = { outputLatencySeconds: 0, connectionLatencySeconds: 0 }
/** A non-zero correction: 50 ms output latency plus 12.5 ms connection delay, 62.5 ms in all. */
const CORRECTION: LatencyCorrection = {
  outputLatencySeconds: 0.05,
  connectionLatencySeconds: 0.0125,
}

/** Intent: shorthand for an identity. */
function id(phraseNumber: number, measureIndex: number, eventIndex: number): ExpectedNoteIdentity {
  return { phraseNumber, measureIndex: measureIndex as MeasureIndex, eventIndex }
}

/** Intent: a tracker with phrase 1 added, and phrase 2 too when asked. */
function tracker(
  correction: LatencyCorrection = NO_CORRECTION,
  withPhraseTwo = false,
): SessionAcknowledgement {
  const acknowledgement = createSessionAcknowledgement({ tempo: TEMPO, correction })
  acknowledgement.addPhrase(1, PHRASE_ONE, PHRASE_ONE_AT)
  if (withPhraseTwo) acknowledgement.addPhrase(2, PHRASE_TWO, PHRASE_TWO_AT)
  return acknowledgement
}

/** Intent: play a pitch at an audio-clock time. */
function play(
  acknowledgement: SessionAcknowledgement,
  pitch: number,
  audioClockSeconds: number,
): readonly ExpectedNoteIdentity[] {
  return acknowledgement.notePlayed({ pitch: makeConcertPitch(pitch), audioClockSeconds })
}

// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
// @test-link [[rule_expected_note_window]]
describe('session acknowledgement: matching', () => {
  // @test-link [[rule_acknowledgement_highlights_expected_note_only]]
  it('acknowledges an expected note played on time', () => {
    const acknowledgement = tracker()
    const result = play(acknowledgement, 60, 1)
    expect(result).toEqual([id(1, 0, 0)])
    expect(Object.isFrozen(result)).toBe(true)
  })

  // @test-link [[rule_expected_note_window]]
  it('acknowledges notes played early or late inside their window', () => {
    const acknowledgement = tracker()
    expect(play(acknowledgement, 62, 1.5 - 0.14)).toEqual([id(1, 0, 1)])
    expect(play(acknowledgement, 64, 2 + 0.34)).toEqual([id(1, 0, 2)])
    expect(acknowledgement.acknowledged()).toEqual([id(1, 0, 1), id(1, 0, 2)])
    expect(Object.isFrozen(acknowledgement.acknowledged())).toBe(true)
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('returns nothing for a wrong pitch, an octave off, or a note outside every window', () => {
    const acknowledgement = tracker()
    expect(play(acknowledgement, 61, 1)).toEqual([])
    expect(play(acknowledgement, 72, 1)).toEqual([])
    expect(play(acknowledgement, 60, 0.84)).toEqual([])
    expect(play(acknowledgement, 60, 1.36)).toEqual([])
    expect(acknowledgement.acknowledged()).toEqual([])
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('returns nothing for a second play of a note already acknowledged', () => {
    const acknowledgement = tracker()
    expect(play(acknowledgement, 60, 1)).toEqual([id(1, 0, 0)])
    expect(play(acknowledgement, 60, 1.05)).toEqual([])
    expect(acknowledgement.acknowledged()).toEqual([id(1, 0, 0)])
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('returns nothing before any phrase is added', () => {
    const acknowledgement = createSessionAcknowledgement({
      tempo: TEMPO,
      correction: NO_CORRECTION,
    })
    expect(play(acknowledgement, 60, 1)).toEqual([])
  })
})

// @test-link [[rule_expected_note_window]]
describe('session acknowledgement: windows over the session sequence', () => {
  // @test-link [[rule_expected_note_window]]
  it('matches nothing in phrase 2 until phrase 2 is added', () => {
    const acknowledgement = tracker()
    expect(play(acknowledgement, 67, 9)).toEqual([])
    acknowledgement.addPhrase(2, PHRASE_TWO, PHRASE_TWO_AT)
    expect(play(acknowledgement, 67, 9.01)).toEqual([id(2, 0, 0)])
  })

  // @test-link [[rule_expected_note_window]]
  it("bounds phrase 1's last note by phrase 2's first once phrase 2 is added", () => {
    // Phrase 1's last F4 sounds from 8.5 s to 9 s; alone, its window runs to 9 s. Phrase 2 starts
    // at 9 s, so the shared boundary is 8.85 s.
    expect(play(tracker(), 65, 8.9)).toEqual([id(1, 3, 3)])
    expect(play(tracker(NO_CORRECTION, true), 65, 8.9)).toEqual([])
    expect(play(tracker(NO_CORRECTION, true), 65, 8.85)).toEqual([id(1, 3, 3)])
  })

  // @test-link [[rule_expected_note_window]]
  it('keeps every acknowledgement when the windows are placed again', () => {
    const acknowledgement = tracker()
    play(acknowledgement, 60, 1)
    acknowledgement.addPhrase(2, PHRASE_TWO, PHRASE_TWO_AT)
    expect(acknowledgement.acknowledged()).toEqual([id(1, 0, 0)])
    expect(play(acknowledgement, 60, 1)).toEqual([])
  })

  // @test-link [[rule_expected_note_window]]
  it('throws on a phrase out of order, and keeps its state', () => {
    const fresh = createSessionAcknowledgement({ tempo: TEMPO, correction: NO_CORRECTION })
    expect(() => fresh.addPhrase(2, PHRASE_TWO, PHRASE_TWO_AT)).toThrow(SessionAcknowledgementError)
    const acknowledgement = tracker()
    expect(() => acknowledgement.addPhrase(1, PHRASE_ONE, PHRASE_ONE_AT)).toThrow(
      SessionAcknowledgementError,
    )
    expect(() => acknowledgement.addPhrase(3, PHRASE_TWO, PHRASE_TWO_AT)).toThrow(
      SessionAcknowledgementError,
    )
    expect(() => acknowledgement.addPhrase(2, PHRASE_TWO, 8)).toThrow()
    acknowledgement.addPhrase(2, PHRASE_TWO, PHRASE_TWO_AT)
    expect(play(acknowledgement, 67, 9)).toEqual([id(2, 0, 0)])
  })
})

/** Whole notes C4 D4 E4 F4 from 1 s: onsets 1, 3, 5 and 7 s; C4's window is [0.85, 2.85] s. */
const WHOLES = phraseFromBars(['w', 'w', 'w', 'w'], [60, 62, 64, 65])

/** Intent: a tracker holding the whole-note phrase as phrase 1. */
function wholesTracker(): SessionAcknowledgement {
  const acknowledgement = createSessionAcknowledgement({ tempo: TEMPO, correction: NO_CORRECTION })
  acknowledgement.addPhrase(1, WHOLES, PHRASE_ONE_AT)
  return acknowledgement
}

// @test-link [[rule_controller_loss_mid_session]]
describe('session acknowledgement: notes due while the controller was away', () => {
  // @test-link [[rule_controller_loss_mid_session]]
  it('never acknowledges a note whose onset fell in a passed range, even in its open window', () => {
    const acknowledgement = wholesTracker()
    acknowledgement.passDueBetween(0.9, 1.5)
    expect(play(acknowledgement, 60, 2)).toEqual([])
    expect(acknowledgement.acknowledged()).toEqual([])
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('still acknowledges a note whose onset comes after the passed range', () => {
    const acknowledgement = wholesTracker()
    acknowledgement.passDueBetween(0.9, 1.5)
    expect(play(acknowledgement, 62, 3)).toEqual([id(1, 1, 0)])
    expect(acknowledgement.acknowledged()).toEqual([id(1, 1, 0)])
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('keeps a note acknowledged before the range, and includes both ends of the range', () => {
    const acknowledgement = wholesTracker()
    expect(play(acknowledgement, 60, 1)).toEqual([id(1, 0, 0)])
    acknowledgement.passDueBetween(1, 3)
    expect(play(acknowledgement, 62, 3.1)).toEqual([])
    expect(acknowledgement.acknowledged()).toEqual([id(1, 0, 0)])
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('rejects a range that is not finite or runs backwards', () => {
    const acknowledgement = wholesTracker()
    expect(() => acknowledgement.passDueBetween(2, 1)).toThrow(SessionAcknowledgementError)
    expect(() => acknowledgement.passDueBetween(Number.NaN, 1)).toThrow(SessionAcknowledgementError)
    expect(() => acknowledgement.passDueBetween(1, Infinity)).toThrow(SessionAcknowledgementError)
    expect(play(acknowledgement, 60, 1)).toEqual([id(1, 0, 0)])
  })
})

// @test-link [[rule_played_onset_latency_compensation]]
describe('session acknowledgement: latency compensation', () => {
  // @test-link [[rule_played_onset_latency_compensation]]
  it('matches the compensated onset, not the audio-clock time', () => {
    // C4's window is [0.85, 1.35] s.
    expect(play(tracker(NO_CORRECTION), 60, 1.4)).toEqual([])
    expect(play(tracker(CORRECTION), 60, 1.4)).toEqual([id(1, 0, 0)])
    expect(play(tracker(NO_CORRECTION), 60, 0.86)).toEqual([id(1, 0, 0)])
    expect(play(tracker(CORRECTION), 60, 0.86)).toEqual([])
  })

  // @test-link [[rule_played_onset_latency_compensation]]
  it('shifts a finished note’s onset and release by the same total correction', () => {
    const recorded = tracker(CORRECTION).compensatedRecord({
      pitch: makeConcertPitch(60),
      velocity: 90,
      onsetAt: 1.4,
      releaseAt: 1.9,
    })
    expect(recorded.pitch).toBe(60)
    expect(recorded.velocity).toBe(90)
    expect(recorded.onsetAt).toBeCloseTo(1.3375, 12)
    expect(recorded.releaseAt).toBeCloseTo(1.8375, 12)
    expect(Object.isFrozen(recorded)).toBe(true)
  })

  // @test-link [[rule_played_onset_latency_compensation]]
  it('rejects a finished note released before its onset or at a non-finite time', () => {
    const acknowledgement = tracker(CORRECTION)
    const pitch = makeConcertPitch(60)
    expect(() =>
      acknowledgement.compensatedRecord({ pitch, velocity: 90, onsetAt: 2, releaseAt: 1 }),
    ).toThrow(SessionAcknowledgementError)
    expect(() =>
      acknowledgement.compensatedRecord({ pitch, velocity: 90, onsetAt: 1, releaseAt: Infinity }),
    ).toThrow(SessionAcknowledgementError)
  })

  // @test-link [[rule_played_onset_latency_compensation]]
  it('rejects a tempo or a correction no session can use', () => {
    expect(() => createSessionAcknowledgement({ tempo: 0, correction: NO_CORRECTION })).toThrow(
      SessionAcknowledgementError,
    )
    expect(() =>
      createSessionAcknowledgement({
        tempo: TEMPO,
        correction: { outputLatencySeconds: -0.01, connectionLatencySeconds: 0 },
      }),
    ).toThrow(SessionAcknowledgementError)
  })
})
