---
id: req_drum_part
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
version: 0.1
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment, drums]
dependents: []
human_name: The Drum Part
parents:
  - [[req_accompaniment_parts]]
---

# The Drum Part

## INTENT
Give the session a steady beat beside the backing.

## THE RULE / LOGIC
The drum part plays one groove, the same in every measure: the kick drum on beats 1 and 3, the snare drum on beats 2 and 4, and the closed hi-hat on every eighth. Its velocities are 100 for the kick, 90 for the snare, and 70 for the hi-hat on the beat and 50 off it. It plays no fill and no variation, and makes no random draw. The click keeps its own switch, and the count-in stays the click: the drum part never counts in.

## TECHNICAL INTERFACE
Switched on, the drum part sounds in a running session under its own switch and volume, independent of the click's.

## EXPECTATION
- Every measure of the drum part is the same groove at the same velocities.
- The drum part never sounds in the count-in.
- Turning the drum part on or off leaves the click and the count-in as they are.
