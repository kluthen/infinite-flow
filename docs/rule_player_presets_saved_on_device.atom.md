---
id: rule_player_presets_saved_on_device
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
tags: [v3, release-v3.1, player-controls, presets, storage]
version: 0.1
human_name: Player Presets Are Kept on the Device
parents:
  - [[req_on_device_storage]]
  - [[req_presets]]
dependents:
  - [[rule_preset_load_values_win]]
  - [[rule_presets_in_visits_that_save_nothing]]
  - [[rule_presets_load_tolerantly]]
  - [[rule_refused_preset_save_told]]
  - [[rule_saved_profile_becomes_preset]]
---

# Player Presets Are Kept on the Device

## INTENT
Keep the player's presets and selection across reloads, on their own device only.

## THE RULE / LOGIC
From v3.1 each player preset is kept on the device as one record holding its ten controls, seven levels, name and restriction, and is known by an internal identifier, not by its name, so renaming it keeps it selected and keeps it as Custom's base. A preset is saved automatically when it is made, changed, renamed or deleted, and never during a session. The figure levels and the selection (which preset, or Custom and its base) are saved like the other settings. The restriction in force is not saved: it follows from the selection and the key and mode. Each save writes a whole preset, so between two tabs the last save wins, and another tab sees the change after a reload.

## TECHNICAL INTERFACE
Player presets are records of the on-device store, keyed by an internal identifier.

## EXPECTATION
- Player presets, their restrictions, the figure levels and the selection survive a reload.
- Renaming the selected preset keeps it selected.
