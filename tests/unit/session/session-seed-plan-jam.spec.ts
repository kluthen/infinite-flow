// @vitest-environment node
/**
 * A fresh Jam's phrase 1 in the session seed plan: each of its six attempts (rung 1's first
 * attempt and three retries, rung 2, rung 3) takes the seed its own label derives from the
 * session seed drawn at Start, by the plan's one derivation; the labels of phrases 2 onward and
 * of the mutation are untouched, and any other rung is refused.
 */

import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { LADDER } from '@/session/failure-ladder'
import {
  JAM_PHRASE_ONE_ATTEMPTS,
  SessionSeedPlanError,
  jamPhraseOneSeed,
  phraseAttemptSeed,
  settingsMutationSeed,
} from '@/session/session-seed-plan'

/** A sample session seed, the one the plan's own spec uses. */
const SESSION_SEED = makeSeed(0x12345678)

// @test-link [[module_session_seed_plan]]
describe("the session seed plan's labels for a fresh Jam's phrase 1", () => {
  // @test-link [[module_session_seed_plan]]
  it('counts six attempts: rung 1 and its three retries, rung 2, rung 3', () => {
    expect(JAM_PHRASE_ONE_ATTEMPTS).toBe(6)
  })

  // @test-link [[module_session_seed_plan]]
  it('derives the pinned values: the session seed XOR the FNV-1a hash of jam-phrase-one:rung:<r>', () => {
    // fnv1a32('session-seed-plan-v1:jam-phrase-one:rung:<r>') for r = 0 to 5:
    // 2287857628, 2304635247, 2321412866, 2338190485, 2220747152, 2237524771
    expect([0, 1, 2, 3, 4, 5].map((rung) => jamPhraseOneSeed(SESSION_SEED, rung))).toEqual([
      2590620068, 2607392535, 2557060474, 2573837037, 2523512808, 2540289371,
    ])
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the same seed for the same inputs and another for another session seed', () => {
    expect(jamPhraseOneSeed(SESSION_SEED, 3)).toBe(jamPhraseOneSeed(SESSION_SEED, 3))
    expect(jamPhraseOneSeed(makeSeed(0x12345679), 3)).not.toBe(jamPhraseOneSeed(SESSION_SEED, 3))
  })

  // @test-link [[module_session_seed_plan]]
  it("shares no seed with the plan's other labels", () => {
    const others: number[] = [settingsMutationSeed(SESSION_SEED)]
    for (let phraseNumber = 2; phraseNumber <= 40; phraseNumber += 1)
      for (let rung = 0; rung < LADDER.length; rung += 1)
        others.push(phraseAttemptSeed(SESSION_SEED, phraseNumber, rung))
    const jam = [0, 1, 2, 3, 4, 5].map((rung) => jamPhraseOneSeed(SESSION_SEED, rung))
    expect(new Set([...others, ...jam]).size).toBe(others.length + jam.length)
  })

  // @test-link [[module_session_seed_plan]]
  it.each([
    { label: 'a negative rung', rung: -1 },
    { label: 'rung 6', rung: 6 },
    { label: 'a fractional rung', rung: 2.5 },
    { label: 'a rung that is not a number', rung: Number.NaN },
  ])('refuses $label with a SessionSeedPlanError', ({ rung }) => {
    expect(() => jamPhraseOneSeed(SESSION_SEED, rung)).toThrow(SessionSeedPlanError)
  })

  // @test-link [[module_session_seed_plan]]
  it('refuses a session seed that is not a 32-bit unsigned integer', () => {
    expect(() => jamPhraseOneSeed(1.5 as typeof SESSION_SEED, 0)).toThrow(SessionSeedPlanError)
  })
})
