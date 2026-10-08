---
id: rule_refused_preset_save_told
status: DRAFT
human_name: A Refused Preset Save Is Told at Once
tags: [v3, release-v3.1, player-controls, presets, storage]
layer: BUSINESS
version: 0.1
priority: 1
parents:
  - [[rule_player_presets_saved_on_device]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
---

# A Refused Preset Save Is Told at Once

## INTENT
Never let the player believe a preset is kept when it is not.

## THE RULE / LOGIC
If the browser refuses to save a player preset, because its storage is full or for another reason, the preset is kept for this visit and the player is told at once that it is not kept. Preset management happens outside a session, so the notice need not wait for one to end.

## TECHNICAL INTERFACE
A failed preset write raises a notice outside the session view.

## EXPECTATION
- After a refused save the preset stays usable for the visit, and the player is told at once that it is not kept.
