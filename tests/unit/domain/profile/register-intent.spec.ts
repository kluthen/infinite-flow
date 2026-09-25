import { describe, expect, it } from 'vitest'

import { C_KEYBOARD_PROFILE, BB_TENOR_PROFILE } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import {
  RegisterIntentError,
  buildRegisterIntent,
  resolveRegisterIntentCandidate,
  type RegisterChoice,
  type RegisterIntent,
} from '@/domain/profile/register-intent'

// @test-link [[module_register_intent_boundary]]
describe('RegisterChoice', () => {
  it('is the outer, player-facing vocabulary: Low, Middle, High, or Varying', () => {
    const choices: readonly RegisterChoice[] = ['Low', 'Middle', 'High', 'Varying']
    expect(choices).toHaveLength(4)
  })
})

// @test-link [[module_register_intent_boundary]]
describe('buildRegisterIntent', () => {
  it('carries the source range, requested register, resolved candidates, and policy version', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')

    expect(intent.sourceRange).toBe(C_KEYBOARD_PROFILE.concertRange)
    expect(intent.requestedRegister).toBe('Low')
    expect(intent.policyVersion).toBe(C_KEYBOARD_PROFILE.registerWindows.algorithm)
    expect(intent.candidates.map((candidate) => candidate.id)).toEqual(['Low', 'Middle', 'High'])
  })

  it('reuses deriveRegisterWindowCandidates for the candidate set', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Middle')
    const expected = deriveRegisterWindowCandidates(
      C_KEYBOARD_PROFILE.concertRange,
      C_KEYBOARD_PROFILE.registerWindows,
    )

    expect(intent.candidates).toEqual(expected)
  })

  it('accepts Varying as a requested register (the outer intent boundary)', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Varying')
    expect(intent.requestedRegister).toBe('Varying')
  })

  it('returns an immutable descriptor', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')
    expect(() => {
      // @ts-expect-error the intent descriptor is readonly
      intent.requestedRegister = 'High'
    }).toThrow(TypeError)
  })
})

// @test-link [[module_register_intent_boundary]]
describe('resolveRegisterIntentCandidate', () => {
  it('resolves exactly one candidate for a fixed Low/Middle/High choice, matching the profile-derived window', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')
    const derived = deriveRegisterWindowCandidates(
      C_KEYBOARD_PROFILE.concertRange,
      C_KEYBOARD_PROFILE.registerWindows,
    )

    const resolvedLow = resolveRegisterIntentCandidate(intent, 'Low')
    const resolvedMiddle = resolveRegisterIntentCandidate(intent, 'Middle')
    const resolvedHigh = resolveRegisterIntentCandidate(intent, 'High')

    expect(resolvedLow.window).toEqual(derived[0]?.window)
    expect(resolvedMiddle.window).toEqual(derived[1]?.window)
    expect(resolvedHigh.window).toEqual(derived[2]?.window)
  })

  it('resolves the correct candidate for a different profile too', () => {
    const intent = buildRegisterIntent(BB_TENOR_PROFILE, 'High')
    const derived = deriveRegisterWindowCandidates(
      BB_TENOR_PROFILE.concertRange,
      BB_TENOR_PROFILE.registerWindows,
    )

    expect(resolveRegisterIntentCandidate(intent, 'High').window).toEqual(derived[2]?.window)
  })

  it('throws a typed RegisterIntentError for an id not present in the candidate set', () => {
    const intent = {
      ...buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low'),
      candidates: [],
    } as RegisterIntent
    expect(() => resolveRegisterIntentCandidate(intent, 'Low')).toThrow(RegisterIntentError)
  })
})
