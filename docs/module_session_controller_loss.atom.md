---
id: module_session_controller_loss
status: REVIEW
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: Session Controller Loss
parents:
  - [[rule_controller_loss_mid_session]]
  - [[rule_controller_reconnection_window]]
  - [[service_workspace_session_flow]]
tags: workspace,session,midi
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
---

# Session Controller Loss

## INTENT
Give a session with a controller a fixed window to get the same controller back after a loss, and end it when the controller does not come back.

## THE RULE / LOGIC
During a session with a controller any state other than connected is a loss: a 30-second countdown runs from the audio time of the loss, published second by second, and at 0 ends the session with the controller-lost cause, which ends on screen exactly as a silence timeout does. When the same device is connected again before then, every expected note whose onset fell between the loss and the reattachment is passed over, never acknowledged afterwards even if its window is still open, then the countdown clears and a silence timer that was armed is re-armed from the reattachment. A session with a controller also sends each loss and each reconnection to the engine as the controller event, whether or not adaptive tempo runs, at the audio clock's time raised to the engine's time floor; a session without a controller sends none.

## TECHNICAL INTERFACE
The session end causes include controller-lost. The MIDI side's readonly readings include the controller-lost countdown as seconds left or null; its beginSession(seams) is given a controllerPresence sink told of each loss and reconnection.

## EXPECTATION
In a session with a controller, a loss not recovered within 30 seconds ends it with controller-lost; when the same device returns, no expected note that fell due during the loss is ever acknowledged, and later notes are acknowledged as usual. A loss and a reconnection reach the engine only in a session started with a controller.
