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
version: 0.4
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): for a Jam it opens with the quantized doodle as a section marked Doodle, with no backing under it; the quantized doodle is a generation input, not played notes (rule_jam_exports_open_with_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-06 (previous version 0.3) on spec D193, the product owner answer to O105 - the checks of exports in real programs do not block the v2.0 tag; they follow it and are validated at a later date as v2.0.x hand checks, because the owner has no MuseScore account or DAW at hand (hardware checklist part F, 2026-10-06). The automated checks and the rest of the rule are unchanged; still part of release v2.0. Revised 2026-10-05 (previous version 0.2) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
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
- Opening the file in a real MIDI tool, and finding the correct tempo map there, is a hand check that follows the v2.0 tag, validated later as a v2.0.x hand check; it does not block the tag.
- The backing track is present only when the player opts in; played notes are never present.
