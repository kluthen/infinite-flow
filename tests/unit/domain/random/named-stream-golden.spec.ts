import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { STREAM_LABELS, deriveNamedStream } from '@/domain/random/streams'
import {
  NAMED_STREAM_GOLDEN_FIXTURES,
  NAMED_STREAM_GOLDEN_FIXTURE_VERSION,
  NAMED_STREAM_GOLDEN_SAMPLE_COUNT,
  NAMED_STREAM_GOLDEN_SEED,
} from './fixtures/named-stream-golden.v1'

// @test-link [[module_named_stream_pseudorandomness]]
describe('named-stream golden fixtures', () => {
  it('carries an explicit version marker', () => {
    expect(NAMED_STREAM_GOLDEN_FIXTURE_VERSION).toBe(1)
  })

  it('has a committed literal fixture for every registered stream label', () => {
    for (const label of STREAM_LABELS) {
      expect(NAMED_STREAM_GOLDEN_FIXTURES[label]).toBeDefined()
      expect(NAMED_STREAM_GOLDEN_FIXTURES[label]).toHaveLength(NAMED_STREAM_GOLDEN_SAMPLE_COUNT)
    }
  })

  it.each(STREAM_LABELS)('matches the committed golden sequence for the "%s" stream', (label) => {
    const seed = makeSeed(NAMED_STREAM_GOLDEN_SEED)
    const stream = deriveNamedStream(seed, label)

    const actual = Array.from({ length: NAMED_STREAM_GOLDEN_SAMPLE_COUNT }, () => stream.next())

    expect(actual).toStrictEqual([...NAMED_STREAM_GOLDEN_FIXTURES[label]])
  })
})
