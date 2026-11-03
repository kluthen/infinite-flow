// @vitest-environment node
/**
 * The steering block's rhythm order (master spec C5.9, C8): a candidate is compared with the
 * target as heard (a rest start right after another rest dropped); under the band ordering the
 * candidates whose every measure lies inside the band come first in seeded order, then the rest by
 * total edits, then seeded order; under the nearest ordering (the lock on, nothing locked yet) by
 * total edits alone, whatever the band. Every candidate stays once; the same input gives the same
 * order, whatever the runtime's collation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'
import type {
  SteeringBand,
  SteeringStart,
  SteeringTargetRhythm,
} from '@/domain/generation/steering-block'
import {
  heardMeasureStarts,
  steerRhythmOrder,
  type RhythmSteeringOrdering,
} from '@/domain/generation/steering/rhythm-steering'
import { makeSeed } from '@/domain/random/seed'
import { rhythmStarts, type MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import { measureBand, rhythmDistance, type RhythmBand } from '@/domain/rhythm/rhythm-distance'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'

import { seededOrder } from '../../rhythm/rhythm-lock-fixture'

/** Eighth notes with rests to spare: some candidates write one silence as two rests. */
const RESTFUL: RhythmExpansionInput = {
  noteDensity: 'Eighth',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Occasional offbeats',
  silenceDensity: 'Breath-heavy',
  tensionArc: 'Build',
}

/** Intent: a whole frozen domain of the given rhythm controls, in domain order. */
function domainOf(input: RhythmExpansionInput): readonly RhythmCandidate[] {
  const result = makeRhythmCandidateDomain(input)
  if (isNoLegalRhythmPlan(result)) throw new Error('Fixture setup: the domain has no plan.')
  return Object.freeze([...result.candidates()])
}

const DOMAIN = domainOf(RESTFUL)
const SEED = makeSeed(19)
const SEEDED = seededOrder(DOMAIN, SEED)

/** Intent: a measure's starts as heard, read here on their own: a rest after a rest is dropped. */
function heard(measure: MeasureStarts): MeasureStarts {
  return measure.filter(
    (start, index) => start.kind === 'note' || measure[index - 1]?.kind !== 'rest',
  )
}

/** Intent: a candidate's four measures as heard. */
function heardRhythm(candidate: RhythmCandidate): readonly MeasureStarts[] {
  return rhythmStarts(candidate.bars).map(heard)
}

/** Intent: a target rhythm of these measures (as plain starts) and band. */
function targetOf(measures: readonly MeasureStarts[], band: SteeringBand): SteeringTargetRhythm {
  return {
    measures: measures.map((measure) =>
      measure.map(({ tick, kind }): SteeringStart => ({ tick, kind })),
    ),
    band,
  }
}

/** Intent: whether a band admits a measure band. */
function admits(band: SteeringBand, measure: RhythmBand): boolean {
  if (band === 'unbounded') return true
  if (band === 'near') return measure !== 'beyond'
  return measure === 'Same' || measure === 'Close'
}

/** Intent: the candidate's rank as the spec states it, computed here from the rhythm distance. */
function expectedRank(
  candidate: RhythmCandidate,
  target: SteeringTargetRhythm,
  ordering: RhythmSteeringOrdering,
): number {
  const measures = heardRhythm(candidate)
  const edits = rhythmDistance(measures, target.measures)
  if (ordering === 'nearest') return edits
  const inside = measures.every((measure, index) =>
    admits(target.band, measureBand(measure, target.measures[index]!)),
  )
  return inside ? 0 : 1 + edits
}

/** Intent: whether some measure of the candidate writes a rest start right after another. */
function writesTwoRests(candidate: RhythmCandidate): boolean {
  return rhythmStarts(candidate.bars).some((measure) => heard(measure).length < measure.length)
}

/** A candidate writing some silence as two rests, and the target its measures make as heard. */
const TWO_RESTS = DOMAIN.find(writesTwoRests)!
/** A target far from most of the domain: one note on every beat, nothing else. */
const BEATS: readonly MeasureStarts[] = [0, 1, 2, 3].map(() =>
  [0, 4, 8, 12].map((tick) => ({ tick, kind: 'note' as const })),
)

/** Intent: the candidate indexes of an order. */
function indexes(order: readonly RhythmCandidate[]): readonly number[] {
  return order.map((candidate) => candidate.candidateIndex)
}

afterEach(() => {
  vi.restoreAllMocks()
})

