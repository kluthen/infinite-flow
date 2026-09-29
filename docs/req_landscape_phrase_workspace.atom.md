---
id: req_landscape_phrase_workspace
status: REVIEW
layer: BUSINESS
priority: 1
human_name: Landscape Phrase Workspace
type: REQUIREMENT
version: 0.1
tags: workspace,orientation,first-release
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_layout_preflight]]
  - [[rule_idle_phrase_too_dense_is_replaced]]
  - [[rule_landscape_lock_during_session]]
  - [[rule_session_ends_on_portrait_view]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_staff_needs_room_notice]]
---

# Landscape Phrase Workspace

## INTENT
Provide the interactive phrase workspace on screens with sufficient landscape width while preventing an unusable portrait score workspace.

## THE RULE / LOGIC
The phrase workspace supports mobile and tablet devices in landscape orientation and desktop when sufficient width is available. Portrait mobile and tablet views show a rotate-device notice instead of an interactive score or phrase controls.

## TECHNICAL INTERFACE
The phrase workspace is available in supported landscape and desktop layouts; unsupported portrait mobile and tablet layouts show a rotate-device notice.

## EXPECTATION
A supported landscape mobile or tablet device and a sufficiently wide desktop can use the phrase workspace. A portrait mobile or tablet shows a rotate-device notice rather than an interactive score.
