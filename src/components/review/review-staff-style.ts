/**
 * The block size a Review's `review-staff` reserves before anything is drawn (a phrase's, and a
 * Jam's doodle's): its system positions', plus, while Played notes is on, one lane and its
 * separating gap per position, so engraving, releasing or replacing it by its note never changes
 * the item's size.
 */
import type { ReviewStaffReservation } from './review-types'

/**
 * Intent: the review staff's reserved block size as an inline style, for a reservation and the
 * Played notes switch; none while the reservation is unknown.
 */
// @spec-link [[module_review_played_notes_lane]]
export function reviewStaffStyle(
  reservation: ReviewStaffReservation | null,
  playedNotesShown: boolean,
): { readonly blockSize: string } | undefined {
  if (reservation === null) return undefined
  const { positionCount: n, positionBlockPx } = reservation
  const positions = `${n * positionBlockPx}px`
  if (!playedNotesShown) return { blockSize: positions }
  const lanes = `${n} * (var(--played-notes-lane-block-size) + var(--spacing-2))`
  return { blockSize: `calc(${positions} + ${lanes})` }
}

/**
 * Intent: the system positions a Jam's doodle reserves: as a phrase's in the one-system layout; in
 * the split layout the top one only for a doodle of one or two measures, both for three or four.
 */
// @spec-link [[rule_review_opens_with_doodle]]
export function doodleStaffReservation(
  reservation: ReviewStaffReservation | null,
  measureCount: number,
): ReviewStaffReservation | null {
  if (reservation === null) return null
  if (reservation.positionCount === 2 && measureCount <= 2)
    return { ...reservation, positionCount: 1 }
  return reservation
}
