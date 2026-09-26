---
id: api_rhythm_domain_expansion
status: REVIEW
human_name: Rhythm Domain Expansion
layer: ARCHITECTURE
priority: 1
tags: rhythm,planner,canonical-domain,step6
version: 0.3
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

The public API accepts grammarVersion, NoteDensity, SilenceDensity, Syncopation, and TensionArc and selects a grammar registry entry by that exact version. rhythm-mvp-v1 is the first supported version; a first-release caller that omits the version receives an explicitly labelled rhythm-mvp-v1 domain, while an unknown version is rejected with no latest-compatible fallback. The selected grammar lazily enumerates finite canonical candidates through version-owned skeleton, transform, normalization, and validation stages, yielding only the first candidate for each normalized identity. It neither ranks nor selects candidates; Step 7 may rank the returned domain but cannot change its canonical expansion. New productions, catalog entries, transforms, normalization rules, or order require a new grammar version. Exception: three corrections and speed-ups, each signed off by the user, keep rhythm-mvp-v1's version while changing how the domain is produced without changing what it yields: two Step 7 corrections bring rhythm-mvp-v1 in line with its own policy (the Breath-heavy rest-count check and the swap_final_pattern scan order), and the post-Step 9 enumeration speed package skips or defers work the validator would reject anyway rather than changing any candidate the domain yields, using a prefilter that rejects a candidate failing the validator's own metrical-anchor, Mixed-duration-coverage, active-anchor-ratio, or answer-ending-signature checks before that candidate is frozen and fully validated, plus a Mixed-density gesture skip for source cells that cannot cover a required duration class; when the sped-up enumeration finds no candidate it is re-run without these shortcuts so the reported no-plan validation codes remain the full union. All three exceptions are recorded in docs/music/rhythm-phrase-structure.md.

## TECHNICAL INTERFACE

Callers provide RhythmExpansionInput with grammarVersion and the four rhythm controls and receive an immutable RhythmCandidateDomain whose candidates() factory returns a fresh finite IterableIterator, or a typed planner failure. The API accepts no seed, random source, harmony, pitch, profile, instrument, ranking, selection, arbitrary candidate limit, calibration table, catalog table, ordering table, or tooling fixture.

## EXPECTATION
For identical versioned inputs, repeated full or partial traversals yield the same finite ordered candidate sequence with contiguous indices and normalized identities, independent of seed, iteration chunking, or backpressure. The API does not eagerly allocate the complete domain, mutate values, inspect harmony or pitch, or substitute another grammar version. Amendment note: the amended v1.0-gate master spec retires the player-facing Mixed note density and the mixed-subdivision concept in favor of a rhythmic-variety control layered on Quarter, Eighth, and Sixteenth density. rhythm-mvp-v1 as described above, including its current Mixed-density support, remains what shipped code implements today; it is not yet updated. The successor grammar version rhythm-mvp-v2, which drops Mixed and adds rhythmic-variety-aware expansion, is now fully specified -- its per density x level value catalog, its nominal-attack-share dominance validator, its in-beat merge restriction, its place as a hard filter in the tie-break priority's budgets tier, its per-variety blocked-combination set, and its prefilter soundness and determinism obligations are recorded in [[module_rhythm_variety_grammar]], fixed by the user-confirmed rhythm-grammar feasibility review (D74, specs/decisions.md) -- but rhythm-mvp-v2 is not yet implemented in shipped code.
