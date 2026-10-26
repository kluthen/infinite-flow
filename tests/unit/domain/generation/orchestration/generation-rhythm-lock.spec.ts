import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  GENERATION_SEARCH_POLICY_CARRY_IN_V1,
  GENERATION_SEARCH_POLICY_V1,
} from '@/domain/generation/orchestration/search-ledger'
import type { LockedRhythmMeasure } from '@/domain/generation/request-rhythm-lock'
import { rhythmBarKey, rhythmStarts } from '@/domain/rhythm/rhythm-bars'
import { rhythmDistance } from '@/domain/rhythm/rhythm-distance'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'

import {
  lockedBarsOf,
  lockOn,
  lockPending,
  lockTestDomain,
  tieVariantOutsideDomain,
} from '../../rhythm/rhythm-lock-fixture'
import { lockTestIntent } from './rhythm-lock-search-fixture'

type Success = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** Intent: generate and require a success. */
function succeed(intent: GenerationIntent): Success {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success') throw new Error(`Expected a phrase: ${outcome.code}`)
  return outcome
}

/** Intent: the total edits from locked bars to a rhythm. */
function editsFrom(bars: readonly LockedRhythmMeasure[], rhythm: RhythmCandidate): number {
  const locked = rhythmStarts(bars.map((events, barIndex) => ({ barIndex, events })))
  return rhythmDistance(rhythmStarts(rhythm.bars), locked)
}

const SEEDS = [2, 3, 4, 5, 6, 7]

const PHRASE_ONE_INTENT = lockTestIntent({ tension: 'Lift', seed: 1 })
const PHRASE_ONE = succeed(PHRASE_ONE_INTENT)
const LOCKED_BARS = lockedBarsOf(PHRASE_ONE.provenance.rhythm)
const LOCKED_KEY = rhythmBarKey(PHRASE_ONE.provenance.rhythm.bars)

// @test-link [[req_rhythm_lock]]
// @test-link [[rule_rhythm_lock_strict]]
// @test-link [[rule_session_generation_failure_ladder]]
describe('generation under locked bars', () => {
  it('keeps the locked bars on every attempt shape: standalone, Varying, carry-in', () => {
    const carryIn = deriveCarryIn({
      intent: PHRASE_ONE_INTENT,
      outcome: PHRASE_ONE,
      phraseNumber: 1,
    })
    for (const seed of SEEDS) {
      const standalone = lockTestIntent({ tension: 'Lift', seed, rhythmLock: lockOn(LOCKED_BARS) })
      const varying = lockTestIntent({
        tension: 'Lift',
        seed,
        register: 'Varying',
        rhythmLock: lockOn(LOCKED_BARS),
      })
      const withCarryIn = makeCarryInGenerationIntent({
        requestId: standalone.requestId,
        seed: standalone.seed,
        controls: standalone.controls,
        figureLevels: standalone.figureLevels,
        rhythmLock: lockOn(LOCKED_BARS),
        carryIn,
      })
      for (const intent of [standalone, varying, withCarryIn]) {
        const outcome = succeed(intent)
        expect(rhythmBarKey(outcome.provenance.rhythm.bars)).toBe(LOCKED_KEY)
        expect(outcome.provenance.rhythmLockOutcome).toBe('locked_bars')
      }
    }
  })

  it('keeps the outcome out of the timeline', () => {
    const outcome = succeed(
      lockTestIntent({ tension: 'Lift', seed: 2, rhythmLock: lockOn(LOCKED_BARS) }),
    )
    expect(JSON.stringify(outcome.result)).not.toMatch(/locked_bars|forced_bend|rhythmLock/)
  })

  it('searches under the fuel the request already has', () => {
    const standalone = succeed(
      lockTestIntent({ tension: 'Lift', seed: 3, rhythmLock: lockOn(LOCKED_BARS) }),
    )
    for (const window of standalone.diagnostics.windows) {
      expect(window.fuelAllowance).toBe(GENERATION_SEARCH_POLICY_V1.windowFuel)
      expect(window.fuelUsed).toBeLessThanOrEqual(window.fuelAllowance)
    }
    const base = lockTestIntent({ tension: 'Lift', seed: 3, rhythmLock: lockOn(LOCKED_BARS) })
    const carried = succeed(
      makeCarryInGenerationIntent({
        requestId: base.requestId,
        seed: base.seed,
        controls: base.controls,
        figureLevels: base.figureLevels,
        rhythmLock: lockOn(LOCKED_BARS),
        carryIn: deriveCarryIn({ intent: PHRASE_ONE_INTENT, outcome: PHRASE_ONE, phraseNumber: 1 }),
      }),
    )
    expect(carried.diagnostics.windows[0]!.fuelAllowance).toBe(
      GENERATION_SEARCH_POLICY_CARRY_IN_V1.windowFuel,
    )
  })
})

// @test-link [[rule_forced_bend]]
// @test-link [[module_rhythm_lock_order]]
describe('the forced bend', () => {
  const lift = lockTestDomain('Lift')
  const liftKeys = new Set(lift.map((rhythm) => rhythmBarKey(rhythm.bars)))

  it('takes the least total edits after a step from Build to Lift that loses the bars', () => {
    const buildOnly = lockTestDomain('Build').find(
      (rhythm) => !liftKeys.has(rhythmBarKey(rhythm.bars)),
    )!
    const bars = lockedBarsOf(buildOnly)
    const least = Math.min(...lift.map((rhythm) => editsFrom(bars, rhythm)))
    for (const seed of SEEDS) {
      const outcome = succeed(lockTestIntent({ tension: 'Lift', seed, rhythmLock: lockOn(bars) }))
      expect(outcome.provenance.rhythmLockOutcome).toBe('forced_bend')
      expect(editsFrom(bars, outcome.provenance.rhythm)).toBe(least)
    }
  })

  it('takes a rhythm tied otherwise, at distance 0, first', () => {
    const { bars } = tieVariantOutsideDomain(lift)
    for (const seed of SEEDS) {
      const outcome = succeed(lockTestIntent({ tension: 'Lift', seed, rhythmLock: lockOn(bars) }))
      expect(outcome.provenance.rhythmLockOutcome).toBe('forced_bend')
      expect(editsFrom(bars, outcome.provenance.rhythm)).toBe(0)
    }
  })
})

// @test-link [[module_ranked_candidate_ordering]]
// @test-link [[service_generation_window_search]]
describe('generation without locked bars', () => {
  it('gives the phrase of a request without the lock with "on, nothing locked yet"', () => {
    for (const seed of SEEDS) {
      for (const tension of ['Lift', 'Build'] as const) {
        const plain = succeed(lockTestIntent({ tension, seed }))
        const pending = succeed(lockTestIntent({ tension, seed, rhythmLock: lockPending() }))
        expect(pending.result).toEqual(plain.result)
        expect(pending.provenance).toEqual(plain.provenance)
        expect(pending.diagnostics).toEqual(plain.diagnostics)
      }
    }
  })
})
