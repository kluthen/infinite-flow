/**
 * The rhythm lock's order: under "on, these bars", the order in which the window search tries a
 * phrase's rhythm candidates, so the locked bars are kept whenever they can make a phrase and a
 * forced bend takes the nearest rhythm only when they cannot. Each candidate gets a preference
 * rank for the ordering seam (`orderRhythmByPreference`): the drawn rhythm change's candidates
 * when the phrase draws one (`rhythm-change-draw.ts`), then the candidates whose written bars
 * equal the locked bars, then every other candidate in the forced bend's order, by total edits
 * from the locked bars (a rhythm tied otherwise is at distance 0, so first); the seeded order
 * breaks every tie. Candidates are matched to the locked bars by the bar key, never by index or identity. The
 * forced bend's order is computed only when the search reaches past the locked bars, and at most
 * once per order, which the orchestrator builds once per request.
 */

import { orderRhythmByPreference } from '../generation/orchestration/candidate-ranking'
import type { LockedRhythmMeasure } from '../generation/request-rhythm-lock'
import {
  barsKeyedDomainOf,
  rhythmBarKey,
  rhythmStarts,
  type MeasureStarts,
  type WrittenMeasure,
} from './rhythm-bars'
import type { RhythmChangeCandidate, RhythmChangeDraw } from './rhythm-change-draw'
import type { RhythmChangeKind } from './rhythm-change-kinds'
import { rhythmDistance } from './rhythm-distance'
import type { RhythmCandidate } from './rhythm-types'

/**
 * Which part of the lock's order a rhythm comes from: the drawn rhythm change, the locked bars, or
 * a forced bend.
 */
// @spec-link [[module_rhythm_lock_order]]
export type RhythmLockTier = 'rhythm_change' | 'locked_bars' | 'forced_bend'

/** The preference rank of the drawn rhythm change's candidates. */
const RHYTHM_CHANGE_RANK = 0

/** The preference rank of the locked bars' candidates. */
const LOCKED_BARS_RANK = 1

/** The preference rank of a forced bend at distance 0; each edit adds one. */
const FORCED_BEND_RANK = 2

/** Injectable collaborators: the total edits between two rhythms, defaulted to the real one. */
export interface RhythmLockOrderDeps {
  readonly distance: (a: readonly MeasureStarts[], b: readonly MeasureStarts[]) => number
}

/** The production collaborators: the rhythm distance's total edits. */
export const DEFAULT_RHYTHM_LOCK_ORDER_DEPS: RhythmLockOrderDeps = Object.freeze({
  distance: rhythmDistance,
})

/** What one lock order is built from. */
export interface RhythmLockOrderInput {
  /** The phrase's whole rhythm domain in domain order, frozen (the canonical domain memo's list). */
  readonly domain: readonly RhythmCandidate[]
  /** The same candidates in the seeded order the search would walk without the lock. */
  readonly seeded: readonly RhythmCandidate[]
  /** The request's locked bars. */
  readonly lockedBars: readonly LockedRhythmMeasure[]
  /** The phrase's rhythm change draw, when one is made. */
  readonly change?: RhythmChangeDraw
}

/**
 * One request's rhythm lock order: the drawn change's candidates, the locked bars' candidates, then
 * the forced bend's order.
 */
// @spec-link [[module_rhythm_lock_order]]
export interface RhythmLockOrder {
  readonly lockedKey: string
  /** The phrase's rhythm change draw, when one was made; the record of its outcome reads it. */
  readonly change?: RhythmChangeDraw
  /** The drawn change's candidates, in seeded order; empty when the phrase draws none. */
  readonly changeCandidates: readonly RhythmChangeCandidate[]
  /** The candidates written as the locked bars, in seeded order; empty when the domain lacks them. */
  readonly lockedBars: readonly RhythmCandidate[]
  /** Every other candidate in the forced bend's order: computed on the first call, then reused. */
  readonly forcedBend: () => readonly RhythmCandidate[]
}

/** One rhythm of the walk, with the tier it comes from, and the kind of a drawn change. */
export interface RhythmLockStep {
  readonly rhythm: RhythmCandidate
  readonly tier: RhythmLockTier
  readonly changeKind?: RhythmChangeKind
}

/** Intent: locked bars as written measures, for the bar key and the start lists. */
function writtenMeasures(bars: readonly LockedRhythmMeasure[]): readonly WrittenMeasure[] {
  return bars.map((events, barIndex) => ({ barIndex, events }))
}

