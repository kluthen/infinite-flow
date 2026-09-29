import { describe, expect, it } from 'vitest'

import {
  deriveExpectedNotes,
  ExpectedNoteDerivationError,
} from '@/domain/acknowledgement/expected-note'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { phraseFromBars } from './acknowledgement-fixtures'

const AT_120 = { phraseNumber: 1, startSeconds: 0, tempoBpm: 120 } as const

// @test-link [[rule_expected_note_window]]
describe('deriveExpectedNotes', () => {
  it('makes one expected note per fresh attack, with its identity, pitch, onset and end', () => {
    const timeline = phraseFromBars(['q r:q h', 'w', 'w', 'w'], [60, 62, 64, 65, 67])

    const notes = deriveExpectedNotes(timeline, {
      phraseNumber: 3,
      startSeconds: 10,
      tempoBpm: 120,
    })

    expect(notes.map((note) => note.identity)).toEqual([
      { phraseNumber: 3, measureIndex: 0, eventIndex: 0 },
      { phraseNumber: 3, measureIndex: 0, eventIndex: 2 },
      { phraseNumber: 3, measureIndex: 1, eventIndex: 0 },
      { phraseNumber: 3, measureIndex: 2, eventIndex: 0 },
      { phraseNumber: 3, measureIndex: 3, eventIndex: 0 },
    ])
    expect(notes.map((note) => note.pitch)).toEqual([60, 62, 64, 65, 67])
    expect(notes.map((note) => note.onsetSeconds)).toEqual([10, 11, 12, 14, 16])
    expect(notes.map((note) => note.soundingEndSeconds)).toEqual([10.5, 12, 14, 16, 18])
  })

  it('gives a rest no expected note of its own', () => {
    const timeline = phraseFromBars(['r:w', 'q r:h.', 'r:h h', 'r:w'])

    const notes = deriveExpectedNotes(timeline, AT_120)

    expect(notes).toHaveLength(2)
    expect(notes.map((note) => note.onsetSeconds)).toEqual([2, 5])
  })

  it('lets a tie continuation lengthen its attack, even across a barline, without a note of its own', () => {
    const timeline = phraseFromBars(['h ~:q q', '~:w', '~:h h', 'w'], [60, 62, 64, 65])

    const notes = deriveExpectedNotes(timeline, AT_120)

    expect(notes.map((note) => note.identity)).toEqual([
      { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
      { phraseNumber: 1, measureIndex: 0, eventIndex: 2 },
      { phraseNumber: 1, measureIndex: 2, eventIndex: 1 },
      { phraseNumber: 1, measureIndex: 3, eventIndex: 0 },
    ])
    // The half note tied to a quarter sounds 1.5 s at 120 BPM; the quarter tied through bar 2
    // and into bar 3 sounds from 1.5 s to 5 s.
    expect(notes.map((note) => [note.onsetSeconds, note.soundingEndSeconds])).toEqual([
      [0, 1.5],
      [1.5, 5],
      [5, 6],
      [6, 8],
    ])
  })

  it('scales onsets with the tempo', () => {
    const timeline = phraseFromBars(['q q q q', 'w', 'w', 'w'])

    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 240 })

    expect(notes.slice(0, 4).map((note) => note.onsetSeconds)).toEqual([0, 0.25, 0.5, 0.75])
  })

  it('rejects a tie continuation that opens the phrase or follows a rest', () => {
    const quarter = makeRational(1, 4)
    const tiedAfterRest = makeMeasure(0, [
      makeRestEvent({ duration: quarter }),
      makeNoteEvent({ duration: quarter, pitch: makeConcertPitch(60), tieContinuation: true }),
      makeRestEvent({ duration: makeRational(1, 2) }),
    ])
    const rests = [1, 2, 3].map((index) =>
      makeMeasure(index, [makeRestEvent({ duration: makeRational(1, 1) })]),
    )

    expect(() =>
      deriveExpectedNotes(makeConcertEventTimeline([tiedAfterRest, ...rests]), AT_120),
    ).toThrow(ExpectedNoteDerivationError)
  })

  it('rejects a tie continuation at a different pitch from the note it continues', () => {
    const half = makeRational(1, 2)
    const badTie = makeMeasure(0, [
      makeNoteEvent({ duration: half, pitch: makeConcertPitch(60), tieContinuation: false }),
      makeNoteEvent({ duration: half, pitch: makeConcertPitch(61), tieContinuation: true }),
    ])
    const rests = [1, 2, 3].map((index) =>
      makeMeasure(index, [makeRestEvent({ duration: makeRational(1, 1) })]),
    )

    expect(() => deriveExpectedNotes(makeConcertEventTimeline([badTie, ...rests]), AT_120)).toThrow(
      ExpectedNoteDerivationError,
    )
  })

  it.each([
    { phraseNumber: 0, startSeconds: 0, tempoBpm: 120 },
    { phraseNumber: 1.5, startSeconds: 0, tempoBpm: 120 },
    { phraseNumber: 1, startSeconds: Number.NaN, tempoBpm: 120 },
    { phraseNumber: 1, startSeconds: 0, tempoBpm: 0 },
    { phraseNumber: 1, startSeconds: 0, tempoBpm: Number.POSITIVE_INFINITY },
  ])('rejects the placement %o', (placement) => {
    const timeline = phraseFromBars(['w', 'w', 'w', 'w'])

    expect(() => deriveExpectedNotes(timeline, placement)).toThrow(ExpectedNoteDerivationError)
  })
})
