import { describe, expect, it } from 'vitest'

import {
  AcknowledgementWindowError,
  EARLY_GRACE_SECONDS,
  LATE_GRACE_SECONDS,
  placeAcknowledgementWindows,
  sharedBoundarySeconds,
} from '@/domain/acknowledgement/acknowledgement-window'
import { deriveExpectedNotes, type ExpectedNote } from '@/domain/acknowledgement/expected-note'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { phraseFromBars } from './acknowledgement-fixtures'

/** Intent: a bare expected note for window arithmetic: onset and sounding end in seconds. */
function note(eventIndex: number, onsetSeconds: number, soundingEndSeconds: number): ExpectedNote {
  return {
    identity: { phraseNumber: 1, measureIndex: 0, eventIndex },
    pitch: makeConcertPitch(60 + eventIndex),
    onsetSeconds,
    soundingEndSeconds,
  }
}

/** Intent: each window relative to its own onset, in milliseconds, rounded to 0.001 ms. */
function relativeWindowsMs(notes: readonly ExpectedNote[]) {
  return placeAcknowledgementWindows(notes).map((windowed) => [
    Math.round((windowed.window.opensAtSeconds - windowed.onsetSeconds) * 1e6) / 1e3,
    Math.round((windowed.window.closesAtSeconds - windowed.onsetSeconds) * 1e6) / 1e3,
  ])
}

const SIXTEENTH_BAR = Array.from({ length: 16 }, () => 's').join(' ')

