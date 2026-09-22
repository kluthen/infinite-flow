// @test-link [[module_named_stream_pseudorandomness]]
import { describe, expect, it } from 'vitest'

import {
  SeedConstructionError,
  SeedParseError,
  encodeSeed,
  makeSeed,
  parseSeed,
  type Seed,
} from '@/domain/random/seed'

describe('makeSeed', () => {
  it('accepts 0 as the minimum valid 32-bit unsigned seed', () => {
    expect(() => makeSeed(0)).not.toThrow()
  })

  it('accepts 0xffffffff as the maximum valid 32-bit unsigned seed', () => {
    expect(() => makeSeed(0xffffffff)).not.toThrow()
  })

  it('rejects a negative number', () => {
    expect(() => makeSeed(-1)).toThrow(SeedConstructionError)
  })

  it('rejects a value above the 32-bit unsigned range', () => {
    expect(() => makeSeed(0x100000000)).toThrow(SeedConstructionError)
  })

  it('rejects a non-integer number', () => {
    expect(() => makeSeed(1.5)).toThrow(SeedConstructionError)
  })
})

describe('seed string encoding', () => {
  it('round-trips an arbitrary seed through encode then parse exactly', () => {
    const original = makeSeed(0x1234abcd)

    const roundTripped = parseSeed(encodeSeed(original))

    expect(roundTripped).toBe(original)
  })

  it('round-trips the minimum seed value', () => {
    const original = makeSeed(0)

    expect(parseSeed(encodeSeed(original))).toBe(original)
  })

  it('round-trips the maximum seed value', () => {
    const original = makeSeed(0xffffffff)

    expect(parseSeed(encodeSeed(original))).toBe(original)
  })

  it('produces a stable, documented encoded form', () => {
    expect(encodeSeed(makeSeed(0))).toBe('seed1-00000000')
    expect(encodeSeed(makeSeed(0xffffffff))).toBe('seed1-ffffffff')
    expect(encodeSeed(makeSeed(0x1234abcd))).toBe('seed1-1234abcd')
  })

  it('rejects a malformed encoded string', () => {
    expect(() => parseSeed('not-a-seed')).toThrow(SeedParseError)
  })

  it('rejects an encoded string with the wrong version prefix', () => {
    expect(() => parseSeed('seed2-1234abcd')).toThrow(SeedParseError)
  })

  it('rejects an encoded string with too few hex digits', () => {
    expect(() => parseSeed('seed1-abcd')).toThrow(SeedParseError)
  })

  it('rejects an encoded string with uppercase hex digits', () => {
    expect(() => parseSeed('seed1-1234ABCD')).toThrow(SeedParseError)
  })
})

describe('branded seed identity', () => {
  it('resists being constructed from an arbitrary raw number at the type level', () => {
    // @ts-expect-error a bare number is not assignable to the branded Seed type; callers must use makeSeed
    const rejected: Seed = 42
    void rejected

    expect(true).toBe(true)
  })
})
