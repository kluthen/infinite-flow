import { describe, expect, it } from 'vitest'

import {
  harmonyTieKey,
  materializeRankedRhythmCache,
  rankHarmonyCandidates,
  rhythmTieKey,
} from '@/domain/generation/orchestration/candidate-ranking'
import { isNoLegalHarmonyPlan, makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { makeSeed } from '@/domain/random/seed'

function harmonyDomain(): readonly HarmonyCandidate[] {
  const result = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Active diatonic',
    tensionArc: 'Settled',
    profile: 'Neutral',
  })
  if (isNoLegalHarmonyPlan(result)) throw new Error('Unexpected empty harmony domain.')
  return result.candidates
}

function fastRhythmDomain() {
  const result = makeRhythmCandidateDomain({
    noteDensity: 'Eighth',
    silenceDensity: 'Conversational',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (isNoLegalRhythmPlan(result)) throw new Error('Unexpected empty rhythm domain.')
  return result
}

const SEED_A = makeSeed(1)
const SEED_B = makeSeed(2)

// @test-link [[module_named_stream_pseudorandomness]]
describe('candidate-ranking', () => {
  // @test-link [[service_generation_orchestration]]
  describe('rankHarmonyCandidates', () => {
    it('is a loss-free, duplication-free permutation of the domain', () => {
      const candidates = harmonyDomain()
      const ranked = rankHarmonyCandidates(candidates, SEED_A)
      expect(ranked).toHaveLength(candidates.length)
      expect([...ranked].sort((a, b) => a.candidateIndex - b.candidateIndex)).toEqual(
        [...candidates].sort((a, b) => a.candidateIndex - b.candidateIndex),
      )
    })

    it('is deterministic for the same seed', () => {
      const candidates = harmonyDomain()
      const first = rankHarmonyCandidates(candidates, SEED_A).map((c) => c.candidateIndex)
      const second = rankHarmonyCandidates(candidates, SEED_A).map((c) => c.candidateIndex)
      expect(second).toEqual(first)
    })

    it('is seed sensitive: at least one pair of seeds yields a different order', () => {
      const candidates = harmonyDomain()
      const byA = rankHarmonyCandidates(candidates, SEED_A).map((c) => c.candidateIndex)
      const byB = rankHarmonyCandidates(candidates, SEED_B).map((c) => c.candidateIndex)
      expect(byB).not.toEqual(byA)
    })

    it('does not depend on input array order', () => {
      const candidates = harmonyDomain()
      const shuffled = [...candidates].reverse()
      const fromOriginal = rankHarmonyCandidates(candidates, SEED_A).map((c) => c.candidateIndex)
      const fromShuffled = rankHarmonyCandidates(shuffled, SEED_A).map((c) => c.candidateIndex)
      expect(fromShuffled).toEqual(fromOriginal)
    })

    it('breaks a tie-key collision by candidateIndex ascending', () => {
      const base = harmonyDomain()[0]!
      const sharedIdentity = base.identity
      const high = { ...base, candidateIndex: 9, identity: sharedIdentity }
      const low = { ...base, candidateIndex: 3, identity: sharedIdentity }
      expect(harmonyTieKey(SEED_A, high)).toBe(harmonyTieKey(SEED_A, low))
      const ranked = rankHarmonyCandidates([high, low], SEED_A)
      expect(ranked.map((c) => c.candidateIndex)).toEqual([3, 9])
    })

    it('freezes the returned array', () => {
      const ranked = rankHarmonyCandidates(harmonyDomain(), SEED_A)
      expect(Object.isFrozen(ranked)).toBe(true)
    })
  })

  // @test-link [[service_generation_orchestration]]
  describe('materializeRankedRhythmCache', () => {
    it('has a domainSize equal to the full candidate count', () => {
      const domain = fastRhythmDomain()
      const full = [...domain.candidates()]
      const cache = materializeRankedRhythmCache(domain, SEED_A)
      expect(cache.domainSize).toBe(full.length)
      expect(cache.candidates).toHaveLength(full.length)
      expect(cache.grammarVersion).toBe(domain.grammarVersion)
    })

    it('is a loss-free, duplication-free permutation of the domain', () => {
      const domain = fastRhythmDomain()
      const full = [...domain.candidates()]
      const cache = materializeRankedRhythmCache(domain, SEED_A)
      expect([...cache.candidates].sort((a, b) => a.candidateIndex - b.candidateIndex)).toEqual(
        [...full].sort((a, b) => a.candidateIndex - b.candidateIndex),
      )
    })

    it('is deterministic for the same seed', () => {
      const domain = fastRhythmDomain()
      const first = materializeRankedRhythmCache(domain, SEED_A).candidates.map(
        (c) => c.candidateIndex,
      )
      const second = materializeRankedRhythmCache(domain, SEED_A).candidates.map(
        (c) => c.candidateIndex,
      )
      expect(second).toEqual(first)
    })

    it('is seed sensitive: at least one pair of seeds yields a different order', () => {
      const domain = fastRhythmDomain()
      const byA = materializeRankedRhythmCache(domain, SEED_A).candidates.map(
        (c) => c.candidateIndex,
      )
      const byB = materializeRankedRhythmCache(domain, SEED_B).candidates.map(
        (c) => c.candidateIndex,
      )
      expect(byB).not.toEqual(byA)
    })

    it('breaks a tie-key collision by candidateIndex ascending', () => {
      const base = [...fastRhythmDomain().candidates()][0]!
      const sharedIdentity = base.identity
      const high = { ...base, candidateIndex: 7, identity: sharedIdentity }
      const low = { ...base, candidateIndex: 2, identity: sharedIdentity }
      expect(rhythmTieKey(SEED_A, high)).toBe(rhythmTieKey(SEED_A, low))
      const fakeDomain = {
        kind: 'rhythm_candidate_domain' as const,
        grammarVersion: base.grammarVersion,
        input: base.input,
        candidates: function* () {
          yield high
          yield low
        },
      }
      const cache = materializeRankedRhythmCache(fakeDomain, SEED_A)
      expect(cache.candidates.map((c) => c.candidateIndex)).toEqual([2, 7])
    })

    it('freezes the returned cache and its candidate array', () => {
      const cache = materializeRankedRhythmCache(fastRhythmDomain(), SEED_A)
      expect(Object.isFrozen(cache)).toBe(true)
      expect(Object.isFrozen(cache.candidates)).toBe(true)
    })
  })
})
