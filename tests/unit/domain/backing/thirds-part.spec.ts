/**
 * The Thirds (highlighting) part on hand-built C major phrases: which lead notes it doubles (long
 * ones, tied notes counted once, and those starting on beat 1 or 3, never a chromatic one), the
 * third or the sixth below taken by the chord sounding at the note's start, the MIDI 48 floor, and
 * each doubling's start, length and velocity; deterministic.
 */

import { describe, expect, it } from 'vitest'

import type { ArrangerPhrase, PartNote } from '@/domain/backing/accompaniment-part'
import { leadFacts } from '@/domain/backing/lead-facts'
import {
  THIRDS_FLOOR,
  THIRDS_VELOCITY,
  ThirdsPartError,
  thirdsPart,
} from '@/domain/backing/thirds-part'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { DiatonicTriad, HarmonyEvent, PitchClassNumber } from '@/domain/harmony/harmony-types'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRational, type Rational } from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const D_MINOR: DiatonicTriad = { degree: 2, pitchClasses: [2, 5, 9], quality: 'minor' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }

/** A hand-built harmony event; role, template and bar roles do not affect the part. */
function event(
  barIndex: 0 | 1 | 2 | 3,
  durationBeats: number,
  triad: DiatonicTriad,
  seventh?: HarmonyEvent['seventh'],
): HarmonyEvent {
  const base = { barIndex, startBeat: 0 as const, durationBeats, triad, role: 'tonic' as const }
  return {
    ...base,
    ...(seventh === undefined ? {} : { seventh }),
    templateId: 'test',
    barRoles: [],
  }
}

/** One chord over the whole phrase. */
function throughout(triad: DiatonicTriad, seventh?: HarmonyEvent['seventh']): HarmonyEvent[] {
  return [event(0, 16, triad, seventh)]
}

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

/** A measure of silence. */
function silent(): MeasureEvent[] {
  return [restOf(r(1, 1))]
}

/** A C major phrase in the Middle window of a C keyboard from its measures' events, the rest silent. */
function phraseOf(
  bars: readonly MeasureEvent[][],
  harmony: readonly HarmonyEvent[],
): ArrangerPhrase {
  const measures = [0, 1, 2, 3].map((index) => makeMeasure(index, bars[index] ?? silent()))
  return {
    timeline: makeConcertEventTimeline(measures),
    harmony,
    window: { register: 'Middle', range: makeRegisterWindow(57, 69) },
    scale: makeHarmonyCollection('C', 'Major'),
    seed: makeSeed(20261124),
  }
}

/** The part's notes for `phrase`, its lead read from the phrase's own timeline and harmony. */
function thirdsOf(phrase: ArrangerPhrase): readonly PartNote[] {
  return thirdsPart(phrase, leadFacts(phrase.timeline, phrase.harmony))
}

/** Each note as its pitch, start and length, for readable expectations. */
function plain(notes: readonly PartNote[]) {
  return notes.map((note) => ({
    pitch: note.sound.kind === 'pitch' ? Number(note.sound.pitch) : note.sound.drum,
    start: note.start,
    duration: note.duration,
  }))
}

/** An expected doubling: its MIDI pitch, start and length. */
function at(pitch: number, start: Rational, duration: Rational) {
  return { pitch, start, duration }
}

/** A measure holding one note of `pitch` for its first half, then a half rest. */
function halfNote(pitch: number): MeasureEvent[] {
  return [noteOf(pitch, r(1, 2)), restOf(r(1, 2))]
}

/**
 * E4 half, A4 quarter tied into an eighth, an eighth on the off-beat; G4 eighth on beat 2, C5
 * quarter on beat 3, a quarter rest; F#4 whole; then D5 half and a half rest. Over C, G7 from
 * measure 2's beat 3 through measure 3, then F.
 */
const PHRASE = phraseOf(
  [
    [noteOf(64, r(1, 2)), noteOf(69, r(1, 4)), noteOf(69, r(1, 8), true), noteOf(67, r(1, 8))],
    [restOf(r(1, 4)), noteOf(67, r(1, 8)), restOf(r(1, 8)), noteOf(72, r(1, 4)), restOf(r(1, 4))],
    [noteOf(66, r(1, 1))],
    halfNote(74),
  ],
  [
    event(0, 6, C_MAJOR),
    { ...event(1, 6, G_MAJOR, { pitchClass: 5, quality: 'dominant-seventh' }), startBeat: 2 },
    event(3, 4, F_MAJOR),
  ],
)

