---
id: rule_starting_note_only_starts_count_in
status: REVIEW
version: 0.1
priority: 1
parents:
  - [[rule_midi_starting_note]]
dependents:
  - [[module_session_starting_note]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
human_name: Starting Note Only Starts the Count-In
tags: [v2, release-v2.0, session, session-start, midi, changes-in-v3.2]
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): in a Jam without a held doodle, after the count-in the player plays a doodle, not phrase 1 (rule_jam_starting_note_is_home_note). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Starting Note Only Starts the Count-In

## INTENT
Keep the note that starts a session out of the phrase the player is about to play.

## THE RULE / LOGIC
The starting note only starts the count-in. It is not phrase 1's first note already played, and it belongs to no phrase in the session history or in any export. After the count-in, the player plays phrase 1 from its first note, on beat 1.

## TECHNICAL INTERFACE
The starting note triggers the count-in and is otherwise ignored by acknowledgement, history and export.

## EXPECTATION
- The starting note is recorded in no phrase and appears in no export.
- Phrase 1's first expected note still has to be played after the count-in to be acknowledged.
