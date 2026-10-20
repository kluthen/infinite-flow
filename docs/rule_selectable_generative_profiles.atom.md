---
id: rule_selectable_generative_profiles
status: REVIEW
human_name: Selectable Presets
priority: 1
parents:
  - [[user_story_controlled_phrase_generation]]
type: RULE
layer: BUSINESS
version: 0.2
tags: [profile, controls, configuration, changes-in-v3.1]
dependents:
  - [[module_generative_profile_selection]]
  - [[rule_profile_control_customization]]
  - [[rule_profile_presets_apply_defined_controls]]
---

# Selectable Presets

## INTENT
Allow a player to select a preset with a defined configuration.

## THE RULE / LOGIC
Each selectable preset defines a complete configuration of the settings a preset holds. Selecting a preset makes that preset's configuration current. Neutral and Jazz, the two musical profiles of earlier versions, are two of the built-in presets.

## TECHNICAL INTERFACE
The player selects one preset.

## EXPECTATION
The selected preset supplies its defined configuration as the current preset-held settings.
