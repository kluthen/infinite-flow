---
id: rule_controllerless_session_never_gains_controller
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Session Without a Controller Stays Without One
parents:
  - [[req_midi_controller_input]]
  - [[req_rolling_practice_session]]
tags: [v2, release-v2.0, midi, session]
dependents:
  - [[service_workspace_session_flow]]
---

# Session Without a Controller Stays Without One

## INTENT
Keep a session without a controller simple: it never gains one and only ends when the player or the browser ends it.

## THE RULE / LOGIC
A controller can only be connected between sessions, so a session started without one stays without one for its whole length: it cannot gain a controller mid-session, and no timeout applies to it. It ends only on Stop, a hidden tab, or the staff no longer being shown.

## TECHNICAL INTERFACE
A controller-less session offers no way to attach a controller and runs no silence or reconnection timer.

## EXPECTATION
A session started without a controller runs until Stop (or a hidden tab, or the staff no longer being shown) and cannot gain a controller mid-session.
