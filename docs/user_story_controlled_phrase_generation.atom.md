---
id: user_story_controlled_phrase_generation
status: DRAFT
human_name: Controlled Phrase Generation
layer: BUSINESS
version: 0.1
parents:
  - [[req_four_measure_phrase]]
type: USER_STORY
priority: 1
tags: player-controls,generation
dependents:
  - [[api_rhythm_domain_expansion]]
  - [[entity_rhythm_candidate_domain]]
  - [[mechanic_syncopation_translation]]
  - [[module_generation_control_catalog]]
  - [[module_generation_request_construction]]
  - [[module_harmony_candidate_domain]]
  - [[module_rhythm_skeleton_allocator]]
  - [[rule_selectable_generative_profiles]]
  - [[service_workspace_session_flow]]
  - [[specification_behavioral_quality_gates]]
---

# Controlled Phrase Generation

## INTENT
Enable a player to configure the musical character of a generated phrase and explicitly request a new variation.

## THE RULE / LOGIC
The player selects a stable tempo from 60 through 240 BPM in 10-BPM increments; one concert-pitch tonal center and a separately labeled major, minor, or church-mode collection; harmonic motion; tension arc; note density; syncopation; silence density; contour; register; leapiness; arpeggio chaos; and either the neutral or jazz profile preset. The first-load selections are 90 BPM, C Ionian, neutral profile, Lift tension, and Shaped leapiness. Regeneration applies the selected controls to all four measures.

## TECHNICAL INTERFACE
Controls expose the stated musical choices, profile preset, and an explicit regeneration action that requests a whole new phrase.

## EXPECTATION
A player can select every first-release control, including all twelve tonal centers, major, minor, and each church mode, and request generation. Regeneration affects the entire phrase rather than a single independently random measure.