// @test-link [[rule_expected_note_window]]
describe('acknowledgement windows', () => {
  it('use a 150 ms early grace and a 200 ms late grace', () => {
    expect(EARLY_GRACE_SECONDS).toBe(0.15)
    expect(LATE_GRACE_SECONDS).toBe(0.2)
  })

  it('give a short note followed by a rest, with the next onset 400 ms later, -150 ms to +200 ms', () => {
    // At 150 BPM a sixteenth sounds 100 ms and a sixteenth plus a dotted-eighth rest spans 400 ms.
    const timeline = phraseFromBars(['s r:e. s r:e. h', 'w', 'w', 'w'])
    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 150 })

    expect(notes[0]!.soundingEndSeconds).toBeCloseTo(0.1, 9)
    expect(notes[1]!.onsetSeconds).toBeCloseTo(0.4, 9)
    expect(relativeWindowsMs(notes)[0]).toEqual([-150, 200])
  })

  it('give a half note tied to a quarter at 120 BPM a window ending 150 ms before the next onset', () => {
    const timeline = phraseFromBars(['h ~:q q', 'w', 'w', 'w'])
    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 120 })
    const [tied] = placeAcknowledgementWindows(notes)

    expect(tied!.soundingEndSeconds).toBe(1.5)
    expect(tied!.window.opensAtSeconds).toBeCloseTo(-0.15, 9)
    expect(tied!.window.closesAtSeconds).toBeCloseTo(1.35, 9)
  })

  it('keep a long note open to the end of its sounding span when nothing follows soon', () => {
    // A half note at 60 BPM sounds 2 s, then a half rest; the next note starts 4 s after it.
    const timeline = phraseFromBars(['h r:h', 'w', 'w', 'w'])
    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 60 })

    expect(relativeWindowsMs(notes)[0]).toEqual([-150, 2000])
  })

  it('split the gap halfway between sixteenths at 120 BPM: -62.5 ms to +62.5 ms each', () => {
    const timeline = phraseFromBars([SIXTEENTH_BAR, 'w', 'w', 'w'])
    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 120 })

    const windows = relativeWindowsMs(notes.slice(0, 16))

    expect(windows[0]).toEqual([-150, 62.5])
    for (const window of windows.slice(1, 15)) expect(window).toEqual([-62.5, 62.5])
  })

  it('give eighths at 240 BPM the same windows as sixteenths at 120 BPM', () => {
    const timeline = phraseFromBars(['e e e e e e e e', 'w', 'w', 'w'])
    const notes = deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 240 })

    const windows = relativeWindowsMs(notes.slice(0, 8))

    for (const window of windows.slice(1, 7)) expect(window).toEqual([-62.5, 62.5])
  })

  it('touch: each window closes exactly where the next one opens when the notes are close', () => {
    const timeline = phraseFromBars(['q q q q', 'q q q q', 'w', 'w'])
    const windowed = placeAcknowledgementWindows(
      deriveExpectedNotes(timeline, { phraseNumber: 1, startSeconds: 0, tempoBpm: 240 }),
    )

    for (let index = 0; index + 1 < windowed.length; index += 1) {
      expect(windowed[index]!.window.closesAtSeconds).toBe(
        windowed[index + 1]!.window.opensAtSeconds,
      )
    }
  })

  it.each([0.01, 0.05, 0.1, 0.125, 0.15, 0.2, 0.299, 0.3, 0.35, 0.5, 1, 3])(
    'contain their own onset for notes %f s apart, opening 150 ms early from 300 ms apart',
    (spacing) => {
      const notes = [0, 1, 2, 3].map((index) =>
        note(index, 5 + index * spacing, 5 + index * spacing + spacing / 2),
      )

      const windowed = placeAcknowledgementWindows(notes)

      for (const each of windowed) {
        expect(each.window.opensAtSeconds).toBeLessThan(each.onsetSeconds)
        expect(each.window.closesAtSeconds).toBeGreaterThan(each.onsetSeconds)
      }
      if (spacing >= 0.3) {
        for (const each of windowed) {
          expect(each.window.opensAtSeconds).toBeCloseTo(each.onsetSeconds - 0.15, 9)
        }
      }
    },
  )

  it('bound the last note of a phrase by the next phrase’s first note, once it is known', () => {
    const first = deriveExpectedNotes(phraseFromBars(['w', 'w', 'w', 'q r:h.']), {
      phraseNumber: 1,
      startSeconds: 0,
      tempoBpm: 120,
    })
    const second = deriveExpectedNotes(phraseFromBars(['s s s s q h', 'w', 'w', 'w']), {
      phraseNumber: 2,
      startSeconds: 8,
      tempoBpm: 240,
    })
    // The last note of phrase 1 sits at 6 s; phrase 2 starts 2 s later, far enough apart.
    const alone = placeAcknowledgementWindows(first)
    const joined = placeAcknowledgementWindows([...first, ...second])

    expect(alone.at(-1)!.window.closesAtSeconds).toBeCloseTo(6.5, 9)
    expect(joined[3]!.window.closesAtSeconds).toBeCloseTo(6.5, 9)
    expect(joined[4]!.window.opensAtSeconds).toBeCloseTo(7.85, 9)
  })

  it('cut the last note of a phrase short when the next phrase starts right after it', () => {
    const first = deriveExpectedNotes(phraseFromBars(['w', 'w', 'w', 'h. q']), {
      phraseNumber: 1,
      startSeconds: 0,
      tempoBpm: 240,
    })
    const second = deriveExpectedNotes(phraseFromBars(['w', 'w', 'w', 'w']), {
      phraseNumber: 2,
      startSeconds: 4,
      tempoBpm: 240,
    })
    const alone = placeAcknowledgementWindows(first)
    const joined = placeAcknowledgementWindows([...first, ...second])

    // The last quarter at 240 BPM starts at 3.75 s and sounds 250 ms; phrase 2 starts at 4 s.
    expect(alone.at(-1)!.window.closesAtSeconds).toBeCloseTo(4, 9)
    expect(joined[4]!.window.closesAtSeconds).toBeCloseTo(3.875, 9)
    expect(joined[5]!.window.opensAtSeconds).toBeCloseTo(3.875, 9)
  })

  it('share a boundary at the later of 150 ms before the next onset and the halfway point', () => {
    expect(sharedBoundarySeconds(1, 1.5)).toBeCloseTo(1.35, 9)
    expect(sharedBoundarySeconds(1, 1.3)).toBeCloseTo(1.15, 9)
    expect(sharedBoundarySeconds(1, 1.2)).toBeCloseTo(1.1, 9)
    expect(sharedBoundarySeconds(1, 1.02)).toBeCloseTo(1.01, 9)
  })

  it('reject expected notes whose onsets do not strictly increase', () => {
    expect(() => placeAcknowledgementWindows([note(0, 1, 2), note(1, 1, 2)])).toThrow(
      AcknowledgementWindowError,
    )
    expect(() => placeAcknowledgementWindows([note(0, 2, 3), note(1, 1, 2)])).toThrow(
      AcknowledgementWindowError,
    )
  })
})
