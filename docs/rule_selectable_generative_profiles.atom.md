---
id: rule_selectable_generative_profiles
status: DRAFT
human_name: Selectable Generative Profiles
priority: 1
parents:
  - [[user_story_controlled_phrase_generation]]
type: RULE
layer: BUSINESS
version: 0.1
tags: profile,controls,configuration
dependents:
  - [[module_generative_profile_selection]]
  - [[rule_profile_control_customization]]
  - [[rule_profile_presets_apply_defined_controls]]
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
