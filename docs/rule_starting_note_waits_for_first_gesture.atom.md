---
id: rule_starting_note_waits_for_first_gesture
status: STABLE
layer: BUSINESS
priority: 1
human_name: Starting Note Waits for the Page's First Gesture
parents:
  - [[rule_audio_unlocked_by_player_click]]
  - [[rule_last_controller_remembered]]
dependents:
  - [[module_session_starting_note]]
type: RULE
version: 0.1
tags: [v3, release-v3.0, midi, session-start, audio]
---

# Starting Note Waits for the Page's First Gesture

## INTENT
Keep a remembered controller from promising a start the browser cannot give sound to.

## THE RULE / LOGIC
From v3.0, after the page loads, the starting note starts nothing before the player's first click, tap or key press on the page, because browsers do not let a page play sound before one. This holds when the remembered controller was reselected at load: remembering the controller unlocks no audio.

## TECHNICAL INTERFACE
After a load, a reselected controller's starting note is ignored until the page has received its first click, tap or key press.

## EXPECTATION
- After a load with the remembered controller reselected, playing the starting note before any click, tap or key press on the page starts nothing.
