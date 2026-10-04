---
id: req_multi_phrase_tension_arc
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
tags: [v2, release-v2.2, session, tension]
dependents:
  - [[module_tension_arc_cycle]]
  - [[rule_multi_phrase_tension_arc_cycle]]
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
By default each phrase's own tension arc (its build and release within its own four measures) is independent of carry-in and of every other phrase in the session. A separate, opt-in multi-phrase tension arc flag lets tension rise and fall across a longer arc spanning several phrases instead. Unlike the always-on single-phrase arc, it is a player-facing control with its own visible on/off toggle, on the same footing as the settings-mutation flag and adaptive tempo, and the toggle starts off. How it is presented belongs to the interface design.

## TECHNICAL INTERFACE
A visible on/off toggle for the multi-phrase tension arc.

## EXPECTATION
- The toggle starts off.
- With the flag off, each session phrase's tension arc is independent of every other phrase, and every phrase is generated as without the flag.
- The flag is a visible player-facing on/off toggle.
