---
id: req_part_playing_lights
status: DRAFT
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment, playing-lights]
dependents:
  - [[rule_playing_light_follows_heard_sound]]
  - [[rule_playing_light_not_colour_alone]]
  - [[rule_playing_light_only_while_part_can_sound]]
  - [[rule_playing_light_steady]]
version: 0.1
human_name: Each Part Has a Playing Light
parents:
  - [[req_accompaniment_parts]]
type: REQUIREMENT
layer: BUSINESS
---

# Each Part Has a Playing Light

## INTENT
Let the player tell which sound belongs to which part.

## THE RULE / LOGIC
Each of the four parts has a small light that says the part is playing. It is lit while the part sounds as heard, steady rather than flickering, and only while the part can sound in a running session; its states never rest on colour alone. The backing, the click and the guides have no light. Where the lights sit, and how they show on a small screen, belong to the interface design.

## TECHNICAL INTERFACE
Each part's switch comes with its playing light.

## EXPECTATION
- Each part has its own playing light, and no other sound has one.
- A part's light tells whether that part is playing.
