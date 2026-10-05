---
id: rule_played_notes_export_unquantized_timing
status: REVIEW
human_name: Played Notes Export Keeps Unquantized Timing
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
tags: [v2, release-v2.0, part-v2.1, export, midi]
parents:
  - [[req_played_notes_export]]
type: RULE
---

# Played Notes Export Keeps Unquantized Timing

## INTENT
Keep played notes exactly where they were played in the exported file.

## THE RULE / LOGIC
Played-notes timing is unquantized: each note keeps its exact onset relative to the start of its phrase, converted to MIDI time through the tempo map, with no snapping to any grid. The file's time resolution is fine enough that no onset moves by more than 1 ms from where it was played. A note lasts until the controller released it; a note still held when the session ends stops at the session's end.

## TECHNICAL INTERFACE
Played-note onsets and releases are written through the session's tempo map at a sub-millisecond resolution.

## EXPECTATION
- No exported onset lies more than 1 ms away from where it was played, relative to its phrase.
- No note is snapped to a grid; a note held at the session's end stops at the end.
