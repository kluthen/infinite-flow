---
id: rule_playing_light_follows_heard_sound
status: DRAFT
type: RULE
human_name: A Playing Light Follows the Sound as Heard
tags: [v4, release-v4.0, session, audio, accompaniment, playing-lights]
parents:
  - [[req_part_playing_lights]]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
---

# A Playing Light Follows the Sound as Heard

## INTENT
Light the part at the moment the player hears it.

## THE RULE / LOGIC
A part's light is lit while the part has a note sounding as heard: timed on the audio clock and corrected for the output latency, the way the playhead is.

## TECHNICAL INTERFACE
The light reads the part's notes against the audio clock, with the playhead's latency correction.

## EXPECTATION
- A part's light turns on and off within the playhead's tolerance of the part's sound.
