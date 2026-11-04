/**
 * The block size a Review's `review-staff` reserves before anything is drawn: its system
 * positions', plus one lane and its gap per position while Played notes is on. And the positions a
 * Jam's doodle reserves: a phrase's in the one-system layout; in the split layout the top one only
 * for a doodle of one or two measures, both for three or four.
 */
import { describe, expect, it } from 'vitest'

import { doodleStaffReservation, reviewStaffStyle } from '@/components/review/review-staff-style'
import type { ReviewStaffReservation } from '@/components/review/review-types'

const ONE_SYSTEM: ReviewStaffReservation = { positionCount: 1, positionBlockPx: 180 }
const SPLIT: ReviewStaffReservation = { positionCount: 2, positionBlockPx: 150 }

// @test-link [[module_review_played_notes_lane]]
describe('reviewStaffStyle', () => {
  // @test-link [[module_review_played_notes_lane]]
  it('reserves nothing while the reservation is unknown', () => {
    expect(reviewStaffStyle(null, false)).toBeUndefined()
    expect(reviewStaffStyle(null, true)).toBeUndefined()
  })

  // @test-link [[module_review_played_notes_lane]]
  it("reserves its positions' block size while Played notes is off", () => {
    expect(reviewStaffStyle(ONE_SYSTEM, false)).toEqual({ blockSize: '180px' })
    expect(reviewStaffStyle(SPLIT, false)).toEqual({ blockSize: '300px' })
  })

  // @test-link [[module_review_played_notes_lane]]
  it('adds one lane and its gap per position while Played notes is on', () => {
    expect(reviewStaffStyle(ONE_SYSTEM, true)).toEqual({
      blockSize: 'calc(180px + 1 * (var(--played-notes-lane-block-size) + var(--spacing-2)))',
    })
    expect(reviewStaffStyle(SPLIT, true)).toEqual({
      blockSize: 'calc(300px + 2 * (var(--played-notes-lane-block-size) + var(--spacing-2)))',
    })
  })
})

// @test-link [[rule_review_opens_with_doodle]]
describe('doodleStaffReservation', () => {
  // @test-link [[rule_review_opens_with_doodle]]
  it("reserves a phrase's single position for a doodle of any length in the one-system layout", () => {
    for (const measureCount of [1, 2, 3, 4]) {
      expect(doodleStaffReservation(ONE_SYSTEM, measureCount)).toEqual(ONE_SYSTEM)
    }
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('reserves the top position only for a doodle of one or two measures in the split layout', () => {
    expect(doodleStaffReservation(SPLIT, 1)).toEqual({ positionCount: 1, positionBlockPx: 150 })
    expect(doodleStaffReservation(SPLIT, 2)).toEqual({ positionCount: 1, positionBlockPx: 150 })
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('reserves both positions for a doodle of three or four measures in the split layout', () => {
    expect(doodleStaffReservation(SPLIT, 3)).toEqual(SPLIT)
    expect(doodleStaffReservation(SPLIT, 4)).toEqual(SPLIT)
  })

  // @test-link [[rule_review_opens_with_doodle]]
  it('reserves nothing while the reservation is unknown', () => {
    expect(doodleStaffReservation(null, 3)).toBeNull()
  })
})
