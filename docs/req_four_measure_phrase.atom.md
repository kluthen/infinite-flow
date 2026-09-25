---
id: req_four_measure_phrase
status: DRAFT
tags: first-release,music-generation
dependents:
  - [[entity_concert_event_timeline]]
  - [[entity_exact_musical_time]]
  - [[entity_rhythm_candidate_domain]]
  - [[module_rhythm_skeleton_allocator]]
  - [[req_browser_only_first_release]]
  - [[req_landscape_phrase_workspace]]
  - [[rule_arpeggio_chaos_respects_constraints]]
  - [[rule_complete_four_four_measures]]
  - [[rule_ephemeral_session_state]]
  - [[rule_instrument_profile_range]]
  - [[rule_jazz_chromatic_resolution]]
  - [[rule_leap_recovery]]
  - [[rule_leapiness_arpeggio_run_limits]]
  - [[rule_leapiness_interval_budget]]
  - [[rule_neutral_profile_diatonic_harmony]]
  - [[rule_neutral_profile_diatonic_pitches]]
  - [[rule_notation_display_preserves_phrase]]
  - [[rule_open_phrase_ending]]
  - [[rule_optional_midi_privacy]]
  - [[rule_phrase_starts_on_downbeat]]
  - [[rule_presentation_preference_preserves_phrase]]
  - [[rule_preserve_metrical_anchor]]
  - [[rule_profile_switch_validates_phrase]]
  - [[rule_seeded_phrase_reproduction]]
  - [[rule_tension_arc_build]]
  - [[rule_tension_arc_edge]]
  - [[rule_tension_arc_level_policy]]
  - [[rule_tension_arc_lift]]
  - [[rule_tension_arc_settled]]
  - [[rule_tension_ranking_respects_constraints]]
  - [[rule_tension_resolution_delay_permits_rests]]
  - [[specification_behavioral_quality_gates]]
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
Provide a player with one coherent, staff-notated four-measure musical proposal for a selected C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile that they can explicitly regenerate.

## THE RULE / LOGIC
The first release generates one complete four-measure 4/4 phrase from player-selected controls and a selected supported instrument profile. The product provides a musically legible proposal rather than playback, accompaniment, scoring, or autonomous continuous generation.

## TECHNICAL INTERFACE
The player selects a supported instrument profile and musical controls, then explicitly requests phrase generation or regeneration. The generated phrase is presented as conventional staff notation with harmonic context.

## EXPECTATION
A completed generation produces one coherent four-measure 4/4 phrase for the selected supported profile. The required release does not provide lead-line playback, required accompaniment, performance scoring, or a rolling autonomous session.
