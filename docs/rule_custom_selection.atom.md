---
id: rule_custom_selection
status: REVIEW
type: RULE
layer: BUSINESS
human_name: When the Selection Becomes Custom
parents:
  - [[req_presets]]
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
dependents:
  - [[module_figure_level_options]]
  - [[module_preset_model]]
  - [[module_profile_control_customization]]
  - [[rule_custom_names_its_base]]
---

# When the Selection Becomes Custom

## INTENT
Keep the selection truthful: it names a preset only while the settings are that preset's.

## THE RULE / LOGIC
The selection is a built-in preset, a player preset, or Custom. With a preset selected, the selection becomes Custom when the player changes a preset-held setting, or chooses a key or mode outside the restriction in force. Values are not compared with the preset's: changing a setting back by hand stays Custom. Only choosing a preset leaves Custom. Changing the tempo or the instrument never makes Custom, nor does choosing a key or mode inside the restriction in force. Custom means the current preset-held settings are not a saved preset, or the key and mode have left the preset's restriction: it is the only state in which saving has something new to save.

## TECHNICAL INTERFACE
The selection holds a preset or Custom; each control change at Idle updates it.

## EXPECTATION
- Changing a preset-held setting, or choosing a key or mode outside the restriction in force, makes the selection Custom.
- Changing the tempo or the instrument, or choosing a key or mode inside the restriction in force, never does.
- Only choosing a preset leaves Custom.
