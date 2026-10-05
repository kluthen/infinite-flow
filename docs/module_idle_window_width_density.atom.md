---
id: module_idle_window_width_density
status: REVIEW
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: Idle Note Density From Window Width
tags: workspace,idle,generation,viewport
parents:
  - [[rule_generated_density_follows_window_width]]
  - [[rule_unsupported_rhythm_gives_way_to_no_phrase]]
  - [[rule_unsupported_rhythm_settings_block_generation]]
  - [[service_workspace_session_flow]]
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
---

# Idle Note Density From Window Width

## INTENT
Build every Idle generation attempt with the note density the window's width gives at that moment, while the pending controls keep the chosen density.

## THE RULE / LOGIC
The root injects into the Idle generation composable a window-width seam that tells whether the window is below the tablet-landscape layout's width. Every attempt of a fit run reads that seam when it builds its intent, and builds it with the note density the width gives at that moment, while the pending controls keep the chosen density. The unsupported-rhythm-settings block is judged on that same density at the moment the action is taken. The composable mirrors each crossing of that width in readonly state so the controls and the block follow the window at Idle. A crossing by itself never generates or regenerates; its only effect on the phrase is to stop a running fit run, as the Idle fit round defines, when it makes the combination one that blocks generation, leaving no phrase.

## TECHNICAL INTERFACE
The root creates the Idle composable with an injected window-width seam. Consumers receive the readonly note-density context (where the window stands against the tablet-landscape layout's width, and whether the density has stepped down, always false at Idle); the composable's teardown stops listening for window-width crossings.

## EXPECTATION
Every intent carries the note density the window's width gave when it was built. A crossing of that width updates the readonly note-density context, never issues a generation request, and changes the phrase on screen only by stopping a running fit run it blocks, leaving no phrase.
