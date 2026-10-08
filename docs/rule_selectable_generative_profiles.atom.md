---
id: rule_selectable_generative_profiles
status: REVIEW
human_name: Selectable Generative Profiles
priority: 1
parents:
  - [[user_story_controlled_phrase_generation]]
type: RULE
layer: BUSINESS
version: 0.1
tags: [profile, controls, configuration, changes-in-v3.1]
dependents:
  - [[module_generative_profile_selection]]
  - [[rule_profile_control_customization]]
  - [[rule_profile_presets_apply_defined_controls]]
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the generative profiles become presets; a preset's configuration is ten controls, seven figure levels and a key and mode restriction, and choosing one may move the key and mode inside its restriction (req_presets, rule_choosing_preset_sets_its_settings, rule_choosing_preset_keeps_allowed_key_and_mode). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Selectable Generative Profiles

## INTENT
Allow a player to select a generative profile with a defined configuration.

## THE RULE / LOGIC
Each selectable generative profile defines a complete configuration for its profile-controlled values. Selecting a generative profile makes that profile's configuration current.

## TECHNICAL INTERFACE
The player selects one generative profile.

## EXPECTATION
The selected generative profile supplies its defined configuration as the current profile-controlled values.
