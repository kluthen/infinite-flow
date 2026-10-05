---
id: rule_hidden_tab_ends_session
status: DRAFT
type: RULE
priority: 1
human_name: Hidden Tab Ends the Session
parents:
  - [[rule_session_never_pauses]]
  - [[rule_stop_ends_session]]
dependents:
  - [[service_session_end]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
version: 0.1
tags: [v2, release-v2.0, session, session-end]
---

# Hidden Tab Ends the Session

## INTENT
End the session cleanly when the browser tab is hidden, since a hidden tab cannot keep time.

## THE RULE / LOGIC
A hidden browser tab ends the session immediately, exactly like Stop: the backing and the click fade out over about 100 ms, and the review opens, or, during the count-in, the app goes back to Idle. Browsers throttle timers in hidden tabs, so a paused-and-resumed clock could never resume cleanly; there is no pause and resume state.

## TECHNICAL INTERFACE
The session reacts to the page becoming hidden by ending as Stop does.

## EXPECTATION
- Hiding the tab during a session ends it at once, exactly like Stop, count-in included.
- No session is ever paused and resumed.
