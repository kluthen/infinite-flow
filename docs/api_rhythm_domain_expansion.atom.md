---
id: api_rhythm_domain_expansion
status: DRAFT
human_name: Rhythm Domain Expansion
layer: ARCHITECTURE
priority: 1
tags: rhythm,planner,canonical-domain,step6
version: 0.1
dependents: []
type: API
parents:
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
  - [[rule_tension_ranking_respects_constraints]]
  - [[user_story_controlled_phrase_generation]]
---

# Rhythm Domain Expansion

## INTENT
Expose version-selected finite rhythm-domain expansion as a replayable seed-independent lazy iterator.

## THE RULE / LOGIC
The public API accepts grammarVersion, NoteDensity, SilenceDensity, Syncopation, and TensionArc and selects a grammar registry entry by that exact version. rhythm-mvp-v1 is the first supported version; a first-release caller that omits the version receives an explicitly labelled rhythm-mvp-v1 domain, while an unknown version is rejected with no latest-compatible fallback. The selected grammar lazily enumerates finite canonical candidates through version-owned skeleton, transform, normalization, and validation stages, yielding only the first candidate for each normalized identity. It neither ranks nor selects candidates; Step 7 may rank the returned domain but cannot change its canonical expansion. New productions, catalog entries, transforms, normalization rules, or order require a new grammar version. Exception: two Step 7 corrections, signed off by the user, bring rhythm-mvp-v1 in line with its own policy and keep the version: the Breath-heavy rest-count check and the swap_final_pattern scan order. Both are recorded in docs/music/rhythm-phrase-structure.md.

## TECHNICAL INTERFACE
Callers provide RhythmExpansionInput with grammarVersion and the four rhythm controls and receive an immutable RhythmCandidateDomain whose candidates() factory returns a fresh finite IterableIterator, or a typed planner failure. The API accepts no seed, random source, harmony, pitch, profile, instrument, ranking, selection, arbitrary candidate limit, calibration table, catalog table, ordering table, or tooling fixture.

## EXPECTATION
For identical versioned inputs, repeated full or partial traversals yield the same finite ordered candidate sequence with contiguous indices and normalized identities, independent of seed, iteration chunking, or backpressure. The API does not eagerly allocate the complete domain, mutate values, inspect harmony or pitch, or substitute another grammar version.
