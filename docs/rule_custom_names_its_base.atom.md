---
id: rule_custom_names_its_base
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_custom_selection]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
layer: BUSINESS
human_name: Custom Names the Preset It Is Based On
dependents: []
---

# Custom Names the Preset It Is Based On

## INTENT
Tell the player where their custom settings came from.

## THE RULE / LOGIC
Custom remembers the preset it is based on, the one selected when Custom began, or none. Its display names that base, as in Custom, based on Bebop, or shows just Custom when there is none. It replaces the earlier status line naming a retained grammar: no hidden set of figures remains, since the figures are visible settings.

## TECHNICAL INTERFACE
The selection's display names Custom's base, or none.

## EXPECTATION
- Custom shows the preset it is based on, or no base.
- No status line names a retained grammar.
