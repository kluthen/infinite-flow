import { describe, expect, it } from 'vitest'

import { createExpansionMemo, failsAnswerSimilarity } from '@/domain/rhythm/rhythm-expansion-memo'
import {
  answerSimilarityViolatedBy,
  attackBandViolated,
  attackTicks,
} from '@/domain/rhythm/rhythm-invariants'
import { normalizeRhythmExpansionInput } from '@/domain/rhythm/rhythm-planner'
import type {
  RhythmBar,
  RhythmExpansionInput,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'

import { enumerateRawRhythmCandidates } from './rhythm-prefilter-oracle'

/** Settings whose raw candidates include both verdicts of each check. */
const SETTINGS: readonly RhythmExpansionInput[] = [
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
    tensionArc: 'Build',
  },
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Heavily varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
    tensionArc: 'Edge',
  },
]

/** The raw, unpruned candidates of one setting, paired with their gesture. */
function rawCandidates(setting: RhythmExpansionInput) {
  return [...enumerateRawRhythmCandidates(normalizeRhythmExpansionInput(setting))]
}

/** The first raw candidate the full validator accepts, as a fixture to derive failures from. */
function validCandidate(): UnindexedRhythmCandidate {
  const found = rawCandidates(SETTINGS[0]!).find(
    ({ candidate }) => validateRhythmCandidate(candidate).length === 0,
  )
  if (!found) throw new Error('fixture setting has no valid candidate')
  return found.candidate
}

/** A copy of the bar with every note turned into a rest, so it has no attack. */
function withoutAttacks(bar: RhythmBar): RhythmBar {
  return { ...bar, events: bar.events.map((event) => ({ ...event, kind: 'rest' })) }
}

// @test-link [[api_rhythm_domain_expansion]]
// @test-link [[module_rhythm_domain_validation]]
describe('rhythm invariants shared by the validator and the fast enumeration', () => {
  // @test-link [[api_rhythm_domain_expansion]]
  // @test-link [[module_rhythm_domain_validation]]
  it('accepts the attack band and answer similarity of a valid candidate', () => {
    const candidate = validCandidate()
    const { noteDensity, rhythmicVariety } = candidate.input
    expect(
      candidate.bars.some((bar) => attackBandViolated(bar, noteDensity, rhythmicVariety)),
    ).toBe(false)
    expect(answerSimilarityViolatedBy(candidate.bars, attackTicks)).toBe(false)
    expect(failsAnswerSimilarity(createExpansionMemo(), candidate.bars)).toBe(false)
    expect(validateRhythmCandidate(candidate)).toEqual([])
  })

  // @test-link [[api_rhythm_domain_expansion]]
  // @test-link [[module_rhythm_domain_validation]]
  it('rejects a bar below the attack band, as the validator does', () => {
    const candidate = validCandidate()
    const bars = [withoutAttacks(candidate.bars[0]!), ...candidate.bars.slice(1)]
    const { noteDensity, rhythmicVariety } = candidate.input
    expect(attackTicks(bars[0]!)).toEqual([])
    expect(attackBandViolated(bars[0]!, noteDensity, rhythmicVariety)).toBe(true)
    expect(validateRhythmCandidate({ ...candidate, bars })).toContain(
      'density_attack_band_violation',
    )
  })

  // @test-link [[api_rhythm_domain_expansion]]
  // @test-link [[module_rhythm_domain_validation]]
  it('rejects answer bars that repeat too few gesture attacks, as the validator does', () => {
    const candidate = validCandidate()
    const bars = [
      ...candidate.bars.slice(0, 2),
      withoutAttacks(candidate.bars[2]!),
      withoutAttacks(candidate.bars[3]!),
    ]
    expect(answerSimilarityViolatedBy(bars, attackTicks)).toBe(true)
    expect(failsAnswerSimilarity(createExpansionMemo(), bars)).toBe(true)
    expect(validateRhythmCandidate({ ...candidate, bars })).toContain('answer_similarity_violation')
  })

  // @test-link [[api_rhythm_domain_expansion]]
  it('throws on a phrase that is not four bars long', () => {
    const candidate = validCandidate()
    expect(() => answerSimilarityViolatedBy(candidate.bars.slice(0, 3), attackTicks)).toThrow(
      RangeError,
    )
  })

  // @test-link [[api_rhythm_domain_expansion]]
  // @test-link [[module_rhythm_domain_validation]]
  it.each(SETTINGS)(
    'match the validator on every raw candidate of $noteDensity / $rhythmicVariety / $silenceDensity / $syncopation / $tensionArc',
    (setting) => {
      const memo = createExpansionMemo()
      const counts = { band: 0, similarity: 0, neither: 0 }
      for (const { gesture, candidate } of rawCandidates(setting)) {
        const codes = validateRhythmCandidate(candidate)
        const { noteDensity, rhythmicVariety } = candidate.input
        // Per gesture: transforms keep each bar's attack count, and bars 3-4 copy bars 1-2.
        const band = gesture.bars.some((bar) =>
          attackBandViolated(bar, noteDensity, rhythmicVariety),
        )
        const similarity = failsAnswerSimilarity(memo, candidate.bars)
        expect(band).toBe(codes.includes('density_attack_band_violation'))
        expect(similarity).toBe(codes.includes('answer_similarity_violation'))
        expect(answerSimilarityViolatedBy(candidate.bars, attackTicks)).toBe(similarity)
        if (band) counts.band += 1
        if (similarity) counts.similarity += 1
        if (!band && !similarity) counts.neither += 1
      }
      expect(counts.band).toBeGreaterThan(0)
      expect(counts.similarity).toBeGreaterThan(0)
      expect(counts.neither).toBeGreaterThan(0)
    },
    120_000,
  )
})
