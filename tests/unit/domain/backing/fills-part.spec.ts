/**
 * The Fills (responding) part on hand-built C major phrases: a fill only in a lead rest of a beat
 * or more, one shape drawn per such rest and none for a shorter one; its eighth-note rhythm; its
 * target, the chord tone nearest the lead's next note or, at the phrase's end, the root nearest
 * the window's centre; its five shapes built backwards from the target, each arpeggio note on its
 * own chord; at the window's edges the whole shape flipped, else reversed note by note; an empty
 * fill where no note fits; velocity 64; deterministic.
 */

import { describe, expect, it } from 'vitest'

import type { ArrangerPhrase, PartNote } from '@/domain/backing/accompaniment-part'
import {
  FILLS_VELOCITY,
  FILL_LAST_NOTE_MAX,
  FILL_MAX_NOTES,
  FILL_MIN_REST,
  FILL_NOTE_LENGTH,
  FILL_SHAPES,
  fillsPart,
} from '@/domain/backing/fills-part'
import { leadFacts, type LeadFacts } from '@/domain/backing/lead-facts'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { DiatonicTriad, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { makeRegisterWindow, type RegisterWindow } from '@/domain/profile/register-window'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { deriveNamedStream } from '@/domain/random/streams'
import {
  addRational,
  compareRational,
  makeRational,
  subtractRational,
  type Rational,
} from '@/domain/time/rational'

const C_MAJOR: DiatonicTriad = { degree: 1, pitchClasses: [0, 4, 7], quality: 'major' }
const D_MINOR: DiatonicTriad = { degree: 2, pitchClasses: [2, 5, 9], quality: 'minor' }
const F_MAJOR: DiatonicTriad = { degree: 4, pitchClasses: [5, 9, 0], quality: 'major' }
const G_MAJOR: DiatonicTriad = { degree: 5, pitchClasses: [7, 11, 2], quality: 'major' }
const G_SEVENTH = { pitchClass: 5, quality: 'dominant-seventh' } as const

/** The five shapes in the order the draw indexes them. */
const SHAPE_ORDER = [
  'rising-arpeggio',
  'falling-arpeggio',
  'rising-scale',
  'falling-scale',
  'turn',
] as const

type Shape = (typeof SHAPE_ORDER)[number]

/** The first seed whose fill-shape stream draws `shapes` in that order. */
function seedDrawing(...shapes: Shape[]): Seed {
  for (let value = 0; value < 100_000; value += 1) {
    const stream = deriveNamedStream(makeSeed(value), 'fill-shape')
    if (shapes.every((shape) => SHAPE_ORDER[stream.next() % SHAPE_ORDER.length] === shape)) {
      return makeSeed(value)
    }
  }
  throw new Error(`No seed draws ${shapes.join(', ')}.`)
}

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

/** One chord over the whole phrase. */
function throughout(triad: DiatonicTriad, seventh?: HarmonyEvent['seventh']): HarmonyEvent[] {
  return [event(0, 0, 16, triad, seventh)]
}

/** A whole-note fraction. */
function r(numerator: number, denominator: number): Rational {
  return makeRational(numerator, denominator)
}

/** A fresh note event of `length` whole notes. */
function noteOf(pitch: number, length: Rational): MeasureEvent {
  return makeNoteEvent({ duration: length, pitch: makeConcertPitch(pitch), tieContinuation: false })
}

/** A rest event of `length` whole notes. */
function restOf(length: Rational): MeasureEvent {
  return makeRestEvent({ duration: length })
}

/** A measure holding one whole note. */
function held(pitch: number): MeasureEvent[] {
  return [noteOf(pitch, r(1, 1))]
}

/** What a hand-built phrase may set besides its measures; C major over C throughout by default. */
interface PhraseOptions {
  readonly harmony?: readonly HarmonyEvent[]
  readonly window?: RegisterWindow
  readonly seed?: Seed
}

/** A C major phrase from its measures' events, every missing measure a whole C6. */
function phraseOf(bars: readonly MeasureEvent[][], options: PhraseOptions = {}): ArrangerPhrase {
  const measures = [0, 1, 2, 3].map((index) => makeMeasure(index, bars[index] ?? held(72)))
  return {
    timeline: makeConcertEventTimeline(measures),
    harmony: options.harmony ?? throughout(C_MAJOR),
    window: { register: 'Middle', range: options.window ?? makeRegisterWindow(55, 79) },
    scale: makeHarmonyCollection('C', 'Major'),
    seed: options.seed ?? makeSeed(20261124),
  }
}

/** The lead facts of `phrase`, read from its own timeline and harmony. */
function leadOf(phrase: ArrangerPhrase): LeadFacts {
  return leadFacts(phrase.timeline, phrase.harmony)
}

/** The part's notes for `phrase`. */
function fillsOf(phrase: ArrangerPhrase): readonly PartNote[] {
  return fillsPart(phrase, leadOf(phrase))
}

/** The notes' MIDI pitches, in order. */
function pitches(notes: readonly PartNote[]): number[] {
  return notes.map((note) => (note.sound.kind === 'pitch' ? Number(note.sound.pitch) : -1))
}

/** The notes' starts and lengths, in order. */
function timing(notes: readonly PartNote[]): { start: Rational; duration: Rational }[] {
  return notes.map((note) => ({ start: note.start, duration: note.duration }))
}

/** The expected timing of `count` fill notes in a rest from `start`, the last lasting `last`. */
function fillTiming(start: Rational, count: number, last: Rational) {
  return Array.from({ length: count }, (_, index) => ({
    start: addRational(start, r(index + 1, 8)),
    duration: index === count - 1 ? last : r(1, 8),
  }))
}

/** A measure opening with a rest of `length` whole notes, then a note of `pitch` to its end. */
function restBefore(length: Rational, pitch: number): MeasureEvent[] {
  return [restOf(length), noteOf(pitch, subtractRational(r(1, 1), length))]
}

/** A four-beat rest in measure 1 before a whole E4, over C, in the window 55-79. */
function fourBeatRest(options: PhraseOptions = {}): ArrangerPhrase {
  return phraseOf([held(72), [restOf(r(1, 1))], held(64)], options)
}

describe('the Fills constants', () => {
  // @test-link [[rule_responding_part_in_long_rests]]
  // @test-link [[rule_responding_part_rhythm]]
  // @test-link [[rule_responding_part_shapes]]
  // @test-link [[req_responding_part]]
  it('name a one-beat rest, eighth notes, four notes, a one-beat last note, five shapes, 64', () => {
    expect(FILL_MIN_REST).toEqual(r(1, 4))
    expect(FILL_NOTE_LENGTH).toEqual(r(1, 8))
    expect(FILL_MAX_NOTES).toBe(4)
    expect(FILL_LAST_NOTE_MAX).toEqual(r(1, 4))
    expect(FILL_SHAPES).toEqual(SHAPE_ORDER)
    expect(FILLS_VELOCITY).toBe(64)
  })
})

describe('fillsPart: where fills sound and their rhythm', () => {
  // @test-link [[rule_responding_part_in_long_rests]]
  // @test-link [[rule_responding_part_shapes]]
  it('plays nothing in a rest under a beat, and draws no shape for it', () => {
    const seed = seedDrawing('rising-arpeggio', 'falling-arpeggio')
    const withShortRest = phraseOf(
      [
        [noteOf(60, r(1, 2)), restOf(r(1, 8)), noteOf(62, r(3, 8))],
        [restOf(r(1, 2)), noteOf(64, r(1, 2))],
      ],
      { seed },
    )
    const withoutShortRest = phraseOf(
      [
        [noteOf(60, r(5, 8)), noteOf(62, r(3, 8))],
        [restOf(r(1, 2)), noteOf(64, r(1, 2))],
      ],
      { seed },
    )
    const fills = fillsOf(withShortRest)
    expect(pitches(fills)).toEqual([60, 64, 67])
    expect(timing(fills)).toEqual(fillTiming(r(1, 1), 3, r(1, 8)))
    expect(fillsOf(withoutShortRest)).toEqual(fills)
  })

  // @test-link [[rule_responding_part_rhythm]]
  // @test-link [[rule_responding_part_in_long_rests]]
  it.each([
    ['1', r(1, 4), 1, r(1, 8)],
    ['1.5', r(3, 8), 2, r(1, 8)],
    ['2', r(1, 2), 3, r(1, 8)],
    ['2.5', r(5, 8), 4, r(1, 8)],
    ['3', r(3, 4), 4, r(1, 4)],
  ])(
    'fills a %s-beat rest with %i eighth notes, the last to the rest end or a beat',
    (_, length, count, last) => {
      const phrase = phraseOf([restBefore(length, 64)])
      expect(timing(fillsOf(phrase))).toEqual(fillTiming(r(0, 1), count, last))
    },
  )

  // @test-link [[rule_responding_part_rhythm]]
  it('fills a four-beat rest with four notes, the last lasting one beat, not to the rest end', () => {
    expect(timing(fillsOf(fourBeatRest()))).toEqual(fillTiming(r(1, 1), 4, r(1, 4)))
  })

  // @test-link [[rule_responding_part_rhythm]]
  it('lets the last note run to the rest end when that comes before one beat', () => {
    const phrase = phraseOf([[restOf(r(11, 16)), noteOf(64, r(5, 16))]])
    expect(timing(fillsOf(phrase))).toEqual(fillTiming(r(0, 1), 4, r(3, 16)))
  })

  // @test-link [[rule_responding_part_rhythm]]
  // @test-link [[rule_responding_part_in_long_rests]]
  it('counts a rest off the eighth grid from its own start, an eighth fitting before its end', () => {
    const offGrid = phraseOf([[noteOf(60, r(1, 16)), restOf(r(7, 16)), noteOf(64, r(1, 2))]])
    expect(timing(fillsOf(offGrid))).toEqual(fillTiming(r(1, 16), 2, r(3, 16)))
    const justOverABeat = phraseOf([[restOf(r(5, 16)), noteOf(64, r(11, 16))]])
    expect(timing(fillsOf(justOverABeat))).toEqual(fillTiming(r(0, 1), 1, r(3, 16)))
  })

  // @test-link [[req_responding_part]]
  // @test-link [[rule_responding_part_in_long_rests]]
  it('sounds only inside the lead rests, at velocity 64, in start order', () => {
    const phrase = phraseOf([
      [noteOf(60, r(1, 4)), restOf(r(1, 2)), noteOf(62, r(1, 4))],
      [restOf(r(1, 4)), noteOf(64, r(3, 4))],
      [noteOf(65, r(1, 2)), restOf(r(1, 2))],
      [restOf(r(1, 1))],
    ])
    const lead = leadOf(phrase)
    const notes = fillsPart(phrase, lead)
    expect(notes).toHaveLength(3 + 1 + 4)
    for (const note of notes) {
      expect(note.velocity).toBe(64)
      const end = addRational(note.start, note.duration)
      const inRest = lead.rests.some(
        (rest) =>
          compareRational(rest.start, note.start) <= 0 &&
          compareRational(end, addRational(rest.start, rest.duration)) <= 0,
      )
      expect(inRest).toBe(true)
    }
    const starts = notes.map((note) => note.start)
    expect([...starts].sort(compareRational)).toEqual(starts)
  })

  // @test-link [[rule_parts_deterministic]]
  it('gives equal notes on two calls', () => {
    const phrase = fourBeatRest({ seed: makeSeed(7) })
    expect(fillsOf(phrase)).toEqual(fillsOf(phrase))
  })

  it('throws when a rest before the phrase end is not followed by a lead note', () => {
    const phrase = fourBeatRest()
    const broken: LeadFacts = { notes: [], rests: [{ start: r(0, 1), duration: r(1, 4) }] }
    expect(() => fillsPart(phrase, broken)).toThrow(Error)
  })
})

describe('fillsPart: the target', () => {
  /** The last pitch of the fill in a one-beat rest before `next`, under `options`. */
  function targetBefore(next: number, options: PhraseOptions = {}): number | undefined {
    return pitches(fillsOf(phraseOf([[restOf(r(1, 4)), noteOf(next, r(3, 4))]], options))).at(-1)
  }

  // @test-link [[rule_responding_part_target]]
  it("ends on the chord tone nearest the lead's next note, never on that note", () => {
    expect(targetBefore(64)).toBe(67)
    expect(targetBefore(65)).toBe(64)
    expect(targetBefore(72, { window: makeRegisterWindow(63, 76) })).toBe(76)
  })

  // @test-link [[rule_responding_part_target]]
  it('takes the lower of two equally near chord tones', () => {
    expect(targetBefore(62)).toBe(60)
  })

  // @test-link [[rule_responding_part_target]]
  // @test-link [[rule_parts_read_chord_as_written]]
  it("may end on the chord's seventh", () => {
    expect(targetBefore(64, { harmony: throughout(G_MAJOR, G_SEVENTH) })).toBe(65)
  })

  // @test-link [[rule_responding_part_target]]
  it("reads the chord sounding at the target's start, not at the lead's next note", () => {
    const harmony = [event(0, 0, 2, C_MAJOR), event(0, 2, 14, F_MAJOR)]
    const phrase = phraseOf([[restOf(r(9, 16)), noteOf(65, r(7, 16))]], { harmony })
    const notes = fillsOf(phrase)
    expect(notes.at(-1)?.start).toEqual(r(3, 8))
    expect(pitches(notes).at(-1)).toBe(64)
  })

  // @test-link [[rule_responding_part_target]]
  it("ends a phrase-ending rest on the chord's root nearest the window's centre, the lower on a tie", () => {
    const bars = [held(60), held(62), held(64), [noteOf(65, r(1, 2)), restOf(r(1, 2))]]
    const harmony = [event(0, 0, 12, C_MAJOR), event(3, 0, 4, G_MAJOR)]
    expect(
      pitches(fillsOf(phraseOf(bars, { harmony, window: makeRegisterWindow(57, 69) }))).at(-1),
    ).toBe(67)
    expect(pitches(fillsOf(phraseOf(bars, { window: makeRegisterWindow(54, 78) }))).at(-1)).toBe(60)
  })

  // @test-link [[rule_responding_part_target]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('plays nothing when no chord tone other than the next note lies in the window', () => {
    const phrase = phraseOf([[restOf(r(1, 2)), noteOf(60, r(1, 2))]], {
      window: makeRegisterWindow(60, 60),
    })
    expect(fillsOf(phrase)).toEqual([])
  })

  // @test-link [[rule_responding_part_shapes]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('still draws a shape for an empty fill, so the next fill takes the next draw', () => {
    const harmony = [event(0, 0, 4, D_MINOR), event(1, 0, 12, C_MAJOR)]
    const bars = [
      [restOf(r(1, 2)), noteOf(65, r(1, 2))],
      [restOf(r(3, 8)), noteOf(69, r(5, 8))],
    ]
    const window = makeRegisterWindow(64, 67)
    const notes = fillsOf(
      phraseOf(bars, { harmony, window, seed: seedDrawing('rising-scale', 'rising-arpeggio') }),
    )
    expect(pitches(notes)).toEqual([64, 67])
    expect(notes[0]!.start).toEqual(r(9, 8))
  })
})