describe('thirdsPart', () => {
  // @test-link [[rule_highlighting_part_doubled_notes]]
  it('doubles a lead note lasting a beat or more, wherever it starts', () => {
    const phrase = phraseOf(
      [[restOf(r(1, 4)), noteOf(64, r(1, 4)), restOf(r(1, 8)), noteOf(64, r(3, 8))]],
      throughout(C_MAJOR),
    )
    expect(plain(thirdsOf(phrase))).toEqual([at(60, r(1, 4), r(1, 4)), at(60, r(5, 8), r(3, 8))])
  })

  // @test-link [[rule_highlighting_part_doubled_notes]]
  it('doubles a short lead note starting on beat 1 or beat 3 of any measure', () => {
    const phrase = phraseOf(
      [
        [noteOf(64, r(1, 8)), restOf(r(3, 8)), noteOf(64, r(1, 16)), restOf(r(7, 16))],
        [noteOf(67, r(1, 8)), restOf(r(7, 8))],
        [restOf(r(1, 2)), noteOf(67, r(1, 8)), restOf(r(3, 8))],
      ],
      throughout(C_MAJOR),
    )
    expect(plain(thirdsOf(phrase))).toEqual([
      at(60, r(0, 1), r(1, 8)),
      at(60, r(1, 2), r(1, 16)),
      at(64, r(1, 1), r(1, 8)),
      at(64, r(5, 2), r(1, 8)),
    ])
  })

  // @test-link [[rule_highlighting_part_doubled_notes]]
  it('does not double a short lead note starting off beats 1 and 3', () => {
    const phrase = phraseOf(
      [
        [
          restOf(r(1, 8)),
          noteOf(64, r(1, 8)),
          noteOf(64, r(1, 8)),
          restOf(r(1, 8)),
          restOf(r(1, 4)),
          noteOf(64, r(1, 8)),
          noteOf(64, r(1, 8)),
        ],
        [restOf(r(1, 2)), restOf(r(1, 16)), noteOf(67, r(3, 16)), restOf(r(1, 4))],
      ],
      throughout(C_MAJOR),
    )
    expect(thirdsOf(phrase)).toEqual([])
  })

  // @test-link [[rule_highlighting_part_doubled_notes]]
  // @test-link [[req_highlighting_part]]
  it('counts a tied lead note as one long note, doubled once over its whole tied length', () => {
    const phrase = phraseOf(
      [
        [restOf(r(7, 8)), noteOf(64, r(1, 8))],
        [noteOf(64, r(1, 8), true), restOf(r(7, 8))],
      ],
      throughout(C_MAJOR),
    )
    expect(plain(thirdsOf(phrase))).toEqual([at(60, r(7, 8), r(1, 4))])
  })

  // @test-link [[rule_highlighting_part_doubled_notes]]
  it('never doubles a chromatic lead note, even a long one on beat 1', () => {
    const phrase = phraseOf(
      [[noteOf(66, r(1, 1))], halfNote(61), halfNote(64)],
      throughout(C_MAJOR),
    )
    expect(plain(thirdsOf(phrase))).toEqual([at(60, r(2, 1), r(1, 2))])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  it('takes the third below when only the third is a tone of the chord', () => {
    expect(plain(thirdsOf(phraseOf([halfNote(69)], throughout(D_MINOR))))).toEqual([
      at(65, r(0, 1), r(1, 2)),
    ])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  it('takes the sixth below when only the sixth is a tone of the chord', () => {
    expect(plain(thirdsOf(phraseOf([halfNote(69)], throughout(C_MAJOR))))).toEqual([
      at(60, r(0, 1), r(1, 2)),
    ])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  it('takes the third below when both or neither are tones of the chord', () => {
    const phrase = phraseOf(
      [halfNote(69), halfNote(69)],
      [event(0, 4, F_MAJOR), event(1, 12, G_MAJOR)],
    )
    expect(plain(thirdsOf(phrase))).toEqual([at(65, r(0, 1), r(1, 2)), at(65, r(1, 1), r(1, 2))])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  it('sounds the third 3 or 4 half steps below and the sixth 8 or 9, in the scale', () => {
    const phrase = phraseOf(
      [halfNote(72), halfNote(64), halfNote(69), halfNote(72)],
      [event(0, 4, F_MAJOR), event(1, 12, C_MAJOR)],
    )
    expect(plain(thirdsOf(phrase)).map((note) => note.pitch)).toEqual([69, 60, 60, 64])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  // @test-link [[rule_parts_read_chord_as_written]]
  it("counts a seventh chord's seventh among the chord's tones", () => {
    const g7 = throughout(G_MAJOR, { pitchClass: 5, quality: 'dominant-seventh' })
    expect(plain(thirdsOf(phraseOf([halfNote(74)], g7)))).toEqual([at(71, r(0, 1), r(1, 2))])
    expect(plain(thirdsOf(phraseOf([halfNote(67)], throughout(G_MAJOR))))).toEqual([
      at(59, r(0, 1), r(1, 2)),
    ])
    // A hand-built seventh on E, not the scale's: only a seventh read as written makes E a tone.
    const seventhOnE = throughout(G_MAJOR, { pitchClass: 4, quality: 'dominant-seventh' })
    expect(plain(thirdsOf(phraseOf([halfNote(67)], seventhOnE)))).toEqual([
      at(64, r(0, 1), r(1, 2)),
    ])
  })

  // @test-link [[rule_highlighting_part_floor]]
  it('takes the sixth down to MIDI 48 and the third when the sixth would fall below it', () => {
    const phrase = phraseOf(
      [halfNote(57), halfNote(55)],
      [event(0, 4, C_MAJOR), event(1, 12, G_MAJOR)],
    )
    expect(THIRDS_FLOOR).toBe(48)
    expect(plain(thirdsOf(phrase))).toEqual([at(48, r(0, 1), r(1, 2)), at(52, r(1, 1), r(1, 2))])
  })

  // @test-link [[rule_highlighting_part_floor]]
  it('leaves a lead note undoubled when its third and its sixth both fall below MIDI 48', () => {
    const phrase = phraseOf([halfNote(50), halfNote(48)], throughout(G_MAJOR))
    expect(thirdsOf(phrase)).toEqual([])
  })

  // @test-link [[req_highlighting_part]]
  it("gives each doubling its lead note's start and length, in lead order, at velocity 64", () => {
    const notes = thirdsOf(PHRASE)
    expect(plain(notes)).toEqual([
      at(60, r(0, 1), r(1, 2)),
      at(60, r(1, 2), r(3, 8)),
      at(69, r(3, 2), r(1, 4)),
      at(65, r(3, 1), r(1, 2)),
    ])
    expect(THIRDS_VELOCITY).toBe(64)
    expect(notes.map((note) => note.velocity)).toEqual([64, 64, 64, 64])
  })

  // @test-link [[req_accompaniment_parts]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('gives no note for a phrase with no lead note to double', () => {
    const offBeats = phraseOf(
      [[restOf(r(1, 4)), noteOf(64, r(1, 8)), restOf(r(5, 8))], [noteOf(61, r(1, 1))]],
      throughout(C_MAJOR),
    )
    expect(thirdsOf(offBeats)).toEqual([])
    expect(thirdsOf(phraseOf([], throughout(C_MAJOR)))).toEqual([])
  })

  // @test-link [[rule_highlighting_part_pitch]]
  it('rejects a phrase scale that is not seven distinct pitch classes', () => {
    const phrase = phraseOf([halfNote(64)], throughout(C_MAJOR))
    const sixPitchClasses: PitchClassNumber[] = [0, 2, 4, 5, 7, 9]
    const sixNotes = { ...phrase, scale: { ...phrase.scale, pitchClasses: sixPitchClasses } }
    expect(() => thirdsPart(sixNotes, leadFacts(phrase.timeline, phrase.harmony))).toThrow(
      ThirdsPartError,
    )
  })

  // @test-link [[rule_parts_deterministic]]
  it('gives equal, frozen notes for the same phrase', () => {
    const first = thirdsOf(PHRASE)
    expect(thirdsOf(structuredClone(PHRASE))).toEqual(first)
    expect(Object.isFrozen(first[0])).toBe(true)
  })
})
