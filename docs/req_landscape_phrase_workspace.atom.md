---
id: req_landscape_phrase_workspace
status: DRAFT
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
