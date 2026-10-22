import { describe, expect, it } from 'vitest'

import { measureStarts, rhythmStarts, type MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import {
  measureBand,
  measureBands,
  measureEdits,
  rhythmDistance,
} from '@/domain/rhythm/rhythm-distance'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmEventKind } from '@/domain/rhythm/rhythm-types'

import { bar, phrase, starts } from './rhythm-bar-fixture'

/** Intent: a small deterministic PRNG (mulberry32) so the property checks replay exactly. */
function prng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** Intent: draw a start list of 0 to `maxStarts` distinct ticks of a 16-tick measure. */
function randomStarts(next: () => number, maxStarts: number): MeasureStarts {
  const count = Math.floor(next() * (maxStarts + 1))
  const ticks = new Set<number>()
  while (ticks.size < count) ticks.add(Math.floor(next() * 16))
  return [...ticks]
    .sort((left, right) => left - right)
    .map((tick) => ({ tick, kind: (next() < 0.5 ? 'note' : 'rest') as RhythmEventKind }))
}

/** Intent: whether a tick is beat 1 or beat 3, the strong beats of the distance. */
function strong(tick: number): number {
  return tick === 0 || tick === 8 ? 1 : 0
}

/**
 * Intent: the exact lexicographic minimum (edits, strong edits) over every partial matching of
 * `a`'s starts to `b`'s, crossing pairs included; an unmatched start is an add or a remove.
 */
function bruteForce(a: MeasureStarts, b: MeasureStarts): { edits: number; strongEdits: number } {
  let best = { edits: Infinity, strongEdits: Infinity }
  const used = new Array<boolean>(b.length).fill(false)
  /** Intent: settle start `index` of `a` every possible way, then score the unmatched starts. */
  const visit = (index: number, edits: number, strongEdits: number): void => {
    if (index === a.length) {
      let total = edits
      let totalStrong = strongEdits
      b.forEach((start, j) => {
        if (!used[j]) {
          total += 1
          totalStrong += strong(start.tick)
        }
      })
      if (total < best.edits || (total === best.edits && totalStrong < best.strongEdits))
        best = { edits: total, strongEdits: totalStrong }
      return
    }
    const from = a[index]!
    visit(index + 1, edits + 1, strongEdits + strong(from.tick))
    b.forEach((to, j) => {
      if (used[j]) return
      const shift = Math.abs(to.tick - from.tick)
      let cost: [number, number] | undefined
      if (shift === 0 && to.kind === from.kind) cost = [0, 0]
      else if (shift === 0) cost = [1, strong(from.tick)]
      else if (shift <= 2 && to.kind === from.kind)
        cost = [1, Math.max(strong(from.tick), strong(to.tick))]
      if (!cost) return
      used[j] = true
      visit(index + 1, edits + cost[0], strongEdits + cost[1])
      used[j] = false
    })
  }
  visit(0, 0, 0)
  return best
}

/** Intent: a four-measure rhythm from one measure's start list and three unchanged ones. */
function withFirst(first: MeasureStarts): readonly MeasureStarts[] {
  return [first, starts('n0 n8'), starts('n0'), starts('n0 r12')]
}

