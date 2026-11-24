/**
 * The Fills (responding) part of a phrase's accompaniment, rendered from the phrase and its lead
 * facts: a short fill of eighth notes in every lead rest of a beat or more, ending on a target
 * tone that leads into the lead's next note (or, at the phrase's end, on the chord's root), its
 * earlier notes built backwards from the target in one of five shapes drawn from the phrase's
 * seed, every note inside the lead's register window. Pure arithmetic in whole-note rationals
 * from the phrase's start.
 */

import { makeConcertPitch } from '../events/concert-pitch'
import { FOUR_FOUR_METER, PHRASE_MEASURE_COUNT } from '../generation/generation-request-envelope'
import { chordTones, type HarmonyEvent } from '../harmony/harmony-types'
import { deriveNamedStream } from '../random/streams'
import {
  addRational,
  compareRational,
  equalsRational,
  makeRational,
  subtractRational,
  type Rational,
} from '../time/rational'
import { makePartNote, type ArrangerPhrase, type PartNote } from './accompaniment-part'
import type { LeadFacts, LeadRest } from './lead-facts'

/** The shortest lead rest that holds a fill: one beat, in whole notes. */
// @spec-link [[rule_responding_part_in_long_rests]]
export const FILL_MIN_REST: Rational = makeRational(1, FOUR_FOUR_METER.beatUnit)

/** The length of a fill's notes, its last one aside: an eighth, in whole notes. */
// @spec-link [[rule_responding_part_rhythm]]
export const FILL_NOTE_LENGTH: Rational = makeRational(1, 8)

/** The most notes a fill holds. */
// @spec-link [[rule_responding_part_rhythm]]
export const FILL_MAX_NOTES = 4

/** The longest a fill's last note lasts: one beat, in whole notes. */
// @spec-link [[rule_responding_part_rhythm]]
export const FILL_LAST_NOTE_MAX: Rational = makeRational(1, FOUR_FOUR_METER.beatUnit)

/** The five shapes a fill takes, in the order the shape draw indexes them. */
// @spec-link [[rule_responding_part_shapes]]
export const FILL_SHAPES = [
  'rising-arpeggio',
  'falling-arpeggio',
  'rising-scale',
  'falling-scale',
  'turn',
] as const

/** One fill shape. */
// @spec-link [[rule_responding_part_shapes]]
export type FillShape = (typeof FILL_SHAPES)[number]

/** The velocity of the Fills part's notes. */
// @spec-link [[req_responding_part]]
export const FILLS_VELOCITY = 64

const OCTAVE = 12
const BEATS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure
const BEATS_PER_WHOLE_NOTE = FOUR_FOUR_METER.beatUnit
const PHRASE_END = makeRational(PHRASE_MEASURE_COUNT, 1)

/** A direction to walk in pitch: +1 up, -1 down. */
type Direction = 1 | -1

/** The inclusive MIDI bounds every fill note stays inside. */
interface Bounds {
  readonly low: number
  readonly high: number
}

/** A fill note's start and length, before its pitch is known. */
interface Slot {
  readonly start: Rational
  readonly duration: Rational
}

/**
 * The Fills part's notes for a phrase, in start order: per lead rest of at least
 * `FILL_MIN_REST`, one shape drawn from the phrase's `fill-shape` stream before anything else,
 * then that rest's fill, possibly empty; a shorter rest draws nothing. Deterministic and pure.
 * Throws an Error when a rest ends before the phrase's end with no lead note starting there, or
 * when no harmony event holds a fill note's start.
 */
// @spec-link [[req_accompaniment_parts]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
// @spec-link [[req_responding_part]]
export function fillsPart(phrase: ArrangerPhrase, lead: LeadFacts): readonly PartNote[] {
  const stream = deriveNamedStream(phrase.seed, 'fill-shape')
  return lead.rests.filter(holdsFill).flatMap((rest) => {
    const shape = FILL_SHAPES[stream.next() % FILL_SHAPES.length]!
    return restFill(phrase, lead, rest, shape)
  })
}

/** Whether a lead rest is long enough to hold a fill. */
// @spec-link [[rule_responding_part_in_long_rests]]
function holdsFill(rest: LeadRest): boolean {
  return compareRational(rest.duration, FILL_MIN_REST) >= 0
}

/**
 * One rest's fill in `shape`: its notes' starts and lengths, its target, then its pitches built
 * backwards from the target; empty when the window holds no target or the shape cannot stay in it.
 */
