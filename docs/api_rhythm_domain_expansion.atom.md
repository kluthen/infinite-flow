---
id: api_rhythm_domain_expansion
status: REVIEW
human_name: Rhythm Domain Expansion
layer: ARCHITECTURE
priority: 1
tags: rhythm,planner,canonical-domain,step6
version: 0.4
dependents:
  - [[module_rhythm_variety_grammar]]
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
The public API accepts grammarVersion, NoteDensity, RhythmicVariety, SilenceDensity, Syncopation, and TensionArc and selects a grammar registry entry by that exact version. rhythm-mvp-v2 is the sole supported version; a caller that omits the version receives an explicitly labelled rhythm-mvp-v2 domain, while the retired rhythm-mvp-v1 or any other unknown version is rejected with no fallback. The selected grammar lazily enumerates finite canonical candidates through version-owned skeleton, transform, normalization, and validation stages, yielding only the first candidate for each normalized identity. It neither ranks nor selects candidates; Step 7 may rank the returned domain but cannot change its canonical expansion. New productions, catalog entries, transforms, normalization rules, or order require a new grammar version. Exception: three corrections and speed-ups, each signed off by the user, keep the grammar's version while changing how the domain is produced without changing what it yields: two Step 7 corrections bring the grammar in line with its own policy (the Breath-heavy rest-count check and the swap_final_pattern scan order), and the post-Step 9 enumeration speed package skips or defers work the validator would reject anyway rather than changing any candidate the domain yields, using a prefilter that rejects a candidate failing the validator's own metrical-anchor, rhythmic-variety, active-anchor-ratio, or answer-ending-signature checks before that candidate is frozen and fully validated, plus a gesture skip for source cells that cannot reach the required rhythmic-variety share; when the sped-up enumeration finds no candidate it is re-run without these shortcuts so the reported no-plan validation codes remain the full union.

## TECHNICAL INTERFACE
Callers provide RhythmExpansionInput with grammarVersion and the five rhythm controls (NoteDensity, RhythmicVariety, SilenceDensity, Syncopation, TensionArc) and receive an immutable RhythmCandidateDomain whose candidates() factory returns a fresh finite IterableIterator, or a typed planner failure. The API accepts no seed, random source, harmony, pitch, profile, instrument, ranking, selection, arbitrary candidate limit, calibration table, catalog table, ordering table, or tooling fixture.

## EXPECTATION
For identical versioned inputs, repeated full or partial traversals yield the same finite ordered candidate sequence with contiguous indices and normalized identities, independent of seed, iteration chunking, or backpressure. The API does not eagerly allocate the complete domain, mutate values, inspect harmony or pitch, or substitute another grammar version. History: rhythm-mvp-v1 shipped with a Mixed note density; a user-confirmed rhythm-grammar feasibility review retired Mixed in favor of the rhythmic-variety control specified in [[module_rhythm_variety_grammar]], and shipped code now implements that successor grammar version, rhythm-mvp-v2, as the sole supported version.
