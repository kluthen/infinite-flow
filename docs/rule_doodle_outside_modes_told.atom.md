---
id: rule_doodle_outside_modes_told
status: DRAFT
priority: 1
parents:
  - [[rule_suggestion_candidates]]
dependents: []
layer: BUSINESS
human_name: A Doodle Outside the App's Modes Is Said Plainly
tags: [v3, release-v3.2, jam, key-and-mode-suggestion, non-scoring]
type: RULE
version: 0.2
---

# A Doodle Outside the App's Modes Is Said Plainly

## INTENT
Tell the player kindly when their doodle uses notes the app's modes do not offer.

## THE RULE / LOGIC
When under 80 % of the doodle's weighted length fits the best candidate, the doodle uses notes the app's modes do not offer, such as those of harmonic minor or blue notes. The review then says so in one plain sentence, in every review of that Jam, kept ones included, without naming any note as wrong, and suggests nothing.

## TECHNICAL INTERFACE
Every review of such a Jam shows one plain sentence when the doodle fits no mode well enough.

## EXPECTATION
- Under 80 % fit, every review of that Jam says so in one plain sentence and names no wrong note.
