/**
 * An independent oracle for the Fills part (master spec §6.5) and for the §6.6 overlap between the
 * relation parts: written from the rules alone, it reads nothing of the part's own module, only
 * the `fill-shape` named stream, the chords' tones and the lead facts, and asserts with vitest's
 * `expect`, the phrase's label as the message. It rebuilds every fill its own way: the window's
 * pitches enumerated, a shape's next note the nearest in-window pool pitch beyond the one after
 * it; a rising or falling shape with no such note tried whole the other way, then note by note,
 * each note taken the other way when none is. Test plumbing.
 */

import { expect } from 'vitest'

import type { ArrangerPhrase, PartNote } from '@/domain/backing/accompaniment-part'
import type { LeadFacts, LeadRest } from '@/domain/backing/lead-facts'
import { chordTones, type HarmonyEvent } from '@/domain/harmony/harmony-types'
import { deriveNamedStream } from '@/domain/random/streams'
import {
  addRational,
  compareRational,
  equalsRational,
  makeRational,
  subtractRational,
  type Rational,
} from '@/domain/time/rational'
import {
  RELATION_PART_VELOCITY,
  chordSpans,
  holds,
  pitchClass,
  pitchedNote,
  ratText,
  type ChordSpan,
  type PitchedNote,
} from './relation-part-invariants'

/** The five fill shapes, in the order the shape draw's value modulo five picks them. */
const SHAPES = [
  'rising-arpeggio',
  'falling-arpeggio',
  'rising-scale',
  'falling-scale',
  'turn',
] as const

type Shape = (typeof SHAPES)[number]

const EIGHTH = makeRational(1, 8)
const ONE_BEAT = makeRational(1, 4)
const MOST_NOTES = 4

/** What one phrase's Fills check counted; every count but `emptyFills` is of sounding fills. */
export interface FillsCounts {
  /** Lead rests of a beat or more whose fill sounds. */
  readonly fills: number
  /** Lead rests of a beat or more whose rules place no note. */
  readonly emptyFills: number
  /** Sounding fills of fewer than four notes. */
  readonly shortened: number
  /** Sounding rising or falling fills played whole the other way, as drawn leaving the window. */
  readonly wholeShapeFlips: number
  /** Sounding rising or falling fills reversed note by note, the flipped shape leaving it too. */
  readonly perNoteFallbacks: number
  /** Sounding turns with a step taken on the target's other side. */
  readonly turnOtherSide: number
  /** Sounding fills in a rest that ends the phrase. */
  readonly phraseEndFills: number
  /** Sounding fills whose notes start under more than one harmony event. */
  readonly chordChangeFills: number
  /** Sounding fills per drawn shape. */
  readonly shapes: Readonly<Record<Shape, number>>
}

/**
 * How a fill's pitches were read: as drawn, the whole shape flipped, reversed note by note, or a
 * turn with a step on the target's other side.
 */
type Reading = 'as-drawn' | 'whole-shape-flip' | 'per-note-fallback' | 'turn-other-side'

/** One expected fill: its notes, or null when its rules place none, and how it was read. */
interface ExpectedFill {
  readonly notes: readonly PitchedNote[] | null
  readonly reading: Reading
}

/** The harmony event whose span holds `at`; throws when none does. */
function chordAt(spans: readonly ChordSpan[], at: Rational, label: string): HarmonyEvent {
  const span = spans.find((candidate) => holds(candidate, at))
  if (span === undefined) throw new Error(`${label}: no harmony event holds ${ratText(at)}.`)
  return span.event
}

/** Every MIDI pitch in the phrase's window, ascending. */
function windowPitches(phrase: ArrangerPhrase): number[] {
  const { minMidi, maxMidi } = phrase.window.range
  return Array.from({ length: maxMidi - minMidi + 1 }, (_, index) => minMidi + index)
}

/** Of `candidates`, the one nearest `aim`, the lower on a tie; null when there are none. */
function closest(candidates: readonly number[], aim: number): number | null {
  const sorted = [...candidates].sort((a, b) => Math.abs(a - aim) - Math.abs(b - aim) || a - b)
  return sorted[0] ?? null
}

/** The fill's note starts and lengths: a note only where a whole eighth fits before the rest ends. */
function expectedRhythm(rest: LeadRest): { start: Rational; duration: Rational }[] {
  const end = addRational(rest.start, rest.duration)
  const slots: { start: Rational; duration: Rational }[] = []
  let start = addRational(rest.start, EIGHTH)
  while (slots.length < MOST_NOTES && compareRational(addRational(start, EIGHTH), end) <= 0) {
    slots.push({ start, duration: EIGHTH })
    start = addRational(start, EIGHTH)
  }
  const last = slots.at(-1)
  if (last !== undefined) {
    const left = subtractRational(end, last.start)
    last.duration = compareRational(left, ONE_BEAT) <= 0 ? left : ONE_BEAT
  }
  return slots
}

