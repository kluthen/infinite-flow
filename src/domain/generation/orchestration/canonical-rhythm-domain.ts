/**
 * Step 9 memo for the seed-independent canonical rhythm domain: `makeRhythmCandidateDomain`'s
 * full expansion depends only on the five rhythm-relevant controls (note density, rhythmic
 * variety, silence density, syncopation, tension arc) plus the grammar version, never on the seed,
 * yet the finite v2 control catalog carries only 3 x 3 x 3 x 3 x 4 = 324 distinct rhythm settings
 * per grammar version. Every repeated generation/regeneration against one of those 324 settings
 * can therefore reuse one already-materialized candidate list instead of re-running the expensive
 * Step 6 enumeration, with no eviction policy needed since the keyspace this memo can ever be
 * asked to fill is bounded by that finite catalog.
 */

import { deepFreeze } from '../../events/deep-freeze'
import {
  isNoLegalRhythmPlan,
  makeRhythmCandidateDomain,
  normalizeRhythmExpansionInput,
} from '../../rhythm/rhythm-planner'
import type {
  NoLegalRhythmPlan,
  NormalizedRhythmExpansionInput,
  RhythmCandidate,
  RhythmExpansionInput,
  RhythmGrammarVersion,
} from '../../rhythm/rhythm-types'

/**
 * The seed-independent canonical rhythm domain for one normalized rhythm setting: either the
 * typed no-plan result (memoized as-is) or the complete, already-materialized candidate list in
 * canonical iterator order, deep-frozen so no consumer can mutate the shared memoized instance.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export type CanonicalRhythmDomain =
  | NoLegalRhythmPlan
  | {
      readonly kind: 'canonical_rhythm_domain'
      readonly grammarVersion: RhythmGrammarVersion
      readonly input: NormalizedRhythmExpansionInput
      readonly candidates: readonly RhythmCandidate[]
    }

/** Intent: build the memo key string from a normalized rhythm-expansion input's identity fields. */
// @spec-link [[module_rhythm_variety_grammar]]
function memoKey(input: NormalizedRhythmExpansionInput): string {
  return `${input.grammarVersion}|${input.noteDensity}|${input.rhythmicVariety}|${input.silenceDensity}|${input.syncopation}|${input.tensionArc}`
}

/**
 * Intent: fully materialize a fresh `RhythmCandidateDomain`'s lazy iterator exactly once, in its
 * canonical iterator order, and freeze the result as a `CanonicalRhythmDomain`.
 */
function materializeCanonicalDomain(
  grammarVersion: RhythmGrammarVersion,
  input: NormalizedRhythmExpansionInput,
): CanonicalRhythmDomain {
  const result = makeRhythmCandidateDomain(input)
  if (isNoLegalRhythmPlan(result)) return result
  const candidates: RhythmCandidate[] = []
  for (const candidate of result.candidates()) {
    candidates.push(candidate)
  }
  return deepFreeze({
    kind: 'canonical_rhythm_domain' as const,
    grammarVersion,
    input,
    candidates,
  })
}

/** One memo instance's public interface: a keyed lookup, and the number of settings it has filled. */
export interface CanonicalRhythmDomainMemo {
  readonly lookup: (input: RhythmExpansionInput) => CanonicalRhythmDomain
  readonly size: () => number
}

/**
 * Intent: create a fresh, empty canonical-rhythm-domain memo keyed by grammar version and the five
 * rhythm-relevant controls of the NORMALIZED input. A miss expands and materializes the domain
 * exactly once (or memoizes the typed no-plan result) and stores it; a hit returns the exact same
 * frozen instance without touching the grammar again. Bounded by the finite 324-setting-per-
 * grammar-version control catalog, so no eviction policy is needed.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export function createCanonicalRhythmDomainMemo(): CanonicalRhythmDomainMemo {
  const store = new Map<string, CanonicalRhythmDomain>()

  function lookup(input: RhythmExpansionInput): CanonicalRhythmDomain {
    const normalized = normalizeRhythmExpansionInput(input)
    const key = memoKey(normalized)
    const existing = store.get(key)
    if (existing !== undefined) return existing
    const domain = materializeCanonicalDomain(normalized.grammarVersion, normalized)
    store.set(key, domain)
    return domain
  }

  function size(): number {
    return store.size
  }

  return { lookup, size }
}

/**
 * Intent: the shared, module-level canonical-rhythm-domain memo instance `generatePhrase` reuses
 * by default across every call in one process, so repeated generations/regenerations against the
 * same rhythm setting skip the expensive Step 6 enumeration.
 */
// @spec-link [[api_rhythm_domain_expansion]]
export const SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO: CanonicalRhythmDomainMemo =
  createCanonicalRhythmDomainMemo()
