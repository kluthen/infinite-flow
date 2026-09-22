// @test-link [[service_generation_orchestration]]
import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import {
  FOUR_FOUR_METER,
  GenerationRequestError,
  makeGenerationRequest,
  makeRequestId,
  parseGenerationRequest,
} from '@/domain/generation/generation-request'
import type { GenerationRequest } from '@/domain/generation/generation-request'

const validSeed = makeSeed(42)
const validRequestId = makeRequestId('11111111-1111-4111-8111-111111111111')

describe('makeGenerationRequest', () => {
  it('constructs an immutable request carrying only the fields this step owns', () => {
    const request = makeGenerationRequest({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
    })

    expect(request).toStrictEqual({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
    })
  })

  it('is serializable via JSON round-trip', () => {
    const request = makeGenerationRequest({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
    })

    expect(JSON.parse(JSON.stringify(request))).toStrictEqual({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
    })
  })

  it('rejects a measure count other than four as a typed failure', () => {
    expect(() =>
      makeGenerationRequest({
        requestId: validRequestId,
        seed: validSeed,
        measureCount: 8,
        meter: FOUR_FOUR_METER,
      }),
    ).toThrow(GenerationRequestError)
  })

  it('returns a request that cannot be mutated', () => {
    const request = makeGenerationRequest({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
    })

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      request.seed = makeSeed(1)
    }).toThrow(TypeError)
  })

  it('type level: a theme field cannot be part of a GenerationRequest object literal', () => {
    const attempt: () => GenerationRequest = () => ({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      // @ts-expect-error theme is presentation state and must not be assignable into GenerationRequest
      theme: 'dark',
    })

    expect(typeof attempt).toBe('function')
  })

  it('type level: a notationDisplay field cannot be part of a GenerationRequest object literal', () => {
    const attempt: () => GenerationRequest = () => ({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      // @ts-expect-error notation display convention must not be assignable into GenerationRequest
      notationDisplay: 'concert',
    })

    expect(typeof attempt).toBe('function')
  })
})

describe('parseGenerationRequest', () => {
  it('parses a well-formed untrusted request', () => {
    const request = parseGenerationRequest({
      requestId: '11111111-1111-4111-8111-111111111111',
      seed: 42,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
    })

    expect(request.seed).toBe(42)
    expect(request.measureCount).toBe(4)
  })

  it('rejects a theme field rather than silently ignoring it', () => {
    expect(() =>
      parseGenerationRequest({
        requestId: '11111111-1111-4111-8111-111111111111',
        seed: 42,
        measureCount: 4,
        meter: { beatsPerMeasure: 4, beatUnit: 4 },
        theme: 'dark',
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects a notationDisplay field rather than silently ignoring it', () => {
    expect(() =>
      parseGenerationRequest({
        requestId: '11111111-1111-4111-8111-111111111111',
        seed: 42,
        measureCount: 4,
        meter: { beatsPerMeasure: 4, beatUnit: 4 },
        notationDisplay: 'concert',
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects browser/session state fields rather than silently ignoring them', () => {
    expect(() =>
      parseGenerationRequest({
        requestId: '11111111-1111-4111-8111-111111111111',
        seed: 42,
        measureCount: 4,
        meter: { beatsPerMeasure: 4, beatUnit: 4 },
        sessionId: 'abc',
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects a non-4/4 meter as a typed failure', () => {
    expect(() =>
      parseGenerationRequest({
        requestId: '11111111-1111-4111-8111-111111111111',
        seed: 42,
        measureCount: 4,
        meter: { beatsPerMeasure: 3, beatUnit: 4 },
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects a non-object input as a typed failure', () => {
    expect(() => parseGenerationRequest('not-a-request')).toThrow(GenerationRequestError)
    expect(() => parseGenerationRequest(null)).toThrow(GenerationRequestError)
  })
})

describe('makeRequestId', () => {
  it('rejects an empty string as a typed failure', () => {
    expect(() => makeRequestId('')).toThrow(GenerationRequestError)
  })
})
