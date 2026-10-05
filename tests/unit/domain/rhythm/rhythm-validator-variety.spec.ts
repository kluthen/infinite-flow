/**
 * Rhythm validation of the rhythmic-variety setting: the value sets and the dominance floor each
 * variety level allows, checked on real generated candidates relabelled to another level.
 */
import { describe, expect, it } from 'vitest'

import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'
import type { UnindexedRhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { generatedCandidate, mutableCandidate } from './rhythm-validator-fixture'

/** Nominal attack counts by duration, matching `densityShare`/`varietyViolated`'s own counting. */
function nominalAttackCounts(candidate: UnindexedRhythmCandidate): Map<number, number> {
  const counts = new Map<number, number>()
  for (const bar of candidate.bars)
    for (const event of bar.events) {
      if (event.kind !== 'note' || event.tieContinuation) continue
      counts.set(event.nominalDurationTicks, (counts.get(event.nominalDurationTicks) ?? 0) + 1)
    }
  return counts
}

// @test-link [[module_rhythm_variety_grammar]]
describe('rhythmic_variety_violation: value sets and dominance', () => {
  it('accepts a Heavily varied candidate whose 50% tie is with a shorter value', () => {
    const candidate = generatedCandidate(
      {
        noteDensity: 'Quarter',
        rhythmicVariety: 'Heavily varied',
        silenceDensity: 'Conversational',
        syncopation: 'Active displacement',
        tensionArc: 'Edge',
      },
      (item) => {
        const counts = nominalAttackCounts(item)
        const qCount = counts.get(4) ?? 0
        return qCount > 0 && (counts.get(2) ?? 0) === qCount
      },
    )
    expect(validateRhythmCandidate(candidate)).toEqual([])
  })

  it('rejects a 50% tie with a longer value at Heavily varied', () => {
    // Same real, generated candidate as above (q=4 tied 50/50 with the shorter value 2), but
    // relabelled with a density whose q is the shorter value: the former density value (4) is
    // now the longer one, so the same tie is no longer with a shorter value.
    const candidate = mutableCandidate(
      {
        noteDensity: 'Quarter',
        rhythmicVariety: 'Heavily varied',
        silenceDensity: 'Conversational',
        syncopation: 'Active displacement',
        tensionArc: 'Edge',
      },
      (item) => {
        const counts = nominalAttackCounts(item)
        const qCount = counts.get(4) ?? 0
        return qCount > 0 && (counts.get(2) ?? 0) === qCount
      },
    )
    candidate.input.noteDensity = 'Eighth'
    expect(validateRhythmCandidate(candidate)).toContain('rhythmic_variety_violation')
  })

  it('rejects a below-floor nominal attack share at Slightly varied', () => {
    // A real Heavily-varied Quarter candidate whose q share sits in [0.5, 0.75) clears Heavily's
    // 0.5 floor but not Slightly's 0.75 floor once relabelled.
    const candidate = mutableCandidate(
      {
        noteDensity: 'Quarter',
        rhythmicVariety: 'Heavily varied',
        silenceDensity: 'Sparse',
        syncopation: 'Straight',
        tensionArc: 'Settled',
      },
      (item) => {
        const counts = nominalAttackCounts(item)
        const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
        const share = (counts.get(4) ?? 0) / total
        return share >= 0.5 && share < 0.75
      },
    )
    candidate.input.rhythmicVariety = 'Slightly varied'
    expect(validateRhythmCandidate(candidate)).toContain('rhythmic_variety_violation')
  })

  // @test-link [[module_rhythm_variety_grammar]]
  it('under Strict, rejects a non-density nominal value but accepts a syncopation-displaced render of the density value (R1)', () => {
    // Reuses the existing "rhythmic variety" audit case's fixture shape: a real Slightly-varied
    // Eighth candidate carrying one of the extra beat cells (nominal != q) relabelled Strict.
    const nonDensityCandidate = mutableCandidate(
      { noteDensity: 'Eighth', rhythmicVariety: 'Slightly varied' },
      (item) =>
        item.bars.some((bar) =>
          bar.events.some((event) => event.kind === 'note' && event.nominalDurationTicks !== 2),
        ),
    )
    nonDensityCandidate.input.rhythmicVariety = 'Strict'
    expect(validateRhythmCandidate(nonDensityCandidate)).toContain('rhythmic_variety_violation')

    // A real Strict Eighth candidate with an active-displacement syncopation transform: its
    // rendered timing differs from its nominal value, but the nominal value is exempt (R1), so
    // the candidate stays fully valid.
    const displacedCandidate = generatedCandidate(
      {
        noteDensity: 'Eighth',
        rhythmicVariety: 'Strict',
        silenceDensity: 'Conversational',
        syncopation: 'Active displacement',
        tensionArc: 'Edge',
      },
      (item) => item.transforms.some((descriptor) => descriptor.roles.includes('syncopation')),
    )
    const renderedEvent = displacedCandidate.bars
      .flatMap((bar) => bar.events)
      .find(
        (event) =>
          event.kind === 'note' &&
          !event.tieContinuation &&
          event.nominalDurationTicks === 2 &&
          event.durationTicks !== event.nominalDurationTicks,
      )!
    expect(renderedEvent).toBeDefined()
    expect(validateRhythmCandidate(displacedCandidate)).toEqual([])
  })
})
