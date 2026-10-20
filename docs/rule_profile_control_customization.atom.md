---
id: rule_profile_control_customization
status: REVIEW
priority: 1
tags: [profile, controls, customization, changes-in-v3.1]
type: RULE
layer: BUSINESS
parents:
  - [[rule_selectable_generative_profiles]]
dependents:
  - [[module_profile_control_customization]]
  - [[rule_mutation_marks_profile_customized]]
human_name: Customizing Never Changes the Preset
version: 0.2
---

# Customizing Never Changes the Preset

## INTENT
Allow a player to change the selected preset's settings without changing the preset.

## THE RULE / LOGIC
After selecting a preset, the player may change each setting it holds: the ten preset-held controls and the seven figure levels. The changed values are the current configuration and the selection becomes Custom, based on that preset; no hidden musical grammar is kept behind them, since the figure levels are visible settings. Changing a setting never changes the preset's own defined configuration.

## TECHNICAL INTERFACE
After selecting a preset, the player may change each setting that preset holds.

## EXPECTATION
Manual changes to preset-held settings are used as the current configuration, with no retained grammar, and leave the preset's own defined configuration unchanged.
