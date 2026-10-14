---
id: rule_jazz_chromatic_resolution
status: REVIEW
priority: 1
tags: [jazz-profile, chromatic, resolution, changes-in-v3.1]
human_name: Jazz Chromatic Resolution
layer: BUSINESS
version: 0.2
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
  - [[module_musical_profile_capabilities]]
type: RULE
---

# Jazz Chromatic Resolution

## INTENT

Limit jazz-profile chromaticism to brief, resolved approaches to chord tones.

## THE RULE / LOGIC

The jazz profile reuses the neutral profile's diatonic harmony and phrase construction. It may use a one-note chromatic approach from one semitone above or below a target chord tone, or a two-note chromatic enclosure when the subdivision leaves audible room to resolve; each device immediately resolves to its chord-tone target and cannot remain unresolved at phrase end, form a new chord, target a non-chord tone, or imply altered harmony. These chromatic figures are gated by the named capability chromatic approach and enclosure figures allowed, which the jazz musical profile declares and the neutral musical profile does not; generation and validation check whether this capability is declared, never the musical profile's name.

## TECHNICAL INTERFACE

The jazz profile declares the chromatic approach and enclosure figures allowed capability; generation applies chromatic approach and enclosure policy to a diatonic harmonic plan only when the selected profile declares that capability, checked by capability, not by profile identity.

## EXPECTATION

Jazz phrases contain only bounded chromatic approaches or enclosures that immediately resolve to chord-tone targets while harmony remains diatonic. No planner or validator compares a musical-profile name to decide this behavior; it checks the declared capability instead.
