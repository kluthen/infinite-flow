---
id: rule_session_history_records_played_notes
status: REVIEW
priority: 1
human_name: Session History Records Played Notes
tags: [v2, release-v2.0, session, history, midi, changes-in-v3.2]
parents:
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents:
  - [[module_session_note_acknowledgement]]
  - [[service_session_history]]
  - [[service_session_midi]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
version: 0.1
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): in a Jam the raw doodle notes, played before phrase 1, are recorded as the doodle's, not as belonging to nothing (rule_raw_doodle_notes_are_played_notes). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Session History Records Played Notes

## INTENT
Record what the player played in each phrase of the session.

## THE RULE / LOGIC
The session history also records, for each phrase, its acknowledgements and the played notes whose onsets fall within it, each with its concert pitch, velocity, onset and release on the audio clock. A played note whose onset falls before phrase 1 begins (the note that started the session, or anything played during the count-in) belongs to no phrase.

## TECHNICAL INTERFACE
Each history entry lists its acknowledgements and the played notes with onsets inside the phrase.

## EXPECTATION
- Every played note with an onset inside a phrase is recorded in that phrase with its concert pitch, velocity, onset and release.
- Notes played before phrase 1 begins belong to no phrase.
