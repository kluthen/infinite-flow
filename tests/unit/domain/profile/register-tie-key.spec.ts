import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { BB_TENOR_PROFILE, C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { buildRegisterIntent } from '@/domain/profile/register-intent'
import {
  REGISTER_TIE_KEY_DOMAIN_V1,
  canonicalizeGenerationAffectingRegisterIntent,
  registerTieKey,
  type GenerationAffectingRegisterIntent,
} from '@/domain/profile/register-tie-key'
import {
  REGISTER_TIE_KEY_GOLDEN_FIXTURE_VERSION,
  REGISTER_TIE_KEY_GOLDEN_FIXTURES,
  REGISTER_TIE_KEY_GOLDEN_SEED,
} from './fixtures/register-tie-key-golden.v1'

// @test-link [[module_register_window_resolution_primitives]]
describe('REGISTER_TIE_KEY_DOMAIN_V1', () => {
  it('is a versioned domain string constant', () => {
    expect(REGISTER_TIE_KEY_DOMAIN_V1).toBe('infinite-flow/register-window/v1')
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('canonicalizeGenerationAffectingRegisterIntent', () => {
  it('excludes display, theme, notation, and session state by signature (not by filtering)', () => {
    const intent: GenerationAffectingRegisterIntent = {
      sourceRange: C_KEYBOARD_PROFILE.concertRange,
      requestedRegister: 'Low',
      policyVersion: C_KEYBOARD_PROFILE.registerWindows.algorithm,
      // @ts-expect-error theme is not a parameter of the generation-affecting intent at all
      theme: 'dark',
    }
    expect(typeof canonicalizeGenerationAffectingRegisterIntent(intent)).toBe('string')
  })

  it('is deterministic for the same inputs', () => {
    const intent: GenerationAffectingRegisterIntent = {
      sourceRange: C_KEYBOARD_PROFILE.concertRange,
      requestedRegister: 'Middle',
      policyVersion: C_KEYBOARD_PROFILE.registerWindows.algorithm,
    }
    expect(canonicalizeGenerationAffectingRegisterIntent(intent)).toBe(
      canonicalizeGenerationAffectingRegisterIntent(intent),
    )
  })

  it('produces different serializations for differing generation-affecting fields', () => {
    const base: GenerationAffectingRegisterIntent = {
      sourceRange: C_KEYBOARD_PROFILE.concertRange,
      requestedRegister: 'Low',
      policyVersion: C_KEYBOARD_PROFILE.registerWindows.algorithm,
    }
    const differentRegister: GenerationAffectingRegisterIntent = {
      ...base,
      requestedRegister: 'High',
    }

    expect(canonicalizeGenerationAffectingRegisterIntent(base)).not.toBe(
      canonicalizeGenerationAffectingRegisterIntent(differentRegister),
    )
  })

  it('does not rely on Object.keys ordering: field order is fixed regardless of construction order', () => {
    const constructedInOneOrder: GenerationAffectingRegisterIntent = {
      sourceRange: C_KEYBOARD_PROFILE.concertRange,
      requestedRegister: 'Low',
      policyVersion: C_KEYBOARD_PROFILE.registerWindows.algorithm,
    }
    const constructedInAnotherOrder: GenerationAffectingRegisterIntent = {
      policyVersion: C_KEYBOARD_PROFILE.registerWindows.algorithm,
      requestedRegister: 'Low',
      sourceRange: C_KEYBOARD_PROFILE.concertRange,
    }

    expect(canonicalizeGenerationAffectingRegisterIntent(constructedInOneOrder)).toBe(
      canonicalizeGenerationAffectingRegisterIntent(constructedInAnotherOrder),
    )
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerTieKey: determinism and seed-sensitivity', () => {
  it('the same seed always yields an identical key across repeated calls', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')
    const seed = makeSeed(42)

    const first = registerTieKey(seed, intent, 'Low')
    const second = registerTieKey(seed, intent, 'Low')

    expect(first).toBe(second)
  })

  it('different seeds yield different keys', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')

    const keyA = registerTieKey(makeSeed(1), intent, 'Low')
    const keyB = registerTieKey(makeSeed(2), intent, 'Low')

    expect(keyA).not.toBe(keyB)
  })

  it('always returns an unsigned 32-bit value', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Varying')
    const key = registerTieKey(makeSeed(999), intent, 'High')

    expect(Number.isInteger(key)).toBe(true)
    expect(key).toBeGreaterThanOrEqual(0)
    expect(key).toBeLessThanOrEqual(0xffffffff)
  })

  it('different candidate window identities under the same seed and intent yield different keys', () => {
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Varying')
    const seed = makeSeed(7)

    const low = registerTieKey(seed, intent, 'Low')
    const middle = registerTieKey(seed, intent, 'Middle')
    const high = registerTieKey(seed, intent, 'High')

    expect(new Set([low, middle, high]).size).toBe(3)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerTieKey: display-state independence (positive property)', () => {
  it('same generation-affecting inputs always yield the same key, regardless of unrelated call context', () => {
    function computeKeyDuringSession(theme: 'light' | 'dark', notation: string): number {
      // theme and notation are accepted by this wrapper (simulating outer session/display state)
      // but are structurally impossible to pass into registerTieKey's intent parameter — there is
      // no field for them on GenerationAffectingRegisterIntent.
      void theme
      void notation
      const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Low')
      return registerTieKey(makeSeed(2024), intent, 'Low')
    }

    const keyWithLightConcert = computeKeyDuringSession('light', 'concert')
    const keyWithDarkTransposed = computeKeyDuringSession('dark', 'bb-tenor-transposed')

    expect(keyWithLightConcert).toBe(keyWithDarkTransposed)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('registerTieKey: golden fixtures', () => {
  it('carries an explicit version marker', () => {
    expect(REGISTER_TIE_KEY_GOLDEN_FIXTURE_VERSION).toBe(1)
  })

  it('matches the committed golden tie keys for the C MIDI keyboard profile', () => {
    const seed = makeSeed(REGISTER_TIE_KEY_GOLDEN_SEED)
    const intent = buildRegisterIntent(C_KEYBOARD_PROFILE, 'Varying')

    expect(registerTieKey(seed, intent, 'Low')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['c-keyboard'].Low,
    )
    expect(registerTieKey(seed, intent, 'Middle')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['c-keyboard'].Middle,
    )
    expect(registerTieKey(seed, intent, 'High')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['c-keyboard'].High,
    )
  })

  it('matches the committed golden tie keys for the B-flat tenor saxophone profile', () => {
    const seed = makeSeed(REGISTER_TIE_KEY_GOLDEN_SEED)
    const intent = buildRegisterIntent(BB_TENOR_PROFILE, 'Varying')

    expect(registerTieKey(seed, intent, 'Low')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['bb-tenor'].Low,
    )
    expect(registerTieKey(seed, intent, 'Middle')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['bb-tenor'].Middle,
    )
    expect(registerTieKey(seed, intent, 'High')).toBe(
      REGISTER_TIE_KEY_GOLDEN_FIXTURES['bb-tenor'].High,
    )
  })
})
