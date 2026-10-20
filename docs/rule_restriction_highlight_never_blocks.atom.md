---
id: rule_restriction_highlight_never_blocks
status: REVIEW
dependents:
  - [[module_key_and_mode_marks]]
  - [[ui_segmented_control_marked_option]]
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
parents:
  - [[rule_restriction_in_force]]
type: RULE
layer: BUSINESS
version: 0.2
human_name: The Restriction Guides and Never Blocks
---

# The Restriction Guides and Never Blocks

## INTENT
Guide the player toward a preset's keys and modes while leaving them in charge of both.

## THE RULE / LOGIC
While a restriction is in force, the key and mode controls mark the values it allows, by a sign that is not colour alone. With none in force, or with any, nothing is marked. Nothing is ever blocked: every key and mode stays selectable, and no option is disabled. During a session the marks do not change: they show the restriction in force at Start for the whole session, whatever key, mode or selection the read-only controls show.

## TECHNICAL INTERFACE
The Written key and Collection controls mark allowed values while a restriction is in force.

## EXPECTATION
- While a restriction is in force, its allowed keys and modes are marked by a sign other than colour; otherwise nothing is marked.
- Every key and mode stays selectable under every restriction.
- During a session the marks are those Start showed.
