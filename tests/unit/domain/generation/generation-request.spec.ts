// @test-link [[service_generation_orchestration]]
// @test-link [[module_register_intent_boundary]]
import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import type { RegisterChoice } from '@/domain/profile/register-intent'
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

const activeConcertRange = C_KEYBOARD_PROFILE.concertRange
const candidates = deriveRegisterWindowCandidates(
  C_KEYBOARD_PROFILE.concertRange,
  C_KEYBOARD_PROFILE.registerWindows,
)
const lowCandidate = candidates[0]!
const registerWindow = lowCandidate.window
const register = lowCandidate.id

function validRequestInput() {
  return {
    requestId: validRequestId,
    seed: validSeed,
    measureCount: 4 as const,
    meter: FOUR_FOUR_METER,
    activeConcertRange,
    register,
    registerWindow,
  }
}

describe('makeGenerationRequest', () => {
  it('constructs an immutable request carrying only the fields this step owns', () => {
    const request = makeGenerationRequest(validRequestInput())

    expect(request).toStrictEqual({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange,
      register,
      registerWindow,
    })
  })

  it('is serializable via JSON round-trip', () => {
    const request = makeGenerationRequest(validRequestInput())

    expect(JSON.parse(JSON.stringify(request))).toStrictEqual({
      requestId: validRequestId,
      seed: validSeed,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
      activeConcertRange: {
        kind: 'ActiveConcertRange',
        minMidi: activeConcertRange.minMidi,
        maxMidi: activeConcertRange.maxMidi,
      },
      register,
      registerWindow: {
        kind: 'RegisterWindow',
        minMidi: registerWindow.minMidi,
        maxMidi: registerWindow.maxMidi,
      },
    })
  })

  it('rejects a measure count other than four as a typed failure', () => {
    expect(() => makeGenerationRequest({ ...validRequestInput(), measureCount: 8 })).toThrow(
      GenerationRequestError,
    )
  })

  it('returns a request that cannot be mutated', () => {
    const request = makeGenerationRequest(validRequestInput())

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      request.seed = makeSeed(1)
    }).toThrow(TypeError)
  })

  it('returns a request whose resolved registerWindow cannot be mutated (no mid-phrase window changes)', () => {
    const request = makeGenerationRequest(validRequestInput())

    expect(() => {
      // @ts-expect-error the resolved register window is readonly
      request.registerWindow.minMidi = 0
    }).toThrow(TypeError)
  })

  it('type level: a theme field cannot be part of a GenerationRequest object literal', () => {
    const attempt: () => GenerationRequest = () => ({
      ...validRequestInput(),
      // @ts-expect-error theme is presentation state and must not be assignable into GenerationRequest
      theme: 'dark',
    })

    expect(typeof attempt).toBe('function')
  })

  it('type level: a notationDisplay field cannot be part of a GenerationRequest object literal', () => {
    const attempt: () => GenerationRequest = () => ({
      ...validRequestInput(),
      // @ts-expect-error notation display convention must not be assignable into GenerationRequest
      notationDisplay: 'concert',
    })

    expect(typeof attempt).toBe('function')
  })

  it('type level: register cannot be assigned the outer RegisterChoice value "Varying"', () => {
    const attempt: () => GenerationRequest = () => ({
      ...validRequestInput(),
      // @ts-expect-error Varying is the outer register-intent boundary vocabulary, not the core request's
      register: 'Varying' as RegisterChoice,
    })

    expect(typeof attempt).toBe('function')
  })

  it('exposes exactly one resolved window for the whole phrase, contained in the active range', () => {
    const request = makeGenerationRequest(validRequestInput())

    expect(request.registerWindow.minMidi).toBeGreaterThanOrEqual(
      request.activeConcertRange.minMidi,
    )
    expect(request.registerWindow.maxMidi).toBeLessThanOrEqual(request.activeConcertRange.maxMidi)
  })

  it.each(candidates)(
    'resolves exactly one window matching the profile-derived candidate for register $id',
    (candidate) => {
      const request = makeGenerationRequest({
        ...validRequestInput(),
        register: candidate.id,
        registerWindow: candidate.window,
      })

      expect(request.registerWindow).toEqual(candidate.window)
      expect(request.register).toBe(candidate.id)
    },
  )

  it('rejects a resolved window that is not contained in the active range, as a typed failure', () => {
    const narrowerRange = makeActiveConcertRange(60, 84)
    const windowOutsideRange = makeRegisterWindow(48, 60)

    expect(() =>
      makeGenerationRequest({
        ...validRequestInput(),
        activeConcertRange: narrowerRange,
        registerWindow: windowOutsideRange,
      }),
    ).toThrow(GenerationRequestError)
  })
})

