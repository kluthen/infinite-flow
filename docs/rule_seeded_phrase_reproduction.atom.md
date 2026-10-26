---
id: rule_seeded_phrase_reproduction
status: STABLE
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
version: 0.3
priority: 1
tags: [seed, determinism, regeneration, changes-in-v3.2]
parents:
  - [[req_four_measure_phrase]]
---

# Seeded Phrase Reproduction

## INTENT

Make a generated phrase reproducible from its complete request and seed.

## THE RULE / LOGIC
Phrase generation is deterministic for a given complete request and seed. The complete request includes the selected musical values, the seven figure levels, tension arc, and leapiness, and, when they apply, the rhythm lock's state with the locked rhythm, the allowed rhythm changes, whether the phrase is a tenser one, and the steering block a Jam derives from its doodle; it never includes a musical profile's or a preset's name, the doodle itself, the drift or the capture tempo. Every ordering and draw derived from these, the lock's order, the forced bend and the rhythm change draw among them, is computed inside generation from the request and seed, so a phrase reproduces without the app's state. Explicit regeneration creates a new random seed while preserving the active controls and figure levels, and the result retains that seed for internal reproduction. Applying a presentation theme is not a generation request and cannot alter the phrase. Switching the selected instrument profile is a distinct, automatic regeneration path with its own fresh seed, not a same-seed reproduction of the prior request.

## TECHNICAL INTERFACE

Generation accepts a complete request and seed and returns the seed associated with the result.

## EXPECTATION
Supplying the same complete request and seed reproduces the same phrase. Explicit regeneration changes the seed without changing selected controls or figure levels. Changing the theme never changes the phrase; switching the selected instrument profile always draws a fresh seed and regenerates, rather than reproducing the prior phrase. A phrase made under the rhythm lock, with a rhythm change or a forced bend, or with a steering block, reproduces from its complete request and seed like any other.
