---
id: rule_custom_names_its_base
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_custom_selection]]
layer: BUSINESS
human_name: Custom Names the Preset It Is Based On
dependents:
  - [[module_preset_bar_model]]
  - [[module_preset_model]]
  - [[module_profile_control_customization]]
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
