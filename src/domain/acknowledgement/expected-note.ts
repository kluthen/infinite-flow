/**
 * Expected notes: the notes of a generated phrase the player can be acknowledged for, placed on the
 * audio clock. Every fresh attack (a note that is not a tie continuation) is one expected note. A
 * tie continuation lengthens the attack it belongs to, even across a barline, and a rest has no
 * expected note. Each expected note keeps the identity the notation addresses a note by: its phrase
 * number, its measure, and the index of its attack among that measure's events.
 */

import { type ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import { type Measure, type MeasureIndex } from '../events/measure'
import { type ConcertEventTimeline } from '../events/timeline'
import { addRational, makeRational, type Rational } from '../time/rational'

const ZERO = makeRational(0, 1)
const SECONDS_PER_MINUTE = 60
/** In 4/4 a whole note lasts four quarter-note beats. */
const BEATS_PER_WHOLE_NOTE = 4

/** Typed failure for a phrase or placement that cannot yield expected notes. */
// @spec-link [[rule_expected_note_window]]
export class ExpectedNoteDerivationError extends Error {
  readonly kind = 'ExpectedNoteDerivationError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ExpectedNoteDerivationError'
  }
}

/**
 * Which note of the session an expected note is: the phrase number (1 for the session's first
 * phrase), the measure within the phrase, and the index of the attack among that measure's events,
 * rests included. This is the only thing acknowledgement ever reports about a note.
 */
// @spec-link [[rule_expected_note_window]]
export interface ExpectedNoteIdentity {
  readonly phraseNumber: number
  readonly measureIndex: MeasureIndex
  readonly eventIndex: number
}

/**
 * One expected note on the audio clock: its identity, its concert pitch, the onset of its attack,
 * and the end of its full sounding span (the attack plus every tie continuation after it), in
 * seconds.
 */
// @spec-link [[rule_expected_note_window]]
export interface ExpectedNote {
  readonly identity: ExpectedNoteIdentity
  readonly pitch: ConcertPitch
  readonly onsetSeconds: number
  readonly soundingEndSeconds: number
}

/** Where a phrase sits in the session: its number, its first downbeat on the audio clock, its tempo. */
export interface PhrasePlacement {
  readonly phraseNumber: number
  readonly startSeconds: number
  readonly tempoBpm: number
}

/**
 * Intent: list a phrase's expected notes in time order, on the audio clock. Rejects a placement
 * with a phrase number below 1 or not whole, a start time that is not a finite number, or a tempo
 * that is not a positive finite number; rejects a phrase whose tie continuation follows a rest or
 * opens the phrase, or carries a different pitch from the note it continues. Never guesses around
 * a malformed phrase.
 */
// @spec-link [[rule_expected_note_window]]
export function deriveExpectedNotes(
  timeline: ConcertEventTimeline,
  placement: PhrasePlacement,
): readonly ExpectedNote[] {
  assertPlacement(placement)
  const toSeconds = wholeNotesToSeconds(placement)
  const notes: ExpectedNote[] = []
  // The note a tie continuation may extend: the last event read was a note. A rest clears it.
  let sounding: { pitch: ConcertPitch; noteIndex: number } | null = null
  let position = ZERO

  for (const measure of timeline.measures) {
    measure.events.forEach((event, eventIndex) => {
      const end = addRational(position, event.duration)
      if (event.kind === 'rest') {
        sounding = null
      } else if (event.tieContinuation) {
        sounding = extendTiedNote(notes, sounding, event.pitch, toSeconds(end), measure, eventIndex)
      } else {
        notes.push({
          identity: {
            phraseNumber: placement.phraseNumber,
            measureIndex: measure.measureIndex,
            eventIndex,
          },
          pitch: event.pitch,
          onsetSeconds: toSeconds(position),
          soundingEndSeconds: toSeconds(end),
        })
        sounding = { pitch: event.pitch, noteIndex: notes.length - 1 }
      }
      position = end
    })
  }

  return deepFreeze(notes)
}

/** Intent: reject a phrase number, start time or tempo that cannot place a phrase on the clock. */
function assertPlacement(placement: PhrasePlacement): void {
  if (!Number.isInteger(placement.phraseNumber) || placement.phraseNumber < 1) {
    throw new ExpectedNoteDerivationError(
      `The phrase number must be a whole number from 1, got ${placement.phraseNumber}.`,
    )
  }
  if (!Number.isFinite(placement.startSeconds)) {
    throw new ExpectedNoteDerivationError(
      `The phrase start must be a finite audio-clock time, got ${placement.startSeconds}.`,
    )
  }
  if (!Number.isFinite(placement.tempoBpm) || placement.tempoBpm <= 0) {
    throw new ExpectedNoteDerivationError(
      `The tempo must be a positive number of beats per minute, got ${placement.tempoBpm}.`,
    )
  }
}

/**
 * Intent: the conversion from a position in the phrase, in whole notes from its first downbeat,
 * to the audio clock. In 4/4 a whole note is four quarter-note beats, so it lasts 240 / tempo
 * seconds.
 */
function wholeNotesToSeconds(placement: PhrasePlacement): (position: Rational) => number {
  return (position) =>
    placement.startSeconds +
    (position.numerator * SECONDS_PER_MINUTE * BEATS_PER_WHOLE_NOTE) /
      (position.denominator * placement.tempoBpm)
}

/**
 * Intent: lengthen the sounding note a tie continuation belongs to, so its sounding span ends
 * where the continuation ends. Rejects a continuation with no note sounding just before it (it
 * opens the phrase or follows a rest) or at a different pitch from that note.
 */
function extendTiedNote(
  notes: ExpectedNote[],
  sounding: { pitch: ConcertPitch; noteIndex: number } | null,
  pitch: ConcertPitch,
  endSeconds: number,
  measure: Measure,
  eventIndex: number,
): { pitch: ConcertPitch; noteIndex: number } {
  const where = `measure ${measure.measureIndex}, event ${eventIndex}`
  if (sounding === null) {
    throw new ExpectedNoteDerivationError(
      `The tie continuation at ${where} has no note sounding before it to continue.`,
    )
  }
  if (sounding.pitch !== pitch) {
    throw new ExpectedNoteDerivationError(
      `The tie continuation at ${where} is at pitch ${pitch}, but continues pitch ${sounding.pitch}.`,
    )
  }
  const attack = notes[sounding.noteIndex]!
  notes[sounding.noteIndex] = { ...attack, soundingEndSeconds: endSeconds }
  return sounding
}
