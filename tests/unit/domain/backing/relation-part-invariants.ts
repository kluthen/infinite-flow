/**
 * An independent oracle for the Thirds part (master spec §6.3) and the shared reading both
 * relation-part oracles use: written from the rules alone, it reads nothing of the parts' own
 * helpers, and asserts with vitest's `expect`, the phrase's label as the message. Its Thirds check
 * also holds the §6.6 half that concerns Thirds: a Thirds note sounds only while a lead note
 * sounds. The Counter-melody oracle is in ./counter-melody-invariants.ts. Test plumbing.
 */

import { expect } from 'vitest'

import type { ArrangerPhrase, PartNote } from '@/domain/backing/accompaniment-part'
import type { LeadFacts, LeadNote } from '@/domain/backing/lead-facts'
import { chordTones, type HarmonyEvent } from '@/domain/harmony/harmony-types'
import { addRational, compareRational, makeRational, type Rational } from '@/domain/time/rational'

/** The velocity every Thirds and Counter-melody note carries. */
export const RELATION_PART_VELOCITY = 64

/** The lowest MIDI pitch a relation part sounds. */
export const RELATION_PART_FLOOR = 48

const OCTAVE = 12
const SCALE_SIZE = 7
const ONE_BEAT = makeRational(1, 4)
const THIRD_STEPS = 2
const SIXTH_STEPS = 5

/** A pitched part note reduced to what the rules speak of. */
export interface PitchedNote {
  readonly pitch: number
  readonly start: Rational
  readonly duration: Rational
}

/** A harmony event's span in whole notes from the phrase's start. */
export interface ChordSpan {
  readonly event: HarmonyEvent
  readonly start: Rational
  readonly end: Rational
}

/** What one phrase's Thirds check counted. */
export interface ThirdsCounts {
  /** Thirds notes the part gave. */
  readonly doubled: number
  /** Lead notes the rhythm rule would double but that lie outside the scale. */
  readonly chromaticLeftOut: number
  /** Doublings that took the other interval because the chosen one was under the floor. */
  readonly floorFallbacks: number
  /** Lead notes left undoubled because both intervals were under the floor. */
  readonly floorDropped: number
}

/** The pitch class 0-11 of a MIDI pitch or of an interval in half steps. */
export function pitchClass(value: number): number {
  return ((value % OCTAVE) + OCTAVE) % OCTAVE
}

/** A rational as `n/d`, for messages. */
export function ratText(value: Rational): string {
  return `${value.numerator}/${value.denominator}`
}

/** A part note's pitch, start and length; throws on a drum note, which no relation part has. */
export function pitchedNote(note: PartNote, label: string): PitchedNote {
  if (note.sound.kind !== 'pitch') throw new Error(`${label}: a drum note in a relation part.`)
  return { pitch: note.sound.pitch, start: note.start, duration: note.duration }
}

/** Each harmony event with its span: [bar × 4 + start beat, + duration beats) in quarter notes. */
export function chordSpans(harmony: readonly HarmonyEvent[]): readonly ChordSpan[] {
  return harmony.map((event) => {
    const start = makeRational(event.barIndex * 4 + event.startBeat, 4)
    return { event, start, end: addRational(start, makeRational(event.durationBeats, 4)) }
  })
}

/** Whether `at` lies in the half-open span [start, end). */
export function holds(span: { start: Rational; end: Rational }, at: Rational): boolean {
  return compareRational(span.start, at) <= 0 && compareRational(at, span.end) < 0
}

/** The harmony event whose span holds `at`; throws when none does. */
function eventAt(spans: readonly ChordSpan[], at: Rational, label: string): HarmonyEvent {
  const span = spans.find((candidate) => holds(candidate, at))
  if (span === undefined) throw new Error(`${label}: no harmony event holds ${ratText(at)}.`)
  return span.event
}

/** Whether a lead note's rhythm makes it a doubling candidate: a beat or longer, or on beat 1 or 3. */
function rhythmDoubles(note: LeadNote): boolean {
  if (compareRational(note.duration, ONE_BEAT) >= 0) return true
  return makeRational(note.start.numerator * 2, note.start.denominator).denominator === 1
}

