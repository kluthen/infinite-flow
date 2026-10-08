---
id: req_jam
status: DRAFT
layer: BUSINESS
human_name: Jam: a Session That Continues the Player's Doodle
tags: [v3, release-v3.2, session, jam, midi]
parents:
  - [[req_midi_controller_input]]
  - [[req_rolling_practice_session]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents:
  - [[req_key_and_mode_suggestion]]
  - [[rule_doodle_capture_start]]
  - [[rule_doodle_ends_by_length]]
  - [[rule_doodle_ends_by_silence]]
  - [[rule_doodle_only_orders_candidates]]
  - [[rule_doodle_quantized_to_sixteenths]]
  - [[rule_every_jam_phrase_carries_doodle]]
  - [[rule_jam_again_on_this_doodle]]
  - [[rule_jam_click_runs_until_phrase_one]]
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
  - [[rule_jam_start_conditions]]
  - [[rule_jam_starting_note_is_home_note]]
  - [[rule_jam_without_doodle_note_ends]]
  - [[rule_notes_after_doodle_belong_nowhere]]
  - [[rule_quantized_doodle_is_generation_input]]
  - [[rule_raw_doodle_notes_are_played_notes]]
  - [[rule_review_opens_with_doodle]]
  - [[rule_rhythm_distance]]
  - [[rule_two_measures_before_jam_phrase_one]]
type: REQUIREMENT
version: 0.1
priority: 1
---

# Jam: a Session That Continues the Player's Doodle

## INTENT
Let the player give the app a short idea of their own and hear it taken further, so they can grow an idea they are not yet able to develop alone.

## THE RULE / LOGIC
From v3.2 Jam is a session mode. After a one-measure count-in, the player plays a short idea on their controller, the doodle, one to four measures long, over the app's click; the app then continues it with rolling phrases, as any session does. The phrases match the doodle's shape: a rhythm close to it, the same ups and downs, and a first note joined to the doodle's last one. The doodle is never quoted: its notes are not played back inside a phrase. The Jam switch is set at Idle, the review included, never during a session; it is off by default and saved like the options for during a session, and presets neither hold it nor change it. Jam is a mode, not a second Start button, so a played note can start a Jam without two starts competing for one note. Once a Jam runs, no new doodle can be given: to doodle again, the player stops and starts a new Jam.

## TECHNICAL INTERFACE
A Jam switch at Idle and in the review puts sessions in Jam mode.

## EXPECTATION
- With the Jam switch on and a controller attached, a session begins with a doodle captured after the count-in and continues with generated phrases.
- The switch can be changed only at Idle or in the review, starts off, survives a reload, and no preset changes it.
- No new doodle is captured once a Jam's doodle has ended.