// @test-link [[rule_rhythm_distance]]
describe('rhythm distance: the edits', () => {
  it('two equal measures are Same, with no edit', () => {
    expect(measureEdits(starts('n0 n4 r8'), starts('n0 n4 r8'))).toEqual({
      edits: 0,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 n4 r8'), starts('n0 n4 r8'))).toBe('Same')
  })

  it('adding a start off beats 1 and 3 is one Close edit', () => {
    expect(measureEdits(starts('n0 n8'), starts('n0 n4 n8'))).toEqual({ edits: 1, strongEdits: 0 })
    expect(measureBand(starts('n0 n8'), starts('n0 n4 n8'))).toBe('Close')
  })

  it('removing a start is one edit', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n8'))).toEqual({ edits: 1, strongEdits: 0 })
    expect(measureBand(starts('n0 n4 n8'), starts('n0 n8'))).toBe('Close')
  })

  it('moving a start by a sixteenth is one edit', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n5 n8'))).toEqual({
      edits: 1,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 r4 n8'), starts('n0 r3 n8'))).toBe('Close')
  })

  it('moving a start by an eighth is one edit', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n6 n8'))).toEqual({
      edits: 1,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 n12'), starts('n0 n10'))).toBe('Close')
  })

  it('moving a start by three sixteenths is two edits, a remove and an add', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n7 n8'))).toEqual({
      edits: 2,
      strongEdits: 0,
    })
  })

  it('turning a note start into a rest start at the same tick, or back, is one edit', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 r4 n8'))).toEqual({
      edits: 1,
      strongEdits: 0,
    })
    expect(measureEdits(starts('n0 r4 n8'), starts('n0 n4 n8'))).toEqual({
      edits: 1,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 r4 n8'), starts('n0 n4 n8'))).toBe('Close')
  })

  it('a move that also changes the kind is two edits', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 r5 n8'))).toEqual({
      edits: 2,
      strongEdits: 0,
    })
  })
})

// @test-link [[rule_rhythm_distance]]
describe('rhythm distance: the bands', () => {
  it.each([
    ['adding a start on beat 3', 'n0 n4', 'n0 n4 n8'],
    ['removing the start on beat 1', 'n0 n4 n8', 'n4 n8'],
    ['turning the note on beat 1 into a rest', 'n0 n4', 'r0 n4'],
    ['moving a start onto beat 3', 'n0 n6', 'n0 n8'],
    ['moving a start off beat 3', 'n0 n8', 'n0 n10'],
  ])('one edit touching tick 0 or 8 is Near: %s', (_name, left, right) => {
    expect(measureEdits(starts(left), starts(right))).toEqual({ edits: 1, strongEdits: 1 })
    expect(measureBand(starts(left), starts(right))).toBe('Near')
  })

  it('two Close edits are Near', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n5 n8 n12'))).toEqual({
      edits: 2,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 n4 n8'), starts('n0 n5 n8 n12'))).toBe('Near')
  })

  it('among the fewest edits, the count prefers edits away from beats 1 and 3', () => {
    // Moving 6 to 8 and 8 to 10 is also two edits, but both touch beat 3.
    expect(measureEdits(starts('n0 n6 n8'), starts('n0 n8 n10'))).toEqual({
      edits: 2,
      strongEdits: 0,
    })
    expect(measureBand(starts('n0 n6 n8'), starts('n0 n8 n10'))).toBe('Near')
  })

  it('one Close edit and one edit on a strong beat is beyond', () => {
    expect(measureEdits(starts('n0 n4 n8'), starts('n0 n5 r8'))).toEqual({
      edits: 2,
      strongEdits: 1,
    })
    expect(measureBand(starts('n0 n4 n8'), starts('n0 n5 r8'))).toBe('beyond')
  })

  it('three edits are beyond', () => {
    expect(measureEdits(starts('n0 n4 n8 n12'), starts('n0 n5 n8 n13 n14')).edits).toBe(3)
    expect(measureBand(starts('n0 n4 n8 n12'), starts('n0 n5 n8 n13 n14'))).toBe('beyond')
  })

  it('ties are not starts: bars differing only by a tie are at distance 0', () => {
    const tied = phrase(['n4 n2 ~n2 n8', 'n8 ~n8', 'n16', 'r4 n12'])
    const untied = phrase(['n4 n4 n8', 'n16', 'n16', 'r4 n12'])
    expect(measureStarts(tied[0]!)).toEqual(measureStarts(untied[0]!))
    expect(rhythmDistance(rhythmStarts(tied), rhythmStarts(untied))).toBe(0)
    expect(measureBands(rhythmStarts(tied), rhythmStarts(untied))).toEqual([
      'Same',
      'Same',
      'Same',
      'Same',
    ])
    expect(measureBand(measureStarts(bar('n8 ~n8')), measureStarts(bar('n16')))).toBe('Same')
  })
})

