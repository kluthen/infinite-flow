---
id: rule_last_controller_remembered
status: DRAFT
human_name: Last Controller Remembered
tags: [v3, release-v3.0, storage, midi]
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
parents:
  - [[req_midi_controller_input]]
  - [[req_on_device_storage]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
---

# Last Controller Remembered

## INTENT
Spare the player from choosing their controller again on every visit.

## THE RULE / LOGIC
From v3.0, the app remembers the last controller the player chose and, when the app loads, reselects it as soon as that controller is connected, recognising it the same way it recognises a controller that comes back within a page. Deleting My instrument does not forget the controller; Delete everything does.

## TECHNICAL INTERFACE
The chosen controller's identity is kept on the device and matched against the inputs present when the app loads.

## EXPECTATION
- After a reload, the last chosen controller is reselected as soon as it is connected.
- Deleting My instrument keeps the remembered controller; Delete everything forgets it.
