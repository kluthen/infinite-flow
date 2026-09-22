// @test-link [[module_named_stream_pseudorandomness]]
import { describe, expect, it } from 'vitest'

import { createMulberry32 } from '@/domain/random/prng'

describe('createMulberry32', () => {
  it('produces the same deterministic sequence for the same raw seed across independent instances', () => {
    const first = createMulberry32(1)
    const second = createMulberry32(1)

    const firstValues = Array.from({ length: 5 }, () => first.nextUint32())
    const secondValues = Array.from({ length: 5 }, () => second.nextUint32())

    expect(firstValues).toStrictEqual(secondValues)
  })

  it('produces different sequences for different seeds', () => {
    const first = createMulberry32(1)
    const second = createMulberry32(2)

    expect(first.nextUint32()).not.toBe(second.nextUint32())
  })

  it('always yields unsigned 32-bit integers from nextUint32', () => {
    const generator = createMulberry32(0x9e3779b9)

    for (let i = 0; i < 50; i += 1) {
      const value = generator.nextUint32()
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('always yields a float in [0,1) from nextFloat', () => {
    const generator = createMulberry32(7)

    for (let i = 0; i < 50; i += 1) {
      const value = generator.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('advancing state is isolated per instance: consuming one generator does not affect a sibling created from the same seed', () => {
    const reference = createMulberry32(42)
    const referenceFirstFive = Array.from({ length: 5 }, () => reference.nextUint32())

    const probe = createMulberry32(42)
    probe.nextUint32()
    probe.nextUint32()
    probe.nextUint32()

    const freshReference = createMulberry32(42)
    const freshFirstFive = Array.from({ length: 5 }, () => freshReference.nextUint32())

    expect(freshFirstFive).toStrictEqual(referenceFirstFive)
  })
})
