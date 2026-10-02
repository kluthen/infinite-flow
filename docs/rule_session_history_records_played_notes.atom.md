---
id: rule_session_history_records_played_notes
status: DRAFT
priority: 1
human_name: Session History Records Played Notes
tags: [v2, release-v2.0, session, history, midi]
parents:
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents:
  - [[service_session_history]]
  - [[service_workspace_session_flow]]
type: RULE
layer: BUSINESS
version: 0.1
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