describe('parseGenerationRequest', () => {
  function validRawInput() {
    return {
      requestId: '11111111-1111-4111-8111-111111111111',
      seed: 42,
      measureCount: 4,
      meter: { beatsPerMeasure: 4, beatUnit: 4 },
      activeConcertRange: {
        minMidi: activeConcertRange.minMidi,
        maxMidi: activeConcertRange.maxMidi,
      },
      register,
      registerWindow: { minMidi: registerWindow.minMidi, maxMidi: registerWindow.maxMidi },
    }
  }

  it('parses a well-formed untrusted request', () => {
    const request = parseGenerationRequest(validRawInput())

    expect(request.seed).toBe(42)
    expect(request.measureCount).toBe(4)
    expect(request.register).toBe(register)
    expect(request.registerWindow.minMidi).toBe(registerWindow.minMidi)
    expect(request.registerWindow.maxMidi).toBe(registerWindow.maxMidi)
  })

  it('rejects a theme field rather than silently ignoring it', () => {
    expect(() => parseGenerationRequest({ ...validRawInput(), theme: 'dark' })).toThrow(
      GenerationRequestError,
    )
  })

  it('rejects a notationDisplay field rather than silently ignoring it', () => {
    expect(() =>
      parseGenerationRequest({ ...validRawInput(), notationDisplay: 'concert' }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects browser/session state fields rather than silently ignoring them', () => {
    expect(() => parseGenerationRequest({ ...validRawInput(), sessionId: 'abc' })).toThrow(
      GenerationRequestError,
    )
  })

  it('rejects a non-4/4 meter as a typed failure', () => {
    expect(() =>
      parseGenerationRequest({
        ...validRawInput(),
        meter: { beatsPerMeasure: 3, beatUnit: 4 },
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects a non-object input as a typed failure', () => {
    expect(() => parseGenerationRequest('not-a-request')).toThrow(GenerationRequestError)
    expect(() => parseGenerationRequest(null)).toThrow(GenerationRequestError)
  })

  it('rejects "Varying" for the register field at runtime — a core request can never carry it', () => {
    expect(() => parseGenerationRequest({ ...validRawInput(), register: 'Varying' })).toThrow(
      GenerationRequestError,
    )
  })

  it('rejects an unrecognized register string', () => {
    expect(() => parseGenerationRequest({ ...validRawInput(), register: 'Bass' })).toThrow(
      GenerationRequestError,
    )
  })

  it('rejects a resolved window not contained in the active range', () => {
    expect(() =>
      parseGenerationRequest({
        ...validRawInput(),
        activeConcertRange: { minMidi: 60, maxMidi: 84 },
        registerWindow: { minMidi: 48, maxMidi: 60 },
      }),
    ).toThrow(GenerationRequestError)
  })

  it('rejects a missing activeConcertRange', () => {
    const input = validRawInput() as Record<string, unknown>
    delete input.activeConcertRange
    expect(() => parseGenerationRequest(input)).toThrow(GenerationRequestError)
  })

  it('rejects a missing registerWindow', () => {
    const input = validRawInput() as Record<string, unknown>
    delete input.registerWindow
    expect(() => parseGenerationRequest(input)).toThrow(GenerationRequestError)
  })

  it('rejects unknown fields inside registerWindow', () => {
    expect(() =>
      parseGenerationRequest({
        ...validRawInput(),
        registerWindow: {
          minMidi: registerWindow.minMidi,
          maxMidi: registerWindow.maxMidi,
          extra: 1,
        },
      }),
    ).toThrow(GenerationRequestError)
  })
})

describe('makeRequestId', () => {
  it('rejects an empty string as a typed failure', () => {
    expect(() => makeRequestId('')).toThrow(GenerationRequestError)
  })
})
