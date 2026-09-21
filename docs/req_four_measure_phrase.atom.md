---
id: req_four_measure_phrase
status: DRAFT
tags: first-release,music-generation
dependents:
  - [[req_browser_only_first_release]]
  - [[rule_arpeggio_chaos_respects_constraints]]
  - [[rule_complete_four_four_measures]]
  - [[rule_conservative_tenor_range]]
  - [[rule_jazz_chromatic_resolution]]
  - [[rule_leap_recovery]]
  - [[rule_neutral_profile_diatonic_harmony]]
  - [[rule_neutral_profile_diatonic_pitches]]
  - [[rule_notation_display_preserves_phrase]]
  - [[rule_open_phrase_ending]]
  - [[rule_optional_midi_privacy]]
  - [[rule_preserve_metrical_anchor]]
  - [[rule_seeded_phrase_reproduction]]
  - [[user_story_controlled_phrase_generation]]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
parents: []
human_name: Four-Measure Musical Proposal
priority: 1
---

# Four-Measure Musical Proposal

## INTENT
Provide a tenor saxophone player with one coherent, staff-notated four-measure musical proposal they can explicitly regenerate.

## THE RULE / LOGIC
The first release generates one complete four-measure 4/4 phrase from player-selected controls. The product provides a musically legible proposal rather than playback, accompaniment, scoring, or autonomous continuous generation.

## TECHNICAL INTERFACE
The player selects controls and explicitly requests phrase generation or regeneration. The generated phrase is presented as conventional staff notation with harmonic context.

## EXPECTATION
A completed generation produces one coherent four-measure 4/4 phrase for tenor saxophone. The required release does not provide lead-line playback, required accompaniment, performance scoring, or a rolling autonomous session.
