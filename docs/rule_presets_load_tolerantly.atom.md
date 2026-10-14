---
id: rule_presets_load_tolerantly
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
dependents: []
priority: 1
human_name: Presets Load Tolerantly
tags: [v3, release-v3.1, player-controls, presets, storage]
parents:
  - [[rule_player_presets_saved_on_device]]
---

# Presets Load Tolerantly

## INTENT
Keep every readable part of a saved preset when part of it is unknown or damaged.

## THE RULE / LOGIC
Each player preset, and each of its fields, is checked on its own when it loads. An unknown or invalid field takes that setting's first-load value. A figure level missing because the record was written before that figure existed is Off. A missing name becomes a numbered one. In a restriction an unknown key or mode is dropped from its list, and an empty list, or a missing restriction, reads any. A record that cannot be read at all is left in place and not listed. No notice is shown.

## TECHNICAL INTERFACE
Preset loading validates records field by field.

## EXPECTATION
- An invalid field takes its first-load value and every other field still loads.
- A figure level missing from an older record loads as Off.
- An unreadable record is not listed and stays in storage.
