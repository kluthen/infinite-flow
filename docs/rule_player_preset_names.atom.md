---
id: rule_player_preset_names
status: DRAFT
version: 0.1
human_name: Player Preset Names
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_preset_management_actions]]
dependents:
  - [[module_preset_bar_model]]
  - [[module_preset_model]]
type: RULE
layer: BUSINESS
priority: 1
---

# Player Preset Names

## INTENT
Keep every preset recognisable by its name in the selector.

## THE RULE / LOGIC
A player preset's name is plain text, trimmed, of 1 to 40 characters, unique among all presets ignoring case, the built-in names included; Custom is reserved. A refused name says why. Uniqueness is checked only when saving or renaming: presets that arrive from another tab, or a later version's new built-in name, are loaded and listed as they are, duplicates included, and the player may rename them.

## TECHNICAL INTERFACE
Saving and renaming validate the name; loading does not.

## EXPECTATION
- A name empty after trimming, longer than 40 characters, equal to another preset's ignoring case, or equal to Custom is refused with the reason.
- Duplicate names loaded from storage are listed, not refused.
