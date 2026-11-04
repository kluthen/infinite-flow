/**
 * The session pre-generation plan of a steered session (a Jam on the kept doodle): every attempt
 * it asks for, the standalone one included, carries the start's steering block, as the session's
 * own requests do from phrase 2 on; and its ready phrases are the session's at those places only
 * under the same block: they re-derive under a start that carries it, and not under one without.
 */

import { describe, expect, it } from 'vitest'

import { buildSteeringBlock } from '@/jam/steering-block-builder'
import {
  createPregenerationPlan,
  revalidatedReadyPhrases,
  type PregenerationAttempt,
  type PregenerationResult,
} from '@/session/session-pregeneration'
import { KEPT_DOODLE } from '../storage/kept-session-v32-fixtures'
import {
  planSeams,
  planStart,
  plannedReadyPhrases,
  realResult,
  runPlan,
} from './pregeneration-harness'

/** The block a Jam on the fixture's kept doodle carries, at the Near drift. */
const STEERING = buildSteeringBlock(KEPT_DOODLE.quantized, 'Near')

/** Intent: a plan start that carries the kept doodle's steering block. */
function steeredStart() {
  return { ...planStart(), steering: STEERING }
}

/** Intent: an answer failing phrase 2's every carry-in rung, real otherwise. */
function failingPhraseTwoCarryIn(attempt: PregenerationAttempt): PregenerationResult {
  return attempt.phraseNumber === 2 && attempt.step === 'carry-in'
    ? { kind: 'generation-failure', code: 'search_limit_exceeded' }
    : realResult(attempt)
}

// @test-link [[rule_pregenerated_phrase_matches_session]]
describe('the pre-generation plan of a steered session', () => {
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it("puts the start's steering block on every attempt, the standalone one included", () => {
    const { attempts } = runPlan(
      createPregenerationPlan(planSeams(), steeredStart(), []),
      failingPhraseTwoCarryIn,
    )

    expect(attempts.some((attempt) => attempt.step === 'standalone')).toBe(true)
    for (const attempt of attempts) expect(attempt.intent.steering).toEqual(STEERING)
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it('puts no steering block on any attempt of a start without one', () => {
    const { attempts } = runPlan(createPregenerationPlan(planSeams(), planStart(), []))

    expect(attempts.length).toBeGreaterThan(0)
    for (const attempt of attempts) expect(attempt.intent.steering).toBeUndefined()
  })

  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it('makes ready phrases that re-derive under a start with the same block, and not without it', () => {
    const ready = plannedReadyPhrases(planSeams(), steeredStart())
    expect(ready.map((phrase) => phrase.phraseNumber)).toEqual([2, 3, 4, 5])

    expect(revalidatedReadyPhrases(planSeams(), steeredStart(), ready)).toEqual(ready)
    expect(revalidatedReadyPhrases(planSeams(), planStart(), ready)).toEqual([])
    expect(() => createPregenerationPlan(planSeams(), planStart(), ready)).toThrow(/re-derives/)
  })
})
