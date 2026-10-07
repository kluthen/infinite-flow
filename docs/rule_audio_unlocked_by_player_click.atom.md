---
id: rule_audio_unlocked_by_player_click
status: REVIEW
type: RULE
version: 0.1
human_name: Audio Starts Only After a Player Click
tags: [v2, release-v2.0, session, audio, midi, changes-in-v3.0]
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
priority: 1
dependents:
  - [[rule_starting_note_waits_for_first_gesture]]
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
  - [[specification_browser_only_operation_verification]]
notes: v3.0 change pending (2026-10-07, re-sync to the v3.0 master spec v1.3): the approved v3.0 scope, not yet built, changes this atom. From v3.0 the remembered controller is reselected at load, when MIDI access is already allowed, without the player clicking Connect controller (rule_last_controller_remembered), and its starting note starts nothing before the page's first click, tap or key press (rule_starting_note_waits_for_first_gesture); so the clauses that a MIDI note can start a session only after a Connect controller click, and that only Start and Connect controller unlock audio, no longer hold as worded. Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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
