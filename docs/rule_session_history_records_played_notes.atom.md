---
id: rule_session_history_records_played_notes
status: REVIEW
priority: 1
human_name: Session History Records Played Notes
tags: [v2, release-v2.0, session, history, midi]
parents:
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents:
  - [[module_session_note_acknowledgement]]
  - [[service_session_history]]
  - [[service_session_midi]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
version: 0.2
---

# Session History Records Played Notes

## INTENT
Record what the player played in each phrase of the session.

## THE RULE / LOGIC
The session history also records, for each phrase, its acknowledgements and the played notes whose onsets fall within it, each with its concert pitch, velocity, onset and release on the audio clock. A played note whose onset falls before phrase 1 begins (the note that started the session, or anything played during the count-in) belongs to no phrase. In a Jam that begins with a doodle not yet played, the history also records the doodle: the quantized doodle with the tempo it was captured at, and its raw notes, the played notes whose snapped starts fall in the doodle's measures, recorded with the same fields and marked as the doodle's; they belong to no phrase either. The other notes played before phrase 1 (the starting note, the count-in, and after the doodle's end) belong to neither.

## TECHNICAL INTERFACE
Each history entry lists its acknowledgements and the played notes with onsets inside the phrase; a Jam's history also holds its doodle, with the raw doodle notes marked among the played notes.

## EXPECTATION
- Every played note with an onset inside a phrase is recorded in that phrase with its concert pitch, velocity, onset and release.
- Notes played before phrase 1 begins belong to no phrase.
- In a Jam begun with a doodle not yet played, the raw doodle notes are recorded with their concert pitch, velocity, onset and release, marked as the doodle's and in no phrase.
