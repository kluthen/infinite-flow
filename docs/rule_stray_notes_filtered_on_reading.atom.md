---
id: rule_stray_notes_filtered_on_reading
status: DRAFT
layer: BUSINESS
version: 0.1
parents:
  - [[rule_stray_note_definition]]
dependents:
  - [[rule_played_notes_export_omits_stray_notes]]
priority: 1
human_name: Stray Notes Filtered on Reading
tags: [v3, release-v3.0, midi, review]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
type: RULE
---

# Stray Notes Filtered on Reading

## INTENT
Hide stray notes where they clutter what the player reads, without ever losing them.

## THE RULE / LOGIC
From v3.0, very short notes are filtered only when played notes are read for the review's Played notes lane and for the played-notes export. Played notes are kept exactly as received, very short notes included, so a later change of threshold loses nothing. Acknowledgement is unchanged and has no filter: an expected note lights only for a played note of exactly its pitch inside its window.

## TECHNICAL INTERFACE
The review lane and the played-notes export read played notes through the very-short-note filter; recording and acknowledgement do not.

## EXPECTATION
- Very short notes are absent from the Played notes lane.
- Kept played notes include very short notes.
- Very short notes never change acknowledgement.
