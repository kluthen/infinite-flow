// @test-link [[entity_instrument_profile]]
import { describe, expect, it } from 'vitest'

import {
  ActiveConcertRangeError,
  makeActiveConcertRange,
} from '@/domain/profile/active-concert-range'

describe('makeActiveConcertRange', () => {
  it('constructs a valid active range at the minimum 24-semitone span', () => {
    const range = makeActiveConcertRange(48, 72)
    expect(range.minMidi).toBe(48)
    expect(range.maxMidi).toBe(72)
  })

  it('is deep-frozen and cannot be mutated', () => {
    const range = makeActiveConcertRange(48, 72)
    expect(() => {
      // @ts-expect-error maxMidi is readonly
      range.maxMidi = 0
    }).toThrow()
    expect(range.maxMidi).toBe(72)
  })

  it('rejects a non-integer minMidi', () => {
    expect(() => makeActiveConcertRange(48.5, 72)).toThrow(ActiveConcertRangeError)
  })

  it('rejects a non-integer maxMidi', () => {
    expect(() => makeActiveConcertRange(48, 72.5)).toThrow(ActiveConcertRangeError)
  })

  it('rejects minMidi === maxMidi', () => {
    expect(() => makeActiveConcertRange(60, 60)).toThrow(ActiveConcertRangeError)
  })

  it('rejects minMidi > maxMidi', () => {
    expect(() => makeActiveConcertRange(72, 48)).toThrow(ActiveConcertRangeError)
  })

  it('rejects a span narrower than 24 semitones', () => {
    expect(() => makeActiveConcertRange(48, 71)).toThrow(ActiveConcertRangeError)
  })

  it('accepts a span wider than 24 semitones', () => {
    expect(() => makeActiveConcertRange(48, 84)).not.toThrow()
  })
})
