// @vitest-environment node
/**
 * The session seed plan: every seed a session uses after phrase 1 is derived from its session
 * seed by one fixed integer derivation over a versioned label, so the same session seed, phrase
 * number and rung always give the same attempt seed, and the same session seed the same
 * mutation seed; a phrase number below 2, a rung outside the ladder or a value that is not an
 * integer is refused.
 */

import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { LADDER } from '@/session/failure-ladder'
import {
  SESSION_SEED_PLAN_VERSION,
  SessionSeedPlanError,
  phraseAttemptSeed,
  settingsMutationSeed,
} from '@/session/session-seed-plan'

/** A sample session seed. */
const SESSION_SEED = makeSeed(0x12345678)

// @test-link [[module_session_seed_plan]]
describe('the session seed plan', () => {
  // @test-link [[module_session_seed_plan]]
  it('is plan version 1', () => {
    expect(SESSION_SEED_PLAN_VERSION).toBe(1)
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the same seed for the same inputs', () => {
    expect(phraseAttemptSeed(SESSION_SEED, 5, 2)).toBe(phraseAttemptSeed(SESSION_SEED, 5, 2))
    expect(settingsMutationSeed(SESSION_SEED)).toBe(settingsMutationSeed(SESSION_SEED))
  })

  // @test-link [[module_session_seed_plan]]
  it('gives distinct seeds for distinct phrases and rungs, and for the mutation', () => {
    const seeds: number[] = [settingsMutationSeed(SESSION_SEED)]
    for (let phraseNumber = 2; phraseNumber <= 40; phraseNumber += 1)
      for (let rung = 0; rung < LADDER.length; rung += 1)
        seeds.push(phraseAttemptSeed(SESSION_SEED, phraseNumber, rung))
    expect(new Set(seeds).size).toBe(seeds.length)
  })

  // @test-link [[module_session_seed_plan]]
  it('derives the pinned values: the session seed XOR the FNV-1a hash of the label', () => {
    // fnv1a32('session-seed-plan-v1:phrase:2:rung:0') = 1226264586
    expect(phraseAttemptSeed(SESSION_SEED, 2, 0)).toBe(1529022066)
    // fnv1a32('session-seed-plan-v1:phrase:7:rung:4') = 4057812579
    expect(phraseAttemptSeed(SESSION_SEED, 7, 4)).toBe(3823704091)
    // fnv1a32('session-seed-plan-v1:settings-mutation') = 3334097856
    expect(settingsMutationSeed(SESSION_SEED)).toBe(3566083512)
  })

  // @test-link [[module_session_seed_plan]]
  it('gives different seeds for a different session seed', () => {
    const other = makeSeed(0x12345679)
    expect(phraseAttemptSeed(other, 2, 0)).not.toBe(phraseAttemptSeed(SESSION_SEED, 2, 0))
    expect(settingsMutationSeed(other)).not.toBe(settingsMutationSeed(SESSION_SEED))
  })

  // @test-link [[module_session_seed_plan]]
  it.each([
    { label: 'phrase 1', phraseNumber: 1, rung: 0 },
    { label: 'phrase 0', phraseNumber: 0, rung: 0 },
    { label: 'a negative rung', phraseNumber: 2, rung: -1 },
    { label: 'rung 5', phraseNumber: 2, rung: 5 },
    { label: 'a fractional phrase number', phraseNumber: 2.5, rung: 0 },
    { label: 'a fractional rung', phraseNumber: 2, rung: 1.5 },
    { label: 'a phrase number that is not a number', phraseNumber: Number.NaN, rung: 0 },
  ])('refuses $label with a SessionSeedPlanError', ({ phraseNumber, rung }) => {
    expect(() => phraseAttemptSeed(SESSION_SEED, phraseNumber, rung)).toThrow(SessionSeedPlanError)
  })

  // @test-link [[module_session_seed_plan]]
  it('refuses a session seed that is not a 32-bit unsigned integer', () => {
    const fractional = 1.5 as typeof SESSION_SEED
    expect(() => phraseAttemptSeed(fractional, 2, 0)).toThrow(SessionSeedPlanError)
    expect(() => settingsMutationSeed(fractional)).toThrow(SessionSeedPlanError)
  })
})