/** Intent: the bar key of the locked bars, equal to the key of a candidate written alike. */
// @spec-link [[module_rhythm_lock_order]]
// @spec-link [[rule_rhythm_lock_strict]]
export function lockedBarsKey(bars: readonly LockedRhythmMeasure[]): string {
  return rhythmBarKey(writtenMeasures(bars))
}

/**
 * Intent: the forced bend's order: every candidate but the drawn change's and the locked bars', by
 * total edits from the locked bars, then seeded order. Measured once per bar key, since candidates
 * written alike are at the same distance (and are drawn together).
 */
function forcedBendOrder(
  input: RhythmLockOrderInput,
  lockedKey: string,
  changeCandidates: readonly RhythmChangeCandidate[],
  lockedCount: number,
  deps: RhythmLockOrderDeps,
): readonly RhythmCandidate[] {
  const keyed = barsKeyedDomainOf(input.domain)
  const target = rhythmStarts(writtenMeasures(input.lockedBars))
  const rankByKey = new Map<string, number>([[lockedKey, LOCKED_BARS_RANK]])
  for (const { rhythm } of changeCandidates)
    rankByKey.set(keyed.keys[rhythm.candidateIndex]!, RHYTHM_CHANGE_RANK)
  for (const [key, group] of keyed.byKey) {
    if (rankByKey.has(key)) continue
    const starts = keyed.starts[group[0]!.candidateIndex]!
    rankByKey.set(key, FORCED_BEND_RANK + deps.distance(starts, target))
  }
  const ordered = orderRhythmByPreference(input.seeded, (candidate) => {
    const rank = rankByKey.get(keyed.keys[candidate.candidateIndex]!)
    if (rank === undefined)
      throw new Error(`Rhythm candidate ${candidate.candidateIndex} is not in the locked domain.`)
    return rank
  })
  return Object.freeze(ordered.slice(changeCandidates.length + lockedCount))
}

/**
 * Intent: build one request's rhythm lock order. The drawn change's candidates come as the draw
 * gives them, in seeded order; the locked bars' candidates are found through the domain's bar key
 * and kept in seeded order; the forced bend's order waits for its first use. Throws when the
 * seeded order is not the whole domain.
 */
// @spec-link [[module_rhythm_lock_order]]
// @spec-link [[rule_rhythm_lock_strict]]
// @spec-link [[rule_forced_bend]]
export function makeRhythmLockOrder(
  input: RhythmLockOrderInput,
  deps: RhythmLockOrderDeps = DEFAULT_RHYTHM_LOCK_ORDER_DEPS,
): RhythmLockOrder {
  if (input.seeded.length !== input.domain.length)
    throw new Error(
      `The seeded order holds ${input.seeded.length} rhythms; the domain holds ${input.domain.length}.`,
    )
  const lockedKey = lockedBarsKey(input.lockedBars)
  const written = barsKeyedDomainOf(input.domain).byKey.get(lockedKey) ?? []
  const lockedIndexes = new Set(written.map((candidate) => candidate.candidateIndex))
  const lockedBars = Object.freeze(
    input.seeded.filter((candidate) => lockedIndexes.has(candidate.candidateIndex)),
  )
  const changeCandidates = input.change?.changes === true ? input.change.candidates : []
  let forcedBend: readonly RhythmCandidate[] | undefined
  return Object.freeze({
    lockedKey,
    ...(input.change === undefined ? {} : { change: input.change }),
    changeCandidates: Object.freeze(changeCandidates),
    lockedBars,
    forcedBend: () => {
      forcedBend ??= forcedBendOrder(input, lockedKey, changeCandidates, lockedBars.length, deps)
      return forcedBend
    },
  })
}

/**
 * Intent: walk a lock order rhythm by rhythm: the drawn change's candidates with their kind, the
 * locked bars' candidates, then the forced bend's order, each tagged with its tier. The forced
 * bend's order is reached, and so computed, only when the walk goes past the locked bars.
 */
// @spec-link [[module_rhythm_lock_order]]
// @spec-link [[module_rhythm_change_draw]]
export function* walkRhythmLockOrder(order: RhythmLockOrder): Generator<RhythmLockStep> {
  for (const { rhythm, kind } of order.changeCandidates)
    yield { rhythm, tier: 'rhythm_change', changeKind: kind }
  for (const rhythm of order.lockedBars) yield { rhythm, tier: 'locked_bars' }
  for (const rhythm of order.forcedBend()) yield { rhythm, tier: 'forced_bend' }
}
