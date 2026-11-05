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
tags: [v2, release-v2.0, v2.4-check, export, changes-in-v3.2]
type: RULE
version: 0.5
---

# Generated Notes MIDI Export

## INTENT
Export the session's generated notes as MIDI that lines up with the tempo actually played.

## THE RULE / LOGIC
The generated-notes MIDI export (Standard MIDI File, type 1) holds the generated line at concert pitch on its own track, a full tempo map, one marker per phrase, and an optional backing track, off by default. From v3.2, a Jam's file opens with the quantized doodle, at concert pitch on the generated line's track, as its own section marked by a marker Doodle at time zero, at the doodle's capture tempo and as many measures as the doodle, with no backing under it; the first exported phrase starts at the next barline. It never holds played notes, a raw doodle note included.

## TECHNICAL INTERFACE
The generated-notes export in MIDI format produces one type 1 Standard MIDI File, with an option to include the backing.

## EXPECTATION
- The MIDI file carries the correct tempo map and one marker per phrase, as automated tests check.
- Opening the file in a real MIDI tool, and finding the correct tempo map there, is a hand check that follows the v2.0 tag, validated later as a v2.0.x hand check; it does not block the tag.
- A Jam's file opens with the Doodle marker and the quantized doodle at time zero, at its capture tempo, with no backing under it, and the first exported phrase's marker at the next barline.
- The backing track is present only when the player opts in; played notes, raw doodle notes included, are never present.
