import { describe, expect, it } from 'vitest'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type {
  GenerationDiagnostics,
  GenerationOutcome,
} from '@/domain/generation/orchestration/orchestration-types'
import { makeGenerationSearchPolicy } from '@/domain/generation/orchestration/search-ledger'
import {
  makeRequestRhythmLock,
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import { makeSeed } from '@/domain/random/seed'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { isRhythmChangeDrawn } from '@/domain/rhythm/rhythm-change-draw'
import { phraseAttemptSeed } from '@/session/session-seed-plan'

import { lockedBarsOf, lockOn, lockTestDomain } from '../../rhythm/rhythm-lock-fixture'
import { buildOrchestratorIntent } from './generation-orchestrator-fixture'
import { lockTestIntent } from './rhythm-lock-search-fixture'

type Success = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** Intent: require a success. */
function success(outcome: GenerationOutcome): Success {
  if (outcome.kind !== 'generation_success') throw new Error(`Expected a phrase: ${outcome.code}`)
  return outcome
}

/** Intent: a fake clock that advances one second per read, and how often it was read. */
function steppingClock(): { readonly clock: () => number; readonly reads: () => number } {
  let reads = 0
  return {
    clock: () => {
      reads += 1
      return reads * 1000
    },
    reads: () => reads,
  }
}

/** Intent: the rhythm lock group on with these bars and every change kind allowed. */
function lockWithEveryChange(bars: readonly LockedRhythmMeasure[]): RequestRhythmLock {
  return makeRequestRhythmLock({
    state: { kind: 'locked', bars },
    allowedChanges: RHYTHM_CHANGE_KINDS,
    tenserPhrase: false,
  })
}

/** Intent: the reported orderings' seconds of a clocked outcome, required present. */
function orderingsSeconds(diagnostics: GenerationDiagnostics): number {
  const seconds = diagnostics.rhythmOrderingsSeconds
  if (seconds === undefined) throw new Error('Expected the orderings time in the diagnostics.')
  return seconds
}

const UNLOCKED = lockTestIntent({ tension: 'Build', seed: 4 })
const BUILD_BARS = lockedBarsOf(success(generatePhrase(UNLOCKED)).provenance.rhythm)

/** A locked Build intent whose phrase takes a drawn rhythm change. */
const CHANGED = ((): GenerationIntent => {
  for (let session = 0; session < 20; session += 1) {
    const seed = phraseAttemptSeed(makeSeed(session), 2, 0)
    if (!isRhythmChangeDrawn(seed, false)) continue
    const intent = lockTestIntent({
      tension: 'Build',
      seed,
      rhythmLock: lockWithEveryChange(BUILD_BARS),
    })
    const outcome = generatePhrase(intent)
    if (outcome.kind === 'generation_success' && Object.hasOwn(outcome.provenance, 'rhythmChange'))
      return intent
  }
  throw new Error('Fixture setup: no seed takes a rhythm change.')
})()

/** A locked Lift intent whose bars are outside the Lift domain, so it takes a forced bend. */
const FORCED_BEND = ((): GenerationIntent => {
  const liftKeys = new Set(lockTestDomain('Lift').map((rhythm) => rhythmBarKey(rhythm.bars)))
  const buildOnly = lockTestDomain('Build').find(
    (rhythm) => !liftKeys.has(rhythmBarKey(rhythm.bars)),
  )!
  return lockTestIntent({ tension: 'Lift', seed: 3, rhythmLock: lockOn(lockedBarsOf(buildOnly)) })
})()

/** A locked Build intent that keeps its locked bars. */
const KEPT_BARS = lockTestIntent({ tension: 'Build', seed: 5, rhythmLock: lockOn(BUILD_BARS) })

// @test-link [[entity_generation_diagnostics]]
describe('the orderings time without a clock', () => {
  it('gives deep-equal outcomes with no time field, unlocked or locked with a change', () => {
    for (const intent of [UNLOCKED, CHANGED]) {
      const first = generatePhrase(intent)
      const second = generatePhrase(intent, {})
      expect(second).toStrictEqual(first)
      expect(Object.hasOwn(first.diagnostics, 'rhythmOrderingsSeconds')).toBe(false)
    }
  })
})

// @test-link [[entity_generation_diagnostics]]
describe('the orderings time with a clock', () => {
  it('gives the same phrase and provenance, the time added only to the diagnostics', () => {
    for (const intent of [UNLOCKED, CHANGED, FORCED_BEND]) {
      const plain = success(generatePhrase(intent))
      const clocked = success(generatePhrase(intent, { clock: () => performance.now() }))
      expect(clocked.result).toStrictEqual(plain.result)
      expect(clocked.request).toStrictEqual(plain.request)
      expect(clocked.provenance).toStrictEqual(plain.provenance)
      const { rhythmOrderingsSeconds, ...rest } = clocked.diagnostics
      expect(rest).toStrictEqual(plain.diagnostics)
      expect(Number.isFinite(rhythmOrderingsSeconds)).toBe(true)
      expect(rhythmOrderingsSeconds).toBeGreaterThanOrEqual(0)
      expect(Object.isFrozen(clocked.diagnostics)).toBe(true)
    }
  })

  it('times one span for an unlocked intent', () => {
    const { clock, reads } = steppingClock()
    expect(orderingsSeconds(generatePhrase(UNLOCKED, { clock }).diagnostics)).toBe(1)
    expect(reads()).toBe(2)
  })

  it('times one span for a locked intent that keeps its bars', () => {
    const { clock } = steppingClock()
    const outcome = success(generatePhrase(KEPT_BARS, { clock }))
    expect(outcome.provenance.rhythmLockOutcome).toBe('locked_bars')
    expect(orderingsSeconds(outcome.diagnostics)).toBe(1)
  })

  it('adds the forced bend build when the search reaches it, timed once', () => {
    const { clock } = steppingClock()
    const outcome = success(generatePhrase(FORCED_BEND, { clock }))
    expect(outcome.provenance.rhythmLockOutcome).toBe('forced_bend')
    expect(orderingsSeconds(outcome.diagnostics)).toBe(2)
    const varying = lockTestIntent({
      tension: 'Lift',
      seed: 3,
      register: 'Varying',
      ...(FORCED_BEND.rhythmLock === undefined ? {} : { rhythmLock: FORCED_BEND.rhythmLock }),
    })
    const { clock: varyingClock } = steppingClock()
    expect(orderingsSeconds(generatePhrase(varying, { clock: varyingClock }).diagnostics)).toBe(2)
  })

  it('reports the time on a failure too', () => {
    const { clock } = steppingClock()
    const outcome = generatePhrase(KEPT_BARS, {
      clock,
      searchPolicy: makeGenerationSearchPolicy(1),
    })
    expect(outcome.kind).toBe('generation_failure')
    expect(orderingsSeconds(outcome.diagnostics)).toBeGreaterThanOrEqual(1)
  })

  it('reports a zero time on a failure before the orderings are built', () => {
    const intent = buildOrchestratorIntent('Middle', makeSeed(11), {
      noteDensity: 'Quarter',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
      tension: 'Settled',
    })
    const { clock, reads } = steppingClock()
    const outcome = generatePhrase(intent, { clock })
    expect(outcome.kind === 'generation_failure' && outcome.code).toBe('no_legal_rhythm_plan')
    expect(outcome.diagnostics.rhythmOrderingsSeconds).toBe(0)
    expect(reads()).toBe(0)
  })
})
