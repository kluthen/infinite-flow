---
id: user_story_controlled_phrase_generation
status: DRAFT
human_name: Controlled Phrase Generation
layer: BUSINESS
version: 0.2
parents:
  - [[req_four_measure_phrase]]
type: USER_STORY
priority: 1
tags: player-controls,generation
dependents:
  - [[api_rhythm_domain_expansion]]
  - [[entity_generation_diagnostics]]
  - [[entity_rhythm_candidate_domain]]
  - [[mechanic_syncopation_enumeration]]
  - [[mechanic_syncopation_translation]]
  - [[module_generation_control_catalog]]
  - [[module_generation_request_construction]]
  - [[module_harmony_candidate_domain]]
  - [[module_rhythm_skeleton_allocator]]
  - [[rule_selectable_generative_profiles]]
  - [[rule_unsupported_rhythm_settings_block_generation]]
  - [[service_workspace_session_flow]]
  - [[specification_behavioral_quality_gates]]
---

# Controlled Phrase Generation

## INTENT

Enable a player to configure the musical character of a generated phrase and explicitly request a new variation.

## THE RULE / LOGIC

The player selects a stable tempo from 60 through 240 BPM in 10-BPM increments; one tonal center and a separately labeled major, minor, or church-mode collection, read and selected in the selected instrument profile's written pitch (request construction converts the written tonal center to the concert tonal center by removing the profile's transposition); harmonic motion; tension arc; note density; rhythmic variety; syncopation; silence density; contour; register; leapiness; arpeggio chaos; and either the neutral or jazz profile preset. The first-load selections are 90 BPM, written C Ionian on the B-flat tenor saxophone (concert B-flat Ionian), the neutral profile, Slightly varied rhythmic variety, Lift tension, and Shaped leapiness. Regeneration applies the selected controls to all four measures.

## TECHNICAL INTERFACE

Controls expose the stated musical choices, profile preset, and an explicit regeneration action that requests a whole new phrase.

## EXPECTATION

A player can select every first-release control, including all twelve written tonal centers, major, minor, and each church mode, all three rhythmic-variety levels, and request generation, except for the rhythm settings named by [[rule_unsupported_rhythm_settings_block_generation]]. Those settings stay selectable but block generation with an explanation. Regeneration affects the entire phrase rather than a single independently random measure.
