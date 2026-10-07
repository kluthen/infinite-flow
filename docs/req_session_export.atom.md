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
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 an export may also cover only the favorite phrases (rule_favorites_only_export), so every export covers the whole session no longer holds; the export of a kept session works as for the last session (req_kept_session_review). Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md. Earlier: Revised 2026-10-06 (previous version 0.1) for spec D183, wording only - v2 ships as one release, v2.0, so the played-notes action exists in release v2.0 rather than from a release v2.1 (v2.1 now names a part of v2.0); the rule is otherwise unchanged. Status unchanged.
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
