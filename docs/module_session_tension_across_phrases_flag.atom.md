---
id: module_session_tension_across_phrases_flag
status: REVIEW
version: 0.1
priority: 1
human_name: Tension-Across-Phrases Flag
parents:
  - [[req_multi_phrase_tension_arc]]
  - [[rule_ephemeral_session_state]]
  - [[service_workspace_session_flow]]
tags: workspace,session,tension
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: MODULE
layer: ARCHITECTURE
---

# Tension-Across-Phrases Flag

## INTENT
Keep the player's tension-across-phrases choice for the page's lifetime, changeable only outside a session, and carry it into each session's start.

## THE RULE / LOGIC
The controller keeps the tension-across-phrases flag in memory in its state for the page's lifetime: off at load, kept from one session to the next, never persisted. It changes only outside a session, at Idle or while the review shows; changing it during the count-in or a running session throws. A session's start carries the flag as the engine's multi-phrase tension arc flag, fixed for that whole session. The step it gives each phrase's tension arc is never shown: the engine never reports it as a settings change, so the read-only Tension control shows the tension in effect, the player's own choice or the value a settings mutation set.

## TECHNICAL INTERFACE
The controller's readonly state includes tensionAcrossPhrases, the page's tension-across-phrases flag, in memory for the page's lifetime, and its action setTensionAcrossPhrases(on) throws during the count-in or a running session. The session start carries it as multiPhraseTensionArc. The flag is createTensionAcrossPhrasesFlag in src/components/workspace/workspace-session-settings.ts.

## EXPECTATION
The tension-across-phrases flag is off at page load, kept from one session to the next while the page stays open and never persisted; changing it during the count-in or a running session throws; a session's start carries it as the engine's multi-phrase tension arc flag, and while a session runs the Tension control never shows a phrase's step.
