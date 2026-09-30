/**
 * Unit coverage for the batch rhythm tie-key hashing behind `rankMaterializedRhythmCandidates`:
 * every incrementally computed key equals the reference `rhythmTieKey`, and the ranked order equals
 * sorting by that reference key then candidateIndex, on real materialized domains (including the
 * two largest) and on synthetic identities that share prefixes around the 64-character checkpoint
 * span.
 */

import { describe, expect, it } from 'vitest'

import {
  createCanonicalRhythmDomainMemo,
  type CanonicalRhythmDomainMemo,
} from '@/domain/generation/orchestration/canonical-rhythm-domain'
import {
  rankMaterializedRhythmCandidates,
  rhythmTieKey,
} from '@/domain/generation/orchestration/candidate-ranking'
import {
  buildRhythmTieKeyPlan,
  computeRhythmTieKeys,
  MixedRhythmGrammarVersionError,
} from '@/domain/generation/orchestration/rhythm-tie-key-batch'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type {
  RhythmCandidate,
  RhythmExpansionInput,
  RhythmGrammarVersion,
} from '@/domain/rhythm/rhythm-types'

const SETTINGS: readonly RhythmExpansionInput[] = [
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    silenceDensity: 'Sparse',
    syncopation: 'Active displacement',
    tensionArc: 'Build',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Build',
  },
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Heavily varied',
    silenceDensity: 'Conversational',
    syncopation: 'Occasional offbeats',
    tensionArc: 'Edge',
  },
  {
    noteDensity: 'Quarter',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  },
  {
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Conversational',
    syncopation: 'Occasional offbeats',
    tensionArc: 'Lift',
  },
]

const SEEDS: readonly Seed[] = [
  ...Array.from({ length: 20 }, (_, index) => makeSeed(index + 1)),
  makeSeed(0),
  makeSeed(0x7fffffff),
  makeSeed(0x80000000),
  makeSeed(0xffffffff),
]

/** Intent: materialize one setting's canonical candidate list through the real memo. */
function materializedDomain(
  memo: CanonicalRhythmDomainMemo,
  input: RhythmExpansionInput,
): readonly RhythmCandidate[] {
  const domain = memo.lookup(input)
  if (domain.kind !== 'canonical_rhythm_domain') {
    throw new Error(`Fixture setup: no legal rhythm plan for ${JSON.stringify(input)}.`)
  }
  return domain.candidates
}

/** Intent: the reference ranking, sorting by `rhythmTieKey` then candidateIndex. */
function referenceRankedIndices(candidates: readonly RhythmCandidate[], seed: Seed): number[] {
  return candidates
    .map((candidate) => ({ candidate, key: rhythmTieKey(seed, candidate) }))
    .sort(
      (left, right) =>
        left.key - right.key || left.candidate.candidateIndex - right.candidate.candidateIndex,
    )
    .map((entry) => entry.candidate.candidateIndex)
}

/** Intent: count candidates whose batch key differs from the reference key under one seed. */
function keyMismatches(candidates: readonly RhythmCandidate[], seed: Seed): number {
  const keys = computeRhythmTieKeys(candidates, seed)
  return candidates.filter(
    (candidate, position) => keys[position] !== rhythmTieKey(seed, candidate),
  ).length
}

/** Intent: a small real candidate to clone with synthetic identities and indices. */
function baseCandidate(): RhythmCandidate {
  const result = makeRhythmCandidateDomain(SETTINGS[3]!)
  if (isNoLegalRhythmPlan(result)) throw new Error('Fixture setup: no legal rhythm plan.')
  const first = result.candidates().next()
  if (first.done === true) throw new Error('Fixture setup: empty rhythm domain.')
  return first.value
}

/**
 * Intent: synthetic identities sharing prefixes shorter than, exactly at, and longer than 64-char
 * multiples (and around the 512-character coarse comparison block), including empty and short
 * identities, exact duplicates, identities that are a prefix of another at exactly 64, 128, 512
 * and 1024 characters, and a non-ASCII code unit.
 */
function syntheticCandidates(): RhythmCandidate[] {
  const base = baseCandidate()
  const block = (char: string, length: number) => char.repeat(length)
  const identities = [
    '',
    '',
    'a',
    'b',
    'ab',
    block('x', 63),
    block('x', 63) + 'a',
    block('x', 63) + 'b',
    block('x', 64),
    block('x', 64),
    block('x', 64) + 'a',
    block('x', 64) + 'b' + block('y', 70),
    block('x', 65),
    block('x', 127) + 'q',
    block('x', 128),
    block('x', 128) + 'z',
    block('x', 128) + 'z',
    block('x', 129) + block('w', 200),
    block('x', 192),
    block('x', 511) + 'a',
    block('x', 512),
    block('x', 512) + 'a',
    block('x', 513) + block('v', 600),
    block('x', 1024),
    block('x', 1100) + 'b',
    block('x', 1100) + 'c',
    block('x', 10) + 'é' + block('y', 80),
    block('x', 10) + 'é' + block('y', 81),
    'x',
  ]
  return identities.map((identity, candidateIndex) => ({ ...base, candidateIndex, identity }))
}

// @test-link [[module_ranked_candidate_ordering]]
describe('computeRhythmTieKeys', () => {
  it('equals rhythmTieKey key for key on synthetic shared-prefix identities', () => {
    const candidates = syntheticCandidates()
    for (const seed of SEEDS) {
      expect(keyMismatches(candidates, seed)).toBe(0)
    }
  })

  it('ranks synthetic identities exactly as the reference, frozen or not', () => {
    const mutable = syntheticCandidates()
    const frozen = Object.freeze(mutable.map((candidate) => Object.freeze({ ...candidate })))
    for (const seed of SEEDS) {
      const expected = referenceRankedIndices(mutable, seed)
      for (const candidates of [mutable, frozen]) {
        const ranked = rankMaterializedRhythmCandidates('rhythm-mvp-v2', candidates, seed)
        expect(ranked.candidates.map((candidate) => candidate.candidateIndex)).toEqual(expected)
      }
    }
  })

  it('returns no keys for an empty list', () => {
    expect(computeRhythmTieKeys([], makeSeed(1))).toEqual(new Uint32Array(0))
  })

  it('rejects a list mixing grammar versions', () => {
    const [first, second] = syntheticCandidates()
    const otherVersion = { ...second!, grammarVersion: 'rhythm-other' as RhythmGrammarVersion }
    expect(() => buildRhythmTieKeyPlan([first!, otherVersion])).toThrow(
      MixedRhythmGrammarVersionError,
    )
  })

  it.each(SETTINGS.map((input) => [Object.values(input).join('|'), input] as const))(
    'equals rhythmTieKey and the reference order on the %s domain',
    (_label, input) => {
      const candidates = materializedDomain(createCanonicalRhythmDomainMemo(), input)
      for (const seed of SEEDS) {
        expect(keyMismatches(candidates, seed)).toBe(0)
        const ranked = rankMaterializedRhythmCandidates('rhythm-mvp-v2', candidates, seed)
        expect(ranked.candidates.map((candidate) => candidate.candidateIndex)).toEqual(
          referenceRankedIndices(candidates, seed),
        )
        expect(Object.isFrozen(ranked)).toBe(true)
        expect(Object.isFrozen(ranked.candidates)).toBe(true)
      }
    },
    120_000,
  )
})
