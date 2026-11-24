/**
 * The Counter-melody (contrasting) part on hand-built phrases: its lane above or below the lead's
 * window (the C3 floor, an empty lane), one guide tone per chord, the nearest-note line with its
 * ties, held common tones and skipped parallel fifths, the start of each note against the lead's
 * attacks, notes that tile the phrase from the first one, its velocity and its determinism.
 */

import { describe, expect, it } from 'vitest'

import type { ArrangerPhrase, PartNote } from '@/domain/backing/accompaniment-part'
import {
  COUNTER_MELODY_LANE,
  COUNTER_MELODY_VELOCITY,
  counterMelodyPart,
} from '@/domain/backing/counter-melody-part'
import { leadFacts } from '@/domain/backing/lead-facts'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import type { RegisterId } from '@/domain/profile/register-id'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { addRational, compareRational, makeRational, type Rational } from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const E_MINOR: DiatonicTriad = { degree: 3, pitchClasses: [4, 7, 11], quality: 'minor' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }
const A_MINOR: DiatonicTriad = { degree: 6, pitchClasses: [9, 0, 4], quality: 'minor' }
const G_SEVENTH = { pitchClass: 5, quality: 'dominant-seventh' } as const

/** A hand-built harmony event; role, template and bar roles do not affect the part. */
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

/** One measure each of C, A minor, F and G with its seventh. */
const C_AM_F_G7: readonly HarmonyEvent[] = [
  event(0, 0, 4, C_MAJOR),
  event(1, 0, 4, A_MINOR),
  event(2, 0, 4, F_MAJOR),
  event(3, 0, 4, G_MAJOR, G_SEVENTH),
]

