---
id: entity_rhythm_candidate_domain
status: REVIEW
human_name: Rhythm Candidate Domain
layer: ARCHITECTURE
priority: 1
tags: rhythm,candidate-domain,step6
version: 0.4
type: ENTITY
parents:
  - [[req_four_measure_phrase]]
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
  - [[rule_rhythm_change_kinds]]
  - [[rule_rhythm_distance]]
  - [[user_story_controlled_phrase_generation]]
dependents:
  - [[module_rhythm_lock_order]]
---

# Rhythm Candidate Domain

## INTENT
Define the versioned immutable pitchless rhythm-candidate schema, its normalized structural identity, and the bar key by which candidates that write the same rhythm compare equal.

## THE RULE / LOGIC
Each candidate and candidate domain is immutable and carries grammarVersion. A candidate records four bars, recurrence, transform descriptors, nominal provenance, a normalized structural identity, and a contiguous candidateIndex; the index is not part of identity. Identity is derived only from the normalized structural rhythm payload, so it is independent of seed, iteration chunking, consumer backpressure, harmony, pitch, profile, instrument, ranking, and selection. Normalization preserves identity-bearing rhythm provenance and annotations while removing only the equivalences defined by the selected grammar version. A production, ordering, or normalization change creates a new grammar version rather than reinterpreting an existing version.

Bar key. Because identity keeps provenance, two candidates that write the same rhythm can carry different identities. Wherever rhythms must be compared as written (the rhythm distance, the change kinds, the locked rhythm), they are compared by a bar key, never by identity or index: a compact string built from a candidate's written bars, measure by measure (note starts and lengths, rests, ties), so candidates whose bars are identical have equal keys. From the same bars come each measure's start list (note starts and rest starts, ties ignored), so rhythms written with other ties are at distance 0. A domain keyed by bars is built once per canonical domain, beside the canonical domain memo, so a lookup by bars costs a map access. The bar key is derived from a candidate; it changes neither its identity, nor its index, nor the domain's order.

## TECHNICAL INTERFACE
Consumers exchange an immutable RhythmCandidateDomain and immutable RhythmCandidate values. A domain exposes its grammarVersion, normalized expansion input, and a candidates factory that returns a fresh iterable iterator on each call; candidates expose their grammarVersion, structural identity, zero-based index, bars, recurrence, transforms, and provenance. The schema accepts or exposes no seed, random source, harmony, pitch, profile, instrument, ranking, selection, calibration table, catalog table, or tooling fixture. The bar key, the start lists and the bars-keyed domain live in src/domain/rhythm/rhythm-bars.ts: `measureBarKey` and `rhythmBarKey`; the start lists `measureStarts` and `rhythmStarts` (`MeasureStarts`, each a list of `RhythmStart`s); `keyRhythmCandidates`, and `barsKeyedDomainOf`, which keys a frozen candidate list, such as one of the canonical domain memo's (src/domain/generation/orchestration/canonical-rhythm-domain.ts), once and then shares the `BarsKeyedRhythmDomain`. The rhythm distance (src/domain/rhythm/rhythm-distance.ts) and the change kinds (src/domain/rhythm/rhythm-change-kinds.ts) read them, and so do the generation stage's rhythm lock order (src/domain/rhythm/rhythm-lock-order.ts) and rhythm change draw (src/domain/rhythm/rhythm-change-draw.ts), which match candidates to the locked bars by their bar key. The bar key and the start lists read a measure as a `WrittenMeasure`, its events' kind, start, length and tie mark, so a candidate's bar and a locked measure of the request are read alike.

## EXPECTATION
Published domain and candidate values cannot be mutated. Equal normalized structural payloads have one identity and only the earliest derivation is retained; different identity-bearing provenance remains distinct. Repeated candidates() calls replay byte-equivalent candidate values in the same order, and neither identities nor indices vary with a seed or consumer behavior. Candidates with identical written bars have equal bar keys whatever their identities, candidates with different bars have different keys, and keying a domain leaves its candidates and their order unchanged.
