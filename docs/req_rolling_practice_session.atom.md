---
id: req_rolling_practice_session
status: DRAFT
layer: BUSINESS
version: 0.2
tags: [v2, release-v2.0, session]
parents:
  - [[req_four_measure_phrase]]
type: REQUIREMENT
priority: 1
human_name: Rolling Practice Session
dependents:
  - [[module_notation_note_identity_overlays]]
  - [[req_adaptive_tempo]]
  - [[req_last_session_review]]
  - [[req_midi_controller_input]]
  - [[req_multi_phrase_tension_arc]]
  - [[req_session_audio_mix]]
  - [[req_session_backing_track]]
  - [[req_settings_mutation_flag]]
  - [[rule_audio_unlocked_by_player_click]]
  - [[rule_controllerless_session_never_gains_controller]]
  - [[rule_count_in_always_clicks]]
  - [[rule_join_carry_in_limited]]
  - [[rule_landscape_lock_during_session]]
  - [[rule_look_ahead_deadline]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_playhead_follows_audio_clock]]
  - [[rule_screen_wake_lock_during_session]]
  - [[rule_session_density_only_steps_down]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_session_never_pauses]]
  - [[rule_session_settings_locked]]
  - [[rule_session_start_conditions]]
  - [[rule_stop_ends_session]]
  - [[service_session_engine]]
---

# Rolling Practice Session

## INTENT
Let the player practise through a continuous session in which the app keeps generating and showing one phrase after another without being asked again.

## THE RULE / LOGIC
- A session is an ordered sequence of four-measure 4/4 phrases. The four-measure phrase stays the unit of generation, and the generated timeline is never widened to span several phrases. Every phrase of a session is a complete phrase that obeys every rule a single phrase obeys, with one exception: a phrase generated with carry-in (the small handoff from the phrase before it) may end owing a leap recovery or a tense note's resolution, for the next phrase to settle.
- A session starts from Idle (the phrase workspace outside any session and outside the review), then runs at the chosen tempo, the app looking one phrase ahead so the next phrase is ready before it is needed, until the session ends.
- During a session the app plays a simple backing track under the phrases, can read one MIDI controller to quietly acknowledge the notes the player gets right, and never asks the player to request the next phrase.
- When a session that sounded at least one phrase ends, the review of that session opens, from which the player can export it or start again.
- A session exists only in the browser, for one local player; nothing about it survives a page reload.

## TECHNICAL INTERFACE
Idle offers a way to start a session (a Start click, or the starting note on a connected MIDI controller). While a session runs, the player sees the rolling staff, the transport (Stop) and the audio mix. When it ends, the review of that session opens.

## EXPECTATION
- Once started, a session shows phrase after phrase with no request from the player until it ends.
- Every phrase a session shows is a complete four-measure 4/4 phrase that obeys every single-phrase rule, except that a phrase generated with carry-in may end owing a leap recovery or a tense note's resolution.
- When a session that sounded at least one phrase ends, its review opens.
