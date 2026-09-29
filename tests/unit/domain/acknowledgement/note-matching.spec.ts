import { describe, expect, it } from 'vitest'

import {
  placeAcknowledgementWindows,
  type WindowedExpectedNote,
} from '@/domain/acknowledgement/acknowledgement-window'
import { deriveExpectedNotes } from '@/domain/acknowledgement/expected-note'
import {
  acknowledgePlayedNote,
  acknowledgePlayedNotes,
} from '@/domain/acknowledgement/note-matching'
import {
  compensatePlayedNote,
  latencyCorrectionFor,
  type PlayedNote,
} from '@/domain/acknowledgement/played-onset-latency'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { phraseFromBars } from './acknowledgement-fixtures'

/** Intent: a played note over USB at a concert pitch and an audio-clock time. */
function play(pitch: number, audioClockSeconds: number): PlayedNote {
  return compensatePlayedNote(
    { pitch: makeConcertPitch(pitch), audioClockSeconds },
    latencyCorrectionFor('usb'),
  )
}

/** Intent: windowed expected notes of one phrase at a tempo, starting at 0 s. */
function windowed(
  bars: readonly [string, string, string, string],
  pitches: readonly number[],
  tempoBpm: number,
): readonly WindowedExpectedNote[] {
  return placeAcknowledgementWindows(
    deriveExpectedNotes(phraseFromBars(bars, pitches), {
      phraseNumber: 1,
      startSeconds: 0,
      tempoBpm,
    }),
  )
}

const SIXTEENTH_BAR = Array.from({ length: 16 }, () => 's').join(' ')
const identity = (measureIndex: 0 | 1 | 2 | 3, eventIndex: number) => ({
  phraseNumber: 1,
  measureIndex,
  eventIndex,
})

