---
id: rule_playing_light_only_while_part_can_sound
status: DRAFT
version: 0.1
human_name: A Playing Light Is Dark Wherever Its Part Cannot Sound
type: RULE
layer: BUSINESS
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment, playing-lights]
parents:
  - [[req_part_playing_lights]]
dependents: []
---

# A Playing Light Is Dark Wherever Its Part Cannot Sound

## INTENT
Never show a part as playing when it cannot be.

## THE RULE / LOGIC
A part's light can be lit only in a running session, from phrase 1's first beat, while that part's notes can sound. It is dark at Idle, in the count-in and every measure before a Jam's phrase 1, in the review, and while the part is switched off.

## TECHNICAL INTERFACE
The lights are dark outside a running session's phrases.

## EXPECTATION
- Every part's light is dark at Idle, in the count-in, before a Jam's phrase 1 and in the review.
- A part switched off has a dark light.
