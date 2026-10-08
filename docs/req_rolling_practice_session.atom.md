---
id: req_rolling_practice_session
status: REVIEW
layer: BUSINESS
version: 0.4
tags: [v2, release-v2.0, session, changes-in-v3.0, changes-in-v3.2]
parents:
  - [[req_four_measure_phrase]]
type: REQUIREMENT
priority: 1
human_name: Rolling Practice Session
dependents:
  - [[module_notation_note_identity_overlays]]
  - [[module_session_phrase_steps]]
  - [[module_session_rolling_display]]
  - [[module_session_staff_refill]]
  - [[req_adaptive_tempo]]
  - [[req_idle_pregeneration]]
  - [[req_jam]]
  - [[req_kept_sessions]]
  - [[req_last_session_review]]
  - [[req_midi_controller_input]]
  - [[req_multi_phrase_tension_arc]]
  - [[req_rhythm_lock]]
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
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
  - [[rule_session_layout_fixed_at_start]]
  - [[rule_session_never_pauses]]
  - [[rule_session_settings_locked]]
  - [[rule_session_start_conditions]]
  - [[rule_stop_ends_session]]
  - [[service_session_controller]]
  - [[service_session_engine]]
  - [[specification_behavioral_quality_gates]]
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a session may begin with a doodle the player plays after the count-in (Jam), and in Jam mode no fresh phrase is generated for the next session, except after a Jam played on a held doodle, where the next phrase 1 is generated from that doodle with a fresh seed (req_jam, rule_held_doodle_phrase_one_at_idle; note revised 2026-10-08 after the spec settled it). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. Its last clause, that nothing about a session survives a page reload, no longer holds from v3.0: the most recent session and pinned sessions are kept (req_kept_sessions). Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
---

# Rolling Practice Session

## INTENT
Let the player practise through a continuous session in which the app keeps generating and showing one phrase after another without being asked again.

## THE RULE / LOGIC
- A session is an ordered sequence of four-measure 4/4 phrases. The four-measure phrase stays the unit of generation, and the generated timeline is never widened to span several phrases. Every phrase of a session is a complete phrase that obeys every rule a single phrase obeys, with one exception: a phrase generated with carry-in (the small handoff from the phrase before it) may end owing a leap recovery or a tense note's resolution, for the next phrase to settle.
- A session starts from Idle (the phrase workspace outside any session and outside the review), then runs at the chosen tempo, the app looking one phrase ahead so the next phrase is ready before it is needed, until the session ends.
- During a session the app plays a simple backing track under the phrases, can read one MIDI controller to quietly acknowledge the notes the player gets right, and never asks the player to request the next phrase.
- When a session that sounded at least one phrase ends, the review of that session opens, and a fresh phrase is generated for the next session to start on. From the review the player can export the session; to start again, the player leaves the review and starts from Idle.
- A session exists only in the browser, for one local player; nothing about it survives a page reload.

## TECHNICAL INTERFACE
Idle offers a way to start a session (a Start click, or the starting note on a connected MIDI controller); the review does not. While a session runs, the player sees the rolling staff, the transport (Stop) and the audio mix. When it ends, the review of that session opens.

## EXPECTATION
- Once started, a session shows phrase after phrase with no request from the player until it ends.
- Every phrase a session shows is a complete four-measure 4/4 phrase that obeys every single-phrase rule, except that a phrase generated with carry-in may end owing a leap recovery or a tense note's resolution.
- When a session that sounded at least one phrase ends, its review opens; the next session starts from Idle once the player has left the review.
