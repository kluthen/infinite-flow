---
id: rule_generated_notes_midi_export
status: REVIEW
human_name: Generated Notes MIDI Export
parents:
  - [[req_session_export]]
dependents:
  - [[module_review_export_pipeline]]
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, v2.4-check, export]
type: RULE
version: 0.3
notes: Revised 2026-10-05 (previous version 0.2) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
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
- Opening the file in a real MIDI tool, and finding the correct tempo map there, is one of the real-hardware checks of the v2.0 release gate.
- The backing track is present only when the player opts in; played notes are never present.
