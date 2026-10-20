---
id: rule_saved_profile_becomes_preset
status: REVIEW
priority: 1
human_name: Earlier Saved Settings Become a Preset Selection
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.1, player-controls, presets, storage]
parents:
  - [[rule_player_presets_saved_on_device]]
dependents:
  - [[module_settings_upgrade_step]]
type: RULE
---

# Earlier Saved Settings Become a Preset Selection

## INTENT
Carry the player's saved v3.0 settings over to presets without changing their sound.

## THE RULE / LOGIC
Settings saved by v3.0 are carried over when v3.1 first opens the app's storage: the saved musical-profile selection becomes that built-in preset, or Custom based on it, and the figure levels become that built-in preset's. The rule that saved values win then applies: a Jazz selection saved with Tension at Build loads as Custom based on Jazz, since Jazz now holds Tension at Lift.

## TECHNICAL INTERFACE
The storage upgrade maps the saved musical-profile selection to a preset selection and figure levels.

## EXPECTATION
- After the upgrade, every saved v3.0 control value is unchanged, the figure levels are the saved profile's, and the selection is that preset or Custom based on it.
