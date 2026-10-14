---
id: req_session_audio_mix
status: STABLE
dependents:
  - [[rule_click_track]]
  - [[rule_click_volume_never_silent]]
priority: 1
human_name: Session Audio Mix Controls
tags: [v2, release-v2.0, session, audio]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
parents:
  - [[req_rolling_practice_session]]
---

# Session Audio Mix Controls

## INTENT
Let the player balance the backing and the click at any moment.

## THE RULE / LOGIC
Backing on/off, backing volume, click on/off and click volume are four separate mix controls, reachable at all times, including throughout a session. They are not generation settings and change nothing about what is generated. Muting the backing only silences its sound; it never affects timing.

## TECHNICAL INTERFACE
Four independent audio-mix controls stay operable at Idle, in the review and during a session.

## EXPECTATION
- Each of the four controls acts independently at any moment, during a session or not.
- Using them never alters timing or generated material.
