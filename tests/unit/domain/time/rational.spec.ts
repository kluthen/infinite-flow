// @test-link [[entity_exact_musical_time]]
import { describe, expect, it } from 'vitest'

import {
  RationalConstructionError,
  SIXTEENTH_NOTE,
  WHOLE_NOTE,
  addRational,
  compareRational,
  equalsRational,
  makeRational,
  subtractRational,
  sumRational,
  type Rational,
} from '@/domain/time/rational'

describe('makeRational', () => {
  it('normalizes a numerator and denominator to lowest terms', () => {
    const value = makeRational(2, 4)

    expect(value).toStrictEqual<Rational>({ numerator: 1, denominator: 2 })
  })

  it('keeps a whole-note value expressed as 1/1', () => {
    expect(makeRational(1, 1)).toStrictEqual<Rational>({ numerator: 1, denominator: 1 })
  })

  it('represents a sixteenth note as the reduced rational 1/16', () => {
    expect(makeRational(1, 16)).toStrictEqual<Rational>({ numerator: 1, denominator: 16 })
  })

  it('normalizes the sign onto the numerator when the denominator is negative', () => {
    expect(makeRational(1, -4)).toStrictEqual<Rational>({ numerator: -1, denominator: 4 })
  })

  it('canonicalizes zero to 0/1 regardless of the input denominator', () => {
    expect(makeRational(0, 7)).toStrictEqual<Rational>({ numerator: 0, denominator: 1 })
  })

  it('still represents a non-sixteenth (tuplet) value, e.g. a triplet eighth as 1/24', () => {
    expect(makeRational(1, 24)).toStrictEqual<Rational>({ numerator: 1, denominator: 24 })
  })

  it('rejects a non-integer numerator', () => {
    expect(() => makeRational(1.5, 4)).toThrow(RationalConstructionError)
  })

  it('rejects a non-integer denominator', () => {
    expect(() => makeRational(1, 4.5)).toThrow(RationalConstructionError)
  })

  it('rejects a zero denominator', () => {
    expect(() => makeRational(1, 0)).toThrow(RationalConstructionError)
  })

  it('rejects a numerator outside the safe integer range', () => {
    expect(() => makeRational(Number.MAX_SAFE_INTEGER + 2, 1)).toThrow(RationalConstructionError)
  })

  it('rejects an addition whose unreduced cross-multiplied intermediate would overflow', () => {
    const huge = makeRational(1, 2)
    const alsoHuge = makeRational(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER)

    expect(() => addRational(huge, alsoHuge)).toThrow(RationalConstructionError)
  })
})

describe('addRational', () => {
  it('adds two rationals exactly and reduces the result', () => {
    expect(addRational(makeRational(1, 4), makeRational(1, 4))).toStrictEqual<Rational>({
      numerator: 1,
      denominator: 2,
    })
  })

  it('sums sixteen sixteenth notes to exactly one whole note with no drift', () => {
    let total = makeRational(0, 1)
    for (let i = 0; i < 16; i += 1) {
      total = addRational(total, SIXTEENTH_NOTE)
    }

    expect(equalsRational(total, WHOLE_NOTE)).toBe(true)
    expect(total).toStrictEqual<Rational>({ numerator: 1, denominator: 1 })
  })
})

describe('subtractRational', () => {
  it('subtracts two rationals exactly and reduces the result', () => {
    expect(subtractRational(makeRational(3, 4), makeRational(1, 4))).toStrictEqual<Rational>({
      numerator: 1,
      denominator: 2,
    })
  })

  it('produces a signed negative rational when the result is negative', () => {
    expect(subtractRational(makeRational(1, 4), makeRational(1, 2))).toStrictEqual<Rational>({
      numerator: -1,
      denominator: 4,
    })
  })
})

describe('compareRational', () => {
  it('reports equal, less-than, and greater-than across differing denominators', () => {
    expect(compareRational(makeRational(1, 2), makeRational(2, 4))).toBe(0)
    expect(compareRational(makeRational(1, 4), makeRational(1, 2))).toBe(-1)
    expect(compareRational(makeRational(1, 2), makeRational(1, 4))).toBe(1)
  })
})

describe('equalsRational', () => {
  it('treats differently-expressed but equal values as equal', () => {
    expect(equalsRational(makeRational(2, 8), makeRational(1, 4))).toBe(true)
  })

  it('treats differing values as unequal', () => {
    expect(equalsRational(makeRational(1, 4), makeRational(1, 3))).toBe(false)
  })
})

describe('sumRational', () => {
  it('sums an empty list to zero', () => {
    expect(sumRational([])).toStrictEqual<Rational>({ numerator: 0, denominator: 1 })
  })

  it('sums a four-measure phrase (four whole-note bars) to exactly 4 with exact equality', () => {
    const phrase: readonly Rational[] = [WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE, WHOLE_NOTE]

    const total = sumRational(phrase)

    expect(equalsRational(total, makeRational(4, 1))).toBe(true)
    expect(total).toStrictEqual<Rational>({ numerator: 4, denominator: 1 })
  })

  it('sums sixty-four sixteenth notes (one full phrase at the finest grid) to exactly 4', () => {
    const sixteenths: Rational[] = Array.from({ length: 64 }, () => SIXTEENTH_NOTE)

    const total = sumRational(sixteenths)

    expect(equalsRational(total, makeRational(4, 1))).toBe(true)
  })
})
