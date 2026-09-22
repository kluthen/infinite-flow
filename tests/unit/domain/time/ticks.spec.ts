// @test-link [[entity_exact_musical_time]]
import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import {
  BAR_START_TICKS,
  NonIntegerTickError,
  PHRASE_TICKS,
  QUARTER_TICKS,
  TICKS_PER_BAR,
  barContainingTick,
  sixteenthTicksOf,
} from '@/domain/time/ticks'

describe('tick grid constants', () => {
  it('defines the bar as the half-open interval [0,16)', () => {
    expect(TICKS_PER_BAR).toBe(16)
  })

  it('defines the phrase as the half-open interval [0,64)', () => {
    expect(PHRASE_TICKS).toBe(64)
  })

  it('defines bar starts at 0, 16, 32, 48', () => {
    expect(BAR_START_TICKS).toStrictEqual([0, 16, 32, 48])
  })

  it('defines one quarter note as 4 ticks', () => {
    expect(QUARTER_TICKS).toBe(4)
  })
})

describe('sixteenthTicksOf', () => {
  it('derives 0 ticks for a zero-duration position', () => {
    expect(sixteenthTicksOf(makeRational(0, 1))).toBe(0)
  })

  it('derives 1 tick for a sixteenth note', () => {
    expect(sixteenthTicksOf(makeRational(1, 16))).toBe(1)
  })

  it('derives 4 ticks for a quarter note', () => {
    expect(sixteenthTicksOf(makeRational(1, 4))).toBe(4)
  })

  it('derives 16 ticks for a whole 4/4 bar', () => {
    expect(sixteenthTicksOf(makeRational(1, 1))).toBe(16)
  })

  it('derives 64 ticks for the full four-measure phrase', () => {
    expect(sixteenthTicksOf(makeRational(4, 1))).toBe(64)
  })

  it('agrees that each bar start position derives to its documented tick', () => {
    const barStartWholeNotePositions = [
      makeRational(0, 1),
      makeRational(1, 1),
      makeRational(2, 1),
      makeRational(3, 1),
    ]

    const derivedTicks = barStartWholeNotePositions.map((position) => sixteenthTicksOf(position))

    expect(derivedTicks).toStrictEqual([...BAR_START_TICKS])
  })

  it('throws a typed error for a value that has no integer sixteenth-tick representation', () => {
    expect(() => sixteenthTicksOf(makeRational(1, 24))).toThrow(NonIntegerTickError)
  })
})

describe('barContainingTick', () => {
  it('maps ticks within [0,16) to bar 0, [16,32) to bar 1, etc.', () => {
    expect(barContainingTick(0)).toBe(0)
    expect(barContainingTick(15)).toBe(0)
    expect(barContainingTick(16)).toBe(1)
    expect(barContainingTick(31)).toBe(1)
    expect(barContainingTick(32)).toBe(2)
    expect(barContainingTick(48)).toBe(3)
    expect(barContainingTick(63)).toBe(3)
  })
})
