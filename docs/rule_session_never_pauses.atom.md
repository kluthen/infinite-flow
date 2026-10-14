---
id: rule_session_never_pauses
status: REVIEW
version: 0.1
priority: 1
human_name: Session Never Pauses
tags: [v2, release-v2.0, session]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[module_session_failure_ladder]]
  - [[rule_controller_loss_mid_session]]
  - [[rule_hidden_tab_ends_session]]
  - [[service_session_controller]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
---

# Session Never Pauses

## INTENT
Keep a running session moving at tempo until it ends, with no pause state.

## THE RULE / LOGIC
A session has no pause or resume state. From its first phrase until it ends, phrases keep being generated, shown and played at tempo regardless of what the player does, and the app keeps tracking, on the audio clock, which expected note is due next. A player who falls silent, loses their place or loses their controller does not stop the flow, and neither does a generation failure: these leave the session running. Events that would otherwise call for a pause, such as the browser tab becoming hidden or the staff no longer being showable, end the session instead.

## TECHNICAL INTERFACE
A running session exposes Stop but no pause or resume control.

## EXPECTATION
- No player action, silence, controller loss, generation failure or browser event pauses a running session.
- Every such event either leaves the session running at tempo or ends it.