/** The fill's target, or null when the window holds none. */
function expectedTarget(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  rest: LeadRest,
  chord: HarmonyEvent,
  label: string,
): number | null {
  const end = addRational(rest.start, rest.duration)
  const pitches = windowPitches(phrase)
  if (equalsRational(end, makeRational(phrase.timeline.measures.length, 1))) {
    const { minMidi, maxMidi } = phrase.window.range
    const roots = pitches.filter((pitch) => pitchClass(pitch) === chord.triad.pitchClasses[0])
    return closest(roots, (minMidi + maxMidi) / 2)
  }
  const next = lead.notes.find((note) => equalsRational(note.start, end))
  if (next === undefined) throw new Error(`${label}: no lead note at ${ratText(end)}.`)
  const tones: readonly number[] = chordTones(chord)
  const fitting = pitches.filter(
    (pitch) => pitch !== next.pitch && tones.includes(pitchClass(pitch)),
  )
  return closest(fitting, next.pitch)
}

/**
 * The window pitch of `classes` nearest `from` strictly on side `way` (+1 above, -1 below), or
 * else on the other side; null when neither side has one. `flipped` tells which was taken.
 */
function stepFrom(
  from: number,
  way: 1 | -1,
  classes: readonly number[],
  window: readonly number[],
): { readonly pitch: number; readonly flipped: boolean } | null {
  const pool = window.filter((pitch) => classes.includes(pitchClass(pitch)))
  const onSide = (side: number) => pool.filter((pitch) => (pitch - from) * side > 0)
  const ahead = closest(onSide(way), from)
  if (ahead !== null) return { pitch: ahead, flipped: false }
  const behind = closest(onSide(-way), from)
  return behind === null ? null : { pitch: behind, flipped: true }
}

/**
 * The pitches of a fill of `starts.length` notes ending on `target`, each earlier note of the
 * classes sounding at its start, built backwards on side `way` throughout, or, if `noteByNote`,
 * with each note flipping the side when its own holds none; null when a note finds no pitch.
 */
function walkBack(
  starts: readonly Rational[],
  target: number,
  way: 1 | -1,
  noteByNote: boolean,
  classesAt: (start: Rational) => readonly number[],
  window: readonly number[],
): number[] | null {
  let side = way
  const pitches = [target]
  for (const start of [...starts].reverse().slice(1)) {
    const step = stepFrom(pitches[0]!, side, classesAt(start), window)
    if (step === null || (step.flipped && !noteByNote)) return null
    if (step.flipped) side = side === 1 ? -1 : 1
    pitches.unshift(step.pitch)
  }
  return pitches
}

/** The pitches of a fill of `starts.length` notes in `shape` ending on `target`, or null. */
function expectedPitches(
  phrase: ArrangerPhrase,
  spans: readonly ChordSpan[],
  shape: Shape,
  starts: readonly Rational[],
  target: number,
  label: string,
): { readonly pitches: number[]; readonly reading: Reading } | null {
  const window = windowPitches(phrase)
  const scale: readonly number[] = phrase.scale.pitchClasses
  if (shape === 'turn') {
    const turn = (['above', 'target', 'below', 'target'] as const).slice(MOST_NOTES - starts.length)
    const steps = turn.map((note) =>
      note === 'target'
        ? { pitch: target, flipped: false }
        : stepFrom(target, note === 'above' ? 1 : -1, scale, window),
    )
    if (steps.some((step) => step === null)) return null
    return {
      pitches: steps.map((step) => step!.pitch),
      reading: steps.some((step) => step!.flipped) ? 'turn-other-side' : 'as-drawn',
    }
  }
  const classesAt = (start: Rational): readonly number[] =>
    shape.endsWith('scale') ? scale : chordTones(chordAt(spans, start, label))
  const way: 1 | -1 = shape.startsWith('rising') ? -1 : 1
  const tries = [
    { way, noteByNote: false, reading: 'as-drawn' },
    { way: way === 1 ? -1 : 1, noteByNote: false, reading: 'whole-shape-flip' },
    { way, noteByNote: true, reading: 'per-note-fallback' },
  ] as const
  for (const attempt of tries) {
    const pitches = walkBack(starts, target, attempt.way, attempt.noteByNote, classesAt, window)
    if (pitches !== null) return { pitches, reading: attempt.reading }
  }
  return null
}

/** One long rest's expected fill in `shape`, rebuilt from the rules. */
function expectedFill(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  spans: readonly ChordSpan[],
  rest: LeadRest,
  shape: Shape,
  label: string,
): ExpectedFill {
  const slots = expectedRhythm(rest)
  const starts = slots.map((slot) => slot.start)
  const chord = chordAt(spans, starts.at(-1)!, label)
  const target = expectedTarget(phrase, lead, rest, chord, label)
  if (target === null) return { notes: null, reading: 'as-drawn' }
  const built = expectedPitches(phrase, spans, shape, starts, target, label)
  if (built === null) return { notes: null, reading: 'as-drawn' }
  const notes = slots.map((slot, index) => ({ pitch: built.pitches[index]!, ...slot }))
  return { notes, reading: built.reading }
}

