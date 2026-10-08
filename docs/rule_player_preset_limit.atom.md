---
id: rule_player_preset_limit
status: DRAFT
type: RULE
human_name: At Most 50 Player Presets
tags: [v3, release-v3.1, player-controls, presets]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
parents:
  - [[rule_preset_management_actions]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
---

# At Most 50 Player Presets

## INTENT
Keep the preset selector usable.

## THE RULE / LOGIC
The player can keep at most 50 presets of their own. At the limit, saving a new one is refused, saying why. The limit keeps the selector usable; it is not a storage limit. If more than 50 are loaded, as when two tabs each saved some, all are listed, and saving a new one stays refused while there are 50 or more.

## TECHNICAL INTERFACE
Saving a new player preset checks the count of player presets.

## EXPECTATION
- Saving a new player preset while 50 or more exist is refused with the reason.
- More than 50 loaded player presets are all listed.
