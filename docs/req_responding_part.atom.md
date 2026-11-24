---
id: req_responding_part
status: DRAFT
layer: BUSINESS
priority: 1
human_name: The Responding Part
parents:
  - [[req_accompaniment_parts]]
dependents:
  - [[rule_responding_part_in_long_rests]]
  - [[rule_responding_part_register]]
  - [[rule_responding_part_rhythm]]
  - [[rule_responding_part_shapes]]
  - [[rule_responding_part_target]]
type: REQUIREMENT
version: 0.1
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# The Responding Part

## INTENT
Let the player hear the lead answered in the gaps it leaves.

## THE RULE / LOGIC
The responding part plays short fills in the lead's rests, each leading into the lead's next entry. It answers the written phrase, which is known before it sounds, and never the notes the player actually plays. It sounds only while the lead rests. Where it plays, its rhythm, the note it aims at, its shape and its register follow the part's own rules.

## TECHNICAL INTERFACE
Switched on, the responding part sounds in a running session under its own switch and volume.

## EXPECTATION
- The responding part never sounds while a lead note sounds.
- Its notes are the same whatever the player plays, or whether the player plays at all.