function restFill(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  rest: LeadRest,
  shape: FillShape,
): PartNote[] {
  const slots = fillRhythm(rest)
  const bounds = { low: phrase.window.range.minMidi, high: phrase.window.range.maxMidi }
  const starts = slots.map((slot) => slot.start)
  const target = fillTarget(phrase, lead, rest, starts.at(-1)!, bounds)
  if (target === null) return []
  const pitches = shapePitches(phrase, shape, starts, target, bounds)
  if (pitches === null) return []
  return slots.map((slot, index) => {
    const sound = { kind: 'pitch', pitch: makeConcertPitch(pitches[index]!) } as const
    return makePartNote(slot.start, slot.duration, sound, FILLS_VELOCITY)
  })
}

/**
 * A fill's notes' starts and lengths in `rest`: one per eighth that starts a whole eighth before
 * the rest ends, the first one eighth in, at most `FILL_MAX_NOTES`; each `FILL_NOTE_LENGTH` long
 * but the last, which lasts until the rest ends or `FILL_LAST_NOTE_MAX`, whichever is shorter.
 */
// @spec-link [[rule_responding_part_rhythm]]
function fillRhythm(rest: LeadRest): Slot[] {
  const eighths = Math.floor(
    (rest.duration.numerator * FILL_NOTE_LENGTH.denominator) /
      (rest.duration.denominator * FILL_NOTE_LENGTH.numerator),
  )
  const count = Math.min(FILL_MAX_NOTES, eighths - 1)
  const end = addRational(rest.start, rest.duration)
  return Array.from({ length: count }, (_, index) => {
    const start = addRational(rest.start, makeRational(index + 1, FILL_NOTE_LENGTH.denominator))
    if (index < count - 1) return { start, duration: FILL_NOTE_LENGTH }
    const toEnd = subtractRational(end, start)
    const capped = compareRational(toEnd, FILL_LAST_NOTE_MAX) < 0 ? toEnd : FILL_LAST_NOTE_MAX
    return { start, duration: capped }
  })
}

/**
 * The fill's target, its last note, starting at `start`: of the tones of the chord sounding there
 * inside the window, the one nearest the lead note starting at the rest's end without being its
 * pitch; for a rest ending the phrase, the chord's root nearest the window's centre; the lower on
 * a tie; null when the window holds none. Throws an Error when the rest ends before the phrase's
 * end and no lead note starts there, which lead facts tiling the phrase never leave.
 */
// @spec-link [[rule_responding_part_target]]
function fillTarget(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  rest: LeadRest,
  start: Rational,
  bounds: Bounds,
): number | null {
  const chord = chordAt(phrase.harmony, start)
  const end = addRational(rest.start, rest.duration)
  if (equalsRational(end, PHRASE_END)) {
    const root = chord.triad.pitchClasses[0]
    const centre = (bounds.low + bounds.high) / 2
    return nearest(bounds, (pitch) => pitchClassOf(pitch) === root, centre)
  }
  const next = lead.notes.find((note) => equalsRational(note.start, end))
  if (next === undefined) {
    throw new Error(`fills: no lead note starts where the rest ending at ${ratText(end)} ends`)
  }
  const tones: readonly number[] = chordTones(chord)
  /** Whether `pitch` is a chord tone other than the lead's next note. */
  const fits = (pitch: number) => pitch !== next.pitch && tones.includes(pitchClassOf(pitch))
  return nearest(bounds, fits, next.pitch)
}

/** Of the window's pitches that `fits`, the one nearest `aim`, the lower on a tie; null if none. */
function nearest(bounds: Bounds, fits: (pitch: number) => boolean, aim: number): number | null {
  let best: number | null = null
  for (let pitch = bounds.low; pitch <= bounds.high; pitch += 1) {
    if (fits(pitch) && (best === null || Math.abs(pitch - aim) < Math.abs(best - aim))) best = pitch
  }
  return best
}

/**
 * The fill's pitches, one per start, the last `target`, the others built backwards from it in
 * `shape`; a fill of fewer than four notes builds only the shape's last notes. An arpeggio note
 * takes a tone of the chord sounding at its own start, a scale note a step of the phrase's scale.
 * A rising or falling shape that leaves the window is played whole the other way (a rising
 * arpeggio as a falling one), and when that leaves it too, reversed note by note. Null when the
 * shape cannot stay inside the window.
 */
// @spec-link [[rule_responding_part_shapes]]
function shapePitches(
  phrase: ArrangerPhrase,
  shape: FillShape,
  starts: readonly Rational[],
  target: number,
  bounds: Bounds,
): number[] | null {
  const scale: readonly number[] = phrase.scale.pitchClasses
  if (shape === 'turn') return turnPitches(scale, starts.length, target, bounds)
  /** The pitch classes of each earlier note, from the one before the target backwards. */
  const pools = starts
    .slice(0, -1)
    .reverse()
    .map((start) =>
      shape.endsWith('arpeggio') ? chordTones(chordAt(phrase.harmony, start)) : scale,
    )
  const backwards: Direction = shape.startsWith('rising') ? -1 : 1
  return (
    straightInWindow(target, backwards, pools, bounds) ??
    straightInWindow(target, backwards === 1 ? -1 : 1, pools, bounds) ??
    reversedInWindow(target, backwards, pools, bounds)
  )
}

