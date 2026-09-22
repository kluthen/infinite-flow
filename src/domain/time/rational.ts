/**
 * Intent: represent every duration and position in whole-note units as a normalized integer
 * numerator over a positive integer denominator, reduced to lowest terms by their greatest
 * common divisor, with no floating-point value anywhere in the core time model, so summing
 * sixteenth notes (or any other exact subdivision) never drifts the way repeated float
 * addition would.
 */
// @spec-link [[entity_exact_musical_time]]
export interface Rational {
  readonly numerator: number
  readonly denominator: number
}

/** Intent: signal a rejected attempt to construct or compute a Rational as a typed failure. */
// @spec-link [[entity_exact_musical_time]]
export class RationalConstructionError extends Error {
  readonly kind = 'RationalConstructionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RationalConstructionError'
  }
}

// Values in play for a four-measure 4/4 phrase stay tiny (denominators are at most a few dozen,
// numerators bound by a handful of whole notes), so plain JS numbers are exact as long as every
// intermediate product/sum stays within Number.MAX_SAFE_INTEGER. This guard makes that
// assumption an enforced invariant instead of a silent hope.
function assertSafeInteger(value: number, context: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RationalConstructionError(
      `${context} (${value}) exceeds the safe integer range for exact rational arithmetic.`,
    )
  }
}

/** Intent: compute the greatest common divisor of two non-negative integers (Euclid's algorithm). */
function greatestCommonDivisor(a: number, b: number): number {
  let x = a
  let y = b
  while (y !== 0) {
    const remainder = x % y
    x = y
    y = remainder
  }
  return x
}

/**
 * Intent: build a normalized Rational from a raw numerator/denominator pair. Reduces by the
 * gcd, canonicalizes the sign onto the numerator (denominator is always positive), and
 * canonicalizes zero to 0/1. Rejects non-integer inputs, a zero denominator, and any
 * unsafe-integer intermediate as a loud typed failure rather than coercing or defaulting.
 */
// @spec-link [[entity_exact_musical_time]]
export function makeRational(numerator: number, denominator: number): Rational {
  if (!Number.isInteger(numerator)) {
    throw new RationalConstructionError(`Rational numerator must be an integer, got ${numerator}.`)
  }
  if (!Number.isInteger(denominator)) {
    throw new RationalConstructionError(
      `Rational denominator must be an integer, got ${denominator}.`,
    )
  }
  if (denominator === 0) {
    throw new RationalConstructionError('Rational denominator must not be zero.')
  }
  assertSafeInteger(numerator, 'Rational numerator')
  assertSafeInteger(denominator, 'Rational denominator')

  if (numerator === 0) {
    return { numerator: 0, denominator: 1 }
  }

  const sign = numerator < 0 === denominator < 0 ? 1 : -1
  const absNumerator = Math.abs(numerator)
  const absDenominator = Math.abs(denominator)
  const divisor = greatestCommonDivisor(absNumerator, absDenominator)

  return {
    numerator: sign * (absNumerator / divisor),
    denominator: absDenominator / divisor,
  }
}

/** A 4/4 bar expressed in whole-note units. */
// @spec-link [[entity_exact_musical_time]]
export const WHOLE_NOTE: Rational = makeRational(1, 1)

/** A sixteenth note expressed in whole-note units: the finest first-release grid unit. */
// @spec-link [[entity_exact_musical_time]]
export const SIXTEENTH_NOTE: Rational = makeRational(1, 16)

/** Intent: add two exact rationals and return the normalized, reduced result. */
// @spec-link [[entity_exact_musical_time]]
export function addRational(a: Rational, b: Rational): Rational {
  const numerator = a.numerator * b.denominator + b.numerator * a.denominator
  const denominator = a.denominator * b.denominator
  assertSafeInteger(numerator, 'Rational addition numerator')
  assertSafeInteger(denominator, 'Rational addition denominator')
  return makeRational(numerator, denominator)
}

/** Intent: subtract b from a as exact rationals and return the normalized, reduced result. */
// @spec-link [[entity_exact_musical_time]]
export function subtractRational(a: Rational, b: Rational): Rational {
  const numerator = a.numerator * b.denominator - b.numerator * a.denominator
  const denominator = a.denominator * b.denominator
  assertSafeInteger(numerator, 'Rational subtraction numerator')
  assertSafeInteger(denominator, 'Rational subtraction denominator')
  return makeRational(numerator, denominator)
}

/**
 * Intent: compare two exact rationals without introducing floating-point division, by
 * cross-multiplying over their (always positive) denominators.
 */
// @spec-link [[entity_exact_musical_time]]
export function compareRational(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.numerator * b.denominator
  const right = b.numerator * a.denominator
  assertSafeInteger(left, 'Rational comparison left-hand side')
  assertSafeInteger(right, 'Rational comparison right-hand side')

  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Intent: exact equality on normalized rational form. */
// @spec-link [[entity_exact_musical_time]]
export function equalsRational(a: Rational, b: Rational): boolean {
  return compareRational(a, b) === 0
}

/** Intent: sum a list of exact rationals into one normalized, reduced total. */
// @spec-link [[entity_exact_musical_time]]
export function sumRational(values: readonly Rational[]): Rational {
  return values.reduce<Rational>((total, value) => addRational(total, value), makeRational(0, 1))
}
