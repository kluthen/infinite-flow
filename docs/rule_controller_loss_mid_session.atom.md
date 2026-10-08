---
id: rule_controller_loss_mid_session
status: STABLE
type: RULE
layer: BUSINESS
version: 0.2
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
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A9), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. A controller lost in a Jam started without a held doodle, from its count-in until its phrase 1, ends the Jam at once, back to Idle with no review. Earlier: Status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/e2e/session/session-midi-controller-loss.spec.ts (the phrase keeps playing at tempo through the loss and after the same device is back, added in eab0519; notes due while away stay unmatched, those played after the reconnection are acknowledged) and tests/unit/session/session-acknowledgement.spec.ts.
---

# Lost Controller Is Shown While the Session Continues

## INTENT
Make a lost controller obvious to the player while the session keeps going.

## THE RULE / LOGIC
When a connected controller is lost during a session, the loss is made clearly visible to the player, even though that briefly draws attention away from playing; how it looks belongs to the interface design. The session keeps running meanwhile, since there is no pause state: phrases keep being generated and played at tempo, and the app keeps tracking which note is due next. One exception: in a Jam started without a held doodle, a controller lost from its count-in until its phrase 1 sounds (the count-in, the capture, the generation measure, an extended wait or the read-in measure) ends the Jam at once, back to Idle with no review, since the doodle can no longer be played or followed. From that Jam's phrase 1 on, and throughout a Jam on a held doodle, its count-in included, this rule applies as to any session. The same device coming back is reattached automatically; this is not a new connection, and a different device cannot be attached mid-session. Expected notes that fell due while the controller was away stay unacknowledged, like any note not played, with no signal. Notes played after a reconnection are recorded and acknowledged exactly as before. The review does not mark the gap.

## TECHNICAL INTERFACE
The session view shows a clear controller-lost state while the session continues.

## EXPECTATION
- A controller lost mid-session (its port reports disconnected) is clearly visible to the player, and the phrase keeps playing at tempo throughout, except in a Jam started without a held doodle, from its count-in until its phrase 1, where the loss ends the Jam at once.
- The same device returning is reattached without re-running the transposition check; notes that fell due during the loss stay unacknowledged, and notes played after the reconnection are acknowledged as usual.
