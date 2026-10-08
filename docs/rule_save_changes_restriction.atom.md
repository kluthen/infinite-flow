---
id: rule_save_changes_restriction
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
notes: Created 2026-10-08 at DRAFT by the follow-up to the v3.1 and v3.2 spec ingestion, after the v3.1 master spec, approved by the product owner on 2026-10-08, settled when save changes asks for the restriction. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
human_name: Save Changes Asks for the Restriction Only Outside It
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_saving_preset_asks_its_restriction]]
---

# Save Changes Asks for the Restriction Only Outside It

## INTENT
Never save a player preset whose own key and mode lie outside its restriction.

## THE RULE / LOGIC
Saving changes into a player preset asks for its restriction only when the current key or mode lies outside that preset's restriction, as happens once the player has chosen a key or mode the preset is not meant for. Inside it, nothing is asked and the preset keeps its restriction. Outside it, the same three choices as for a new preset are asked (as now, only this key and mode, any key and mode), as now then meaning any key and mode, since no restriction is in force; the answer replaces the preset's old restriction. Keeping the old one would save a preset whose own key and mode lie outside it, shown as selected now but loaded as Custom after a reload.

## TECHNICAL INTERFACE
Save changes asks the restriction question only when the current key or mode lies outside the preset's restriction.

## EXPECTATION
- Saving changes with the key and mode inside the preset's restriction asks nothing and keeps that restriction.
- Saving changes with the key or mode outside it asks the three choices, As now meaning any key and mode, and the answer replaces the old restriction.