/** One chord for the whole phrase. */
function wholePhrase(triad: DiatonicTriad, seventh?: HarmonyEvent['seventh']): HarmonyEvent[] {
  return [event(0, 0, 16, triad, seventh)]
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

/** A four-measure timeline from each measure's events. */
function timelineOf(
  bars: readonly [MeasureEvent[], MeasureEvent[], MeasureEvent[], MeasureEvent[]],
): ConcertEventTimeline {
  return makeConcertEventTimeline(bars.map((events, index) => makeMeasure(index, events)))
}

/** A measure of one whole rest. */
function restBar(): MeasureEvent[] {
  return [restOf(r(1, 1))]
}

/** A lead that rests on each measure's first beat and holds `pitch` for the other three. */
function offBeatLead(pitch: number): ConcertEventTimeline {
  /** One measure of the pattern. */
  const bar = (): MeasureEvent[] => [restOf(r(1, 4)), noteOf(pitch, r(3, 4))]
  return timelineOf([bar(), bar(), bar(), bar()])
}

/** A lead of one whole note per measure: it attacks every downbeat. */
const DOWNBEAT_LEAD = timelineOf([
  [noteOf(60, r(1, 1))],
  [noteOf(62, r(1, 1))],
  [noteOf(64, r(1, 1))],
  [noteOf(65, r(1, 1))],
])

/** A phrase in C major from its lead, harmony and register window. */
function phraseOf(
  timeline: ConcertEventTimeline,
  harmony: readonly HarmonyEvent[],
  register: RegisterId,
  minMidi: number,
  maxMidi: number,
): ArrangerPhrase {
  return {
    timeline,
    harmony,
    window: { register, range: makeRegisterWindow(minMidi, maxMidi) },
    scale: makeHarmonyCollection('C', 'Major'),
    seed: makeSeed(20261124),
  }
}

/** The part for a phrase, with the lead facts read from it. */
function counter(phrase: ArrangerPhrase): readonly PartNote[] {
  return counterMelodyPart(phrase, leadFacts(phrase.timeline, phrase.harmony))
}

/** A part note's concert pitch as a plain number; throws on a drum note. */
function pitchOf(note: PartNote): number {
  if (note.sound.kind !== 'pitch') throw new Error('a counter-melody note is pitched')
  return Number(note.sound.pitch)
}

/** The part's notes as pitch, start and length, for readable expectations. */
function plain(notes: readonly PartNote[]) {
  return notes.map((note) => ({ pitch: pitchOf(note), start: note.start, duration: note.duration }))
}

/** An expected note. */
function n(pitch: number, start: Rational, duration: Rational) {
  return { pitch, start, duration }
}

/** The part's pitches only. */
function pitches(phrase: ArrangerPhrase): number[] {
  return counter(phrase).map(pitchOf)
}

describe('counterMelodyPart', () => {
  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[req_contrasting_part]]
  it('plays 3 to 15 half steps above a Low or Middle window, never crossing the lead', () => {
    const low = phraseOf(offBeatLead(48), C_AM_F_G7, 'Low', 40, 52)
    const middle = phraseOf(offBeatLead(64), C_AM_F_G7, 'Middle', 57, 69)
    expect(pitches(low)).toEqual([64, 60, 59])
    expect(pitches(middle)).toEqual([79, 76, 72, 77])
    for (const phrase of [low, middle]) {
      const top = phrase.window.range.maxMidi
      for (const pitch of pitches(phrase)) {
        expect(pitch).toBeGreaterThanOrEqual(top + COUNTER_MELODY_LANE.nearest)
        expect(pitch).toBeLessThanOrEqual(top + COUNTER_MELODY_LANE.farthest)
      }
    }
  })

  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[req_contrasting_part]]
  it('plays 15 to 3 half steps below a High window, never crossing the lead', () => {
    const high = phraseOf(offBeatLead(76), C_AM_F_G7, 'High', 72, 84)
    expect(pitches(high)).toEqual([64, 60, 59])
    for (const pitch of pitches(high)) {
      expect(pitch).toBeGreaterThanOrEqual(72 - COUNTER_MELODY_LANE.farthest)
      expect(pitch).toBeLessThanOrEqual(72 - COUNTER_MELODY_LANE.nearest)
    }
  })

  // @test-link [[rule_contrasting_part_lane]]
  it('never goes below MIDI 48 under a High window, the floor clipping the lane', () => {
    // Unclipped, the lane would be 43-55 with E minor's G and B at 43, 47 and 55.
    const phrase = phraseOf(offBeatLead(64), wholePhrase(E_MINOR), 'High', 58, 70)
    expect(pitches(phrase)).toEqual([55])
    expect(COUNTER_MELODY_LANE.floor).toBe(48)
  })

  // @test-link [[rule_contrasting_part_lane]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('places no note when the floor leaves no lane below a High window', () => {
    expect(counter(phraseOf(offBeatLead(55), C_AM_F_G7, 'High', 50, 62))).toEqual([])
  })

  // @test-link [[rule_contrasting_part_guide_tones]]
  // @test-link [[req_contrasting_part]]
  it('plays at most one note per chord, each starting in its own chord', () => {
    const phrases = [
      phraseOf(offBeatLead(64), C_AM_F_G7, 'Middle', 57, 69),
      phraseOf(DOWNBEAT_LEAD, C_AM_F_G7, 'Middle', 57, 69),
      phraseOf(offBeatLead(76), C_AM_F_G7, 'High', 72, 84),
    ]
    for (const phrase of phrases) {
      const chordIndices = counter(phrase).map((note) =>
        phrase.harmony.findIndex((chord) => {
          const start = r(chord.barIndex * 4 + chord.startBeat, 4)
          const end = r(chord.barIndex * 4 + chord.startBeat + chord.durationBeats, 4)
          return compareRational(start, note.start) <= 0 && compareRational(note.start, end) < 0
        }),
      )
      expect(chordIndices.every((index) => index >= 0)).toBe(true)
      expect(new Set(chordIndices).size).toBe(chordIndices.length)
    }
  })

  // @test-link [[rule_contrasting_part_guide_tones]]
  it("plays a triad's third or fifth, never its root", () => {
    // The lane 66-78 is centred on C5 (72), C major's root: its third E5 is taken.
    expect(pitches(phraseOf(offBeatLead(60), wholePhrase(C_MAJOR), 'Middle', 51, 63))).toEqual([76])
    // The lane 72-84 is centred on 78: C major's fifth G5 is nearest.
    expect(pitches(phraseOf(offBeatLead(64), wholePhrase(C_MAJOR), 'Middle', 57, 69))).toEqual([79])
  })

  // @test-link [[rule_contrasting_part_guide_tones]]
  it("plays a seventh chord's third or seventh, never its fifth", () => {
    // The lane 68-80 is centred on D5 (74): G's fifth when G is a triad, skipped for G7.
    expect(pitches(phraseOf(offBeatLead(60), wholePhrase(G_MAJOR), 'Middle', 53, 65))).toEqual([74])
    expect(
      pitches(phraseOf(offBeatLead(60), wholePhrase(G_MAJOR, G_SEVENTH), 'Middle', 53, 65)),
    ).toEqual([71])
    // The lane 71-83 is centred on F5 (77), G7's seventh.
    expect(
      pitches(phraseOf(offBeatLead(64), wholePhrase(G_MAJOR, G_SEVENTH), 'Middle', 56, 68)),
    ).toEqual([77])
  })

  // @test-link [[rule_contrasting_part_guide_tones]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('adds no note for a chord with no guide tone in the lane, the earlier note lasting on', () => {
    // The lane is 48-52: C's E3 fits, none of G7's B or F does.
    const cThenG7 = [event(0, 0, 8, C_MAJOR), event(2, 0, 8, G_MAJOR, G_SEVENTH)]
    const g7ThenC = [event(0, 0, 8, G_MAJOR, G_SEVENTH), event(2, 0, 8, C_MAJOR)]
    expect(plain(counter(phraseOf(offBeatLead(60), cThenG7, 'High', 55, 67)))).toEqual([
      n(52, r(0, 1), r(4, 1)),
    ])
    expect(plain(counter(phraseOf(offBeatLead(60), g7ThenC, 'High', 55, 67)))).toEqual([
      n(52, r(2, 1), r(2, 1)),
    ])
  })

  // @test-link [[rule_contrasting_part_voice_leading]]
  it('starts on the guide tone nearest the lane centre, the lower on a tie', () => {
    // Centre 74: G7's B4 (71) and F5 (77) are both three half steps away.
    const tie = phraseOf(offBeatLead(60), wholePhrase(G_MAJOR, G_SEVENTH), 'Middle', 53, 65)
    expect(pitches(tie)).toEqual([71])
    // Centre 61: C's E4 (64) is nearer than G3 (55) and G4 (67).
    expect(pitches(phraseOf(offBeatLead(48), wholePhrase(C_MAJOR), 'Low', 40, 52))).toEqual([64])
  })

  // @test-link [[rule_contrasting_part_voice_leading]]
  it('moves to the guide tone nearest the previous note, the lower on a tie', () => {
    // From G's D5 (74), G7's B4 (71) and F5 (77) are both three half steps away.
    const tie = [event(0, 0, 4, G_MAJOR), event(1, 0, 12, G_MAJOR, G_SEVENTH)]
    expect(plain(counter(phraseOf(offBeatLead(60), tie, 'Middle', 53, 65)))).toEqual([
      n(74, r(0, 1), r(1, 1)),
      n(71, r(1, 1), r(3, 1)),
    ])
    // From G5 (79), A minor's E5 (76) is nearer than C6 (84) and C5 (72).
    expect(pitches(phraseOf(offBeatLead(64), C_AM_F_G7, 'Middle', 57, 69)).slice(0, 2)).toEqual([
      79, 76,
    ])
  })

  // @test-link [[rule_contrasting_part_voice_leading]]
  // @test-link [[req_contrasting_part]]
  it('holds a common tone as one longer note', () => {
    // C's E5 (76) is also A minor's fifth: one note over both chords.
    const phrase = phraseOf(offBeatLead(60), C_AM_F_G7, 'Middle', 51, 63)
    expect(plain(counter(phrase))).toEqual([
      n(76, r(0, 1), r(2, 1)),
      n(72, r(2, 1), r(1, 1)),
      n(71, r(3, 1), r(1, 1)),
    ])
  })

  // @test-link [[rule_contrasting_part_voice_leading]]
  it('skips a guide tone making parallel fifths with the bass when another exists', () => {
    // C to A minor: the bass moves C2 to A2; G5 over C2, then E5 over A2, would be fifths again.
    const cToAm = [event(0, 0, 2, C_MAJOR), event(0, 2, 14, A_MINOR)]
    expect(plain(counter(phraseOf(offBeatLead(64), cToAm, 'Middle', 57, 69)))).toEqual([
      n(79, r(0, 1), r(1, 2)),
      n(84, r(1, 2), r(7, 2)),
    ])
    // G to F under a High window: D3 over G, then C3 over F would be fifths; A3 is taken.
    const gToF = [event(0, 0, 2, G_MAJOR), event(0, 2, 14, F_MAJOR)]
    expect(plain(counter(phraseOf(offBeatLead(64), gToF, 'High', 60, 72)))).toEqual([
      n(50, r(0, 1), r(1, 2)),
      n(57, r(1, 2), r(7, 2)),
    ])
  })

  // @test-link [[rule_contrasting_part_voice_leading]]
  it('takes a guide tone making parallel fifths when it is the only one in the lane', () => {
    // The lane 48-52 holds F's C3 but not its A3.
    const gToF = [event(0, 0, 2, G_MAJOR), event(0, 2, 14, F_MAJOR)]
    expect(plain(counter(phraseOf(offBeatLead(60), gToF, 'High', 55, 67)))).toEqual([
      n(50, r(0, 1), r(1, 2)),
      n(48, r(1, 2), r(7, 2)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it("starts on the chord's start when no lead note starts there", () => {
    const lead = timelineOf([
      [restOf(r(1, 4)), noteOf(64, r(3, 4))],
      restBar(),
      restBar(),
      restBar(),
    ])
    expect(plain(counter(phraseOf(lead, wholePhrase(C_MAJOR), 'Middle', 57, 69)))).toEqual([
      n(79, r(0, 1), r(4, 1)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it('starts an eighth later when a lead note starts with the chord', () => {
    const lead = timelineOf([
      [noteOf(64, r(1, 2)), restOf(r(1, 2))],
      restBar(),
      restBar(),
      restBar(),
    ])
    expect(plain(counter(phraseOf(lead, wholePhrase(C_MAJOR), 'Middle', 57, 69)))).toEqual([
      n(79, r(1, 8), r(31, 8)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it('starts on the second beat when lead notes start on the first two eighths', () => {
    const lead = timelineOf([
      [noteOf(64, r(1, 8)), noteOf(65, r(3, 8)), noteOf(67, r(1, 2))],
      restBar(),
      restBar(),
      restBar(),
    ])
    expect(plain(counter(phraseOf(lead, wholePhrase(C_MAJOR), 'Middle', 57, 69)))).toEqual([
      n(79, r(1, 4), r(15, 4)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it("starts on the chord's start when lead notes start on all of its first four eighths", () => {
    const lead = timelineOf([
      [
        noteOf(60, r(1, 8)),
        noteOf(62, r(1, 8)),
        noteOf(64, r(1, 8)),
        noteOf(65, r(1, 8)),
        noteOf(67, r(1, 2)),
      ],
      restBar(),
      restBar(),
      restBar(),
    ])
    expect(plain(counter(phraseOf(lead, wholePhrase(C_MAJOR), 'Middle', 57, 69)))).toEqual([
      n(79, r(0, 1), r(4, 1)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it("does not count a lead note tied across the chord's start as starting there", () => {
    const harmony = [event(0, 0, 4, C_MAJOR), event(1, 0, 12, F_MAJOR)]
    /** A lead of C4 for a measure, then C4 again in measure 2, tied or fresh. */
    const lead = (tied: boolean) =>
      timelineOf([[noteOf(60, r(1, 1))], [noteOf(60, r(1, 1), tied)], restBar(), restBar()])
    expect(plain(counter(phraseOf(lead(true), harmony, 'Middle', 57, 69)))).toEqual([
      n(79, r(1, 8), r(7, 8)),
      n(81, r(1, 1), r(3, 1)),
    ])
    expect(plain(counter(phraseOf(lead(false), harmony, 'Middle', 57, 69)))).toEqual([
      n(79, r(1, 8), r(1, 1)),
      n(81, r(9, 8), r(23, 8)),
    ])
  })

  // @test-link [[rule_contrasting_part_timing]]
  it('sounds without a gap from its first note to the end of the phrase', () => {
    const phrase = phraseOf(DOWNBEAT_LEAD, C_AM_F_G7, 'Middle', 57, 69)
    const notes = counter(phrase)
    expect(plain(notes)).toEqual([
      n(79, r(1, 8), r(1, 1)),
      n(76, r(9, 8), r(1, 1)),
      n(72, r(17, 8), r(1, 1)),
      n(77, r(25, 8), r(7, 8)),
    ])
    notes.forEach((note, index) => {
      const end = addRational(note.start, note.duration)
      expect(end).toEqual(index + 1 < notes.length ? notes[index + 1]!.start : r(4, 1))
    })
  })

  // @test-link [[req_contrasting_part]]
  it('plays every note at velocity 64', () => {
    const notes = counter(phraseOf(offBeatLead(64), C_AM_F_G7, 'Middle', 57, 69))
    expect(COUNTER_MELODY_VELOCITY).toBe(64)
    expect(notes.map((note) => note.velocity)).toEqual(notes.map(() => 64))
  })

  // @test-link [[rule_parts_deterministic]]
  // @test-link [[rule_parts_rendered_from_phrase_alone]]
  it('gives the same notes for the same phrase, without mutating it', () => {
    const phrase = phraseOf(DOWNBEAT_LEAD, C_AM_F_G7, 'Middle', 57, 69)
    const snapshot = structuredClone(phrase)
    const first = counter(phrase)
    expect(counter(structuredClone(phrase))).toEqual(first)
    expect(phrase).toEqual(snapshot)
  })
})
