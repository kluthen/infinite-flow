---
id: rule_restriction_highlight_never_blocks
status: DRAFT
dependents: []
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_restriction_in_force]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
layer: BUSINESS
version: 0.1
human_name: The Restriction Guides and Never Blocks
---

# The Restriction Guides and Never Blocks

## INTENT
Guide the player toward a preset's keys and modes while leaving them in charge of both.

## THE RULE / LOGIC
While a restriction is in force, the key and mode controls mark the values it allows, by a sign that is not colour alone. With none in force, or with any, nothing is marked. Nothing is ever blocked: every key and mode stays selectable, and no option is disabled.

## TECHNICAL INTERFACE
The Written key and Collection controls mark allowed values while a restriction is in force.

## EXPECTATION
- While a restriction is in force, its allowed keys and modes are marked by a sign other than colour; otherwise nothing is marked.
- Every key and mode stays selectable under every restriction.
