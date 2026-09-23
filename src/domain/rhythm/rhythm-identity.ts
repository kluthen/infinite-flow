import { deepFreeze } from '../events/deep-freeze'
import type { RhythmCandidate, UnindexedRhythmCandidate } from './rhythm-types'

/** The v1 identity is canonical JSON over every structural, provenance-bearing field. */
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

export function withRhythmIdentity(
  candidate: UnindexedRhythmCandidate,
  candidateIndex: number,
): RhythmCandidate {
  return deepFreeze({
    ...candidate,
    candidateIndex,
    identity: normalizedRhythmIdentity(candidate),
  })
}
