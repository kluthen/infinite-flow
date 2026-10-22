---
id: rule_stray_notes_filtered_on_reading
status: REVIEW
layer: BUSINESS
version: 0.2
parents:
  - [[rule_stray_note_definition]]
dependents:
  - [[module_doodle_quantizer]]
  - [[module_review_played_notes_lane]]
  - [[rule_played_notes_export_omits_stray_notes]]
priority: 1
human_name: Stray Notes Filtered on Reading
tags: [v3, release-v3.0, midi, review]
type: RULE
---

# Stray Notes Filtered on Reading

## INTENT
Hide very short notes, most of the stray notes a controller sends, where they clutter what the player reads, without ever losing them.

## THE RULE / LOGIC
From v3.0, very short notes are filtered only when played notes are read for the review's Played notes lane and for the played-notes export. Played notes are kept exactly as received, very short notes included, so a later change of threshold loses nothing. Acknowledgement is unchanged and has no filter: an expected note lights only for a played note of exactly its pitch inside its window.

## TECHNICAL INTERFACE
The review lane and the played-notes export read played notes through the very-short-note filter; recording and acknowledgement do not.

## EXPECTATION
- Very short notes are absent from the Played notes lane.
- Kept played notes include very short notes.
- Very short notes never change acknowledgement.
