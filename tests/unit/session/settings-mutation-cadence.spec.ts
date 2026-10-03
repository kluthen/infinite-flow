import { describe, expect, it } from 'vitest'

import { makeSeed, type Seed } from '@/domain/random/seed'
import {
  MUTATION_GAP_MAX,
  MUTATION_GAP_MIN,
  SETTINGS_MUTATION_DEFAULT,
  SETTINGS_MUTATION_OFF,
  SettingsMutationError,
  mutationGap,
  mutationIndexLandingOn,
  mutationPhrase,
} from '@/session/settings-mutation'

const SEEDS: readonly Seed[] = Array.from({ length: 300 }, (_, index) => makeSeed(index * 104729))

// @test-link [[req_settings_mutation_flag]]
describe('settings-mutation flag constants', () => {
  it('names the gap bounds 2 and 4', () => {
    expect(MUTATION_GAP_MIN).toBe(2)
    expect(MUTATION_GAP_MAX).toBe(4)
  })

  it('starts off', () => {
    expect(SETTINGS_MUTATION_DEFAULT).toBe(SETTINGS_MUTATION_OFF)
    expect(SETTINGS_MUTATION_OFF).toStrictEqual({ kind: 'off' })
    expect(Object.isFrozen(SETTINGS_MUTATION_OFF)).toBe(true)
  })
})

// @test-link [[rule_mutation_lands_on_scheduled_phrase]]
// @test-link [[req_settings_mutation_flag]]
describe('settings-mutation cadence', () => {
  it('draws every gap from 2 to 4, all three values occurring, purely from (seed, k)', () => {
    const seen = new Set<number>()
    for (const seed of SEEDS)
      for (let k = 1; k <= 5; k += 1) {
        const gap = mutationGap(seed, k)
        expect(gap).toBeGreaterThanOrEqual(MUTATION_GAP_MIN)
        expect(gap).toBeLessThanOrEqual(MUTATION_GAP_MAX)
        expect(Number.isInteger(gap)).toBe(true)
        expect(mutationGap(seed, k)).toBe(gap)
        seen.add(gap)
      }
    expect([...seen].sort()).toStrictEqual([2, 3, 4])
  })

  it('lands the first mutation on phrase 1 + g1, so phrase 3, 4 or 5', () => {
    for (const seed of SEEDS) {
      const first = mutationPhrase(seed, 1)
      expect(first).toBe(1 + mutationGap(seed, 1))
      expect([3, 4, 5]).toContain(first)
    }
  })

  it('lands each later mutation its own gap after the one before', () => {
    for (const seed of SEEDS.slice(0, 50))
      for (let k = 1; k < 20; k += 1) {
        const difference = mutationPhrase(seed, k + 1) - mutationPhrase(seed, k)
        expect(difference).toBe(mutationGap(seed, k + 1))
        expect(difference).toBeGreaterThanOrEqual(2)
        expect(difference).toBeLessThanOrEqual(4)
      }
  })

  it('names the mutation landing on a phrase, in agreement with mutationPhrase', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const landings = new Map<number, number>()
      for (let k = 1; k <= 25; k += 1) landings.set(mutationPhrase(seed, k), k)
      for (let phrase = 1; phrase <= 60; phrase += 1)
        expect(mutationIndexLandingOn(seed, phrase), `${seed} phrase ${phrase}`).toBe(
          landings.get(phrase),
        )
    }
  })

  it('never lands a mutation on phrases 1 and 2', () => {
    for (const seed of SEEDS) {
      expect(mutationIndexLandingOn(seed, 1)).toBeUndefined()
      expect(mutationIndexLandingOn(seed, 2)).toBeUndefined()
    }
  })

  it('rejects a mutation number or phrase number that is not a positive integer', () => {
    for (const bad of [0, -2, 2.5, Number.NaN]) {
      expect(() => mutationGap(makeSeed(1), bad)).toThrow(SettingsMutationError)
      expect(() => mutationPhrase(makeSeed(1), bad)).toThrow(SettingsMutationError)
      expect(() => mutationIndexLandingOn(makeSeed(1), bad)).toThrow(SettingsMutationError)
    }
  })
})
