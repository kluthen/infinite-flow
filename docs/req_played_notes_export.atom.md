---
id: req_played_notes_export
status: REVIEW
type: REQUIREMENT
layer: BUSINESS
version: 0.1
parents:
  - [[req_session_export]]
dependents:
  - [[module_review_export_pipeline]]
  - [[rule_played_notes_export_aligns_with_generated_midi]]
  - [[rule_played_notes_export_unquantized_timing]]
priority: 1
human_name: Played Notes MIDI Export
tags: [v2, release-v2.1, export, midi]
---

# Played Notes MIDI Export

## INTENT
Let the player take what they actually played out of the app as its own MIDI file.

## THE RULE / LOGIC
The review's played-notes action delivers one MIDI file only (Standard MIDI File, type 1), with one track of the notes the player played: every played note whose onset falls within a phrase of the session. A note whose onset falls before phrase 1 begins (the note that started the session, or anything played during the count-in) belongs to no phrase and is never exported. Each note keeps its concert pitch exactly as received from the controller and its original note-on velocity. The file never holds the backing, which is generated material and stays an option of the generated-notes MIDI file. When the session holds no played note at all (a session without a controller, or one in which nothing was played), the played-notes action is unavailable and only generated notes can be exported; how that is shown belongs to the interface design.

## TECHNICAL INTERFACE
The review's played-notes export action downloads one MIDI file and is unavailable when the session holds no played note.

## EXPECTATION
- A played-notes file is MIDI and holds exactly the played notes whose onsets fall in the session's phrases, at concert pitch as received, with their original velocity, and nothing else.
- The played-notes action is unavailable when the session holds no played note.
