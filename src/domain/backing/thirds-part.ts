/**
 * The Thirds (highlighting) part of a phrase's accompaniment, rendered from the phrase's scale and
 * its lead facts: some of the lead's notes, each doubled below at a scale step read from the
 * phrase's scale and the chord at the note's start, at the lead note's own start and length.
 */

import { makeConcertPitch, type ConcertPitch } from '../events/concert-pitch'
import { FOUR_FOUR_METER } from '../generation/generation-request-envelope'
import { chordTones, type HarmonyCollection, type HarmonyEvent } from '../harmony/harmony-types'
import type { Rational } from '../time/rational'
import { makePartNote, type ArrangerPhrase, type PartNote } from './accompaniment-part'
import type { LeadFacts, LeadNote } from './lead-facts'

/** The lowest concert MIDI pitch the part may sound. */
// @spec-link [[rule_highlighting_part_floor]]
export const THIRDS_FLOOR = 48

/** The velocity of the part's notes. */
// @spec-link [[req_highlighting_part]]
export const THIRDS_VELOCITY = 64

/** Typed failure for a phrase scale the part cannot count its steps in; never repaired. */
// @spec-link [[rule_highlighting_part_pitch]]
export class ThirdsPartError extends Error {
  readonly kind = 'ThirdsPartError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ThirdsPartError'
  }
}

/**
 * The Thirds part's notes for a phrase, in the lead's start order: one note per doubled lead
 * note, at its start and length, at `THIRDS_VELOCITY`; possibly none. Pure and deterministic.
 * Throws a ThirdsPartError when the phrase's scale is not seven distinct pitch classes.
 */
// @spec-link [[req_accompaniment_parts]]
// @spec-link [[rule_part_rests_when_no_note_fits]]
// @spec-link [[req_highlighting_part]]
export function thirdsPart(phrase: ArrangerPhrase, lead: LeadFacts): readonly PartNote[] {
  const scale = scaleSteps(phrase.scale)
  return lead.notes.flatMap((note) => {
    const step = scale.indexOf(pitchClassOf(note.pitch))
    if (!isDoubled(note, step)) return []
    const pitch = doublingPitch(note.pitch, step, scale, note.chord)
    if (pitch === null) return []
    return [makePartNote(note.start, note.duration, { kind: 'pitch', pitch }, THIRDS_VELOCITY)]
  })
}

const OCTAVE = 12
const SCALE_SIZE = 7
const THIRD_STEPS_BELOW = 2
const SIXTH_STEPS_BELOW = 5
const BEATS_PER_WHOLE_NOTE = FOUR_FOUR_METER.beatUnit
const BEATS_PER_MEASURE = FOUR_FOUR_METER.beatsPerMeasure
/** Beats 1 and 3 of a measure, counted from 0. */
const DOUBLED_BEATS = [0, 2] as const

/** The pitch class 0-11 of a MIDI pitch. */
function pitchClassOf(pitch: number): number {
  return ((pitch % OCTAVE) + OCTAVE) % OCTAVE
}

/**
 * The phrase scale's pitch classes in degree order. Throws a ThirdsPartError when they are not
 * seven distinct pitch classes, since scale steps are counted modulo seven.
 */
function scaleSteps(scale: HarmonyCollection): readonly number[] {
  const steps = scale.pitchClasses
  if (steps.length !== SCALE_SIZE || new Set(steps).size !== SCALE_SIZE) {
    throw new ThirdsPartError(
      `thirds part: the phrase scale [${steps.join(', ')}] is not seven distinct pitch classes`,
    )
  }
  return steps
}

/**
 * Whether `start`, in whole notes from the phrase's start, falls exactly on beat 1 or beat 3 of
 * its measure; compared by cross-multiplying, so the rational need not be reduced.
 */
function startsOnBeatOneOrThree(start: Rational): boolean {
  const beatsTimesDenominator = start.numerator * BEATS_PER_WHOLE_NOTE
  const inMeasure = beatsTimesDenominator % (BEATS_PER_MEASURE * start.denominator)
  return DOUBLED_BEATS.some((beat) => beat * start.denominator === inMeasure)
}

/** Whether the lead note gets a doubling; `step` is its scale step, -1 when outside the scale. */
// @spec-link [[rule_highlighting_part_doubled_notes]]
function isDoubled(note: LeadNote, step: number): boolean {
  if (step < 0) return false
  return note.long || startsOnBeatOneOrThree(note.start)
}

/**
 * The nearest MIDI pitch strictly below `pitch` whose pitch class sits `stepsBelow` scale steps
 * under the scale step `step`; 1 to 11 half steps below, as the two pitch classes differ.
 */
function pitchStepsBelow(
  pitch: ConcertPitch,
  step: number,
  scale: readonly number[],
  stepsBelow: number,
): number {
  const target = scale[(step - stepsBelow + SCALE_SIZE) % SCALE_SIZE]!
  return pitch - pitchClassOf(pitch - target)
}

/**
 * The doubling's concert pitch for a lead note at `pitch` on scale step `step` over `chord`: the
 * third or the sixth below, picked by `chord`'s tones (its seventh included), or the other one
 * when the picked one is under `THIRDS_FLOOR`; null when both are under it.
 */
// @spec-link [[rule_highlighting_part_pitch]]
// @spec-link [[rule_parts_read_chord_as_written]]
function doublingPitch(
  pitch: ConcertPitch,
  step: number,
  scale: readonly number[],
  chord: HarmonyEvent,
): ConcertPitch | null {
  const third = pitchStepsBelow(pitch, step, scale, THIRD_STEPS_BELOW)
  const sixth = pitchStepsBelow(pitch, step, scale, SIXTH_STEPS_BELOW)
  const tones = chordTones(chord)
  /** Whether `candidate`'s pitch class is one of the chord's tones. */
  const isTone = (candidate: number): boolean =>
    tones.some((tone) => tone === pitchClassOf(candidate))
  const sixthPicked = isTone(sixth) && !isTone(third)
  return aboveFloor(sixthPicked ? sixth : third, sixthPicked ? third : sixth)
}

/** `chosen` as a concert pitch when at or above `THIRDS_FLOOR`, else `other` when it is, else null. */
// @spec-link [[rule_highlighting_part_floor]]
function aboveFloor(chosen: number, other: number): ConcertPitch | null {
  if (chosen >= THIRDS_FLOOR) return makeConcertPitch(chosen)
  if (other >= THIRDS_FLOOR) return makeConcertPitch(other)
  return null
}
