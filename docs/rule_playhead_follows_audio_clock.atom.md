---
id: rule_playhead_follows_audio_clock
status: REVIEW
tags: [v2, release-v2.0, v2.4-check, session, audio]
dependents:
  - [[module_session_rolling_display]]
  - [[module_session_staff_overlays]]
  - [[service_session_controller]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
version: 0.3
priority: 1
human_name: Playhead Follows the Audio Clock
parents:
  - [[req_rolling_practice_session]]
type: RULE
---

# Playhead Follows the Audio Clock

## INTENT
Keep what the player sees in step with what they hear.

## THE RULE / LOGIC
The audio clock is the one master clock for the backing, the click, the on-screen playhead and the matching of played notes: everything is scheduled and read against it, not against wall-clock time, so the playhead and the audio it represents never visibly drift apart. A muted backing does not stop this clock: muting silences the sound and never suspends the clock.

## TECHNICAL INTERFACE
Backing, click, playhead and acknowledgement timing all read one shared audio clock.

## EXPECTATION
- The on-screen playhead stays within 20 ms of the actual audio output position over a five-minute session in Chromium. This is measured in real Chromium on the reference machine, one of the real-hardware checks of the v2.0 release gate.
- Muting the backing never affects timing.
