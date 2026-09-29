/**
 * The timing window of each expected note: the stretch of the audio clock in which a played note
 * can acknowledge it. Consecutive expected notes share a boundary, so windows never overlap except
 * at that single shared instant, and every window contains its own note's onset however close
 * together the notes are.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type ExpectedNote } from './expected-note'

/**
 * How early a note may be played and still count: a window opens 150 ms before its onset, unless
 * the boundary with the note before it comes later. The value is the one the product owner set
 * for the acknowledgement rule; it is a starting point, to be confirmed by playing on the
 * reference hardware (a breath controller over USB and a USB keyboard) once acknowledgement runs
 * in a live session.
 */
// @spec-link [[rule_expected_note_window]]
export const EARLY_GRACE_SECONDS = 0.15

/**
 * How late a note may be played and still count: a window stays open at least 200 ms after its
 * onset, or until the end of the note's tied sounding span if that is later, unless the boundary
 * with the next note comes sooner. Same origin, and the same confirmation on the reference
 * hardware, as the early grace above.
 */
// @spec-link [[rule_expected_note_window]]
export const LATE_GRACE_SECONDS = 0.2

/** Typed failure for a sequence of expected notes whose windows cannot be placed. */
// @spec-link [[rule_expected_note_window]]
export class AcknowledgementWindowError extends Error {
  readonly kind = 'AcknowledgementWindowError' as const

  constructor(message: string) {
    super(message)
    this.name = 'AcknowledgementWindowError'
  }
}

/** A closed interval of the audio clock, in seconds: both ends belong to the window. */
// @spec-link [[rule_expected_note_window]]
export interface AcknowledgementWindow {
  readonly opensAtSeconds: number
  readonly closesAtSeconds: number
}

/** An expected note together with its timing window. */
// @spec-link [[rule_expected_note_window]]
export interface WindowedExpectedNote extends ExpectedNote {
  readonly window: AcknowledgementWindow
}

/**
 * Intent: the boundary two consecutive expected notes share: the later of 150 ms before the next
 * onset and the point halfway between the two onsets. It always lies strictly between them.
 */
// @spec-link [[rule_expected_note_window]]
export function sharedBoundarySeconds(onsetSeconds: number, nextOnsetSeconds: number): number {
  return Math.max(nextOnsetSeconds - EARLY_GRACE_SECONDS, (onsetSeconds + nextOnsetSeconds) / 2)
}

/**
 * Intent: give every expected note of a time-ordered sequence its window. The first note opens
 * 150 ms before its onset; every later note opens at the boundary with the note before it. A note
 * closes at the later of 200 ms after its onset or the end of its sounding span, but never after
 * the boundary with the next note; the last note of the sequence has no next note to cut it short.
 * Rejects a sequence whose onsets do not strictly increase.
 */
// @spec-link [[rule_expected_note_window]]
export function placeAcknowledgementWindows(
  notes: readonly ExpectedNote[],
): readonly WindowedExpectedNote[] {
  assertStrictlyIncreasingOnsets(notes)
  // boundaries[i] is the boundary between notes[i] and notes[i + 1]. Each is computed once, so a
  // window closes at exactly the value the next window opens at.
  const boundaries = notes
    .slice(1)
    .map((next, index) => sharedBoundarySeconds(notes[index]!.onsetSeconds, next.onsetSeconds))

  return deepFreeze(
    notes.map((note, index): WindowedExpectedNote => {
      const opensAtSeconds =
        index === 0 ? note.onsetSeconds - EARLY_GRACE_SECONDS : boundaries[index - 1]!
      const lateEdge = Math.max(note.onsetSeconds + LATE_GRACE_SECONDS, note.soundingEndSeconds)
      const nextBoundary = boundaries[index]
      const closesAtSeconds =
        nextBoundary === undefined ? lateEdge : Math.min(lateEdge, nextBoundary)
      return { ...note, window: { opensAtSeconds, closesAtSeconds } }
    }),
  )
}

/** Intent: reject a sequence of expected notes that is not in strictly increasing onset order. */
function assertStrictlyIncreasingOnsets(notes: readonly ExpectedNote[]): void {
  notes.forEach((note, index) => {
    if (!Number.isFinite(note.onsetSeconds) || !Number.isFinite(note.soundingEndSeconds)) {
      throw new AcknowledgementWindowError(
        `Expected note ${index} has a time that is not a finite number.`,
      )
    }
    const previous = notes[index - 1]
    if (previous !== undefined && note.onsetSeconds <= previous.onsetSeconds) {
      throw new AcknowledgementWindowError(
        `Expected note ${index} starts at ${note.onsetSeconds} s, not after the note before it ` +
          `(${previous.onsetSeconds} s); expected notes must be in strictly increasing onset order.`,
      )
    }
  })
}
