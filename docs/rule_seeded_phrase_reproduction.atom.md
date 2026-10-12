---
id: rule_seeded_phrase_reproduction
status: REVIEW
human_name: Seeded Phrase Reproduction
type: RULE
layer: BUSINESS
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_phrase_replay_key]]
  - [[module_session_seed_plan]]
  - [[rule_figure_draws_reproducible]]
  - [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  - [[rule_no_carry_in_output_matches_v1]]
  - [[rule_pregenerated_phrase_matches_session]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_tempo_never_affects_generation]]
  - [[service_headless_phrase_replay]]
version: 0.1
priority: 1
tags: [seed, determinism, regeneration, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_four_measure_phrase]]
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the complete request holds the seven figure levels instead of the profile preset (rule_figure_draws_reproducible). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the complete request also holds the quantized doodle, the drift, the locked rhythm, the allowed rhythm changes and whether the phrase is a tenser one (rule_jam_and_lock_off_reproduce_earlier_phrases). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
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
