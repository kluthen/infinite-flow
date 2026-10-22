---
id: req_jam
status: DRAFT
layer: BUSINESS
human_name: Jam: a Mode Whose Sessions Continue the Player's Doodle
tags: [v3, release-v3.2, session, jam, midi]
parents:
  - [[req_midi_controller_input]]
  - [[req_rolling_practice_session]]
dependents:
  - [[req_jam_settings]]
  - [[req_key_and_mode_suggestion]]
  - [[rule_app_opens_in_session_mode]]
  - [[rule_doodle_capture_start]]
  - [[rule_doodle_ends_by_length]]
  - [[rule_doodle_ends_by_silence]]
  - [[rule_doodle_only_orders_candidates]]
  - [[rule_doodle_quantized_to_sixteenths]]
  - [[rule_every_jam_phrase_carries_doodle]]
  - [[rule_jam_again_on_this_doodle]]
  - [[rule_jam_click_runs_until_phrase_one]]
  - [[rule_jam_code_loaded_on_demand]]
  - [[rule_jam_controller_loss_before_phrase_one]]
  - [[rule_jam_drift_positions]]
  - [[rule_jam_ending_before_phrase_one]]
  - [[rule_jam_exports_open_with_doodle]]
  - [[rule_jam_idle_shows_no_phrase]]
  - [[rule_jam_in_visits_that_save_nothing]]
  - [[rule_jam_live_view_never_shows_doodle]]
  - [[rule_jam_melody_follows_doodle_moves]]
  - [[rule_jam_needs_controller]]
  - [[rule_jam_no_backing_before_phrase_one]]
  - [[rule_jam_phrase_one_deadline]]
  - [[rule_jam_phrase_one_joins_doodle]]
  - [[rule_jam_register_follows_doodle]]
  - [[rule_jam_rhythm_ordered_by_doodle]]
  - [[rule_jam_runs_as_session_from_phrase_one]]
  - [[rule_jam_silence_timer_from_phrase_one]]
  - [[rule_jam_start_conditions]]
  - [[rule_jam_starting_note_is_home_note]]
  - [[rule_jam_without_doodle_note_ends]]
  - [[rule_leaving_jam_mode_keeps_session_mode]]
  - [[rule_mode_button_at_idle_only]]
  - [[rule_notes_after_doodle_belong_nowhere]]
  - [[rule_quantized_doodle_is_generation_input]]
  - [[rule_raw_doodle_notes_are_played_notes]]
  - [[rule_review_opens_with_doodle]]
  - [[rule_rhythm_distance]]
  - [[rule_shared_setting_changed_in_jam_mode]]
  - [[rule_two_measures_before_jam_phrase_one]]
type: REQUIREMENT
version: 0.2
priority: 1
---

# Jam: a Mode Whose Sessions Continue the Player's Doodle

## INTENT
Let the player give the app a short idea of their own and hear it taken further, so they can grow an idea they are not yet able to develop alone.

## THE RULE / LOGIC
From v3.2 the app has two modes. It opens in session mode, the app as before; Jam mode is a second mode, entered and left by a mode button at Idle, with its own Idle, its own settings and its own start, over the same workspace (the generator, the audio, the controller connection and saving). In Jam mode a session, a Jam, begins with the player's own idea: after a one-measure count-in, the player plays a short idea on their controller, the doodle, one to four measures long, over the app's click; the app then continues it with rolling phrases, as any session does. A Jam may also run on the doodle Jam mode kept from an earlier Jam, without playing it again. The doodle sets Jam's rhythm and shape controls and steers which of the phrases those controls allow come first, so the phrases match its shape: a rhythm close to it, the same ups and downs, and a first note joined to the doodle's last one. The doodle is never quoted (its notes are never played back inside a phrase) and never switches the key or mode. Once a Jam runs, no new doodle can be given: to doodle again, the player stops, asks for a new doodle at Idle and starts a new Jam.

## TECHNICAL INTERFACE
A mode button at Idle switches between session mode and Jam mode; in Jam mode a session begins with a doodle captured after the count-in, or with the kept doodle.

## EXPECTATION
- In Jam mode with a controller attached, a session begins with a doodle captured after the count-in and continues with generated phrases.
- The doodle never changes the key or mode, and its notes are never played back inside a phrase.
- No new doodle is captured once a Jam's doodle has ended.
