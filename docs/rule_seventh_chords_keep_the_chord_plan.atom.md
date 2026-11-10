---
id: rule_seventh_chords_keep_the_chord_plan
status: DRAFT
version: 0.1
priority: 1
tags: [v3, release-v3.3, generation, chords]
human_name: Seventh Chords Leave the Chord Plans as They Were
parents:
  - [[req_seventh_chords_level]]
dependents: []
type: RULE
layer: BUSINESS
---

# Seventh Chords Leave the Chord Plans as They Were

## INTENT
Let the level add a sound without changing which chord progressions the settings give.

## THE RULE / LOGIC
The level never changes how chord plans are built: which degree each harmony event takes, its harmonic role, the templates and, in a modal plan, its colour chord (a chord that holds the mode's characteristic note), which is still found by looking at the triads. For the same request and seed, the candidate plans are those of Off, in the same order; only each harmony event's form, triad or seventh, differs.

## TECHNICAL INTERFACE
The chord plans are built from the triads before any event's form is drawn.

## EXPECTATION
- For the same request and seed, the degrees, roles and templates of the candidate plans, the modal colour chords included, are those of Off at every level.
