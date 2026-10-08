---
id: rule_deleting_base_preset_leaves_custom
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
human_name: Deleting the Selected Preset Leaves Custom
parents:
  - [[rule_preset_management_actions]]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
---

# Deleting the Selected Preset Leaves Custom

## INTENT
Keep the player's sound unchanged when they delete the preset they are using.

## THE RULE / LOGIC
Deleting the selected player preset, or the one Custom is based on, leaves the selection Custom with no base and the same values, so nothing is regenerated and no restriction is in force any more.

## TECHNICAL INTERFACE
Deleting a player preset updates the selection when it was selected or Custom's base.

## EXPECTATION
- After deleting the selected or base player preset, the selection is Custom with no base, every setting is unchanged, and no restriction is in force.
