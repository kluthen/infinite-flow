---
id: rule_presets_read_at_start_up
status: STABLE
version: 0.1
human_name: Player Presets Are Read With the Saved Settings
tags: [v3, release-v3.1, player-controls, presets, storage]
parents:
  - [[rule_player_presets_saved_on_device]]
dependents: []
type: RULE
layer: BUSINESS
priority: 1
---

# Player Presets Are Read With the Saved Settings

## INTENT
Start every visit with the player's presets in place, and treat a failed read of them like any failed read of what is kept.

## THE RULE / LOGIC
From v3.1 the player presets are read at start-up together with the saved settings, before the first phrase and within the same short start-up wait. If that read fails, or outlasts the wait, the whole visit is a visit whose saved data could not be read: it starts from the defaults and saves nothing, exactly as when the saved settings themselves cannot be read.

## TECHNICAL INTERFACE
The start-up read of the saved settings also reads the player presets, under the same bounded wait.

## EXPECTATION
- The first phrase of a visit is generated only after the player presets have been read with the saved settings.
- A failed or late read of the player presets makes the visit one whose saved data could not be read, as a whole.
