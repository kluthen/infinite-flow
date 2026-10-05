---
id: rule_tension_arc_build
status: REVIEW
version: 0.1
human_name: Tension Arc: Build
type: RULE
tags: tension,melody,harmony,controls
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
layer: BUSINESS
priority: 1
---

# Tension Arc: Build

## INTENT
Apply the Build tension arc as a concentration of active notes with one limited two-note diatonic approach permitted in the phrase's middle.

## THE RULE / LOGIC
Under the Build tension arc, the phrase concentrates active (non-chord-tone) notes and permits exactly one limited two-note diatonic approach figure in the middle of the phrase.

## TECHNICAL INTERFACE
The tension-arc control selects Build as one of its four permitted values.

## EXPECTATION
A phrase using the Build tension arc concentrates its active notes and contains at most one two-note diatonic approach figure, placed in the phrase's middle.
