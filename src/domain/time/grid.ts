/**
 * First-release grid policy: every duration and position must land on an integer sixteenth
 * tick. This restriction lives here, not in Rational itself — Rational can still represent a
 * tuplet or sub-sixteenth value; this validator is what refuses it for the current release, so
 * a later release can lift the restriction without changing the representation.
 */

import { type Rational } from './rational'
import { NonIntegerTickError, sixteenthTicksOf } from './ticks'

/** Typed failure: a duration or position was rejected by first-release sixteenth-grid policy. */
// @spec-link [[entity_exact_musical_time]]
export class GridAlignmentViolation extends Error {
  readonly kind = 'GridAlignmentViolation' as const

  constructor(readonly value: Rational) {
    super(
      `Duration/position ${value.numerator}/${value.denominator} (whole notes) is not aligned ` +
        'to the integer sixteenth-note grid. Tuplets and sub-sixteenth durations are rejected ' +
        'by first-release policy.',
    )
    this.name = 'GridAlignmentViolation'
  }
}

/**
 * Intent: enforce first-release grid policy on a whole-note Rational duration/position. Returns
 * the derived integer sixteenth-tick value when the input lands exactly on the grid; rejects
 * tuplets and sub-sixteenth durations as a typed GridAlignmentViolation. The rational type
 * itself is untouched by this policy and can still represent the rejected value.
 */
// @spec-link [[entity_exact_musical_time]]
export function validateSixteenthGridAlignment(value: Rational): number {
  try {
    return sixteenthTicksOf(value)
  } catch (error) {
    if (error instanceof NonIntegerTickError) {
      throw new GridAlignmentViolation(value)
    }
    throw error
  }
}
