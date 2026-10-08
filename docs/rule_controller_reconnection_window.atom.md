---
id: rule_controller_reconnection_window
status: STABLE
dependents:
  - [[module_session_controller_loss]]
  - [[service_workspace_session_flow]]
type: RULE
version: 0.2
priority: 1
tags: [v2, release-v2.0, midi, session-end]
parents:
  - [[rule_controller_loss_mid_session]]
layer: BUSINESS
human_name: 30-Second Controller Reconnection Window
notes: Revised 2026-10-08 to version 0.2 (previous version 0.1) with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A10), together with the CONTRACT 3.0 MAJOR bump; stays STABLE. The 30-second window does not apply to a controller lost in a Jam started without a held doodle between the start of its count-in and its phrase 1. Earlier: Text unchanged. The product owner accepted on 2026-10-05 (spec D184) the silence timer as v2 chunk 17 built it, which this rule already states - the starting note arms it as the first played note, and after a reattachment it counts again from the reconnection once a played note has armed it.
---

# 30-Second Controller Reconnection Window

## INTENT
Give a lost controller a fixed window to come back before the session ends.

## THE RULE / LOGIC
If a controller lost mid-session is not reconnected within 30 seconds, the session ends, the same way the silence timeout ends it. The 30 seconds count from the moment the controller is lost, whatever came before: how long the player had already been silent does not shorten them. While no controller is attached the silence timer is suspended; after a reconnection it counts again from the reconnection. The window does not apply to a controller lost in a Jam started without a held doodle, from its count-in until its phrase 1 sounds, which ends the Jam at once; from that Jam's phrase 1 on, and throughout a Jam on a held doodle, its count-in included, it applies as to any session.

## TECHNICAL INTERFACE
A 30-second reconnection timer starts when the controller is lost and is cancelled by the same device returning.

## EXPECTATION
- If the same device comes back within 30 seconds of the loss, the session carries on; if not, the session ends, however long the player had been silent before the loss. This holds for every session except a Jam started without a held doodle whose controller is lost between the start of its count-in and its phrase 1.
- After a reconnection, the silence timer counts from the reconnection.
