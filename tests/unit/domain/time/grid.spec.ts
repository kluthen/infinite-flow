import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import { GridAlignmentViolation, validateSixteenthGridAlignment } from '@/domain/time/grid'

// @test-link [[entity_exact_musical_time]]
describe('validateSixteenthGridAlignment', () => {
  it('accepts a sixteenth note and returns its integer tick value', () => {
    expect(validateSixteenthGridAlignment(makeRational(1, 16))).toBe(1)
  })

  it('accepts a whole bar and returns 16 ticks', () => {
    expect(validateSixteenthGridAlignment(makeRational(1, 1))).toBe(16)
  })

  it('accepts a full four-measure phrase duration and returns 64 ticks', () => {
    expect(validateSixteenthGridAlignment(makeRational(4, 1))).toBe(64)
  })

  it('rejects a triplet (sub-sixteenth, non-grid) duration with a typed failure', () => {
    expect(() => validateSixteenthGridAlignment(makeRational(1, 24))).toThrow(
      GridAlignmentViolation,
    )
  })

  it('rejects a thirty-second note (sub-sixteenth) duration with a typed failure', () => {
    expect(() => validateSixteenthGridAlignment(makeRational(1, 32))).toThrow(
      GridAlignmentViolation,
    )
  })

  it('the rational type itself still represents the same rejected tuplet value successfully', () => {
    // This is the crux of the design: representability and grid policy are independent.
    const tuplet = makeRational(1, 24)

    expect(tuplet).toStrictEqual({ numerator: 1, denominator: 24 })
    expect(() => validateSixteenthGridAlignment(tuplet)).toThrow(GridAlignmentViolation)
  })

  it('the rational type itself still represents the same rejected sub-sixteenth value successfully', () => {
    const subSixteenth = makeRational(1, 32)

    expect(subSixteenth).toStrictEqual({ numerator: 1, denominator: 32 })
    expect(() => validateSixteenthGridAlignment(subSixteenth)).toThrow(GridAlignmentViolation)
  })
})
