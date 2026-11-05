---
id: req_session_audio_mix
status: STABLE
dependents:
  - [[module_guide_playback_layers]]
  - [[rule_click_track]]
  - [[rule_click_volume_never_silent]]
priority: 1
human_name: Session Audio Mix Controls
tags: [v2, release-v2.0, session, audio, changes-in-v3.2]
type: REQUIREMENT
layer: BUSINESS
version: 0.2
parents:
  - [[req_rolling_practice_session]]
---

# Session Audio Mix Controls

## INTENT
Let the player balance the backing, the click and each guide at any moment.

## THE RULE / LOGIC
The mix's controls are an on/off switch and a volume for each of the backing, the click, the melody guide and the rhythm guide: eight separate controls, each independent of the others, so every combination of the backing and the two guides is valid, reachable at all times, at Idle, in the review and throughout a session, and shared by both modes. They are not generation settings and change nothing about what is generated. Turning the backing or a guide off only silences its sound; it never affects timing.

## TECHNICAL INTERFACE
Eight independent audio-mix controls, an on/off switch and a volume for each of the backing, the click, the melody guide and the rhythm guide, stay operable at Idle, in the review and during a session, in both modes.

## EXPECTATION
- Each of the eight controls acts independently at any moment, during a session or not.
- Using them never alters timing or generated material.
