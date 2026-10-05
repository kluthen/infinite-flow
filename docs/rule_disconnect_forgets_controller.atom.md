---
id: rule_disconnect_forgets_controller
status: REVIEW
human_name: Disconnect Forgets the Controller
tags: [v2, release-v2.0, midi]
parents:
  - [[rule_controller_connects_between_sessions]]
priority: 1
notes: Recorded 2026-10-05 from the v2 controller connection as built (MidiController disconnect and the connection sheet's Disconnect action). The text was proposed in a documentalist report and approved by the product owner on 2026-10-05.
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
---

# Disconnect Forgets the Controller

## INTENT
Let the player stop using a controller between sessions, so that no later session reads it unless the player connects it again.

## THE RULE / LOGIC
Between sessions, the player's Disconnect ends any held notes and clears the selected controller. That device is no longer read and never reattaches on its own; a later session has no controller until the player connects again. Disconnect cannot be reached during a session.

## TECHNICAL INTERFACE
Disconnect is offered in the controller connection step, between sessions only; afterwards no controller is selected until the player connects one again.

## EXPECTATION
- After Disconnect, every note still held has ended and no controller is selected.
- Notes played on the disconnected device are not read, and the device coming back is not reattached by itself.
- A session started after Disconnect, before the player connects again, runs without a controller.
- Disconnect is not offered during a session.
