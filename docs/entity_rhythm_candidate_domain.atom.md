---
id: entity_rhythm_candidate_domain
status: DRAFT
human_name: Rhythm Candidate Domain
layer: ARCHITECTURE
priority: 1
tags: rhythm,candidate-domain,step6
version: 0.1
type: ENTITY
parents:
  - [[req_four_measure_phrase]]
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
  - [[user_story_controlled_phrase_generation]]
dependents: []
---

# Rhythm Candidate Domain

## INTENT
Define the versioned immutable pitchless rhythm-candidate schema and its normalized structural identity.

## THE RULE / LOGIC
Each candidate and candidate domain is immutable and carries grammarVersion. A candidate records four bars, recurrence, transform descriptors, nominal provenance, a normalized structural identity, and a contiguous candidateIndex; the index is not part of identity. Identity is derived only from the normalized structural rhythm payload, so it is independent of seed, iteration chunking, consumer backpressure, harmony, pitch, profile, instrument, ranking, and selection. Normalization preserves identity-bearing rhythm provenance and annotations while removing only the equivalences defined by the selected grammar version. A production, ordering, or normalization change creates a new grammar version rather than reinterpreting an existing version.

## TECHNICAL INTERFACE
Consumers exchange an immutable RhythmCandidateDomain and immutable RhythmCandidate values. A domain exposes its grammarVersion, normalized expansion input, and a candidates factory that returns a fresh iterable iterator on each call; candidates expose their grammarVersion, structural identity, zero-based index, bars, recurrence, transforms, and provenance. The schema accepts or exposes no seed, random source, harmony, pitch, profile, instrument, ranking, selection, calibration table, catalog table, or tooling fixture.

## EXPECTATION
Published domain and candidate values cannot be mutated. Equal normalized structural payloads have one identity and only the earliest derivation is retained; different identity-bearing provenance remains distinct. Repeated candidates() calls replay byte-equivalent candidate values in the same order, and neither identities nor indices vary with a seed or consumer behavior.
