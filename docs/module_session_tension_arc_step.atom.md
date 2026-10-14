---
id: module_session_tension_arc_step
status: REVIEW
type: MODULE
tags: session,tension
parents:
  - [[module_tension_arc_cycle]]
  - [[req_multi_phrase_tension_arc]]
  - [[service_session_engine]]
dependents: []
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: Session Tension Arc Step
---

# Session Tension Arc Step

## INTENT
Generate each look-ahead phrase of a session under its tension-arc cycle step when the multi-phrase tension arc runs, without the step ever reaching the settings in effect.

## THE RULE / LOGIC
Each look-ahead phrase is generated under the settings the pure tension-arc cycle module gives from the flag, its own phrase number and the settings in effect after any mutation landing on it: with the flag on, its tension arc takes that phrase's four-phrase cycle step; with it off, or when the clamped step changes nothing, they are the settings in effect themselves. They are applied again, by the same phrase number, when a settings change requests a pending phrase again. The step never reaches the settings in effect, a mutation's draw or any settings changed output.

## TECHNICAL INTERFACE
The `SessionStart` field `multiPhraseTensionArc: boolean` says whether the multi-phrase tension arc runs, checked at start and kept in `EngineContext`. The settings a phrase is generated under come from `settingsGeneratedUnder` in `src/session/tension-arc-cycle.ts`, becoming its look-ahead basis's settings and, once decided, the engine state's `lastDecidedSettings`.

## EXPECTATION
With the multi-phrase tension arc on, each look-ahead phrase is generated under the settings in effect with its own four-phrase cycle step on its tension arc, applied again by the same phrase number when a settings change requests it again; with it off, or when the clamped step changes nothing, under the settings in effect themselves. The step never reaches the settings in effect, a mutation's draw or any settings changed output.
