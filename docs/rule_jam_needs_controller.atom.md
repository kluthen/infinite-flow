---
id: rule_jam_needs_controller
status: DRAFT
dependents: []
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[req_jam]]
version: 0.2
human_name: Starting a Jam Needs a Controller
tags: [v3, release-v3.2, session, jam, midi]
---

# Starting a Jam Needs a Controller

## INTENT
Let the player enter Jam mode and set it up at any time, and start a Jam only when the doodle can be played.

## THE RULE / LOGIC
A Jam needs a MIDI controller attached, that is, a selected controller that is connected, since the doodle is played on it. Without one, Jam mode still opens and its settings can be set, but its Start is unavailable and says why, as Rising tempo does without a controller. A controller attaching or leaving never switches the mode: a mode the player chose with a button never changes by itself.

## TECHNICAL INTERFACE
Jam mode's Start is unavailable, with its reason, while no controller is attached.

## EXPECTATION
- Without a controller attached, Jam mode opens, its settings can be changed, and its Start is unavailable and states why.
- A controller attaching or being lost never switches between session mode and Jam mode.
