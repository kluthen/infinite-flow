import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { STREAM_LABELS, STREAM_REGISTRY_VERSION, deriveNamedStream } from '@/domain/random/streams'

// @test-link [[module_named_stream_pseudorandomness]]
describe('STREAM_LABELS registry', () => {
  it('is a closed registry that at minimum contains harmony, rhythm, pitch, register resolution, and tie-breaking', () => {
    expect(STREAM_LABELS).toContain('harmony')
    expect(STREAM_LABELS).toContain('rhythm')
    expect(STREAM_LABELS).toContain('pitch')
    expect(STREAM_LABELS).toContain('register-resolution')
    expect(STREAM_LABELS).toContain('tie-breaking')
  })

  it('is versioned', () => {
    expect(STREAM_REGISTRY_VERSION).toBe(1)
  })
})

// @test-link [[module_named_stream_pseudorandomness]]
describe('deriveNamedStream determinism', () => {
  it('the same seed reproduces an identical sequence for a label across repeated independent derivations', () => {
    const seed = makeSeed(0xdeadbeef)

    const first = deriveNamedStream(seed, 'harmony')
    const firstValues = Array.from({ length: 8 }, () => first.next())

    const second = deriveNamedStream(seed, 'harmony')
    const secondValues = Array.from({ length: 8 }, () => second.next())

    expect(secondValues).toStrictEqual(firstValues)
  })

  it('different seeds produce different sequences for the same label', () => {
    const streamA = deriveNamedStream(makeSeed(1), 'rhythm')
    const streamB = deriveNamedStream(makeSeed(2), 'rhythm')

    expect(streamA.next()).not.toBe(streamB.next())
  })

  it('different labels under the same seed produce different sequences', () => {
    const seed = makeSeed(123456)

    const harmony = deriveNamedStream(seed, 'harmony')
    const rhythm = deriveNamedStream(seed, 'rhythm')

    expect(harmony.next()).not.toBe(rhythm.next())
  })
})

// @test-link [[module_named_stream_pseudorandomness]]
describe('stream isolation', () => {
  it('consuming any number of values from one named stream never changes the sequence any other named stream produces', () => {
    const seed = makeSeed(0x1234)

    // Reference: draw 6 values from every registered stream with none of them touched first.
    const referenceSequences = Object.fromEntries(
      STREAM_LABELS.map((label) => {
        const stream = deriveNamedStream(seed, label)
        return [label, Array.from({ length: 6 }, () => stream.next())]
      }),
    )

    // Probe: heavily consume 'harmony' and 'pitch' before drawing from every other stream.
    const harmonyProbe = deriveNamedStream(seed, 'harmony')
    for (let i = 0; i < 100; i += 1) harmonyProbe.next()

    const pitchProbe = deriveNamedStream(seed, 'pitch')
    for (let i = 0; i < 250; i += 1) pitchProbe.next()

    const probedSequences = Object.fromEntries(
      STREAM_LABELS.map((label) => {
        const stream = deriveNamedStream(seed, label)
        return [label, Array.from({ length: 6 }, () => stream.next())]
      }),
    )

    for (const label of STREAM_LABELS) {
      expect(probedSequences[label]).toStrictEqual(referenceSequences[label])
    }
  })

  it('a fresh derivation of a stream is unaffected by prior consumption of that same label in another derivation', () => {
    const seed = makeSeed(777)

    const firstDerivation = deriveNamedStream(seed, 'tie-breaking')
    firstDerivation.next()
    firstDerivation.next()
    firstDerivation.next()

    const secondDerivation = deriveNamedStream(seed, 'tie-breaking')
    const firstValueOfSecondDerivation = secondDerivation.next()

    const thirdDerivation = deriveNamedStream(seed, 'tie-breaking')
    const firstValueOfThirdDerivation = thirdDerivation.next()

    expect(firstValueOfSecondDerivation).toBe(firstValueOfThirdDerivation)
  })
})
