---
id: rule_last_controller_remembered
status: DRAFT
human_name: Last Controller Remembered
tags: [v3, release-v3.0, storage, midi]
dependents:
  - [[entity_remembered_controller_record]]
  - [[rule_starting_note_waits_for_first_gesture]]
type: RULE
layer: BUSINESS
version: 0.3
priority: 1
parents:
  - [[req_midi_controller_input]]
  - [[req_on_device_storage]]
---

# Last Controller Remembered

## INTENT
Spare the player from choosing their controller again on every visit.

## THE RULE / LOGIC
From v3.0, the app remembers the last controller the player chose and, when the app loads, reselects it as soon as that controller is connected, recognising it the same way it recognises a controller that comes back within a page. It does so only when the browser already allows MIDI access, never with a permission prompt; otherwise the player connects as before. The player's Disconnect, which forgets the controller for the page, also forgets the remembered one, so a reload never reconnects a controller the player chose to disconnect in a visit that saves. A visit that saves nothing (an outdated tab, or a visit started from the defaults because the saved data could not be read) neither remembers nor forgets: a controller connected there is not remembered, and its Disconnect forgets the controller for that visit only, so the next load that reads the saved data reselects the controller remembered before. Deleting My instrument does not forget the controller; Delete everything does.

## TECHNICAL INTERFACE
The chosen controller's identity is kept on the device and, only when MIDI access is already allowed, matched against the inputs present when the app loads; Disconnect and Delete everything clear it.

## EXPECTATION
- After a reload, with MIDI access already allowed, the last chosen controller is reselected as soon as it is connected, with no permission prompt.
- When MIDI access is not already allowed, loading the app shows no permission prompt and reselects nothing; the player connects as before.
- After the player's Disconnect, a reload reselects nothing.
- Deleting My instrument keeps the remembered controller; Delete everything forgets it.
- In an outdated tab or a visit started from the defaults, connecting a controller and Disconnect change nothing remembered; the next load that reads the saved data reselects the controller remembered before.
