---
id: req_multi_phrase_tension_arc
status: REVIEW
layer: BUSINESS
version: 0.3
priority: 1
tags: [v2, release-v2.0, part-v2.2, session, tension]
dependents:
  - [[module_session_tension_across_phrases_flag]]
  - [[module_session_tension_arc_step]]
  - [[module_tension_arc_cycle]]
  - [[rule_multi_phrase_tension_arc_cycle]]
  - [[rule_tension_across_phrases_never_marks_custom]]
  - [[service_workspace_session_flow]]
  - [[service_workspace_session_runner_factory]]
type: REQUIREMENT
human_name: Multi-Phrase Tension Arc
parents:
  - [[req_rolling_practice_session]]
  - [[rule_tension_arc_level_policy]]
---

# Multi-Phrase Tension Arc

## INTENT
Let the player opt in to a tension arc that spans several phrases of a session.

## THE RULE / LOGIC
By default each phrase's own tension arc (its build and release within its own four measures) is independent of carry-in and of every other phrase in the session. A separate, opt-in multi-phrase tension arc flag lets tension rise and fall across a longer arc spanning several phrases instead. Unlike the always-on single-phrase arc, it is a player-facing control with its own visible on/off toggle, on the same footing as the settings-mutation flag and adaptive tempo, and the toggle is off on a first visit. The player's choice is saved, so it comes back after a page reload, on only if the player turned it on. How it is presented belongs to the interface design.

## TECHNICAL INTERFACE
A visible on/off toggle for the multi-phrase tension arc.

## EXPECTATION
- The toggle is off on a first visit, and after a page reload it comes back as the player left it, on only if the player turned it on.
- With the flag off, each session phrase's tension arc is independent of every other phrase, and every phrase is generated as without the flag.
- The flag is a visible player-facing on/off toggle.
