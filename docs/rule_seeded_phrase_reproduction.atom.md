---
id: rule_seeded_phrase_reproduction
status: DRAFT
human_name: Seeded Phrase Reproduction
type: RULE
layer: BUSINESS
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[rule_no_carry_in_output_matches_v1]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_tempo_never_affects_generation]]
version: 0.1
priority: 1
tags: seed,determinism,regeneration
parents:
  - [[req_four_measure_phrase]]
---

# Seeded Phrase Reproduction

## INTENT

Make a generated phrase reproducible from its complete request and seed.

## THE RULE / LOGIC
Phrase generation is deterministic for a given complete request and seed. The complete request includes the selected musical values, profile preset, tension arc, and leapiness. Explicit regeneration creates a new random seed while preserving the active controls, and the result retains that seed for internal reproduction. Applying a presentation theme is not a generation request and cannot alter the phrase. Switching the selected instrument profile is a distinct, automatic regeneration path with its own fresh seed, not a same-seed reproduction of the prior request.

## TECHNICAL INTERFACE

Generation accepts a complete request and seed and returns the seed associated with the result.

## EXPECTATION

Supplying the same complete request and seed reproduces the same phrase. Explicit regeneration changes the seed without changing selected controls. Changing the theme never changes the phrase; switching the selected instrument profile always draws a fresh seed and regenerates, rather than reproducing the prior phrase.