// @test-link [[rule_rhythm_distance]]
describe('rhythm distance: over four measures', () => {
  it('bands each measure and totals the edits', () => {
    const left = withFirst(starts('n0 n4 n8'))
    const right: readonly MeasureStarts[] = [
      starts('n0 n5 n8 n12'),
      starts('n0 n8'),
      starts('n0 n4'),
      starts('r0 n4 r12'),
    ]
    expect(measureBands(left, right)).toEqual(['Near', 'Same', 'Close', 'beyond'])
    expect(rhythmDistance(left, right)).toBe(5)
  })

  it('rejects two rhythms with different measure counts', () => {
    const four = withFirst(starts('n0'))
    expect(() => rhythmDistance(four, four.slice(1))).toThrow(/measure/)
    expect(() => measureBands(four, four.slice(1))).toThrow(/measure/)
  })

  it('rejects a start list that is not strictly increasing within the measure', () => {
    expect(() => measureEdits(starts('n4 n0'), starts('n0'))).toThrow()
    expect(() => measureEdits(starts('n0 n16'), starts('n0'))).toThrow()
  })
})

// @test-link [[rule_rhythm_distance]]
describe('rhythm distance: properties', () => {
  it('equals the exact minimum over every matching, crossing pairs included', () => {
    const next = prng(20261022)
    const disagreements: string[] = []
    for (let trial = 0; trial < 20_000; trial += 1) {
      const a = randomStarts(next, 6)
      const b = randomStarts(next, 6)
      const expected = bruteForce(a, b)
      const actual = measureEdits(a, b)
      if (actual.edits !== expected.edits || actual.strongEdits !== expected.strongEdits)
        disagreements.push(JSON.stringify({ a, b, expected, actual }))
    }
    expect(disagreements.slice(0, 3)).toEqual([])
  })

  it('a note and the rest beside it swapping, with a crossing match, is two edits', () => {
    // Note 4 moves to 6 and rest 6 moves to 5: an order-preserving alignment would count three.
    expect(measureEdits(starts('n4 r6'), starts('r5 n6'))).toEqual({ edits: 2, strongEdits: 0 })
  })

  it('is symmetric and zero only between equal start lists', () => {
    const next = prng(7)
    for (let trial = 0; trial < 5_000; trial += 1) {
      const a = [0, 1, 2, 3].map(() => randomStarts(next, 6))
      const b = [0, 1, 2, 3].map((index) => (next() < 0.5 ? a[index]! : randomStarts(next, 6)))
      expect(rhythmDistance(a, b)).toBe(rhythmDistance(b, a))
      expect(measureBands(a, b)).toEqual(measureBands(b, a))
      a.forEach((measure, index) =>
        expect(measureEdits(measure, b[index]!)).toEqual(measureEdits(b[index]!, measure)),
      )
      expect(rhythmDistance(a, b) === 0).toBe(JSON.stringify(a) === JSON.stringify(b))
    }
  })

  it('over a real domain, two candidates are at distance 0 exactly when their start lists match', () => {
    const result = makeRhythmCandidateDomain({
      noteDensity: 'Sixteenth',
      rhythmicVariety: 'Slightly varied',
      silenceDensity: 'Conversational',
      syncopation: 'Straight',
      tensionArc: 'Lift',
    })
    if (isNoLegalRhythmPlan(result)) throw new Error('the domain has no plan')
    const lists = [...result.candidates()].map((candidate) => rhythmStarts(candidate.bars))
    const texts = lists.map((list) => JSON.stringify(list))
    let zero = 0
    lists.forEach((left, i) =>
      lists.forEach((right, j) => {
        const distance = rhythmDistance(left, right)
        if (distance === 0) zero += 1
        if ((distance === 0) !== (texts[i] === texts[j]))
          throw new Error(`candidates ${i} and ${j}: distance ${distance}`)
      }),
    )
    expect(zero).toBeGreaterThanOrEqual(lists.length)
  }, 60_000)
})
