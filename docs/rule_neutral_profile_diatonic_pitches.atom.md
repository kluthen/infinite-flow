---
id: rule_neutral_profile_diatonic_pitches
status: REVIEW
human_name: Neutral Profile Diatonic Pitches
type: RULE
layer: BUSINESS
version: 0.1
tags: [neutral-profile, diatonic, pitch-policy, changes-in-v3.1]
parents:
  - [[req_four_measure_phrase]]
dependents: []
priority: 1
---

# Neutral Profile Diatonic Pitches

## INTENT
Keep neutral-profile pitches inside the selected tonal collection.

## THE RULE / LOGIC
The neutral profile uses only pitches in the selected major, minor, or modal collection. It may use controlled diatonic passing tones, neighbor tones, and resolution-directed accented diatonic appoggiaturas, but it introduces no chromatic pitches, substitutions, altered dominants, or chromatic enclosures.

## TECHNICAL INTERFACE
The profile selection and tonal context determine the permitted pitch collection for generation.

## EXPECTATION
A neutral-profile phrase contains no pitch outside its selected collection and no excluded chromatic harmonic device.
