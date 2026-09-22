// @test-link [[module_named_stream_pseudorandomness]]
import { describe, expect, it } from 'vitest'

import { FNV_OFFSET_BASIS_32, FNV_PRIME_32, fnv1a32 } from '@/domain/random/hash32'

describe('fnv1a32', () => {
  it('carries the standard FNV-1a 32-bit offset basis and prime constants', () => {
    expect(FNV_OFFSET_BASIS_32).toBe(0x811c9dc5)
    expect(FNV_PRIME_32).toBe(0x01000193)
  })

  it('matches the published reference vector for the empty string', () => {
    expect(fnv1a32('')).toBe(2166136261)
  })

  it('matches the published reference vector for "a"', () => {
    expect(fnv1a32('a')).toBe(3826002220)
  })

  it('matches the published reference vector for "foobar"', () => {
    expect(fnv1a32('foobar')).toBe(3214735720)
  })

  it('always returns an unsigned 32-bit integer', () => {
    const hash = fnv1a32('some arbitrary input string')
    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThanOrEqual(0xffffffff)
  })

  it('is deterministic: the same input always produces the same hash', () => {
    expect(fnv1a32('named-stream-registry-v1:harmony')).toBe(
      fnv1a32('named-stream-registry-v1:harmony'),
    )
  })

  it('different inputs produce different hashes (for these sample inputs)', () => {
    expect(fnv1a32('harmony')).not.toBe(fnv1a32('rhythm'))
  })
})
