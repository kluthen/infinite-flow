---
id: module_session_tension_across_phrases_flag
status: REVIEW
version: 0.2
priority: 1
human_name: Tension-Across-Phrases Flag
parents:
  - [[req_multi_phrase_tension_arc]]
  - [[rule_ephemeral_session_state]]
  - [[service_workspace_session_flow]]
tags: workspace,session,tension
dependents: []
type: MODULE
layer: ARCHITECTURE
---

# Tension-Across-Phrases Flag

## INTENT
Hold the player's tension-across-phrases choice for the page's lifetime, from the choice they saved, changeable only outside a session, and carry it into each session's start.

## THE RULE / LOGIC
The controller keeps the tension-across-phrases flag in memory in its state for the page's lifetime, kept from one session to the next. The flag enters at the controller's creation, never through its actions, with the player's saved choice loaded before the first draw (off on a first visit). The controller never writes the flag to storage; the player's change handler saves a change the controller accepted. It changes only outside a session, at Idle or while the review shows; changing it during the count-in or a running session throws. A session's start carries the flag as the engine's multi-phrase tension arc flag, fixed for that whole session. The step it gives each phrase's tension arc is never shown: the engine never reports it as a settings change, so the read-only Tension control shows the tension in effect, the player's own choice or the value a settings mutation set.

## TECHNICAL INTERFACE
The controller's readonly state includes tensionAcrossPhrases, the page's tension-across-phrases flag, from the player's saved choice and then in memory for the page's lifetime, and its action setTensionAcrossPhrases(on) throws during the count-in or a running session. The session start carries it as multiPhraseTensionArc. The flag is createTensionAcrossPhrasesFlag(phase, initialOn) in src/components/workspace/workspace-session-settings.ts, initialOn being the saved choice the controller receives among its dependencies (savedSessionOptions.tensionAcrossPhrases).

## EXPECTATION
The tension-across-phrases flag starts from the player's saved choice (off on a first visit), is kept from one session to the next while the page stays open and is never written to storage by the controller; changing it during the count-in or a running session throws; a session's start carries it as the engine's multi-phrase tension arc flag, and while a session runs the Tension control never shows a phrase's step.
