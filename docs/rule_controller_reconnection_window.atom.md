---
id: rule_controller_reconnection_window
status: DRAFT
dependents: []
type: RULE
version: 0.1
priority: 1
tags: [v2, release-v2.0, midi, session-end]
parents:
  - [[rule_controller_loss_mid_session]]
layer: BUSINESS
human_name: 30-Second Controller Reconnection Window
---

# 30-Second Controller Reconnection Window

## INTENT
Give a lost controller a fixed window to come back before the session ends.

## THE RULE / LOGIC
If a controller lost mid-session is not reconnected within 30 seconds, the session ends, the same way the silence timeout ends it. The 30 seconds count from the moment the controller is lost, whatever came before: how long the player had already been silent does not shorten them. While no controller is attached the silence timer is suspended; after a reconnection it counts again from the reconnection.

## TECHNICAL INTERFACE
A 30-second reconnection timer starts when the controller is lost and is cancelled by the same device returning.

## EXPECTATION
- If the same device comes back within 30 seconds of the loss, the session carries on; if not, the session ends, however long the player had been silent before the loss.
- After a reconnection, the silence timer counts from the reconnection.
