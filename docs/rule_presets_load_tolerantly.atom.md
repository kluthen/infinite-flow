---
id: rule_presets_load_tolerantly
status: STABLE
type: RULE
layer: BUSINESS
version: 0.2
dependents:
  - [[entity_player_preset_record]]
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
Each player preset, and each of its fields, is checked on its own when it loads. An unknown or invalid field takes that setting's first-load value. A figure level missing because the record was written before that figure existed is Off, the same rule as for older phrase replay keys. The record's data version tells which figures existed when it was written: a level missing for a figure that already existed then is an invalid field, and takes its first-load value. A missing name becomes a numbered one. In a restriction an unknown key or mode is dropped from its list, and an empty list, or a missing restriction, reads any. A record that cannot be read at all is left in place and not listed. No notice is shown.

## TECHNICAL INTERFACE
Preset loading validates records field by field.

## EXPECTATION
- An invalid field takes its first-load value and every other field still loads.
- A figure level missing from a record written before that figure existed loads as Off.
- A figure level missing for a figure that already existed when the record was written loads with its first-load value.
- An unreadable record is not listed and stays in storage.
