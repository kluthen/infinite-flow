import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { rhythmBarKey, rhythmStarts, type MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import { rhythmChangeCandidates } from '@/domain/rhythm/rhythm-change-draw'
import { rhythmDistance } from '@/domain/rhythm/rhythm-distance'
import {
  lockedBarsKey,
  makeRhythmLockOrder,
  walkRhythmLockOrder,
  type RhythmLockOrderDeps,
} from '@/domain/rhythm/rhythm-lock-order'
import {
  RHYTHM_CHANGE_KINDS,
  type LockedRhythmMeasure,
} from '@/domain/generation/request-rhythm-lock'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'

import {
  lockedBarsOf,
  lockTestDomain,
  seededOrder,
  tieVariantOutsideDomain,
} from './rhythm-lock-fixture'

const BUILD = lockTestDomain('Build')
const LIFT = lockTestDomain('Lift')
const SEED = makeSeed(11)

/** Intent: the starts of locked bars, as the rhythm distance reads them. */
function lockedStarts(bars: readonly LockedRhythmMeasure[]): readonly MeasureStarts[] {
  return rhythmStarts(bars.map((events, barIndex) => ({ barIndex, events })))
}

/** Intent: a bar key written by two candidates or more of the Build domain. */
function sharedKeyCandidate(): RhythmCandidate {
  const counts = new Map<string, number>()
  for (const candidate of BUILD) {
    const key = rhythmBarKey(candidate.bars)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const found = BUILD.find((candidate) => counts.get(rhythmBarKey(candidate.bars))! > 1)
  if (!found) throw new Error('Fixture setup: no bars written by two candidates.')
  return found
}

/** Intent: a distance dependency that counts its calls. */
function countingDeps(): { deps: RhythmLockOrderDeps; calls: () => number } {
  let count = 0
  return {
    deps: {
      distance: (a, b) => {
        count += 1
        return rhythmDistance(a, b)
      },
    },
    calls: () => count,
  }
}

// @test-link [[module_rhythm_lock_order]]
// @test-link [[rule_rhythm_lock_strict]]
describe('the locked bars', () => {
  it('keys locked bars as the candidate written alike is keyed', () => {
    const candidate = BUILD[3]!
    expect(lockedBarsKey(lockedBarsOf(candidate))).toBe(rhythmBarKey(candidate.bars))
  })

  it('come first: every candidate written alike, whatever its identity, in seeded order', () => {
    const locked = sharedKeyCandidate()
    const seeded = seededOrder(BUILD, SEED)
    const order = makeRhythmLockOrder({ domain: BUILD, seeded, lockedBars: lockedBarsOf(locked) })
    const key = rhythmBarKey(locked.bars)
    const expected = seeded.filter((candidate) => rhythmBarKey(candidate.bars) === key)
    expect(expected.length).toBeGreaterThan(1)
    expect(order.lockedBars).toEqual(expected)
  })

  it('are matched by bars, so bars missing from the domain lock no candidate', () => {
    const missing = BUILD.find(
      (candidate) =>
        !LIFT.some((other) => rhythmBarKey(other.bars) === rhythmBarKey(candidate.bars)),
    )!
    const order = makeRhythmLockOrder({
      domain: LIFT,
      seeded: seededOrder(LIFT, SEED),
      lockedBars: lockedBarsOf(missing),
    })
    expect(order.lockedBars).toEqual([])
  })
})

// @test-link [[module_rhythm_lock_order]]
// @test-link [[rule_forced_bend]]
describe("the forced bend's order", () => {
  it('follows the locked bars, by total edits from them, then in seeded order', () => {
    const locked = sharedKeyCandidate()
    const seeded = seededOrder(BUILD, SEED)
    const order = makeRhythmLockOrder({ domain: BUILD, seeded, lockedBars: lockedBarsOf(locked) })
    const target = rhythmStarts(locked.bars)
    const key = rhythmBarKey(locked.bars)
    const expected = seeded
      .filter((candidate) => rhythmBarKey(candidate.bars) !== key)
      .map((candidate, position) => ({
        candidate,
        position,
        distance: rhythmDistance(rhythmStarts(candidate.bars), target),
      }))
      .sort((left, right) => left.distance - right.distance || left.position - right.position)
      .map((entry) => entry.candidate)
    expect(order.forcedBend()).toEqual(expected)
  })

  it('puts a rhythm that sounds as the locked bars but is tied otherwise first', () => {
    const { source, bars } = tieVariantOutsideDomain(LIFT)
    const order = makeRhythmLockOrder({
      domain: LIFT,
      seeded: seededOrder(LIFT, SEED),
      lockedBars: bars,
    })
    expect(order.lockedBars).toEqual([])
    const first = order.forcedBend()[0]!
    expect(rhythmDistance(rhythmStarts(first.bars), lockedStarts(bars))).toBe(0)
    expect(rhythmBarKey(first.bars)).not.toBe(lockedBarsKey(bars))
    const atZero = order
      .forcedBend()
      .filter((candidate) => rhythmDistance(rhythmStarts(candidate.bars), lockedStarts(bars)) === 0)
    expect(atZero).toContain(source)
    expect(order.forcedBend().slice(0, atZero.length)).toEqual(atZero)
  })

  it('is an order, never a filter: every candidate once across the two tiers', () => {
    const seeded = seededOrder(BUILD, SEED)
    const order = makeRhythmLockOrder({
      domain: BUILD,
      seeded,
      lockedBars: lockedBarsOf(sharedKeyCandidate()),
    })
    const walked = [...order.lockedBars, ...order.forcedBend()]
    expect(walked).toHaveLength(seeded.length)
    expect(new Set(walked)).toEqual(new Set(seeded))
  })

  it('is computed only when asked for, and once', () => {
    const counting = countingDeps()
    const order = makeRhythmLockOrder(
      { domain: BUILD, seeded: seededOrder(BUILD, SEED), lockedBars: lockedBarsOf(BUILD[0]!) },
      counting.deps,
    )
    expect(counting.calls()).toBe(0)
    const first = order.forcedBend()
    const afterFirst = counting.calls()
    expect(afterFirst).toBeGreaterThan(0)
    expect(order.forcedBend()).toBe(first)
    expect(counting.calls()).toBe(afterFirst)
  })
})

// @test-link [[module_rhythm_lock_order]]
describe('walking the order', () => {
  it('gives the locked bars, then the forced bend, each tagged with its tier', () => {
    const order = makeRhythmLockOrder({
      domain: BUILD,
      seeded: seededOrder(BUILD, SEED),
      lockedBars: lockedBarsOf(sharedKeyCandidate()),
    })
    expect([...walkRhythmLockOrder(order)]).toEqual([
      ...order.lockedBars.map((rhythm) => ({ rhythm, tier: 'locked_bars' })),
      ...order.forcedBend().map((rhythm) => ({ rhythm, tier: 'forced_bend' })),
    ])
  })

  it("never computes the forced bend's order while the locked bars are being tried", () => {
    const counting = countingDeps()
    const order = makeRhythmLockOrder(
      { domain: BUILD, seeded: seededOrder(BUILD, SEED), lockedBars: lockedBarsOf(BUILD[0]!) },
      counting.deps,
    )
    const walk = walkRhythmLockOrder(order)
    expect(walk.next().value).toEqual({ rhythm: order.lockedBars[0], tier: 'locked_bars' })
    expect(counting.calls()).toBe(0)
  })
})

/** Intent: a Build candidate whose bars offer a change of some kind, with those candidates. */
function lockedWithChange(seeded: readonly RhythmCandidate[]) {
  for (const locked of BUILD) {
    const lockedBars = lockedBarsOf(locked)
    const candidates = rhythmChangeCandidates({
      domain: BUILD,
      seeded,
      lockedBars,
      allowedChanges: RHYTHM_CHANGE_KINDS,
    })
    if (candidates.length > 0) return { lockedBars, candidates }
  }
  throw new Error('Fixture setup: no Build rhythm offers a change.')
}

// @test-link [[module_rhythm_lock_order]]
// @test-link [[module_rhythm_change_draw]]
describe('the drawn rhythm change', () => {
  it('comes first, with its kind, then the locked bars, then the forced bend without it', () => {
    const seeded = seededOrder(BUILD, SEED)
    const { lockedBars, candidates } = lockedWithChange(seeded)
    const change = { changes: true as const, candidates }
    const order = makeRhythmLockOrder({ domain: BUILD, seeded, lockedBars, change })
    expect(order.change).toBe(change)
    const walked = [...walkRhythmLockOrder(order)]
    expect(walked.slice(0, candidates.length)).toEqual(
      candidates.map(({ rhythm, kind }) => ({ rhythm, tier: 'rhythm_change', changeKind: kind })),
    )
    const next = walked.slice(candidates.length, candidates.length + order.lockedBars.length)
    expect(next.map((step) => step.rhythm)).toEqual(order.lockedBars)
    expect(next.every((step) => step.tier === 'locked_bars')).toBe(true)
    const drawn = new Set(candidates.map((entry) => entry.rhythm))
    expect(order.forcedBend().some((candidate) => drawn.has(candidate))).toBe(false)
    expect(walked).toHaveLength(seeded.length)
    expect(new Set(walked.map((step) => step.rhythm))).toEqual(new Set(seeded))
  })

  it('leaves the lock order as it was when the phrase draws no change', () => {
    const seeded = seededOrder(BUILD, SEED)
    const { lockedBars } = lockedWithChange(seeded)
    const plain = makeRhythmLockOrder({ domain: BUILD, seeded, lockedBars })
    const unchanged = makeRhythmLockOrder({
      domain: BUILD,
      seeded,
      lockedBars,
      change: { changes: false },
    })
    expect(plain.change).toBeUndefined()
    expect(unchanged.change).toEqual({ changes: false })
    expect([...walkRhythmLockOrder(unchanged)]).toEqual([...walkRhythmLockOrder(plain)])
  })
})
