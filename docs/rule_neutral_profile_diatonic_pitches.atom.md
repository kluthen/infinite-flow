---
id: rule_neutral_profile_diatonic_pitches
status: REVIEW
human_name: Neutral Profile Diatonic Pitches
type: RULE
layer: BUSINESS
version: 0.2
tags: [neutral-profile, diatonic, pitch-policy, changes-in-v3.1]
parents:
  - [[req_four_measure_phrase]]
dependents: []
priority: 1
---

# Neutral Profile Diatonic Pitches

## INTENT
Keep Neutral's pitches inside the selected tonal collection, as a property of its figure levels.

## THE RULE / LOGIC
Neutral's figure levels hold the chromatic approach and the chromatic enclosure Off, so a phrase generated with them uses only pitches in the selected major, minor, or modal collection. Being diatonic follows from those two levels, not from the preset's name: any figure levels with both chromatic figures Off give the same. With Neutral's levels a phrase may hold diatonic passing tones, accented passing tones and neighbor tones, and Tension's scheduled figure, an accented diatonic appoggiatura among them, but it introduces no chromatic pitches, substitutions, altered dominants, or chromatic approaches or enclosures.

## TECHNICAL INTERFACE
The request's figure levels and tonal context determine the permitted pitch collection for generation: with both chromatic figures Off, it is the selected collection.

## EXPECTATION
A phrase generated with Neutral's levels, or with any levels holding both chromatic figures Off, contains no pitch outside its selected collection and no excluded chromatic harmonic device.
