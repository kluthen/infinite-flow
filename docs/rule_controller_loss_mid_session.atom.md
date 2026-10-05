---
id: rule_controller_loss_mid_session
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Lost Controller Is Shown While the Session Continues
tags: [v2, release-v2.0, midi, session]
parents:
  - [[rule_controller_attached_definition]]
  - [[rule_session_never_pauses]]
priority: 1
dependents:
  - [[module_session_adaptive_tempo_schedule]]
  - [[module_session_controller_loss]]
  - [[rule_controller_reconnection_window]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
---

# Lost Controller Is Shown While the Session Continues

## INTENT
Make a lost controller obvious to the player while the session keeps going.

## THE RULE / LOGIC
When a connected controller is lost during a session, the loss is made clearly visible to the player, even though that briefly draws attention away from playing; how it looks belongs to the interface design. The session keeps running meanwhile, since there is no pause state: phrases keep being generated and played at tempo, and the app keeps tracking which note is due next. The same device coming back is reattached automatically; this is not a new connection, and a different device cannot be attached mid-session. Expected notes that fell due while the controller was away stay unacknowledged, like any note not played, with no signal. Notes played after a reconnection are recorded and acknowledged exactly as before. The review does not mark the gap.

## TECHNICAL INTERFACE
The session view shows a clear controller-lost state while the session continues.

## EXPECTATION
- A controller lost mid-session (its port reports disconnected) is clearly visible to the player, and the phrase keeps playing at tempo throughout.
- The same device returning is reattached without re-running the transposition check; notes that fell due during the loss stay unacknowledged, and notes played after the reconnection are acknowledged as usual.
