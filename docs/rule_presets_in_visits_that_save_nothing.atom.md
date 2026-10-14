---
id: rule_presets_in_visits_that_save_nothing
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets, storage]
parents:
  - [[rule_player_presets_saved_on_device]]
dependents: []
layer: BUSINESS
human_name: Presets in a Visit That Saves Nothing
---

# Presets in a Visit That Saves Nothing

## INTENT
Keep a visit that must not write from losing or damaging the player's presets.

## THE RULE / LOGIC
An outdated tab (one that knows data saved by a newer version exists) and a visit whose saved data could not be read save no preset: presets made or changed there last for the page, under that visit's existing notice. Neither offers any preset deletion. A visit whose saved data could not be read starts from the defaults and lists the built-in presets only; an outdated tab lists the player presets it could read.

## TECHNICAL INTERFACE
Preset writes and deletions are disabled in visits that save nothing.

## EXPECTATION
- In an outdated tab or a failed-read visit, no preset is written or deleted, and presets made there last for the page.
- A failed-read visit lists only the built-in presets; an outdated tab lists the player presets it could read.
