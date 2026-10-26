import { describe, expect, it } from 'vitest'

import { makeGenerationSearchPolicy } from '@/domain/generation/orchestration/search-ledger'
import { makeRequestRhythmLock, RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import {
  DEFAULT_WINDOW_SEARCH_DEPS,
  searchWindow,
  type WindowSearchDeps,
  type WindowSearchInput,
} from '@/domain/generation/orchestration/window-search'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import {
  makeTensionBindingDomain,
  planPitchPhrase,
  type PitchPlanResult,
} from '@/domain/pitch/pitch-planner'
import { makeSeed } from '@/domain/random/seed'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { isRhythmChangeDrawn } from '@/domain/rhythm/rhythm-change-draw'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { phraseAttemptSeed } from '@/session/session-seed-plan'

import { lockedBarsOf, lockOn, lockPending, lockTestDomain } from '../../rhythm/rhythm-lock-fixture'
import { lockTestIntent, lockTestWindowInput } from './rhythm-lock-search-fixture'

/** One planner call: the pair and binding the search tried. */
interface Call {
  readonly harmony: string
  readonly rhythm: string
  readonly binding: number
}

const NO_PLAN: PitchPlanResult = { kind: 'no_legal_pitch_plan', fuelUsed: 0 }

/** Intent: planner deps that record every call, planning for real only when `plans` allows. */
function recordingDeps(plans: (rhythm: RhythmCandidate) => boolean): {
  readonly deps: WindowSearchDeps
  readonly calls: Call[]
} {
  const calls: Call[] = []
  return {
    calls,
    deps: {
      ...DEFAULT_WINDOW_SEARCH_DEPS,
      planPitch: (input) => {
        calls.push({
          harmony: input.harmony.identity,
          rhythm: input.rhythm.identity,
          binding: input.tensionBinding.bindingIndex,
        })
        return plans(input.rhythm) ? planPitchPhrase(input) : NO_PLAN
      },
    },
  }
}

/** Intent: every call one pair of the walk makes, in binding order. */
function pairCalls(harmony: HarmonyCandidate, rhythm: RhythmCandidate): Call[] {
  const domain = makeTensionBindingDomain(harmony, rhythm)
  if (domain.kind !== 'tension_binding_domain') return []
  return domain.bindings.map((binding) => ({
    harmony: harmony.identity,
    rhythm: rhythm.identity,
    binding: binding.bindingIndex,
  }))
}

/** Intent: the calls of v3.1's harmony-major walk: each chord plan with every rhythm. */
function harmonyMajorCalls(input: WindowSearchInput): Call[] {
  return input.rankedHarmony.flatMap((harmony) =>
    input.rankedRhythm.candidates.flatMap((rhythm) => pairCalls(harmony, rhythm)),
  )
}

/** Intent: the calls of the lock's rhythm-major walk: each rhythm with every chord plan. */
function rhythmMajorCalls(input: WindowSearchInput): Call[] {
  const order = input.rhythmLockOrder!
  const changes = order.changeCandidates.map((entry) => entry.rhythm)
  return [...changes, ...order.lockedBars, ...order.forcedBend()].flatMap((rhythm) =>
    input.rankedHarmony.flatMap((harmony) => pairCalls(harmony, rhythm)),
  )
}

const LIFT = lockTestDomain('Lift')

/** A Lift rhythm that more than one chord plan can carry, so the walk's order shows. */
const LOCKED = LIFT.find((rhythm) => {
  const input = lockTestWindowInput(lockTestIntent({ tension: 'Lift', seed: 5 }))
  return input.rankedHarmony.filter((harmony) => pairCalls(harmony, rhythm).length > 0).length > 1
})!
const LOCKED_KEY = rhythmBarKey(LOCKED.bars)

/** Intent: the window input of a Lift intent locked on LOCKED's bars. */
function lockedInput(seed = 5): WindowSearchInput {
  return lockTestWindowInput(
    lockTestIntent({ tension: 'Lift', seed, rhythmLock: lockOn(lockedBarsOf(LOCKED)) }),
  )
}

// @test-link [[service_generation_window_search]]
// @test-link [[rule_rhythm_lock_strict]]
describe('the search under locked bars', () => {
  it('tries the locked rhythm with every chord plan before any other rhythm', () => {
    const input = lockedInput()
    const { deps, calls } = recordingDeps(() => false)
    const report = searchWindow(input, deps)
    expect(report.outcome.kind).toBe('window_exhausted')
    const expected = rhythmMajorCalls(input)
    expect(calls).toEqual(expected)
    const lockedCalls = expected.filter((call) =>
      input.rhythmLockOrder!.lockedBars.some((rhythm) => rhythm.identity === call.rhythm),
    )
    expect(calls.slice(0, lockedCalls.length)).toEqual(lockedCalls)
    expect(new Set(lockedCalls.map((call) => call.harmony)).size).toBeGreaterThan(1)
  })

  it('keeps the locked bars when they make a phrase, and says so in the provenance', () => {
    const report = searchWindow(lockedInput())
    expect(report.outcome.kind).toBe('window_success')
    if (report.outcome.kind !== 'window_success') return
    expect(rhythmBarKey(report.outcome.provenance.rhythm.bars)).toBe(LOCKED_KEY)
    expect(report.outcome.provenance.rhythmLockOutcome).toBe('locked_bars')
  })

  it('takes a forced bend only once no chord plan makes a phrase with the locked rhythm', () => {
    const input = lockedInput()
    const { deps, calls } = recordingDeps((rhythm) => rhythmBarKey(rhythm.bars) !== LOCKED_KEY)
    const report = searchWindow(input, deps)
    expect(report.outcome.kind).toBe('window_success')
    if (report.outcome.kind !== 'window_success') return
    expect(report.outcome.provenance.rhythmLockOutcome).toBe('forced_bend')
    expect(rhythmBarKey(report.outcome.provenance.rhythm.bars)).not.toBe(LOCKED_KEY)
    const expected = rhythmMajorCalls(input)
    expect(calls).toEqual(expected.slice(0, calls.length))
    const firstBend = calls.findIndex((call) => call.rhythm !== calls[0]!.rhythm)
    const lockedCalls = expected.filter((call) =>
      input.rhythmLockOrder!.lockedBars.some((rhythm) => rhythm.identity === call.rhythm),
    )
    expect(firstBend).toBe(lockedCalls.length)
  })

  it('spends no more fuel than the request allows', () => {
    const input = { ...lockedInput(), searchPolicy: makeGenerationSearchPolicy(5) }
    const report = searchWindow(input, recordingDeps(() => false).deps)
    expect(report.outcome.kind).toBe('window_search_limit_exceeded')
    expect(report.diagnostics.fuelAllowance).toBe(5)
    expect(report.diagnostics.fuelUsed).toBeLessThanOrEqual(5)
  })

  it('refuses a request with locked bars but no lock order, and an order without locked bars', () => {
    const { rhythmLockOrder, ...withoutOrder } = lockedInput()
    if (rhythmLockOrder === undefined) throw new Error('Fixture setup: no lock order.')
    expect(() => searchWindow(withoutOrder)).toThrow(/lock order/)
    const unlocked = lockTestWindowInput(lockTestIntent({ tension: 'Lift', seed: 5 }))
    expect(() => searchWindow({ ...unlocked, rhythmLockOrder })).toThrow(/lock order/)
  })
})

// @test-link [[service_generation_window_search]]
describe('the search without locked bars', () => {
  const cases = [
    ['the lock off', undefined],
    ['on, nothing locked yet', lockPending()],
  ] as const

  for (const [label, rhythmLock] of cases) {
    it(`walks v3.1's harmony-major order with ${label}`, () => {
      const input = lockTestWindowInput(
        lockTestIntent({ tension: 'Lift', seed: 5, ...(rhythmLock ? { rhythmLock } : {}) }),
      )
      const { deps, calls } = recordingDeps(() => false)
      searchWindow(input, deps)
      expect(calls).toEqual(harmonyMajorCalls(input))
    })

    it(`records no lock outcome with ${label}`, () => {
      const input = lockTestWindowInput(
        lockTestIntent({ tension: 'Lift', seed: 5, ...(rhythmLock ? { rhythmLock } : {}) }),
      )
      const report = searchWindow(input)
      expect(report.outcome.kind).toBe('window_success')
      if (report.outcome.kind !== 'window_success') return
      expect(Object.keys(report.outcome.provenance)).toEqual([
        'harmony',
        'rhythm',
        'tensionBinding',
      ])
    })
  }
})

/** Locked Build bars that offer rhythm changes: a candidate one change from several others. */
const BUILD_LOCKED = lockedBarsOf(lockTestDomain('Build')[1]!)

/** Intent: the window input of a Build intent locked on BUILD_LOCKED, every change allowed. */
function changeInput(seed: number): WindowSearchInput {
  const rhythmLock = makeRequestRhythmLock({
    state: { kind: 'locked', bars: BUILD_LOCKED },
    allowedChanges: RHYTHM_CHANGE_KINDS,
    tenserPhrase: false,
  })
  return lockTestWindowInput(lockTestIntent({ tension: 'Build', seed, rhythmLock }))
}

/** The first session phrase seed that draws a change. */
const DRAWN_SEED = [0, 1, 2, 3, 4, 5, 6, 7]
  .map((session) => phraseAttemptSeed(makeSeed(session), 2, 0))
  .find((seed) => isRhythmChangeDrawn(seed, false))!

// @test-link [[service_generation_window_search]]
// @test-link [[module_rhythm_change_draw]]
describe('the search under a drawn rhythm change', () => {
  it("tries the change's candidates with every chord plan before the locked rhythm", () => {
    const input = changeInput(DRAWN_SEED)
    const order = input.rhythmLockOrder!
    expect(order.change?.changes).toBe(true)
    expect(order.changeCandidates.length).toBeGreaterThan(0)
    const { deps, calls } = recordingDeps(() => false)
    searchWindow(input, deps)
    expect(calls).toEqual(rhythmMajorCalls(input))
    const changeIdentities = new Set(order.changeCandidates.map((entry) => entry.rhythm.identity))
    expect(changeIdentities.has(calls[0]!.rhythm)).toBe(true)
  })

  it('records the kind of the change the phrase took', () => {
    const input = changeInput(DRAWN_SEED)
    const kindByIdentity = new Map(
      input.rhythmLockOrder!.changeCandidates.map((entry) => [entry.rhythm.identity, entry.kind]),
    )
    const { deps } = recordingDeps((rhythm) => kindByIdentity.has(rhythm.identity))
    const report = searchWindow(input, deps)
    expect(report.outcome.kind).toBe('window_success')
    if (report.outcome.kind !== 'window_success') return
    const { provenance } = report.outcome
    expect(provenance.rhythmLockOutcome).toBe('rhythm_change')
    expect(provenance.rhythmChange).toBe(kindByIdentity.get(provenance.rhythm.identity))
  })

  it('records no change available when no candidate makes a phrase', () => {
    const input = changeInput(DRAWN_SEED)
    const lockedKey = input.rhythmLockOrder!.lockedKey
    const { deps } = recordingDeps((rhythm) => rhythmBarKey(rhythm.bars) === lockedKey)
    const report = searchWindow(input, deps)
    expect(report.outcome.kind).toBe('window_success')
    if (report.outcome.kind !== 'window_success') return
    expect(report.outcome.provenance.rhythmLockOutcome).toBe('locked_bars')
    expect(report.outcome.provenance.rhythmChange).toBe('no_change_available')
  })
})
