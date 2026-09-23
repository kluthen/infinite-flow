import { normalizedRhythmIdentity } from './rhythm-identity'
import type { RhythmCandidateDomain, RhythmValidationCode } from './rhythm-types'

/** Validate properties that only exist across a complete replayed domain. */
// @spec-link [[module_rhythm_domain_validation]]
export function validateRhythmCandidateDomain(
  domain: RhythmCandidateDomain,
): readonly RhythmValidationCode[] {
  const first = [...domain.candidates()]
  const second = [...domain.candidates()]
  const failures = new Set<RhythmValidationCode>()
  if (first.some((candidate, index) => candidate.candidateIndex !== index))
    failures.add('candidate_index_invalid')
  if (new Set(first.map((candidate) => candidate.identity)).size !== first.length)
    failures.add('candidate_identity_duplicate')
  if (first.some((candidate) => candidate.identity !== normalizedRhythmIdentity(candidate)))
    failures.add('candidate_identity_mismatch')
  if (JSON.stringify(first) !== JSON.stringify(second)) failures.add('domain_replay_mismatch')
  return [...failures]
}
