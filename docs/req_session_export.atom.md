---
id: req_session_export
status: DRAFT
human_name: Whole-Session Export
parents:
  - [[req_last_session_review]]
type: REQUIREMENT
layer: BUSINESS
version: 0.2
priority: 1
tags: [v2, release-v2.0, export, changes-in-v3.0]
dependents:
  - [[module_review_export_pipeline]]
  - [[req_played_notes_export]]
  - [[rule_export_contents_never_merged]]
  - [[rule_favorites_only_export]]
  - [[rule_generated_notes_midi_export]]
  - [[rule_generated_notes_musicxml_export]]
  - [[rule_jam_exports_open_with_doodle]]
---

# Whole-Session Export

## INTENT
Let the player take the whole session out of the app as local files.

## THE RULE / LOGIC
The review offers export actions, one per content: one exports the generated notes, the other the played notes. Each action delivers exactly one file, as a browser file download, with no upload and no server-side step anywhere. Every export covers the whole session: its phrases sit back to back in session order, each keeping its session phrase number, with no gap between them, starting at time zero with phrase 1. The action the player triggers decides the content: the generated-notes action never carries played notes, and lets the player choose between MusicXML and MIDI. Both actions exist in release v2.0: the generated-notes action and the played-notes action; each downloads its own file, and the two contents are never merged into one file.

## TECHNICAL INTERFACE
The review offers two export actions, one per content, each downloading one file: the generated-notes action offers MusicXML or MIDI; the played-notes action delivers one MIDI file.

## EXPECTATION
- Every export covers the whole session, phrases back to back from time zero, each keeping its phrase number.
- Each export action delivers exactly one file as a local download, with no upload.
- Both the generated-notes action and the played-notes action exist in release v2.0, each downloading its own file; no generated-notes file holds a played note, and the two contents are never merged into one file.
