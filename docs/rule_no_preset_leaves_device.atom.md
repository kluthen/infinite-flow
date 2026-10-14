---
id: rule_no_preset_leaves_device
status: DRAFT
layer: BUSINESS
version: 0.1
human_name: No Preset Leaves the Device
parents:
  - [[req_presets]]
dependents: []
type: RULE
priority: 1
tags: [v3, release-v3.1, player-controls, presets, export, privacy]
---

# No Preset Leaves the Device

## INTENT
Keep presets as private as every other kept setting.

## THE RULE / LOGIC
Figures are ordinary notes in the MusicXML and MIDI exports. No export carries a preset, its name or its restriction, and no preset is ever sent or shared.

## TECHNICAL INTERFACE
Exports hold notes only; no network path carries a preset.

## EXPECTATION
- No export file holds a preset name or restriction.
- No preset is ever sent over the network.
