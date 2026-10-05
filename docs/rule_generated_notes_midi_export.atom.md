---
id: rule_generated_notes_midi_export
status: DRAFT
human_name: Generated Notes MIDI Export
parents:
  - [[req_session_export]]
dependents:
  - [[module_review_export_pipeline]]
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, v2.4-check, export]
type: RULE
version: 0.2
---

# Generated Notes MIDI Export

## INTENT
Export the session's generated notes as MIDI that lines up with the tempo actually played.

## THE RULE / LOGIC
The generated-notes MIDI export (Standard MIDI File, type 1) holds the generated line at concert pitch on its own track, a full tempo map, one marker per phrase, and an optional backing track, off by default. It never holds played notes.

## TECHNICAL INTERFACE
The generated-notes export in MIDI format produces one type 1 Standard MIDI File, with an option to include the backing.

## EXPECTATION
- The MIDI file carries the correct tempo map and one marker per phrase, as automated tests check.
- Opening the file in a real MIDI tool, and finding the correct tempo map there, is a check of the later real-hardware release, v2.4.
- The backing track is present only when the player opts in; played notes are never present.
