/**
 * Derived integer sixteenth-note tick view of exact rational whole-note time. This view is
 * always computed from a Rational (see ./rational.ts); it is never tracked independently, so it
 * can never disagree with the exact value it was derived from.
 */

import { type Rational } from './rational'

/** Intent: the number of integer sixteenth-note ticks in one 4/4 bar: the interval [0,16). */
// @spec-link [[entity_exact_musical_time]]
export const TICKS_PER_BAR = 16

/** Intent: the number of 4/4 bars in one generated phrase. */
// @spec-link [[entity_exact_musical_time]]
export const BARS_PER_PHRASE = 4

/** Intent: the number of integer sixteenth-note ticks across the whole phrase: [0,64). */
// @spec-link [[entity_exact_musical_time]]
export const PHRASE_TICKS = TICKS_PER_BAR * BARS_PER_PHRASE

/** Intent: the number of integer sixteenth-note ticks in one quarter-note beat. */
// @spec-link [[entity_exact_musical_time]]
export const QUARTER_TICKS = 4

/** Intent: the documented tick at which each of the four bars starts. */
// @spec-link [[entity_exact_musical_time]]
export const BAR_START_TICKS: readonly [0, 16, 32, 48] = [0, 16, 32, 48]

/** Typed failure: a rational whole-note value has no exact integer sixteenth-tick representation. */
// @spec-link [[entity_exact_musical_time]]
export class NonIntegerTickError extends Error {
  readonly kind = 'NonIntegerTickError' as const

  constructor(readonly value: Rational) {
    super(
      `Rational ${value.numerator}/${value.denominator} (whole notes) has no exact integer ` +
        'sixteenth-note tick representation.',
    )
    this.name = 'NonIntegerTickError'
  }
}

/**
 * Intent: derive the integer sixteenth-note tick position/duration for a whole-note Rational by
 * exact multiplication (value * 16), never by floating-point division. Throws when the value
 * does not divide evenly into sixteenth ticks (e.g. a tuplet or a finer subdivision); this is a
 * mathematical fact about the value, distinct from the first-release grid *policy* rejection
 * performed by ./grid.ts.
 */
// @spec-link [[entity_exact_musical_time]]
export function sixteenthTicksOf(value: Rational): number {
  const scaledNumerator = value.numerator * TICKS_PER_BAR
  if (scaledNumerator % value.denominator !== 0) {
    throw new NonIntegerTickError(value)
  }
  return scaledNumerator / value.denominator
}

/**
 * Intent: given an integer tick within the phrase, return the zero-based index of the bar that
 * contains it (bar 0 covers [0,16), bar 1 covers [16,32), and so on).
 */
// @spec-link [[entity_exact_musical_time]]
export function barContainingTick(tick: number): number {
  return Math.floor(tick / TICKS_PER_BAR)
}
