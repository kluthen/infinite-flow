---
id: rule_audio_unlocked_by_player_click
status: REVIEW
type: RULE
version: 0.2
human_name: Audio Starts Only After a Player Click
tags: [v2, release-v2.0, session, audio, midi]
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
priority: 1
dependents:
  - [[rule_starting_note_waits_for_first_gesture]]
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
  - [[specification_browser_only_operation_verification]]
---

# Audio Starts Only After a Player Click

## INTENT
Start sound only after a click, tap or key press by the player on the page, without a separate audio-unlock step.

## THE RULE / LOGIC
Audio can only start after the player has clicked, tapped or pressed a key on the page: browsers do not count a MIDI note as the kind of interaction that lets a page make sound. A Start click is such a click, so it can always start a session with sound whenever a session can start at all. A MIDI note can start a session with sound in two cases. After the player has clicked "Connect controller": that one click unlocks audio and requests MIDI permission together, so there is no separate audio-unlock step. Or, from v3.0, after the page's first click, tap or key press, with a controller attached without that click, as the remembered controller reselected at load is: that first gesture makes no sound by itself, and the starting note played after it starts the session with sound. Nothing plays before the player has either clicked Start or "Connect controller" or played the starting note after the page's first click, tap or key press.

## TECHNICAL INTERFACE
The Start click and the "Connect controller" click unlock audio; after a load, so does the starting note played after the page's first click, tap or key press. No other gesture or note unlocks audio.

## EXPECTATION
- Nothing plays before the player has either clicked Start or "Connect controller" or played the starting note after the page's first click, tap or key press.
- After "Connect controller", the starting MIDI note can start a session with sound; a Start click always can, whenever a session can start.
- After a load with the remembered controller reselected, the page's first click, tap or key press plays nothing by itself, and the starting note played after it starts a session with sound.
