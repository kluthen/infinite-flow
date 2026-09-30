import { describe, expect, it } from 'vitest'

import { FNV_OFFSET_BASIS_32, FNV_PRIME_32, fnv1a32, fnv1a32Resume } from '@/domain/random/hash32'

// @test-link [[module_named_stream_pseudorandomness]]
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

// @test-link [[module_ranked_candidate_ordering]]
describe('fnv1a32Resume', () => {
  it('hashing consecutive pieces equals fnv1a32 over their concatenation', () => {
    const input = 'infinite-flow/rhythm-tie/v1|seed1-00000001|rhythm-mvp-v2|{"bars":[]}é'
    for (const split of [0, 1, 27, input.length - 1, input.length]) {
      const head = fnv1a32Resume(FNV_OFFSET_BASIS_32, input, 0, split)
      expect(fnv1a32Resume(head, input, split, input.length)).toBe(fnv1a32(input))
    }
  })

  it('hashes only the requested range and returns the state unchanged for an empty one', () => {
    expect(fnv1a32Resume(FNV_OFFSET_BASIS_32, 'xfoobarx', 1, 7)).toBe(fnv1a32('foobar'))
    expect(fnv1a32Resume(12345, 'abc', 2, 2)).toBe(12345)
  })
})
