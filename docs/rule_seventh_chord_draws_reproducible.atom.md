---
id: rule_seventh_chord_draws_reproducible
status: DRAFT
human_name: Seventh Chord Draws Reproduce Everywhere
dependents: []
type: RULE
layer: BUSINESS
priority: 1
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
version: 0.1
---

# Seventh Chord Draws Reproduce Everywhere

## INTENT
Keep every phrase reproducible from its inputs when seventh chords are allowed.

## THE RULE / LOGIC
Whether a harmony event tries its seventh form first is drawn from the phrase's seed and the event's position in the phrase, with whole-number arithmetic only, so every supported browser on every machine draws the same; ties are broken as everywhere else in generation. The level is part of what a phrase is generated from, carried with every phrase's request: a phrase reproduces from its inputs, a phrase generated ahead at Idle equals the one the session would generate at that place at every level, and a kept session's inputs say how each of its phrases was made.

## TECHNICAL INTERFACE
Every phrase's generation request carries the Seventh chords level of the mode the phrase is generated in.

## EXPECTATION
- The same request, level and seed give the same phrase in every supported browser.
- A phrase generated ahead at Idle equals the session's phrase at that place, at every level.
