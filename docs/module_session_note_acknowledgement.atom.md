---
id: module_session_note_acknowledgement
status: DRAFT
priority: 1
human_name: Session Note Acknowledgement
tags: workspace,session,midi,acknowledgement
parents:
  - [[rule_acknowledgement_highlights_expected_note_only]]
  - [[rule_played_onset_latency_compensation]]
  - [[rule_session_history_records_played_notes]]
  - [[service_workspace_session_flow]]
dependents: []
layer: ARCHITECTURE
version: 0.1
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
type: MODULE
---

# Session Note Acknowledgement

## INTENT
Match the notes the player plays in a session with a controller against the expected notes, and record every played note in the session history.

## THE RULE / LOGIC
A session with a controller keeps one acknowledgement over the expected notes of every phrase whose tempo is fixed so far, each phrase's at its own tempo from its own first downbeat: each played note, its onset latency-compensated with the USB correction for every controller, is matched at most once; a match is recorded in the history and published for the score to light, and a note that matches nothing leaves no trace. Every finished played note is recorded in the history with its onset and release compensated by the same total, so the history's played notes line up with the generated notes the player heard.

## TECHNICAL INTERFACE
The MIDI side's readonly readings include the acknowledged expected notes; its beginSession(seams) returns phraseReady(phraseNumber, timeline, tempo), which adds a phrase's expected notes at its tempo, once the engine has fixed that tempo. The session history takes recordPlayedNote (a finished note with compensated onset and release) and recordAcknowledgement (one acknowledged expected note), and each phrase record reads back its acknowledgements and played notes.

## EXPECTATION
In a session with a controller each played note is acknowledged at most once, and every finished note reaches the history with compensated onset and release.