/** Whether `note` lies wholly inside `rest`. */
function inside(note: PitchedNote, rest: LeadRest): boolean {
  return (
    compareRational(rest.start, note.start) <= 0 &&
    compareRational(
      addRational(note.start, note.duration),
      addRational(rest.start, rest.duration),
    ) <= 0
  )
}

/**
 * Assert the Fills part of a phrase against §6.5: per lead rest of a beat or more, one shape drawn
 * from the phrase's `fill-shape` stream (none for a shorter rest), and either no note, only when
 * the rules place none, or the fill rebuilt from the rules: min(4, eighths − 1) eighth notes from
 * one eighth in, the last to the rest end or one beat, ending on the target, built backwards in
 * the drawn shape, flipped whole or else reversed note by note at the window's edges (a turn's
 * step taken on the target's other side); no note outside those rests or the window; velocity 64.
 * Returns what it counted.
 */
export function expectFillsInvariants(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  notes: readonly PartNote[],
  label: string,
): FillsCounts {
  const spans = chordSpans(phrase.harmony)
  const stream = deriveNamedStream(phrase.seed, 'fill-shape')
  const actual = notes.map((note) => pitchedNote(note, label))
  const longRests = lead.rests.filter((rest) => compareRational(rest.duration, ONE_BEAT) >= 0)
  const shapes: Record<Shape, number> = {
    'rising-arpeggio': 0,
    'falling-arpeggio': 0,
    'rising-scale': 0,
    'falling-scale': 0,
    turn: 0,
  }
  const counts = {
    fills: 0,
    emptyFills: 0,
    shortened: 0,
    wholeShapeFlips: 0,
    perNoteFallbacks: 0,
    turnOtherSide: 0,
    phraseEndFills: 0,
    chordChangeFills: 0,
  }
  const expected: PitchedNote[] = []
  for (const rest of longRests) {
    const shape = SHAPES[stream.next() % SHAPES.length]!
    const fill = expectedFill(phrase, lead, spans, rest, shape, label)
    const where = `${label}: fill in the rest at ${ratText(rest.start)}`
    expect(
      actual.filter((note) => inside(note, rest)),
      where,
    ).toEqual(fill.notes ?? [])
    if (fill.notes === null) {
      counts.emptyFills += 1
      continue
    }
    expected.push(...fill.notes)
    counts.fills += 1
    shapes[shape] += 1
    if (fill.notes.length < MOST_NOTES) counts.shortened += 1
    if (fill.reading === 'whole-shape-flip') counts.wholeShapeFlips += 1
    if (fill.reading === 'per-note-fallback') counts.perNoteFallbacks += 1
    if (fill.reading === 'turn-other-side') counts.turnOtherSide += 1
    const end = addRational(rest.start, rest.duration)
    if (equalsRational(end, makeRational(phrase.timeline.measures.length, 1))) {
      counts.phraseEndFills += 1
    }
    const chords = new Set(fill.notes.map((note) => chordAt(spans, note.start, label)))
    if (chords.size > 1) counts.chordChangeFills += 1
  }
  expect(actual, `${label}: fills notes`).toEqual(expected)
  const { minMidi, maxMidi } = phrase.window.range
  for (const note of notes) expect(note.velocity, label).toBe(RELATION_PART_VELOCITY)
  for (const note of actual) {
    const where = `${label}: fills note at ${ratText(note.start)}`
    expect(note.pitch, where).toBeGreaterThanOrEqual(minMidi)
    expect(note.pitch, where).toBeLessThanOrEqual(maxMidi)
    expect(
      longRests.some((rest) => inside(note, rest)),
      `${where} lies in a long rest`,
    ).toBe(true)
  }
  return { ...counts, shapes }
}

/** The relation parts' notes as half-open spans, one list per part. */
type Sounding = readonly { readonly start: Rational; readonly end: Rational }[]

/** The notes' half-open sounding spans. */
function sounding(notes: readonly PartNote[]): Sounding {
  return notes.map((note) => ({ start: note.start, end: addRational(note.start, note.duration) }))
}

/**
 * Assert §6.6 across the relation parts: at no instant do a Thirds note and a Fills note both
 * sound, and at no instant do Thirds, Counter-melody and Fills all three sound. Notes sound over
 * half-open spans, so which parts sound changes only at a note's start or end: each such instant
 * is checked.
 */
export function expectRelationOverlap(
  thirds: readonly PartNote[],
  counterMelody: readonly PartNote[],
  fills: readonly PartNote[],
  label: string,
): void {
  const parts = [sounding(thirds), sounding(counterMelody), sounding(fills)]
  const instants = parts.flat().flatMap((span) => [span.start, span.end])
  for (const at of instants) {
    const [third, counter, fill] = parts.map((spans) => spans.some((span) => holds(span, at)))
    const where = `${label}: at ${ratText(at)}`
    expect(third === true && fill === true, `${where}, Thirds and Fills both sound`).toBe(false)
    expect(third === true && counter === true && fill === true, `${where}, all three sound`).toBe(
      false,
    )
  }
}
