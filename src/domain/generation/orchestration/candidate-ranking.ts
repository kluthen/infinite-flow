/**
 * Deterministic, seed-driven candidate ranking. Harmony and rhythm candidates carry no musical
 * score difference under current policy (every harmony candidate of one domain shares the same
 * tension requirement; the rhythm grammar defines no scores), so every candidate is equal-ranked
 * and the search order is the seeded tie key, falling back to the canonical `candidateIndex` only
 * on a key collision. Sorting is stable and explicit: compare unsigned keys, then candidateIndex.
 */

import { deepFreeze } from '../../events/deep-freeze'
import type { HarmonyCandidate } from '../../harmony/harmony-types'
import { fnv1a32 } from '../../random/hash32'
import { encodeSeed, type Seed } from '../../random/seed'
import type {
  RhythmCandidate,
  RhythmCandidateDomain,
  RhythmGrammarVersion,
} from '../../rhythm/rhythm-types'

/**
 * Intent: derive the deterministic unsigned tie key for one harmony candidate under one seed,
 * hashing the versioned tie-key domain string, the seed's documented string encoding, and the
 * candidate's stable identity.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function harmonyTieKey(seed: Seed, candidate: Pick<HarmonyCandidate, 'identity'>): number {
  return fnv1a32(`infinite-flow/harmony-tie/v1|${encodeSeed(seed)}|${candidate.identity}`) >>> 0
}

/**
 * Intent: derive the deterministic unsigned tie key for one rhythm candidate under one seed,
 * hashing the versioned tie-key domain string, the seed's documented string encoding, the
 * candidate's grammar version, and the candidate's stable identity.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function rhythmTieKey(
  seed: Seed,
  candidate: Pick<RhythmCandidate, 'grammarVersion' | 'identity'>,
): number {
  return (
    fnv1a32(
      `infinite-flow/rhythm-tie/v1|${encodeSeed(seed)}|${candidate.grammarVersion}|${candidate.identity}`,
    ) >>> 0
  )
}

/**
 * Intent: sort items by an explicit unsigned tie key ascending, breaking a key collision by the
 * canonical candidate index ascending. Never mutates the input array; returns a new array in the
 * stably-determined order.
 */
function sortByTieKey<T>(
  items: readonly T[],
  keyOf: (item: T) => number,
  candidateIndexOf: (item: T) => number,
): readonly T[] {
  return items
    .map((item) => ({ item, key: keyOf(item), candidateIndex: candidateIndexOf(item) }))
    .sort((left, right) => left.key - right.key || left.candidateIndex - right.candidateIndex)
    .map((entry) => entry.item)
}

/**
 * Intent: rank a complete harmony candidate domain (or any subset) into the seeded search order
 * for one seed, without loss or duplication. Every candidate is equal-ranked under current
 * policy, so order is the seeded tie key with a candidateIndex fallback on collision.
 */
// @spec-link [[service_generation_orchestration]]
export function rankHarmonyCandidates(
  candidates: readonly HarmonyCandidate[],
  seed: Seed,
): readonly HarmonyCandidate[] {
  return deepFreeze(
    sortByTieKey(
      candidates,
      (candidate) => harmonyTieKey(seed, candidate),
      (candidate) => candidate.candidateIndex,
    ),
  )
}

/**
 * A materialized, seed-ranked rhythm candidate cache: the complete domain expansion, sorted once
 * into the seeded search order and frozen, so an orchestrator can reuse the same ranked candidate
 * list across every Varying register window without re-expanding or re-ranking the grammar.
 */
// @spec-link [[service_generation_orchestration]]
export interface RankedRhythmCache {
  readonly kind: 'ranked_rhythm_cache'
  readonly grammarVersion: RhythmGrammarVersion
  readonly domainSize: number
  readonly candidates: readonly RhythmCandidate[]
}

/**
 * Intent: fully materialize a rhythm candidate domain's lazy iterator exactly once, then sort it
 * into the seeded search order (seeded tie key ascending, candidateIndex ascending on collision),
 * and freeze the result as a reusable RankedRhythmCache.
 */
// @spec-link [[service_generation_orchestration]]
export function materializeRankedRhythmCache(
  domain: RhythmCandidateDomain,
  seed: Seed,
): RankedRhythmCache {
  const all: RhythmCandidate[] = []
  for (const candidate of domain.candidates()) {
    all.push(candidate)
  }
  const ranked = sortByTieKey(
    all,
    (candidate) => rhythmTieKey(seed, candidate),
    (candidate) => candidate.candidateIndex,
  )
  return deepFreeze({
    kind: 'ranked_rhythm_cache',
    grammarVersion: domain.grammarVersion,
    domainSize: all.length,
    candidates: ranked,
  })
}
