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
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): being entirely diatonic becomes a property of Neutral's figure levels, not a rule: the player may turn the chromatic figures on from Neutral or any preset (rule_chromatic_notes_need_a_chromatic_figure, rule_neutral_and_jazz_figure_levels); Neutral's diatonic harmony is unchanged. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
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
