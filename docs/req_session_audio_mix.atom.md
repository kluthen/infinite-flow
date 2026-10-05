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
notes: Recorded 2026-09-30 in v2 chunk 10 (audio transport); requirement text unchanged. Each volume control sets its gain equal to its level, a linear mapping that is a placeholder until listening tests settle a loudness curve. Chunk 10 builds the four controls as gains on the audio output only; the on-screen controls and the backing sound come in later chunks. Chunk 11 (backing, 2026-09-30) routes the synthesized backing through the backing on/off and backing volume gains; muting or lowering the backing changes only those gains, never a scheduled note or the clock. The backing volume range, from the design tokens, reaches silence (minimum 0), unlike the click volume; a design choice AWAITING THE OWNER ACCEPTANCE. The on-screen controls still come in a later chunk. The on-screen controls came in v2 chunk 15 (session screen). On 2026-10-05 the product owner accepted as final for v2.0 (closing the mix-level part of ux Q31) the click and backing volume defaults and ranges as built, the backing range reaching silence included, and the linear volume-to-gain mapping: none of them is a placeholder any longer. Promoted to STABLE that day; requirement text unchanged.
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
