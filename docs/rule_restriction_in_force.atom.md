---
id: rule_restriction_in_force
status: DRAFT
type: RULE
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_restriction_highlight_never_blocks]]
  - [[rule_vary_settings_stays_inside_restriction]]
layer: BUSINESS
version: 0.1
human_name: The Restriction in Force
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_key_and_mode_restriction]]
---

# The Restriction in Force

## INTENT
Know at every moment which restriction applies, without storing it, so leaving it is simply opting out.

## THE RULE / LOGIC
The restriction in force is the restriction of the selected preset, or in Custom the restriction of its base, while the current key and mode are inside it; otherwise none is in force. It is worked out from the selection and the two controls, never stored, and recorded nowhere: no phrase depends on it, only on the key and mode. Choosing a key or mode outside it is opting out: a selected preset becomes Custom based on it, the restriction is no longer in force, and no other setting changes. Choosing a key and mode back inside by hand puts it in force again, and the selection stays Custom. Editing a preset-held setting makes Custom and keeps the restriction in force.

## TECHNICAL INTERFACE
The restriction in force is derived from the selection and the Written key and Collection values.

## EXPECTATION
- A restriction is in force exactly while the key and mode are inside the selected preset's restriction, or Custom's base's.
- Choosing a key or mode outside it takes it out of force and changes no other setting.
