---
id: req_played_notes_export
status: REVIEW
type: REQUIREMENT
layer: BUSINESS
version: 0.4
parents:
  - [[req_session_export]]
dependents:
  - [[module_review_export_pipeline]]
  - [[rule_played_notes_export_aligns_with_generated_midi]]
  - [[rule_played_notes_export_omits_stray_notes]]
  - [[rule_played_notes_export_unquantized_timing]]
priority: 1
human_name: Played Notes MIDI Export
tags: [v2, release-v2.0, part-v2.1, export, midi, changes-in-v3.2]
---

# Played Notes MIDI Export

## INTENT
Let the player take what they actually played out of the app as its own MIDI file.

## THE RULE / LOGIC
The review's played-notes action delivers one MIDI file only (Standard MIDI File, type 1), with one track of the notes the player played: every played note whose onset falls within an exported phrase and, from v3.2 in a Jam, the raw doodle notes, in the Doodle section the file opens with in either scope, except that, from v3.0, the very short notes are left out by default, and the player can choose to include them. The exported phrases are every phrase of the session or, from v3.0 under the favorites-only scope, only its favorite phrases, where a played note held past a favorite phrase's end stops at that end when the next phrase is not exported. Any other note whose onset falls before phrase 1 begins (the note that started the session, anything played during the count-in and, in a Jam, during the generation and read-in measures and an extended wait) belongs to no phrase and is never exported. Each note keeps its concert pitch exactly as received from the controller and its original note-on velocity. The file never holds the backing, which is generated material and stays an option of the generated-notes MIDI file. When the session holds no played note at all, a Jam's raw doodle notes counting as played notes (a session without a controller, or one in which nothing was played), the played-notes action is unavailable and only generated notes can be exported. From v3.0 it is also unavailable while the file would hold no note: under the favorites-only scope when no favorite phrase holds a played note and, in a Jam, the doodle holds none either, and under either scope while every played note the file would hold, the doodle's included, is very short and very short notes are not included. How that is shown belongs to the interface design.

## TECHNICAL INTERFACE
The review's played-notes export action downloads one MIDI file and is unavailable while that file would hold no played note.

## EXPECTATION
- A played-notes file is MIDI and holds exactly the played notes whose onsets fall in the exported phrases (the session's, or only its favorite ones) and, in a Jam, the raw doodle notes in its Doodle section, very short notes left out unless the player includes them, at concert pitch as received, with their original velocity, and nothing else.
- The played-notes action is unavailable when the session holds no played note, the raw doodle notes counting, under the favorites-only scope when neither a favorite phrase nor, in a Jam, the doodle holds one, and while every played note the file would hold is very short and very short notes are not included.
