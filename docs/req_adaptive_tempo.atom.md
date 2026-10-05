---
id: req_adaptive_tempo
status: DRAFT
human_name: Adaptive Tempo
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
version: 0.2
priority: 1
tags: [v2, release-v2.2, session, tempo]
dependents:
  - [[module_session_adaptive_tempo_control]]
  - [[module_session_adaptive_tempo_schedule]]
  - [[module_session_phrase_steps]]
  - [[module_session_rolling_display]]
  - [[module_session_transport_tempo_map]]
  - [[rule_adaptive_tempo_flat_schedule]]
  - [[rule_adaptive_tempo_resets_after_session]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
  - [[service_workspace_session_runner_factory]]
type: REQUIREMENT
---

# Adaptive Tempo

## INTENT
Let a player building reading and playing speed opt in to a steadily rising tempo.

## THE RULE / LOGIC
Adaptive tempo is an opt-in feature, separate from the settings-mutation flag. It is available only when a MIDI controller is attached; otherwise it is shown as unavailable, with the reason. A session started while the selected controller is away has no controller, so adaptive tempo does not run in it. Adaptive tempo starts off when the page loads; the player's choice is then kept from one session to the next for as long as the page stays open, and nothing keeps it across a page reload. While it is on, the tempo rises during a session on a flat, unconditional schedule. Nothing about performance is ever displayed, stored or exported: only the tempo itself is shown, and whether adaptive tempo is currently on. Whether it is on never affects generation.

## TECHNICAL INTERFACE
An adaptive-tempo on/off control, unavailable with a stated reason when no controller is attached.

## EXPECTATION
- Adaptive tempo starts off when the page loads, and the player's choice is kept from one session to the next while the page stays open.
- Adaptive tempo can be turned on only with a controller attached; otherwise it shows as unavailable with the reason.
- A session started while the selected controller is away runs without adaptive tempo.
- Generation is provably unaffected by whether adaptive tempo is on.
- Only the tempo and the feature's on/off state are ever shown.
