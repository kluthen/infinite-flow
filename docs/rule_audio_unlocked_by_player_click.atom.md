---
id: rule_audio_unlocked_by_player_click
status: DRAFT
type: RULE
version: 0.1
human_name: Audio Starts Only After a Player Click
tags: [v2, release-v2.0, session, audio, midi]
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
priority: 1
dependents:
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
  - [[specification_browser_only_operation_verification]]
---

# Audio Starts Only After a Player Click

## INTENT
Start sound only after a click by the player, without a separate audio-unlock step.

## THE RULE / LOGIC
Audio can only start after a click by the player: browsers do not count a MIDI note as the kind of interaction that unlocks audio. A Start click is such a click, so it can always start a session with sound whenever a session can start at all. For a MIDI note to be able to start a session, the player must first have clicked "Connect controller": that one click unlocks audio and requests MIDI permission together, so there is no separate audio-unlock step. Nothing plays before the player has clicked either Start or "Connect controller".

## TECHNICAL INTERFACE
The Start click and the "Connect controller" click are the two actions that unlock audio.

## EXPECTATION
- Nothing plays before the player has clicked Start or "Connect controller".
- After "Connect controller", the starting MIDI note can start a session with sound; a Start click always can, whenever a session can start.