// @test-link [[rule_acknowledgement_exact_pitch]]
describe('note matching', () => {
  it('acknowledges the exact concert pitch played inside the window', () => {
    const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 62, 64, 65, 67, 69, 71], 120)

    expect(acknowledgePlayedNotes(expected, [play(62, 0.5 + 0.19)])).toEqual([identity(0, 1)])
  })

  it('never acknowledges the right note in the wrong octave', () => {
    const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 62, 64, 65, 67, 69, 71], 120)

    expect(acknowledgePlayedNotes(expected, [play(72, 0), play(48, 0), play(74, 0.5)])).toEqual([])
  })

  it('never acknowledges a note a semitone off', () => {
    const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 62, 64, 65, 67, 69, 71], 120)

    expect(acknowledgePlayedNotes(expected, [play(61, 0), play(59, 0)])).toEqual([])
  })

  it('never acknowledges a note played outside every window', () => {
    const expected = windowed(['q r:h.', 'w', 'w', 'w'], [60, 62, 64, 65], 120)

    expect(acknowledgePlayedNotes(expected, [play(60, -0.2), play(60, 0.55)])).toEqual([])
  })

  it('acknowledges each expected note at most once', () => {
    const expected = windowed(['q r:h.', 'w', 'w', 'w'], [60, 62, 64, 65], 120)

    expect(acknowledgePlayedNotes(expected, [play(60, 0), play(60, 0.05), play(60, 0.1)])).toEqual([
      identity(0, 0),
    ])
  })

  it('lets a wrong note pass without using up the expected note', () => {
    const expected = windowed(['q r:h.', 'w', 'w', 'w'], [60, 62, 64, 65], 120)

    expect(acknowledgePlayedNotes(expected, [play(61, 0), play(60, 0.08)])).toEqual([
      identity(0, 0),
    ])
  })

  it('on a keyboard chord, acknowledges only the expected note and records nothing else', () => {
    const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 62, 64, 65, 67, 69, 71], 120)

    const acknowledged = acknowledgePlayedNotes(expected, [
      play(55, 0.5),
      play(59, 0.5),
      play(62, 0.5),
      play(65, 0.5),
    ])

    expect(acknowledged).toEqual([identity(0, 1)])
  })

  it('acknowledges every sixteenth played on time at 120 BPM, none as the next note', () => {
    const pitches = Array.from({ length: 16 }, (_, index) => 60 + index)
    const expected = windowed([SIXTEENTH_BAR, 'w', 'w', 'w'], [...pitches, 40, 41, 42], 120)
    const played = pitches.map((pitch, index) => play(pitch, index * 0.125))

    expect(acknowledgePlayedNotes(expected, played)).toEqual(
      pitches.map((_, index) => identity(0, index)),
    )
  })

  it('acknowledges every eighth played on time at 240 BPM', () => {
    const pitches = [60, 62, 64, 65, 67, 69, 71, 72]
    const expected = windowed(['e e e e e e e e', 'w', 'w', 'w'], [...pitches, 40, 41, 42], 240)
    const played = pitches.map((pitch, index) => play(pitch, index * 0.125))

    expect(acknowledgePlayedNotes(expected, played)).toEqual(
      pitches.map((_, index) => identity(0, index)),
    )
  })

  describe('a played note exactly on a shared boundary', () => {
    // Quarters at 240 BPM: onsets 250 ms apart, so the boundary is halfway, at 125 ms.
    it('goes to the earlier note when both notes have its pitch', () => {
      const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 60, 62, 64, 65, 67, 69], 240)
      const boundary = expected[0]!.window.closesAtSeconds

      expect(boundary).toBe(expected[1]!.window.opensAtSeconds)
      expect(acknowledgePlayedNotes(expected, [play(60, boundary)])).toEqual([identity(0, 0)])
    })

    it('goes to the later note when the earlier one is already acknowledged', () => {
      const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 60, 62, 64, 65, 67, 69], 240)
      const boundary = expected[0]!.window.closesAtSeconds

      expect(acknowledgePlayedNotes(expected, [play(60, 0), play(60, boundary)])).toEqual([
        identity(0, 0),
        identity(0, 1),
      ])
    })

    it('goes to the later note when only the later note has its pitch', () => {
      const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 62, 64, 65, 67, 69, 71], 240)
      const boundary = expected[0]!.window.closesAtSeconds

      expect(acknowledgePlayedNotes(expected, [play(62, boundary)])).toEqual([identity(0, 1)])
    })
  })

  it('matches one played note at a time against what is already acknowledged', () => {
    const expected = windowed(['q q q q', 'w', 'w', 'w'], [60, 60, 62, 64, 65, 67, 69], 240)
    const boundary = expected[0]!.window.closesAtSeconds

    expect(acknowledgePlayedNote(expected, [], play(60, boundary))).toEqual([identity(0, 0)])
    expect(acknowledgePlayedNote(expected, [identity(0, 0)], play(60, boundary))).toEqual([
      identity(0, 1),
    ])
    expect(
      acknowledgePlayedNote(expected, [identity(0, 0), identity(0, 1)], play(60, boundary)),
    ).toEqual([])
  })

  it('acknowledges across a phrase join by the phrase number of each note', () => {
    const first = deriveExpectedNotes(phraseFromBars(['w', 'w', 'w', 'w'], [60]), {
      phraseNumber: 4,
      startSeconds: 0,
      tempoBpm: 240,
    })
    const second = deriveExpectedNotes(phraseFromBars(['w', 'w', 'w', 'w'], [62]), {
      phraseNumber: 5,
      startSeconds: 4,
      tempoBpm: 240,
    })
    const expected = placeAcknowledgementWindows([...first, ...second])

    expect(acknowledgePlayedNotes(expected, [play(60, 3), play(62, 4)])).toEqual([
      { phraseNumber: 4, measureIndex: 3, eventIndex: 0 },
      { phraseNumber: 5, measureIndex: 0, eventIndex: 0 },
    ])
  })
})