describe('fillsPart: the shapes and the window', () => {
  // @test-link [[rule_responding_part_shapes]]
  it.each([
    ['rising-arpeggio', [55, 60, 64, 67]],
    ['falling-arpeggio', [79, 76, 72, 67]],
    ['rising-scale', [62, 64, 65, 67]],
    ['falling-scale', [72, 71, 69, 67]],
    ['turn', [69, 67, 65, 67]],
  ] as const)('builds a four-note %s backwards from its target', (shape, expected) => {
    expect(pitches(fillsOf(fourBeatRest({ seed: seedDrawing(shape) })))).toEqual(expected)
  })

  // @test-link [[rule_responding_part_shapes]]
  // @test-link [[rule_responding_part_rhythm]]
  it("plays a shortened fill as its shape's last notes", () => {
    const rest = (length: Rational, shape: Shape) =>
      phraseOf([restBefore(length, 64)], { seed: seedDrawing(shape) })
    expect(pitches(fillsOf(rest(r(3, 8), 'falling-scale')))).toEqual([69, 67])
    expect(pitches(fillsOf(rest(r(3, 8), 'turn')))).toEqual([65, 67])
    expect(pitches(fillsOf(rest(r(1, 2), 'turn')))).toEqual([67, 65, 67])
    expect(pitches(fillsOf(rest(r(1, 2), 'rising-arpeggio')))).toEqual([60, 64, 67])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it('flips a shortened fill only when a note it plays would leave the window', () => {
    // Target 67 in 62-79. The four-note rising arpeggio would be 55, 60, 64, 67 (60 under 62),
    // but a three-eighth rest plays only 64, 67, both inside: no flip.
    const phrase = phraseOf([restBefore(r(3, 8), 64)], {
      window: makeRegisterWindow(62, 79),
      seed: seedDrawing('rising-arpeggio'),
    })
    expect(pitches(fillsOf(phrase))).toEqual([64, 67])
  })

  // @test-link [[rule_responding_part_shapes]]
  // @test-link [[rule_parts_read_chord_as_written]]
  it("builds each arpeggio note on the chord sounding at that note's own start", () => {
    const harmony = [event(0, 0, 6, C_MAJOR), event(1, 2, 10, F_MAJOR)]
    const phrase = fourBeatRest({
      harmony,
      window: makeRegisterWindow(48, 79),
      seed: seedDrawing('rising-arpeggio'),
    })
    expect(pitches(fillsOf(phrase))).toEqual([55, 60, 64, 65])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it("plays a rising arpeggio leaving the window's bottom as a whole falling arpeggio", () => {
    // Target 67 in 62-79. Rising: 64, 60 (under 62), so the shape flips: 72, 76, 79 above it.
    const window = makeRegisterWindow(62, 79)
    expect(
      pitches(fillsOf(fourBeatRest({ window, seed: seedDrawing('rising-arpeggio') }))),
    ).toEqual([79, 76, 72, 67])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it("plays a rising scale leaving the window's bottom as a whole falling scale", () => {
    // Target 67 in 64-79. Rising: 65, 64, 62 (under 64), so the shape flips: 69, 71, 72.
    const window = makeRegisterWindow(64, 79)
    expect(pitches(fillsOf(fourBeatRest({ window, seed: seedDrawing('rising-scale') })))).toEqual([
      72, 71, 69, 67,
    ])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it("plays a falling shape leaving the window's top as the whole rising shape", () => {
    // Target 67. Falling arpeggio in 55-72: 72, 76 (over 72); flipped: 64, 60, 55.
    const arpeggio = fourBeatRest({
      window: makeRegisterWindow(55, 72),
      seed: seedDrawing('falling-arpeggio'),
    })
    expect(pitches(fillsOf(arpeggio))).toEqual([55, 60, 64, 67])
    // Falling scale in 55-70: 69, 71 (over 70); flipped: 65, 64, 62.
    const scale = fourBeatRest({
      window: makeRegisterWindow(55, 70),
      seed: seedDrawing('falling-scale'),
    })
    expect(pitches(fillsOf(scale))).toEqual([62, 64, 65, 67])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it('reverses note by note when the flipped shape leaves the window too', () => {
    // Target 67 in the 13-semitone window 60-72. Rising: 64, 60, 55 (under 60); flipped: 72,
    // 76 (over 72). Note by note from 67, falling: 64, 60, then 55 leaves, so up from 60: 64.
    const window = makeRegisterWindow(60, 72)
    expect(
      pitches(fillsOf(fourBeatRest({ window, seed: seedDrawing('rising-arpeggio') }))),
    ).toEqual([64, 60, 64, 67])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_responding_part_shapes]]
  it('turns below the target when the step above leaves the window', () => {
    const phrase = fourBeatRest({ window: makeRegisterWindow(55, 67), seed: seedDrawing('turn') })
    expect(pitches(fillsOf(phrase))).toEqual([65, 67, 65, 67])
  })

  // @test-link [[rule_responding_part_register]]
  // @test-link [[rule_part_rests_when_no_note_fits]]
  it('plays no part of a fill whose shape leaves the window both ways', () => {
    const turn = fourBeatRest({ window: makeRegisterWindow(66, 68), seed: seedDrawing('turn') })
    expect(fillsOf(turn)).toEqual([])
    const scale = fourBeatRest({
      window: makeRegisterWindow(66, 68),
      seed: seedDrawing('rising-scale'),
    })
    expect(fillsOf(scale)).toEqual([])
  })

  // @test-link [[rule_responding_part_register]]
  it('keeps every note inside the window', () => {
    for (const shape of SHAPE_ORDER) {
      for (const [low, high] of [
        [55, 79],
        [62, 70],
        [60, 72],
        [64, 76],
      ] as const) {
        const notes = fillsOf(
          fourBeatRest({ window: makeRegisterWindow(low, high), seed: seedDrawing(shape) }),
        )
        for (const pitch of pitches(notes)) {
          expect(pitch).toBeGreaterThanOrEqual(low)
          expect(pitch).toBeLessThanOrEqual(high)
        }
      }
    }
  })
})
