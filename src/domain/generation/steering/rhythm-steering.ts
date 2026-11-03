/**
 * The rhythm half of the steering module: how the steering block's target rhythm orders a
 * phrase's rhythm candidates. Each candidate gets a preference rank for the ordering seam
 * (`orderRhythmByPreference`), read from its bar key's start lists as heard (a rest start right
 * after another rest dropped, since one silence written as two rests sounds as one) against the
 * target's measures as the block writes them. Ordering by band: 0 when every measure lies inside
 * the block's band, else 1 plus the total edits over the four measures. Ordering by nearness (the
 * rhythm lock on, nothing locked yet): the total edits alone. The seeded order breaks every tie,
 * so the tuple is (rank, seeded tie key, candidate index). An order, never a filter: every
 * candidate stays exactly once. It reads only the block's target rhythm and band; no doodle, no
 * drift, no Jam, no random stream.
 */

import { orderRhythmByPreference } from '../orchestration/candidate-ranking'
import { barsKeyedDomainOf, type MeasureStarts, type RhythmStart } from '../../rhythm/rhythm-bars'
import { measureBand, measureEdits, type RhythmBand } from '../../rhythm/rhythm-distance'
import type { RhythmCandidate } from '../../rhythm/rhythm-types'
import type { SteeringBand, SteeringTargetRhythm } from '../steering-block'

/**
 * How the target rhythm orders the candidates: by the block's band (the lock off), or by nearness
 * alone, whatever the band (the lock on with nothing locked yet, a Jam's phrase 1).
 */
// @spec-link [[rule_jam_rhythm_ordered_by_doodle]]
// @spec-link [[rule_jam_drift_positions]]
export type RhythmSteeringOrdering = 'band' | 'nearest'

/** What one steered order is built from. */
export interface RhythmSteeringInput {
  /** The phrase's whole rhythm domain in domain order, frozen (the canonical domain memo's list). */
  readonly domain: readonly RhythmCandidate[]
  /** The same candidates in the seeded order the search would walk without the block. */
  readonly seeded: readonly RhythmCandidate[]
  /** The steering block's target rhythm: four measures of starts, and the band. */
  readonly target: SteeringTargetRhythm
  readonly ordering: RhythmSteeringOrdering
}

/** The measure bands each steering band admits; the unbounded band admits every measure. */
const BANDS_INSIDE: Readonly<Record<SteeringBand, ReadonlySet<RhythmBand>>> = {
  close: new Set<RhythmBand>(['Same', 'Close']),
  near: new Set<RhythmBand>(['Same', 'Close', 'Near']),
  unbounded: new Set<RhythmBand>(['Same', 'Close', 'Near', 'beyond']),
}

/** The rank of a candidate whose every measure lies inside the band; outside, 1 plus its edits. */
const INSIDE_BAND_RANK = 0
const OUTSIDE_BAND_RANK = 1

/**
 * Intent: one measure's start list as heard: every note start, and every rest start but one
 * right after another rest, so a silence written as two or more rests starts once. A list with no
 * such rest is returned as it is.
 */
// @spec-link [[rule_rhythm_distance]]
// @spec-link [[module_rhythm_steering]]
export function heardMeasureStarts(starts: MeasureStarts): MeasureStarts {
  const heard: RhythmStart[] = []
  let previous: RhythmStart['kind'] | undefined
  for (const start of starts) {
    if (!(start.kind === 'rest' && previous === 'rest')) heard.push(start)
    previous = start.kind
  }
  return heard.length === starts.length ? starts : Object.freeze(heard)
}

/** One candidate measure against one target measure: its edits and whether the band admits it. */
interface MeasureComparison {
  readonly edits: number
  readonly inside: boolean
}

/**
 * Intent: compare written measures with the target's measures, memoized by measure pair (the
 * written start list, shared by every measure written alike, and the target measure's position),
 * so each distinct pair is measured once per order.
 */
function measureComparer(
  target: SteeringTargetRhythm,
): (written: MeasureStarts, position: number) => MeasureComparison {
  const inside = BANDS_INSIDE[target.band]
  const memo = target.measures.map(() => new Map<MeasureStarts, MeasureComparison>())
  return (written, position) => {
    const known = memo[position]!.get(written)
    if (known) return known
    const heard = heardMeasureStarts(written)
    const goal = target.measures[position]!
    const comparison = {
      edits: measureEdits(heard, goal).edits,
      inside: inside.has(measureBand(heard, goal)),
    }
    memo[position]!.set(written, comparison)
    return comparison
  }
}

/**
 * Intent: the preference rank of one rhythm's measures: under the band ordering 0 when every
 * measure is inside the band, else 1 plus the total edits; under the nearest ordering the total
 * edits alone. Throws when the rhythm and the target differ in measure count.
 */
function rankOf(
  measures: readonly MeasureStarts[],
  compare: (written: MeasureStarts, position: number) => MeasureComparison,
  target: SteeringTargetRhythm,
  ordering: RhythmSteeringOrdering,
): number {
  if (measures.length !== target.measures.length)
    throw new Error(
      `Cannot steer a rhythm of ${measures.length} measures by a target of ` +
        `${target.measures.length}.`,
    )
  let edits = 0
  let inside = true
  measures.forEach((written, position) => {
    const comparison = compare(written, position)
    edits += comparison.edits
    inside &&= comparison.inside
  })
  if (ordering === 'nearest') return edits
  return inside ? INSIDE_BAND_RANK : OUTSIDE_BAND_RANK + edits
}

/**
 * Intent: the steered rhythm order of one request: the seeded order sorted by each candidate's
 * preference rank against the target (by band, or by nearness alone), the seeded order breaking
 * ties. Ranked once per bar key, since candidates written alike are at the same distance. Under
 * the band ordering with the unbounded band every candidate is inside, so the seeded order is
 * returned as it is. Throws when the seeded order is not the whole domain.
 */
// @spec-link [[module_rhythm_steering]]
// @spec-link [[rule_jam_rhythm_ordered_by_doodle]]
// @spec-link [[rule_jam_drift_positions]]
// @spec-link [[rule_doodle_only_orders_candidates]]
export function steerRhythmOrder(input: RhythmSteeringInput): readonly RhythmCandidate[] {
  if (input.seeded.length !== input.domain.length)
    throw new Error(
      `The seeded order holds ${input.seeded.length} rhythms; the domain holds ${input.domain.length}.`,
    )
  if (input.ordering === 'band' && input.target.band === 'unbounded') return input.seeded
  const keyed = barsKeyedDomainOf(input.domain)
  const compare = measureComparer(input.target)
  const rankByKey = new Map<string, number>()
  for (const [key, group] of keyed.byKey)
    rankByKey.set(
      key,
      rankOf(keyed.starts[group[0]!.candidateIndex]!, compare, input.target, input.ordering),
    )
  return orderRhythmByPreference(input.seeded, (candidate) => {
    const rank = rankByKey.get(keyed.keys[candidate.candidateIndex]!)
    if (rank === undefined)
      throw new Error(`Rhythm candidate ${candidate.candidateIndex} is not in the steered domain.`)
    return rank
  })
}
