---
id: user_story_controlled_phrase_generation
status: DRAFT
human_name: Controlled Phrase Generation
layer: BUSINESS
version: 0.1
parents:
  - [[req_four_measure_phrase]]
type: USER_STORY
priority: 1
tags: player-controls,generation
dependents: []
---

# Controlled Phrase Generation

## INTENT
Enable a player to configure the musical character of a generated phrase and explicitly request a new variation.

## THE RULE / LOGIC
The player chooses a stable tempo; concert-pitch tonal center and major, minor, or modal collection; harmonic motion; tension; note density; syncopation; silence density; contour; register; leapiness; arpeggio chaos; and a neutral or jazz profile. Regeneration uses the selected controls for all four measures.

## TECHNICAL INTERFACE
Controls expose the stated musical choices, and an explicit regeneration action requests a whole new phrase.

## EXPECTATION
A player can select every first-release control and request generation. Regeneration affects the entire phrase rather than a single independently random measure.
