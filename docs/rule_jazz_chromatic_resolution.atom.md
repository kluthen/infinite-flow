---
id: rule_jazz_chromatic_resolution
status: DRAFT
priority: 1
tags: jazz-profile,chromatic,resolution
human_name: Jazz Chromatic Resolution
layer: BUSINESS
version: 0.1
parents:
  - [[req_four_measure_phrase]]
dependents: []
type: RULE
---

# Jazz Chromatic Resolution

## INTENT
Limit jazz-profile chromaticism to brief, resolved approaches to chord tones.

## THE RULE / LOGIC
The jazz profile reuses the neutral profile's diatonic harmony and phrase construction. It may use a one-note chromatic approach from one semitone above or below a target chord tone, or a two-note chromatic enclosure when the subdivision leaves audible room to resolve; each device immediately resolves to its chord-tone target and cannot remain unresolved at phrase end, form a new chord, target a non-chord tone, or imply altered harmony.

## TECHNICAL INTERFACE
The jazz profile applies chromatic approach and enclosure policy to a diatonic harmonic plan.

## EXPECTATION
Jazz phrases contain only bounded chromatic approaches or enclosures that immediately resolve to chord-tone targets while harmony remains diatonic.
