---
id: rule_seeded_phrase_reproduction
status: DRAFT
human_name: Seeded Phrase Reproduction
type: RULE
layer: BUSINESS
dependents: []
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
Phrase generation is deterministic for a given complete request and seed. The complete request includes the selected musical values, profile preset, tension arc, and leapiness. Explicit regeneration creates a new random seed while preserving the active controls, and the result retains that seed for internal reproduction. Applying a presentation theme or changing notation display transposition is not a generation request and cannot alter the phrase.

## TECHNICAL INTERFACE
Generation accepts a complete request and seed and returns the seed associated with the result.

## EXPECTATION
Supplying the same complete request and seed reproduces the same phrase. Explicit regeneration changes the seed without changing selected controls. Changing the theme or notation display never changes the phrase.
