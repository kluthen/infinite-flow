---
id: rule_deleting_base_preset_leaves_custom
status: REVIEW
type: RULE
human_name: Deleting the Selected Preset Leaves Custom
parents:
  - [[rule_preset_management_actions]]
dependents:
  - [[module_player_presets]]
  - [[module_preset_model]]
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
---

# Deleting the Selected Preset Leaves Custom

## INTENT
Keep the player's sound unchanged when they delete the preset they are using.

## THE RULE / LOGIC
Deleting the selected player preset, or the one Custom is based on, leaves the selection Custom with no base and the same values, so nothing is regenerated and no restriction is in force any more.

## TECHNICAL INTERFACE
Deleting a player preset updates the selection when it was selected or Custom's base.

## EXPECTATION
- After deleting the selected or base player preset, the selection is Custom with no base, every setting is unchanged, and no restriction is in force.
