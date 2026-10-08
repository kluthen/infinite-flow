---
id: rule_jam_needs_controller
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[req_jam]]
version: 0.1
human_name: Jam Needs a Controller
tags: [v3, release-v3.2, session, jam, midi]
---

# Jam Needs a Controller

## INTENT
Offer Jam only when the doodle can be played, without losing the player's choice.

## THE RULE / LOGIC
Jam needs a controller attached, that is, a selected controller that is connected. Without one, the Jam switch is unavailable and says why, as Rising tempo does, and the player's choice is kept: while no controller is attached, Idle and Start behave exactly as with Jam off. A controller attaching at Idle puts Jam mode in effect, exactly as turning the switch on does; a controller lost at Idle takes it out, exactly as turning the switch off does.

## TECHNICAL INTERFACE
Jam mode is in effect while the switch is on and a controller is attached.

## EXPECTATION
- Without a controller attached the switch is unavailable with its reason, the choice is kept, and Start runs a session as with Jam off.
- A controller attaching or being lost at Idle puts Jam mode in or out of effect as turning the switch on or off would.