/** The nearest MIDI pitch strictly below `pitch` whose pitch class is `target`. */
function nearestBelow(pitch: number, target: number): number {
  for (let below = pitch - 1; below >= pitch - OCTAVE; below -= 1) {
    if (pitchClass(below) === target) return below
  }
  throw new Error(`No pitch of class ${target} within an octave below ${pitch}.`)
}

/** The expected doubling of a scale note on step `step`, or null when both choices are too low. */
function expectedDoubling(
  pitch: number,
  step: number,
  scale: readonly number[],
  chord: HarmonyEvent,
): { readonly pitch: number; readonly fallback: boolean } | null {
  const below = (steps: number) =>
    nearestBelow(pitch, scale[(step - steps + SCALE_SIZE) % SCALE_SIZE]!)
  const third = below(THIRD_STEPS)
  const sixth = below(SIXTH_STEPS)
  const tones: readonly number[] = chordTones(chord)
  const sixthChosen = tones.includes(pitchClass(sixth)) && !tones.includes(pitchClass(third))
  const [chosen, other] = sixthChosen ? [sixth, third] : [third, sixth]
  if (chosen >= RELATION_PART_FLOOR) return { pitch: chosen, fallback: false }
  if (other >= RELATION_PART_FLOOR) return { pitch: other, fallback: true }
  return null
}

/**
 * Assert the Thirds part of a phrase against §6.3 and §6.6: exactly one note per lead note the
 * rhythm rule doubles that is in the scale and has a doubling at or above the floor, at that lead
 * note's start and length, a diatonic third or sixth below as the chord picks it; no chromatic
 * lead note doubled; no note under the floor; every note inside a sounding lead note; velocity 64.
 * Returns what it counted.
 */
export function expectThirdsInvariants(
  phrase: ArrangerPhrase,
  lead: LeadFacts,
  notes: readonly PartNote[],
  label: string,
): ThirdsCounts {
  const scale: readonly number[] = phrase.scale.pitchClasses
  if (new Set(scale).size !== SCALE_SIZE) throw new Error(`${label}: not a seven-note scale.`)
  const spans = chordSpans(phrase.harmony)
  const expected: PitchedNote[] = []
  let chromaticLeftOut = 0
  let floorFallbacks = 0
  let floorDropped = 0
  for (const note of lead.notes) {
    if (!rhythmDoubles(note)) continue
    const step = scale.indexOf(pitchClass(note.pitch))
    if (step < 0) {
      chromaticLeftOut += 1
      continue
    }
    const chord = eventAt(spans, note.start, label)
    const doubling = expectedDoubling(note.pitch, step, scale, chord)
    if (doubling === null) floorDropped += 1
    else {
      if (doubling.fallback) floorFallbacks += 1
      expected.push({ pitch: doubling.pitch, start: note.start, duration: note.duration })
    }
  }
  const actual = notes.map((note) => pitchedNote(note, label))
  expect(actual, `${label}: thirds notes`).toEqual(expected)
  for (const note of notes) expect(note.velocity, label).toBe(RELATION_PART_VELOCITY)
  for (const note of actual) expectThirdsNoteBounds(note, lead, scale, label)
  return { doubled: notes.length, chromaticLeftOut, floorFallbacks, floorDropped }
}

/**
 * Assert one Thirds note on its own: at or above the floor, inside a lead note that sounds over its
 * whole length (so Thirds never sound in the lead's rests, §6.6), that lead note in the scale.
 */
function expectThirdsNoteBounds(
  note: PitchedNote,
  lead: LeadFacts,
  scale: readonly number[],
  label: string,
): void {
  const where = `${label}: thirds note at ${ratText(note.start)}`
  expect(note.pitch, where).toBeGreaterThanOrEqual(RELATION_PART_FLOOR)
  const end = addRational(note.start, note.duration)
  const under = lead.notes.find(
    (leadNote) =>
      compareRational(leadNote.start, note.start) <= 0 &&
      compareRational(end, addRational(leadNote.start, leadNote.duration)) <= 0,
  )
  expect(under, `${where} sounds while a lead note sounds`).toBeDefined()
  expect(scale, `${where} doubles a scale note`).toContain(pitchClass(under!.pitch))
}
