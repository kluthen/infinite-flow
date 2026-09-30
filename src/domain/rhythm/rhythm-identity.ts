import { deepFreeze } from '../events/deep-freeze'
import type { RhythmCandidate, UnindexedRhythmCandidate } from './rhythm-types'

/**
 * The v1 identity is canonical JSON over every structural, provenance-bearing field. The planner
 * builds the same text from cached fragments (`fragmentRhythmIdentity`), which mirrors this key
 * order: change both together.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function normalizedRhythmIdentity(candidate: UnindexedRhythmCandidate): string {
  return JSON.stringify({
    grammarVersion: candidate.grammarVersion,
    controls: candidate.input,
    bars: candidate.bars,
    recurrence: candidate.recurrence,
    transforms: candidate.transforms,
  })
}

/**
 * Index and identify a candidate. A caller that already computed the candidate's
 * `normalizedRhythmIdentity` (the planner does, to deduplicate) passes it to avoid recomputing it.
 * The result is deep-frozen, and so is every part of the candidate not frozen yet: this is where
 * the planner freezes what it publishes.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function withRhythmIdentity(
  candidate: UnindexedRhythmCandidate,
  candidateIndex: number,
  identity: string = normalizedRhythmIdentity(candidate),
): RhythmCandidate {
  return deepFreeze({
    ...candidate,
    candidateIndex,
    identity,
  })
}
