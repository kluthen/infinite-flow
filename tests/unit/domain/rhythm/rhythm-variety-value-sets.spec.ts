import { describe, expect, it } from 'vitest'

import {
  NOTE_DENSITIES,
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  makeGenerationControls,
  type NoteDensity,
  type RhythmicVariety,
} from '@/domain/controls/generation-controls'
import { isUnsupportedRhythmSetting } from '@/domain/controls/unsupported-rhythm-settings'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { densityTicks } from '@/domain/rhythm/rhythm-variety'
import { makeSeed } from '@/domain/random/seed'
import type { RhythmBar, RhythmCandidate, RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'

/**
 * The review §1 resulting nominal attack value sets, in ticks (1 = sixteenth, 2 = eighth,
 * 4 = quarter). Frozen expectations, not derived: this spec exists to prove the implementation
 * produces exactly these sets, not to recompute them.
 */
const EXPECTED_VALUE_SETS: Readonly<
  Record<NoteDensity, Readonly<Record<RhythmicVariety, readonly number[]>>>
> = {
  Quarter: {
    Strict: [4],
    'Slightly varied': [4, 8],
    'Heavily varied': [2, 4, 6, 8],
  },
  Eighth: {
    Strict: [2],
    'Slightly varied': [1, 2, 3, 4, 6],
    'Heavily varied': [1, 2, 3, 4, 6, 8],
  },
  Sixteenth: {
    Strict: [1],
    'Slightly varied': [1, 2, 3],
    'Heavily varied': [1, 2, 3, 4],
  },
}

/** Floor on the density value's nominal attack share, per level (§2, feasibility review; D74). */
const MIN_SHARE: Readonly<Record<RhythmicVariety, number>> = {
  Strict: 1,
  'Slightly varied': 0.75,
  'Heavily varied': 0.5,
}

/** Nominal attack counts by duration, matching `densityShare`/`varietyViolated`'s own counting. */
function nominalAttackCounts(bars: readonly RhythmBar[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const bar of bars)
    for (const event of bar.events) {
      if (event.kind !== 'note' || event.tieContinuation) continue
      counts.set(event.nominalDurationTicks, (counts.get(event.nominalDurationTicks) ?? 0) + 1)
    }
  return counts
}

/** The candidate's every supported (silence density, syncopation, tension arc) full domain. */
function supportedDomainsFor(
  noteDensity: NoteDensity,
  rhythmicVariety: RhythmicVariety,
): RhythmCandidate[] {
  const results: RhythmCandidate[] = []
  for (const silenceDensity of SILENCE_DENSITIES)
    for (const syncopation of SYNCOPATIONS) {
      if (isUnsupportedRhythmSetting({ noteDensity, rhythmicVariety, silenceDensity, syncopation }))
        continue
      for (const tensionArc of TENSION_ARCS) {
        const input: RhythmExpansionInput = {
          grammarVersion: 'rhythm-mvp-v2',
          noteDensity,
          rhythmicVariety,
          silenceDensity,
          syncopation,
          tensionArc,
        }
        const domain = makeRhythmCandidateDomain(input)
        if (isNoLegalRhythmPlan(domain))
          throw new Error(
            `Expected a legal plan for a setting the unsupported-rhythm-settings table does not block: ` +
              `${noteDensity}/${rhythmicVariety}/${silenceDensity}/${syncopation}/${tensionArc}, got ${domain.codes.join(', ')}`,
          )
        results.push(...domain.candidates())
      }
    }
  return results
}

const CELLS: ReadonlyArray<{
  readonly noteDensity: NoteDensity
  readonly variety: RhythmicVariety
}> = NOTE_DENSITIES.flatMap((noteDensity) =>
  RHYTHMIC_VARIETIES.map((variety) => ({ noteDensity, variety })),
)

// @test-link [[module_rhythm_variety_grammar]]
describe('rhythm-mvp-v2 value sets and dominance, per density x rhythmic variety cell', () => {
  it.each(
    CELLS.map(({ noteDensity, variety }) => ({
      noteDensity,
      variety,
      label: `${noteDensity} / ${variety}`,
    })),
  )(
    '$label: every candidate is within the review §1 cell and clears the dominance floor',
    ({ noteDensity, variety }) => {
      const q = densityTicks(noteDensity)
      const floor = MIN_SHARE[variety]
      const expected = new Set(EXPECTED_VALUE_SETS[noteDensity][variety])
      const candidates = supportedDomainsFor(noteDensity, variety)
      expect(candidates.length).toBeGreaterThan(0)

      const observed = new Set<number>()
      for (const candidate of candidates) {
        const counts = nominalAttackCounts(candidate.bars)
        const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
        expect(total).toBeGreaterThan(0)

        // (b) every candidate's nominal values are a subset of its cell.
        for (const value of counts.keys()) {
          expect(
            expected.has(value),
            `unexpected nominal value ${value} at ${noteDensity}/${variety}`,
          ).toBe(true)
          observed.add(value)
        }

        // (c) the density value's nominal attack share is at or above the floor.
        const qCount = counts.get(q) ?? 0
        expect(qCount / total).toBeGreaterThanOrEqual(floor - 1e-9)

        // (d) at Heavily varied, any exact 50% tie is only with a shorter value.
        if (variety === 'Heavily varied')
          for (const [value, count] of counts)
            if (value !== q && count === qCount)
              expect(
                value,
                `50% tie at ${noteDensity}/${variety} must be with a shorter value`,
              ).toBeLessThan(q)
      }

      // (a) the union of nominal values used equals the review §1 cell exactly.
      expect([...observed].sort((left, right) => left - right)).toEqual(
        [...expected].sort((left, right) => left - right),
      )
    },
    60_000,
  )
})

/** One representative supported (silence density, syncopation) setting per cell, for the seed check. */
const SEED_MATRIX_SETTINGS: ReadonlyArray<{
  readonly noteDensity: NoteDensity
  readonly variety: RhythmicVariety
  readonly silenceDensity: (typeof SILENCE_DENSITIES)[number]
  readonly syncopation: (typeof SYNCOPATIONS)[number]
}> = [
  { noteDensity: 'Quarter', variety: 'Strict', silenceDensity: 'Sparse', syncopation: 'Straight' },
  {
    noteDensity: 'Quarter',
    variety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
  },
  {
    noteDensity: 'Quarter',
    variety: 'Heavily varied',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
  },
  { noteDensity: 'Eighth', variety: 'Strict', silenceDensity: 'Sparse', syncopation: 'Straight' },
  {
    noteDensity: 'Eighth',
    variety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
  },
  {
    noteDensity: 'Eighth',
    variety: 'Heavily varied',
    silenceDensity: 'Conversational',
    syncopation: 'Active displacement',
  },
  {
    noteDensity: 'Sixteenth',
    variety: 'Strict',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
  },
  {
    noteDensity: 'Sixteenth',
    variety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
  },
  {
    noteDensity: 'Sixteenth',
    variety: 'Heavily varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
  },
]

const SEEDS = [makeSeed(1), makeSeed(2), makeSeed(3)]

function buildIntent(
  setting: (typeof SEED_MATRIX_SETTINGS)[number],
  seed: ReturnType<typeof makeSeed>,
): GenerationIntent {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: 'Settled',
    noteDensity: setting.noteDensity,
    rhythmicVariety: setting.variety,
    syncopation: setting.syncopation,
    silenceDensity: setting.silenceDensity,
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'bb-tenor',
  })
  return createGenerationIntent({
    requestId: makeRequestId(
      `variety-value-sets-${setting.noteDensity}-${setting.variety}-${seed}`,
    ),
    seed,
    controls,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
}

// @test-link [[module_rhythm_variety_grammar]]
describe('rhythm-mvp-v2 value sets and dominance across the real generatePhrase seed matrix', () => {
  it.each(
    SEED_MATRIX_SETTINGS.map((setting) => ({
      setting,
      label: `${setting.noteDensity} / ${setting.variety} / ${setting.silenceDensity} / ${setting.syncopation}`,
    })),
  )('$label holds the value-set and dominance facts across seeds 1-3', ({ setting }) => {
    const q = densityTicks(setting.noteDensity)
    const floor = MIN_SHARE[setting.variety]
    const expected = new Set(EXPECTED_VALUE_SETS[setting.noteDensity][setting.variety])

    for (const seed of SEEDS) {
      const outcome = generatePhrase(buildIntent(setting, seed))
      expect(outcome.kind).toBe('generation_success')
      if (outcome.kind !== 'generation_success') continue

      const counts = nominalAttackCounts(outcome.provenance.rhythm.bars)
      const total = [...counts.values()].reduce((sum, count) => sum + count, 0)
      expect(total).toBeGreaterThan(0)

      for (const value of counts.keys()) expect(expected.has(value)).toBe(true)

      const qCount = counts.get(q) ?? 0
      expect(qCount / total).toBeGreaterThanOrEqual(floor - 1e-9)
    }
  })
})
