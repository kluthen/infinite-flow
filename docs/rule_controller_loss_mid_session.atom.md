---
id: rule_controller_loss_mid_session
status: STABLE
type: RULE
layer: BUSINESS
version: 0.3
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
When a connected controller is lost during a session, the loss is made clearly visible to the player, even though that briefly draws attention away from playing; how it looks belongs to the interface design. The session keeps running meanwhile, since there is no pause state: phrases keep being generated and played at tempo, and the app keeps tracking which note is due next. One exception: in a Jam started without a kept doodle, a controller lost from its count-in until its phrase 1 sounds (the count-in, the capture, the generation measure, an extended wait or the read-in measure) ends the Jam at once, back to Idle with no review, since the doodle can no longer be played or followed. From that Jam's phrase 1 on, and throughout a Jam on a kept doodle, its count-in included, this rule applies as to any session. A lost controller never switches between session mode and Jam mode. The same device coming back is reattached automatically; this is not a new connection, and a different device cannot be attached mid-session. Expected notes that fell due while the controller was away stay unacknowledged, like any note not played, with no signal. Notes played after a reconnection are recorded and acknowledged exactly as before. The review does not mark the gap.

## TECHNICAL INTERFACE
The session view shows a clear controller-lost state while the session continues.

## EXPECTATION
- A controller lost mid-session (its port reports disconnected) is clearly visible to the player, and the phrase keeps playing at tempo throughout, except in a Jam started without a kept doodle, from its count-in until its phrase 1, where the loss ends the Jam at once.
- The same device returning is reattached without re-running the transposition check; notes that fell due during the loss stay unacknowledged, and notes played after the reconnection are acknowledged as usual.
