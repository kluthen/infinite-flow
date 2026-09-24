import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WINDOW_SEARCH_FUEL,
  GENERATION_SEARCH_POLICY_V1,
  GenerationSearchPolicyError,
  makeGenerationSearchPolicy,
  openFuelLedger,
  remainingFuel,
  spendFuel,
} from '@/domain/generation/orchestration/search-ledger'

describe('search-ledger', () => {
  // @test-link [[mechanic_pitch_search_policy]]
  describe('GENERATION_SEARCH_POLICY_V1', () => {
    it('carries the documented default version and fuel allowance', () => {
      expect(GENERATION_SEARCH_POLICY_V1).toEqual({
        version: 'generation-search-v1',
        windowFuel: DEFAULT_WINDOW_SEARCH_FUEL,
      })
      expect(DEFAULT_WINDOW_SEARCH_FUEL).toBe(250_000)
    })

    it('is frozen', () => {
      expect(Object.isFrozen(GENERATION_SEARCH_POLICY_V1)).toBe(true)
    })
  })

  // @test-link [[mechanic_pitch_search_policy]]
  describe('makeGenerationSearchPolicy', () => {
    it('defaults to DEFAULT_WINDOW_SEARCH_FUEL when no override is given', () => {
      expect(makeGenerationSearchPolicy()).toEqual({
        version: 'generation-search-v1',
        windowFuel: DEFAULT_WINDOW_SEARCH_FUEL,
      })
    })

    it('accepts a positive integer override', () => {
      expect(makeGenerationSearchPolicy(10)).toEqual({
        version: 'generation-search-v1',
        windowFuel: 10,
      })
    })

    it.each([0, -1, 1.5, -100])('rejects a non-positive or non-integer windowFuel (%s)', (bad) => {
      expect(() => makeGenerationSearchPolicy(bad)).toThrow(GenerationSearchPolicyError)
    })

    it('returns a frozen policy', () => {
      expect(Object.isFrozen(makeGenerationSearchPolicy(5))).toBe(true)
    })
  })

  // @test-link [[mechanic_pitch_search_policy]]
  describe('openFuelLedger / remainingFuel / spendFuel', () => {
    it('opens a zero-spent ledger matching the policy allowance and version', () => {
      const policy = makeGenerationSearchPolicy(100)
      const ledger = openFuelLedger(policy)
      expect(ledger).toEqual({ version: 'generation-search-v1', allowance: 100, used: 0 })
      expect(remainingFuel(ledger)).toBe(100)
    })

    it('spending returns a new frozen ledger and leaves the original unchanged', () => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      const spent = spendFuel(ledger, 30)
      expect(Object.isFrozen(spent)).toBe(true)
      expect(spent.used).toBe(30)
      expect(remainingFuel(spent)).toBe(70)
      expect(ledger.used).toBe(0)
      expect(remainingFuel(ledger)).toBe(100)
    })

    it('accumulates spend across successive calls', () => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      const afterFirst = spendFuel(ledger, 40)
      const afterSecond = spendFuel(afterFirst, 40)
      expect(afterSecond.used).toBe(80)
      expect(remainingFuel(afterSecond)).toBe(20)
    })

    it('allows spending exactly the remaining allowance', () => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      const exhausted = spendFuel(ledger, 100)
      expect(exhausted.used).toBe(100)
      expect(remainingFuel(exhausted)).toBe(0)
    })

    it('throws spending one more unit than the allowance', () => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      const exhausted = spendFuel(ledger, 100)
      expect(() => spendFuel(exhausted, 1)).toThrow(GenerationSearchPolicyError)
    })

    it.each([-1, 1.5, -0.5])('rejects a negative or non-integer spend amount (%s)', (bad) => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      expect(() => spendFuel(ledger, bad)).toThrow(GenerationSearchPolicyError)
    })

    it('allows spending zero units without changing the used total', () => {
      const ledger = openFuelLedger(makeGenerationSearchPolicy(100))
      const spent = spendFuel(ledger, 0)
      expect(spent.used).toBe(0)
    })
  })
})
