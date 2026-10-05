---
id: rule_adaptive_tempo_resets_after_session
status: REVIEW
version: 0.1
priority: 1
parents:
  - [[req_adaptive_tempo]]
dependents:
  - [[module_session_adaptive_tempo_control]]
  - [[service_session_history]]
  - [[service_workspace_session_flow]]
human_name: Adaptive Tempo Resets After the Session
tags: [v2, release-v2.0, part-v2.2, session, tempo]
type: RULE
layer: BUSINESS
---

# Adaptive Tempo Resets After the Session

## INTENT
Return the tempo control to where the player started once an adaptive-tempo session ends.

## THE RULE / LOGIC
The tempo control is a fixed list of round numbers, but the flat schedule can land the actual tempo on a value outside that list; during the session the exact value in effect is shown. At the end of the session (Stop, or the next Start), the control resets to the tempo the player actually started that session from, while the review records the tempo the session actually reached. Since there is no manual mid-session editing, the only way to start the next session at a lower tempo is to change the tempo control at Idle or in the review.

## TECHNICAL INTERFACE
The session view shows the exact tempo in effect; the tempo control resets at session end.

## EXPECTATION
- During the session, the exact tempo in effect is shown, even when it is not a value of the tempo control's list.
- At the session's end the tempo control shows the tempo the session started from, and the review records the tempo reached.
