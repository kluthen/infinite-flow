---
id: req_accompaniment_parts
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
version: 0.1
human_name: Accompaniment Parts Beside the Lead
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[req_contrasting_part]]
  - [[req_drum_part]]
  - [[req_highlighting_part]]
  - [[req_part_playing_lights]]
  - [[req_responding_part]]
  - [[rule_accompaniment_export_parts]]
  - [[rule_accompaniment_export_tracks]]
  - [[rule_app_writes_every_part_note]]
  - [[rule_at_most_two_relation_parts]]
  - [[rule_earlier_kept_sessions_export_backing_only]]
  - [[rule_part_rests_when_no_note_fits]]
  - [[rule_part_switch_takes_effect]]
  - [[rule_parts_change_only_sound]]
  - [[rule_parts_deterministic]]
  - [[rule_parts_never_drawn]]
  - [[rule_parts_off_by_default]]
  - [[rule_parts_play_from_phrase_one]]
  - [[rule_parts_read_chord_as_written]]
  - [[rule_parts_rendered_from_phrase_alone]]
  - [[rule_parts_unavailable_without_sound_library]]
  - [[rule_session_start_never_waits_for_sound_library]]
  - [[rule_voice_sounds_not_chosen]]
  - [[rule_voices_keep_lead_clear]]
priority: 1
---

# Accompaniment Parts Beside the Lead

## INTENT
Let the player hear, on demand, how a line can be doubled, countered, answered and kept in time, while they keep playing only their own line.

## THE RULE / LOGIC
During a session the app can play up to four optional accompaniment parts beside the backing. Each is a system voice: the app always plays it, and the player never takes it over; the player plays only the lead, the phrase on the staff. Each part does one job for the lead, its accompaniment role:
- the highlighting part doubles some of the lead's notes a third or a sixth below them;
- the contrasting part plays a second, slower tune on the chords' guide tones;
- the responding part answers the lead with short fills in its rests;
- the drum part keeps one simple groove, beside the backing as the foundation.
Each part has its own on/off switch, its own volume and its own playing light. The app writes every note of every part; the parts are heard only. They are listening aids: nothing compares the player's playing with a part, and nothing grades or scores. A part's label is the interface's, and these rules hold under any label.

## TECHNICAL INTERFACE
The audio mix holds, for each of the four parts, an on/off switch and a volume, beside the backing's, the click's and the guides'; each part has a playing light.

## EXPECTATION
- A session can sound any combination of the four parts beside the backing, from none to all four.
- The player plays only the lead; no part is ever handed to the player.
- Each part does only its own job: doubling, contrasting, answering or keeping the groove.
- Nothing in the session or the review compares the player's playing with a part.
