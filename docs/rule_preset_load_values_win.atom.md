---
id: rule_preset_load_values_win
status: DRAFT
type: RULE
version: 0.1
priority: 1
human_name: On Load, the Saved Values Win
tags: [v3, release-v3.1, player-controls, presets, storage]
dependents: []
layer: BUSINESS
parents:
  - [[rule_player_presets_saved_on_device]]
---

# On Load, the Saved Values Win

## INTENT
Never change the player's sound behind their back when the app loads.

## THE RULE / LOGIC
When the app loads, if the saved settings differ from the selected preset's values, or the saved key and mode lie outside its restriction (a built-in preset retuned by a later version, a player preset changed in another tab), the selection shows Custom based on that preset; if the preset no longer exists, Custom with no base. Loading never moves the key or mode.

## TECHNICAL INTERFACE
Loading compares the saved settings with the saved selection's preset.

## EXPECTATION
- After a load every setting has its saved value, and the selection is the saved preset only while that preset's values and restriction still match.
- Loading never changes the key or mode.