/**
 * The shape built backwards from `target` in `direction` alone, one earlier note per pool (the
 * note before the target's first), each the nearest pool pitch strictly beyond the note after it;
 * in play order. Null when any note leaves the window.
 */
// @spec-link [[rule_responding_part_register]]
function straightInWindow(
  target: number,
  direction: Direction,
  pools: readonly (readonly number[])[],
  bounds: Bounds,
): number[] | null {
  const pitches = [target]
  for (const pool of pools) {
    const pitch = nextInPool(pitches[0]!, direction, pool)
    if (pitch < bounds.low || pitch > bounds.high) return null
    pitches.unshift(pitch)
  }
  return pitches
}

/**
 * The shape built backwards from `target` reversing note by note, one earlier note per pool: each
 * steps in the current direction or, when that leaves the window, the other way, keeping the
 * direction it took; in play order. Null when a note leaves the window both ways.
 */
// @spec-link [[rule_responding_part_register]]
function reversedInWindow(
  target: number,
  direction: Direction,
  pools: readonly (readonly number[])[],
  bounds: Bounds,
): number[] | null {
  let way = direction
  const pitches = [target]
  for (const pool of pools) {
    const step = stepInWindow(pitches[0]!, way, pool, bounds)
    if (step === null) return null
    way = step.direction
    pitches.unshift(step.pitch)
  }
  return pitches
}

/**
 * The last `count` notes of the turn around `target` — a scale step above, the target, a scale
 * step below, the target — each step that would leave the window taken on the target's other side.
 * Null when a sounding step leaves the window on both sides.
 */
// @spec-link [[rule_responding_part_shapes]]
function turnPitches(
  scale: readonly number[],
  count: number,
  target: number,
  bounds: Bounds,
): number[] | null {
  const turn = [1, 0, -1, 0] as const
  const pitches: number[] = []
  for (const offset of turn.slice(turn.length - count)) {
    if (offset === 0) pitches.push(target)
    else {
      const step = stepInWindow(target, offset, scale, bounds)
      if (step === null) return null
      pitches.push(step.pitch)
    }
  }
  return pitches
}

/**
 * The nearest pitch strictly beyond `from` in `direction` whose pitch class is in `pool`, with the
 * direction it was found in: when that pitch leaves the window, the nearest one the other way,
 * the direction reversed. Null when that leaves the window too.
 */
// @spec-link [[rule_responding_part_register]]
function stepInWindow(
  from: number,
  direction: Direction,
  pool: readonly number[],
  bounds: Bounds,
): { readonly pitch: number; readonly direction: Direction } | null {
  const reversed: Direction = direction === 1 ? -1 : 1
  for (const way of [direction, reversed]) {
    const pitch = nextInPool(from, way, pool)
    if (pitch >= bounds.low && pitch <= bounds.high) return { pitch, direction: way }
  }
  return null
}

/** The nearest pitch strictly beyond `from` in `direction` whose pitch class is in `pool`. */
function nextInPool(from: number, direction: Direction, pool: readonly number[]): number {
  for (let distance = 1; distance <= OCTAVE; distance += 1) {
    const pitch = from + direction * distance
    if (pool.includes(pitchClassOf(pitch))) return pitch
  }
  throw new Error(`fills: no pitch class of [${pool.join(', ')}] within an octave of ${from}`)
}

/**
 * The harmony event whose span, [barIndex * 4 + startBeat, + durationBeats) in beats from the
 * phrase's start, holds `at`, compared exactly by cross-multiplying. Throws an Error when none does.
 */
function chordAt(harmony: readonly HarmonyEvent[], at: Rational): HarmonyEvent {
  const scaled = at.numerator * BEATS_PER_WHOLE_NOTE
  const holding = harmony.find((event) => {
    const spanStart = event.barIndex * BEATS_PER_MEASURE + event.startBeat
    const spanEnd = spanStart + event.durationBeats
    return spanStart * at.denominator <= scaled && scaled < spanEnd * at.denominator
  })
  if (holding === undefined) throw new Error(`fills: no harmony event holds ${ratText(at)}`)
  return holding
}

/** The pitch class 0-11 of a MIDI pitch. */
function pitchClassOf(pitch: number): number {
  return ((pitch % OCTAVE) + OCTAVE) % OCTAVE
}

/** A rational as `n/d`, for messages. */
function ratText(value: Rational): string {
  return `${value.numerator}/${value.denominator}`
}
