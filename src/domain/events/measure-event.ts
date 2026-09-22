/**
 * The closed discriminated union of note and rest events that tile a measure. A note event
 * carries a validated ConcertPitch (see ./concert-pitch.ts) and tie-continuation intent — whether
 * this note's attack is a tied continuation of the previous note's pitch rather than a new
 * attack. Durations are exact Rational whole-note values (see ../time/rational.ts); the
 * first-release sixteenth-note grid policy (see ../time/grid.ts) is enforced by the boundary
 * parser and by measure-level tiling validation, not by these constructors directly, so the
 * event shape itself stays independent of that release policy.
 */

import { type Rational, compareRational, makeRational } from '../time/rational'
import { deepFreeze } from './deep-freeze'
import { type ConcertPitch } from './concert-pitch'

/**
 * Optional musical and validation annotations an event may carry. Free-form strings: the
 * controlled annotation vocabularies (chord degree, tension role, phrase function, profile-range
 * source rule) belong to later steps' harmony/profile work and are intentionally not invented
 * here; this slot exists so those steps can attach annotations without a later shape change.
 */
export interface EventAnnotations {
  readonly musical?: string
  readonly validation?: string
}

/** Typed failure for a rejected attempt to construct a note or rest event. */
// @spec-link [[entity_concert_event_timeline]]
export class MeasureEventConstructionError extends Error {
  readonly kind = 'MeasureEventConstructionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MeasureEventConstructionError'
  }
}

/** A sounding note event: an attack (or tie continuation) at a validated concert pitch. */
// @spec-link [[entity_concert_event_timeline]]
export interface NoteEvent {
  readonly kind: 'note'
  readonly duration: Rational
  readonly pitch: ConcertPitch
  readonly tieContinuation: boolean
  readonly annotations?: EventAnnotations
}

/** A silent rest event occupying its exact duration. */
// @spec-link [[entity_concert_event_timeline]]
export interface RestEvent {
  readonly kind: 'rest'
  readonly duration: Rational
  readonly annotations?: EventAnnotations
}

/** The closed union of measure-tiling events. */
// @spec-link [[entity_concert_event_timeline]]
export type MeasureEvent = NoteEvent | RestEvent

const ZERO_DURATION = makeRational(0, 1)

/** Intent: reject a non-positive event duration as a typed failure before construction proceeds. */
function assertPositiveDuration(duration: Rational): void {
  if (compareRational(duration, ZERO_DURATION) <= 0) {
    throw new MeasureEventConstructionError(
      `Event duration ${duration.numerator}/${duration.denominator} must be strictly positive.`,
    )
  }
}

interface NoteEventInput {
  readonly duration: Rational
  readonly pitch: ConcertPitch
  readonly tieContinuation: boolean
  readonly annotations?: EventAnnotations
}

/**
 * Intent: construct an immutable, deep-frozen NoteEvent from already-validated inputs (a
 * Rational duration, a validated ConcertPitch, and tie-continuation intent). Rejects a
 * non-positive duration as a typed failure; never defaults or coerces.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeNoteEvent(input: NoteEventInput): NoteEvent {
  assertPositiveDuration(input.duration)

  const event: NoteEvent =
    input.annotations === undefined
      ? {
          kind: 'note',
          duration: input.duration,
          pitch: input.pitch,
          tieContinuation: input.tieContinuation,
        }
      : {
          kind: 'note',
          duration: input.duration,
          pitch: input.pitch,
          tieContinuation: input.tieContinuation,
          annotations: input.annotations,
        }

  return deepFreeze(event)
}

interface RestEventInput {
  readonly duration: Rational
  readonly annotations?: EventAnnotations
}

/**
 * Intent: construct an immutable, deep-frozen RestEvent from an already-validated Rational
 * duration. Rejects a non-positive duration as a typed failure; never defaults or coerces.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeRestEvent(input: RestEventInput): RestEvent {
  assertPositiveDuration(input.duration)

  const event: RestEvent =
    input.annotations === undefined
      ? { kind: 'rest', duration: input.duration }
      : { kind: 'rest', duration: input.duration, annotations: input.annotations }

  return deepFreeze(event)
}
