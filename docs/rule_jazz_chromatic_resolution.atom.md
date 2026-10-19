---
id: rule_jazz_chromatic_resolution
status: REVIEW
priority: 1
tags: [jazz-profile, chromatic, resolution, changes-in-v3.1]
human_name: Chromatic Figures Resolve at Once
layer: BUSINESS
version: 0.3
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_harmony_candidate_domain]]
  - [[module_musical_profile_capabilities]]
type: RULE
---

# Chromatic Figures Resolve at Once

## INTENT
Limit chromaticism to brief, resolved approaches and enclosures of chord tones, whichever preset or figure levels allow them.

## THE RULE / LOGIC
Every preset shares the same diatonic harmony and phrase construction; chromatic notes come only from two figures over that diatonic plan: a one-note chromatic approach from one semitone above or below a target chord tone, or a two-note chromatic enclosure when the subdivision leaves audible room to resolve. Each device immediately resolves to its chord-tone target and cannot remain unresolved at phrase end, form a new chord, target a non-chord tone, or imply altered harmony. Each of the two figures may be written only when its own figure level is not Off: Jazz's levels allow both, Neutral's neither, and any preset or the player's own levels may allow either. Generation and validation read the figure levels, never a musical profile's or a preset's name.

## TECHNICAL INTERFACE
Generation applies chromatic approach and enclosure policy to a diatonic harmonic plan, offering each of the two figures only when the request's figure levels do not hold it Off, checked by level, never by a musical profile's or a preset's identity.

## EXPECTATION
Phrases contain only bounded chromatic approaches or enclosures that immediately resolve to chord-tone targets while harmony remains diatonic, a chromatic approach only when its level is not Off and a chromatic enclosure only when its level is not Off. No planner or validator compares a musical-profile or preset name to decide this behavior; it reads the figure levels instead.
