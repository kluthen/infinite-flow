/**
 * The lead facts: a phrase's sounding lead notes (ties folded into one note) with the chord at
 * each start, whether the note is one of that chord's tones as written (the seventh too) and
 * whether it lasts a beat; and the lead's rests, consecutive rest events joined across barlines.
 * Malformed ties and a start no harmony event holds are rejected.
 */

import { describe, expect, it } from 'vitest'

import { LeadFactsError, leadFacts, type LeadFacts } from '@/domain/backing/lead-facts'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { makeRational, type Rational } from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }

/** A hand-built harmony event; role, template and bar roles do not affect the facts. */
function event(
  barIndex: 0 | 1 | 2 | 3,
  startBeat: 0 | 2,
  durationBeats: number,
  triad: DiatonicTriad,
  seventh?: HarmonyEvent['seventh'],
): HarmonyEvent {
  const base = { barIndex, startBeat, durationBeats, triad, role: 'tonic' as const }
  return {
    ...base,
    ...(seventh === undefined ? {} : { seventh }),
    templateId: 'test',
    barRoles: [],
  }
}

/** C major for two measures, then G with its seventh (F) for two. */
const C_THEN_G7: readonly HarmonyEvent[] = [
  event(0, 0, 8, C_MAJOR),
  event(2, 0, 8, G_MAJOR, { pitchClass: 5, quality: 'dominant-seventh' }),
]

/** The same chords with G as a triad. */
const C_THEN_G: readonly HarmonyEvent[] = [event(0, 0, 8, C_MAJOR), event(2, 0, 8, G_MAJOR)]

/** A whole-note fraction. */
function r(numerator: number, denominator: number): Rational {
  return makeRational(numerator, denominator)
}

/** A note event of `length` whole notes, fresh or a tie continuation. */
function noteOf(pitch: number, length: Rational, tieContinuation = false): MeasureEvent {
  return makeNoteEvent({ duration: length, pitch: makeConcertPitch(pitch), tieContinuation })
}

/** A rest event of `length` whole notes. */
function restOf(length: Rational): MeasureEvent {
  return makeRestEvent({ duration: length })
}

/** A four-measure timeline from each measure's events. */
function timelineOf(
  bars: readonly [MeasureEvent[], MeasureEvent[], MeasureEvent[], MeasureEvent[]],
): ConcertEventTimeline {
  return makeConcertEventTimeline(bars.map((events, index) => makeMeasure(index, events)))
}

/**
 * C4 half, D4 quarter, a rest from beat 4 through measure 2's first half, E4 tied from measure
 * 2's beat 3 over the whole of measure 3, then G4 and F4 eighths, a quarter rest and C4 half.
 */
const PHRASE = timelineOf([
  [noteOf(60, r(1, 2)), noteOf(62, r(1, 4)), restOf(r(1, 4))],
  [restOf(r(1, 2)), noteOf(64, r(1, 2))],
  [noteOf(64, r(1, 1), true)],
  [noteOf(67, r(1, 8)), noteOf(65, r(1, 8)), restOf(r(1, 4)), noteOf(60, r(1, 2))],
])

/** The facts as plain numbers, for readable expectations. */
function plain(facts: LeadFacts) {
  return {
    notes: facts.notes.map((note) => ({
      pitch: Number(note.pitch),
      start: note.start,
      duration: note.duration,
      chordRoot: note.chord.triad.pitchClasses[0],
      chordTone: note.chordTone,
      long: note.long,
    })),
    rests: facts.rests,
  }
}

describe('leadFacts', () => {
  // @test-link [[module_accompaniment_arranger]]
  // @test-link [[rule_parts_read_chord_as_written]]
  it('reads each sounding note with its chord, chord-tone and length facts, and joins rests', () => {
    expect(plain(leadFacts(PHRASE, C_THEN_G7))).toEqual({
      notes: [
        { pitch: 60, start: r(0, 1), duration: r(1, 2), chordRoot: 0, chordTone: true, long: true },
        {
          pitch: 62,
          start: r(1, 2),
          duration: r(1, 4),
          chordRoot: 0,
          chordTone: false,
          long: true,
        },
        { pitch: 64, start: r(3, 2), duration: r(3, 2), chordRoot: 0, chordTone: true, long: true },
        {
          pitch: 67,
          start: r(3, 1),
          duration: r(1, 8),
          chordRoot: 7,
          chordTone: true,
          long: false,
        },
        {
          pitch: 65,
          start: r(25, 8),
          duration: r(1, 8),
          chordRoot: 7,
          chordTone: true,
          long: false,
        },
        {
          pitch: 60,
          start: r(7, 2),
          duration: r(1, 2),
          chordRoot: 7,
          chordTone: false,
          long: true,
        },
      ],
      rests: [
        { start: r(3, 4), duration: r(3, 4) },
        { start: r(13, 4), duration: r(1, 4) },
      ],
    })
  })

  // @test-link [[rule_parts_read_chord_as_written]]
  it('counts the seventh as a chord tone only when the chord has one', () => {
    const withSeventh = leadFacts(PHRASE, C_THEN_G7).notes.map((note) => note.chordTone)
    const triadOnly = leadFacts(PHRASE, C_THEN_G).notes.map((note) => note.chordTone)
    expect(withSeventh[4]).toBe(true)
    expect(triadOnly[4]).toBe(false)
    expect(triadOnly.filter((_, index) => index !== 4)).toEqual(
      withSeventh.filter((_, index) => index !== 4),
    )
  })

  // @test-link [[module_accompaniment_arranger]]
  it('returns frozen facts, the same for the same phrase', () => {
    const facts = leadFacts(PHRASE, C_THEN_G7)
    expect(leadFacts(PHRASE, C_THEN_G7)).toEqual(facts)
    expect(Object.isFrozen(facts)).toBe(true)
    expect(Object.isFrozen(facts.notes[0])).toBe(true)
    expect(Object.isFrozen(facts.rests)).toBe(true)
  })

  // @test-link [[module_accompaniment_arranger]]
  it('rejects a tie continuation opening the phrase, after a rest or at another pitch', () => {
    const whole = r(1, 1)
    /** A measure holding one whole rest. */
    const rest = (): MeasureEvent[] => [restOf(whole)]
    const opening = timelineOf([[noteOf(60, whole, true)], rest(), rest(), rest()])
    const afterRest = timelineOf([rest(), [noteOf(60, whole, true)], rest(), rest()])
    const otherPitch = timelineOf([[noteOf(60, whole)], [noteOf(62, whole, true)], rest(), rest()])
    for (const timeline of [opening, afterRest, otherPitch]) {
      expect(() => leadFacts(timeline, C_THEN_G)).toThrow(LeadFactsError)
    }
  })

  // @test-link [[module_accompaniment_arranger]]
  it('rejects a note whose start no harmony event holds', () => {
    expect(() => leadFacts(PHRASE, [event(0, 0, 8, C_MAJOR)])).toThrow(LeadFactsError)
  })
})
