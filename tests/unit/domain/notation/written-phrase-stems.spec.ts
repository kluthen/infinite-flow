import { describe, expect, it } from 'vitest'

import type { PitchClass } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure, type MeasureIndex } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { InstrumentTransposition } from '@/domain/profile/instrument-profile'
import { BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { CLEF_STAFF_LINES, staffStepsFromMiddleLine } from '@/domain/notation/pitch-spelling'
import { beamGroupStemDirection, noteStemDirection } from '@/domain/notation/stem-direction'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type {
  ConcertChordSymbol,
  NotationPhraseInput,
  WrittenNote,
} from '@/domain/notation/written-phrase-types'

const CONCERT: InstrumentTransposition = { chromatic: 0, diatonic: 0 }

/** Intent: one concert note event of `ticks` sixteenths at a MIDI pitch, never tied in. */
function note(pitch: number, ticks: number): MeasureEvent {
  return makeNoteEvent({
    duration: makeRational(ticks, 16),
    pitch: makeConcertPitch(pitch),
    tieContinuation: false,
  })
}

/** Intent: one concert rest event of `ticks` sixteenths. */
function rest(ticks: number): MeasureEvent {
  return makeRestEvent({ duration: makeRational(ticks, 16) })
}

/** Intent: a four-measure timeline whose measure 0 holds `events`, then three whole C4s. */
function firstMeasureTimeline(events: readonly MeasureEvent[]): ConcertEventTimeline {
  const wholeC4 = (index: MeasureIndex) => makeMeasure(index, [note(60, 16)])
  return makeConcertEventTimeline([makeMeasure(0, events), wholeC4(1), wholeC4(2), wholeC4(3)])
}

/** Intent: a root-position C chord symbol on every measure's downbeat. */
function tonicChordEachMeasure(): readonly ConcertChordSymbol[] {
  return ([0, 1, 2, 3] as const).map((measureIndex) => ({
    measureIndex,
    startTick: 0,
    root: 0,
    suffix: '',
    bass: null,
  }))
}

/** Intent: the stem direction of each glyph of measure 0, null for a rest. */
function firstMeasureStems(input: NotationPhraseInput): readonly (string | null)[] {
  return transformToWrittenPhrase(input).measures[0]!.events.map((event) =>
    event.kind === 'note' ? event.stemDirection : null,
  )
}

/** Intent: the first glyph of measure 0, which these tests always make a note. */
function firstNote(input: NotationPhraseInput): WrittenNote {
  return transformToWrittenPhrase(input).measures[0]!.events[0] as WrittenNote
}

/** Intent: the display-transform input for a timeline in a Major key, a C chord on every bar. */
function inputOf(
  timeline: ConcertEventTimeline,
  tonalCenter: PitchClass = 'C',
  transposition: InstrumentTransposition = CONCERT,
  clef: InstrumentClef = 'treble',
): NotationPhraseInput {
  return {
    timeline,
    tonalContext: { tonalCenter, collection: 'Major' },
    chords: tonicChordEachMeasure(),
    transposition,
    concertRange: { minMidi: 48, maxMidi: 84 },
    clef,
  }
}

// @test-link [[module_notation_stem_direction]]
describe('staffStepsFromMiddleLine', () => {
  it('counts diatonic steps from B4 in treble by letter and octave, ignoring the accidental', () => {
    expect(staffStepsFromMiddleLine({ letter: 'B', alter: 0, octave: 4 }, 'treble')).toBe(0)
    expect(staffStepsFromMiddleLine({ letter: 'C', alter: 0, octave: 5 }, 'treble')).toBe(1)
    expect(staffStepsFromMiddleLine({ letter: 'C', alter: 0, octave: 4 }, 'treble')).toBe(-6)
    expect(staffStepsFromMiddleLine({ letter: 'B', alter: 1, octave: 3 }, 'treble')).toBe(-7)
  })

  it('counts diatonic steps from D3 in bass, ignoring the accidental', () => {
    expect(staffStepsFromMiddleLine({ letter: 'D', alter: 0, octave: 3 }, 'bass')).toBe(0)
    expect(staffStepsFromMiddleLine({ letter: 'E', alter: 0, octave: 3 }, 'bass')).toBe(1)
    expect(staffStepsFromMiddleLine({ letter: 'C', alter: 0, octave: 3 }, 'bass')).toBe(-1)
    expect(staffStepsFromMiddleLine({ letter: 'D', alter: -1, octave: 3 }, 'bass')).toBe(0)
    expect(staffStepsFromMiddleLine({ letter: 'A', alter: 0, octave: 3 }, 'bass')).toBe(4)
  })
})

// @test-link [[module_notation_stem_direction]]
// @test-link [[module_notation_display_convention]]
describe('CLEF_STAFF_LINES', () => {
  it('holds each clef’s top and middle line as diatonic steps from C0', () => {
    // Treble: top line F5, middle line B4. Bass: top line A3, middle line D3.
    expect(CLEF_STAFF_LINES).toEqual({
      treble: { topLineStep: 38, middleLineStep: 34 },
      bass: { topLineStep: 26, middleLineStep: 22 },
    })
  })
})

// @test-link [[module_notation_stem_direction]]
describe('stem direction in bass clef', () => {
  it('stems a single note on or above D3 down and one below it up', () => {
    expect(noteStemDirection({ letter: 'D', alter: 0, octave: 3 }, 'bass')).toBe('down')
    expect(noteStemDirection({ letter: 'C', alter: 0, octave: 3 }, 'bass')).toBe('up')
    // The same D3 sits far below the treble middle line.
    expect(noteStemDirection({ letter: 'D', alter: 0, octave: 3 }, 'treble')).toBe('up')
  })

  it('stems written single notes from the bass middle line', () => {
    // Quarters (never beamed): D3, A3, C3, G2.
    const timeline = firstMeasureTimeline([note(50, 4), note(57, 4), note(48, 4), note(43, 4)])
    const stems = firstMeasureStems(inputOf(timeline, 'C', CONCERT, 'bass'))
    expect(stems).toEqual(['down', 'down', 'up', 'up'])
  })

  it('lets the beam group note farthest from D3 decide', () => {
    const above = { letter: 'A', alter: 0, octave: 3 } as const
    const below = { letter: 'G', alter: 0, octave: 2 } as const
    expect(beamGroupStemDirection([above, { letter: 'B', alter: 0, octave: 2 }], 'bass')).toBe(
      'down',
    )
    expect(beamGroupStemDirection([{ letter: 'E', alter: 0, octave: 3 }, below], 'bass')).toBe('up')
    const timeline = firstMeasureTimeline([
      // B3 (+5) faces B2, A2, G2 (-1, -2, -4): the farthest note is above.
      ...[59, 47, 45, 43].map((pitch) => note(pitch, 1)),
      // F2 (-5) faces E3, F3, G3 (+1, +2, +3): the farthest note is below.
      ...[52, 53, 55, 41].map((pitch) => note(pitch, 1)),
      note(48, 8),
    ])
    expect(firstMeasureStems(inputOf(timeline, 'C', CONCERT, 'bass'))).toEqual([
      ...['down', 'down', 'down', 'down'],
      ...['up', 'up', 'up', 'up'],
      'up',
    ])
    // In treble every one of those notes is below B4, so every group is stemmed up.
    expect(firstMeasureStems(inputOf(timeline))).toEqual(Array(9).fill('up'))
  })
})

// @test-link [[module_notation_stem_direction]]
describe('transformToWrittenPhrase: stem direction of a single note', () => {
  it('stems a note on or above the middle line (B4) down and a note below it up', () => {
    // Quarters (never beamed): B4, C6, A4, C4.
    const timeline = firstMeasureTimeline([note(71, 4), note(84, 4), note(69, 4), note(60, 4)])
    expect(firstMeasureStems(inputOf(timeline))).toEqual(['down', 'down', 'up', 'up'])
  })

  it('reads the staff position from the written letter and octave, not the MIDI number', () => {
    // MIDI 70 is written B-flat4 (on the middle line) in F major, but A-sharp4 (below it) in B major.
    const timeline = firstMeasureTimeline([note(70, 16)])
    const flatSide = firstNote(inputOf(timeline, 'F'))
    const sharpSide = firstNote(inputOf(timeline, 'B'))
    expect(flatSide.pitch).toEqual({ letter: 'B', alter: -1, octave: 4 })
    expect(flatSide.stemDirection).toBe('down')
    expect(sharpSide.pitch).toEqual({ letter: 'A', alter: 1, octave: 4 })
    expect(sharpSide.stemDirection).toBe('up')
  })

  it('decides from the written pitch after transposition (tenor: concert A3 is written B4)', () => {
    const timeline = firstMeasureTimeline([note(57, 16)])
    expect(firstNote(inputOf(timeline)).stemDirection).toBe('up')
    const tenor = firstNote(inputOf(timeline, 'C', BB_TENOR_PROFILE.transposition))
    expect(tenor.pitch).toEqual({ letter: 'B', alter: 0, octave: 4 })
    expect(tenor.stemDirection).toBe('down')
  })

  it('gives a rest no stem direction', () => {
    const timeline = firstMeasureTimeline([rest(8), note(60, 8)])
    const events = transformToWrittenPhrase(inputOf(timeline)).measures[0]!.events
    expect(events[0]!.kind).toBe('rest')
    expect('stemDirection' in events[0]!).toBe(false)
  })
})

// @test-link [[module_notation_stem_direction]]
describe('transformToWrittenPhrase: stem direction of a beam group', () => {
  it('lets the note farthest from the middle line decide, even against the sum of offsets', () => {
    const timeline = firstMeasureTimeline([
      // A5 (+6) faces G4, F4, E4 (-2, -3, -4): the offsets sum below, the farthest note is above.
      ...[81, 67, 65, 64].map((pitch) => note(pitch, 1)),
      // C4 (-6) faces D5, E5, F5 (+2, +3, +4): the offsets sum above, the farthest note is below.
      ...[74, 76, 77, 60].map((pitch) => note(pitch, 1)),
      note(60, 8),
    ])
    expect(transformToWrittenPhrase(inputOf(timeline)).measures[0]!.beamGroups).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
    ])
    expect(firstMeasureStems(inputOf(timeline))).toEqual([
      ...['down', 'down', 'down', 'down'],
      ...['up', 'up', 'up', 'up'],
      'up',
    ])
  })

  it('breaks an equally far tie by the side holding more of the group', () => {
    const timeline = firstMeasureTimeline([
      // G5 (+5) and D4 (-5) equally far; three notes below the middle line.
      ...[79, 62, 64, 65].map((pitch) => note(pitch, 1)),
      // G5 (+5) and D4 (-5) equally far; three notes above the middle line.
      ...[79, 77, 76, 62].map((pitch) => note(pitch, 1)),
      note(60, 8),
    ])
    expect(firstMeasureStems(inputOf(timeline))).toEqual([
      ...['up', 'up', 'up', 'up'],
      ...['down', 'down', 'down', 'down'],
      'up',
    ])
  })

  it('stems the group down when distance and count both tie, or every note is on the middle line', () => {
    const timeline = firstMeasureTimeline([
      // G5 (+5) and D4 (-5): one note on each side.
      note(79, 2),
      note(62, 2),
      // B4 and B4: both on the middle line.
      note(71, 2),
      note(71, 2),
      note(60, 8),
    ])
    expect(firstMeasureStems(inputOf(timeline))).toEqual(['down', 'down', 'down', 'down', 'up'])
  })

  it('leaves the concert input unchanged and returns deep-frozen stemmed notes', () => {
    const timeline = firstMeasureTimeline([
      ...[81, 67, 65, 64].map((pitch) => note(pitch, 1)),
      note(60, 12),
    ])
    const input = inputOf(timeline)
    const before = structuredClone({ timeline: input.timeline, chords: input.chords })
    const events = transformToWrittenPhrase(input).measures[0]!.events
    expect(structuredClone({ timeline: input.timeline, chords: input.chords })).toEqual(before)
    expect(events.every((event) => Object.isFrozen(event))).toBe(true)
    expect((events[0] as WrittenNote).stemDirection).toBe('down')
  })
})