// @test-link [[rule_rhythm_distance]]
// @test-link [[module_rhythm_steering]]
describe('a candidate read as heard', () => {
  it('drops a rest start right after another rest, and keeps every other start', () => {
    const written: MeasureStarts = [
      { tick: 0, kind: 'note' },
      { tick: 4, kind: 'rest' },
      { tick: 6, kind: 'rest' },
      { tick: 7, kind: 'rest' },
      { tick: 8, kind: 'note' },
      { tick: 12, kind: 'rest' },
    ]
    expect(heardMeasureStarts(written)).toEqual([
      { tick: 0, kind: 'note' },
      { tick: 4, kind: 'rest' },
      { tick: 8, kind: 'note' },
      { tick: 12, kind: 'rest' },
    ])
    const plain: MeasureStarts = [
      { tick: 0, kind: 'rest' },
      { tick: 4, kind: 'note' },
    ]
    expect(heardMeasureStarts(plain)).toBe(plain)
  })

  // @test-link [[rule_jam_rhythm_ordered_by_doodle]]
  it("puts a candidate writing one of the target's silences as two rests at no edit from it", () => {
    expect(TWO_RESTS).toBeDefined()
    const target = targetOf(heardRhythm(TWO_RESTS), 'close')
    // As written, the candidate is at least one edit away: the second rest is a start.
    expect(rhythmDistance(rhythmStarts(TWO_RESTS.bars), target.measures)).toBeGreaterThan(0)
    const nearest = steerRhythmOrder({
      domain: DOMAIN,
      seeded: SEEDED,
      target,
      ordering: 'nearest',
    })
    const firstAway = nearest.findIndex(
      (candidate) => expectedRank(candidate, target, 'nearest') > 0,
    )
    expect(nearest.indexOf(TWO_RESTS)).toBeLessThan(firstAway)
    const banded = steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target, ordering: 'band' })
    const firstOutside = banded.findIndex(
      (candidate) => expectedRank(candidate, target, 'band') > 0,
    )
    expect(banded.indexOf(TWO_RESTS)).toBeLessThan(firstOutside)
  })
})

// @test-link [[rule_jam_rhythm_ordered_by_doodle]]
// @test-link [[rule_jam_drift_positions]]
// @test-link [[module_rhythm_steering]]
describe('the steered rhythm order', () => {
  const targets: readonly SteeringTargetRhythm[] = [
    targetOf(BEATS, 'close'),
    targetOf(BEATS, 'near'),
    targetOf(heardRhythm(SEEDED[SEEDED.length - 1]!), 'close'),
    targetOf(heardRhythm(SEEDED[SEEDED.length - 1]!), 'near'),
  ]

  it('places each candidate by (its rank, its seeded position), under both orderings', () => {
    for (const target of targets)
      for (const ordering of ['band', 'nearest'] as const) {
        const order = steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target, ordering })
        const position = new Map(SEEDED.map((candidate, index) => [candidate, index]))
        const expected = [...SEEDED].sort(
          (a, b) =>
            expectedRank(a, target, ordering) - expectedRank(b, target, ordering) ||
            position.get(a)! - position.get(b)!,
        )
        expect(indexes(order)).toEqual(indexes(expected))
      }
  })

  it('tries every rhythm inside the band before any outside it, in seeded order', () => {
    const target = targets[3]!
    const order = steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target, ordering: 'band' })
    const inside = SEEDED.filter((candidate) => expectedRank(candidate, target, 'band') === 0)
    expect(inside.length).toBeGreaterThan(0)
    expect(inside.length).toBeLessThan(SEEDED.length)
    expect(indexes(order.slice(0, inside.length))).toEqual(indexes(inside))
  })

  it('keeps the seeded order under the unbounded band, and orders by nearness whatever the band', () => {
    const unbounded = targetOf(BEATS, 'unbounded')
    expect(
      steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target: unbounded, ordering: 'band' }),
    ).toBe(SEEDED)
    /** Intent: the nearest ordering's candidate indexes for the beats target at a band. */
    const nearest = (band: SteeringBand): readonly number[] =>
      indexes(
        steerRhythmOrder({
          domain: DOMAIN,
          seeded: SEEDED,
          target: targetOf(BEATS, band),
          ordering: 'nearest',
        }),
      )
    expect(nearest('close')).toEqual(nearest('unbounded'))
    expect(nearest('near')).toEqual(nearest('unbounded'))
    expect(nearest('unbounded')).not.toEqual(indexes(SEEDED))
  })

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('holds every candidate exactly once, and never changes its input', () => {
    for (const target of targets)
      for (const ordering of ['band', 'nearest'] as const) {
        const order = steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target, ordering })
        expect(order).toHaveLength(DOMAIN.length)
        expect(new Set(indexes(order)).size).toBe(DOMAIN.length)
        expect(Object.isFrozen(order)).toBe(true)
      }
    expect(indexes(SEEDED)).toEqual(indexes(seededOrder(DOMAIN, SEED)))
  })

  it('gives the same order twice for the same target and seed, under a non-English collation', () => {
    const target = targetOf(BEATS, 'close')
    const plain = indexes(
      steerRhythmOrder({ domain: DOMAIN, seeded: SEEDED, target, ordering: 'band' }),
    )
    // A collation that reverses every comparison, as no English one does: the order must not move.
    vi.spyOn(String.prototype, 'localeCompare').mockImplementation(function (this: string, other) {
      return this < String(other) ? 1 : this > String(other) ? -1 : 0
    })
    const reversed = new Intl.Collator('sv')
    vi.spyOn(Intl, 'Collator').mockImplementation(
      () =>
        ({
          ...reversed,
          compare: (a: string, b: string) => -reversed.compare(a, b),
        }) as Intl.Collator,
    )
    for (let pass = 0; pass < 2; pass += 1) {
      const again = steerRhythmOrder({
        domain: DOMAIN,
        seeded: seededOrder(DOMAIN, SEED),
        target,
        ordering: 'band',
      })
      expect(indexes(again)).toEqual(plain)
    }
  })

  it('refuses a seeded order that is not the whole domain', () => {
    expect(() =>
      steerRhythmOrder({
        domain: DOMAIN,
        seeded: SEEDED.slice(1),
        target: targetOf(BEATS, 'close'),
        ordering: 'band',
      }),
    ).toThrow(/seeded order holds/)
  })
})
