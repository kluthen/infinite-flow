---
id: rule_playing_light_steady
status: DRAFT
version: 0.1
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment, playing-lights]
parents:
  - [[req_part_playing_lights]]
type: RULE
human_name: A Playing Light Does Not Flicker
dependents: []
layer: BUSINESS
---

# A Playing Light Does Not Flicker

## INTENT
Keep the lights calm enough to read beside the score.

## THE RULE / LOGIC
A part's light stays lit across a silence of that part shorter than one beat at the session's tempo, and goes dark after a longer one. So the drum part's light, once the part is on, stays lit, and the responding part's light comes on only in the lead's rests.

## TECHNICAL INTERFACE
The light's hold is one beat at the session's current tempo.

## EXPECTATION
- A silence of a part shorter than one beat leaves its light lit.
- A silence of a part longer than one beat turns its light dark.
