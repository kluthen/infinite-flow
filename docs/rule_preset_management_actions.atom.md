---
id: rule_preset_management_actions
status: DRAFT
priority: 1
human_name: Saving, Renaming and Deleting Presets
tags: [v3, release-v3.1, player-controls, presets]
dependents:
  - [[rule_deleting_base_preset_leaves_custom]]
  - [[rule_player_preset_limit]]
  - [[rule_player_preset_names]]
parents:
  - [[req_presets]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
layer: BUSINESS
version: 0.1
---

# Saving, Renaming and Deleting Presets

## INTENT
Let the player keep the settings they find, without ever changing the project's own presets.

## THE RULE / LOGIC
Any preset can be chosen. From any state the player can save the current settings as a new player preset under a new name. From Custom based on a player preset, the player can save the changes into that preset, replacing its values without a confirmation, since they asked; a built-in preset never takes saved changes, and the player saves as new instead. Only player presets can be renamed, and deleted after a confirmation, so the player can always tell a built-in preset from their own. The new or overwritten preset becomes the selection. These actions happen at Idle or with the review shown, never during a session, since a running session never asks the player anything; they change no setting, so they need not wait for a phrase being generated.

## TECHNICAL INTERFACE
The preset selector offers save as new, save changes, rename and delete, each only where this rule allows it.

## EXPECTATION
- Save as new works from any state; save changes works only into a player preset; rename, and delete after a confirmation, work only on player presets.
- A built-in preset's values never change.
- None of these actions is available during a session.
- The saved or overwritten preset becomes the selection.
