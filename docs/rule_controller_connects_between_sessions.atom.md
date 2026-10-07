---
id: rule_controller_connects_between_sessions
status: REVIEW
layer: BUSINESS
version: 0.1
tags: [v2, release-v2.0, midi]
dependents:
  - [[rule_controller_transposition_check]]
  - [[rule_disconnect_forgets_controller]]
  - [[rule_transposition_check_sets_my_instrument]]
type: RULE
priority: 1
human_name: Controller Connects Only Between Sessions
parents:
  - [[req_midi_controller_input]]
---

# Controller Connects Only Between Sessions

## INTENT
Keep connecting a controller out of the running session.

## THE RULE / LOGIC
Connecting a controller happens only while the app is Idle or showing the review, never during a session. It is a step of its own: the player clicks "Connect controller" (the same click that unlocks audio), MIDI permission is requested, the player picks the one input if several are present, and the controller-transposition check is part of it. Nothing played during this step can start a session.

## TECHNICAL INTERFACE
"Connect controller" is offered at Idle and in the review, never during a session.

## EXPECTATION
- A controller can be connected only at Idle or in the review.
- No note played during the connection step starts a session.
