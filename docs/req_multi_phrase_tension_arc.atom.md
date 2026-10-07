---
id: req_multi_phrase_tension_arc
status: REVIEW
layer: BUSINESS
version: 0.2
priority: 1
tags: [v2, release-v2.0, part-v2.2, session, tension, changes-in-v3.0]
dependents:
  - [[module_session_tension_across_phrases_flag]]
  - [[module_session_tension_arc_step]]
  - [[module_tension_arc_cycle]]
  - [[rule_multi_phrase_tension_arc_cycle]]
  - [[service_workspace_session_flow]]
  - [[service_workspace_session_runner_factory]]
type: REQUIREMENT
human_name: Multi-Phrase Tension Arc
parents:
  - [[req_rolling_practice_session]]
  - [[rule_tension_arc_level_policy]]
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 the toggle is saved: it starts off on a first visit and otherwise comes back as the player left it (rule_settings_saved_on_change); its start-off clause then reads as the default. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
---

# Multi-Phrase Tension Arc

## INTENT
Let the player opt in to a tension arc that spans several phrases of a session.

## THE RULE / LOGIC
By default each phrase's own tension arc (its build and release within its own four measures) is independent of carry-in and of every other phrase in the session. A separate, opt-in multi-phrase tension arc flag lets tension rise and fall across a longer arc spanning several phrases instead. Unlike the always-on single-phrase arc, it is a player-facing control with its own visible on/off toggle, on the same footing as the settings-mutation flag and adaptive tempo, and the toggle starts off. How it is presented belongs to the interface design.

## TECHNICAL INTERFACE
A visible on/off toggle for the multi-phrase tension arc.

## EXPECTATION
- The toggle starts off.
- With the flag off, each session phrase's tension arc is independent of every other phrase, and every phrase is generated as without the flag.
- The flag is a visible player-facing on/off toggle.
