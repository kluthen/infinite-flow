---
id: rule_stray_notes_filtered_on_reading
status: REVIEW
layer: BUSINESS
version: 0.3
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
From v3.0, very short notes are filtered only when played notes are read for the review's Played notes lane and for the played-notes export and, from v3.2, when a Jam's raw doodle notes are read to quantize the doodle, so a very short note never starts, extends or shapes the doodle. Played notes are kept exactly as received, very short notes included, so a later change of threshold loses nothing. Acknowledgement is unchanged and has no filter: an expected note lights only for a played note of exactly its pitch inside its window.

## TECHNICAL INTERFACE
The review lane, the played-notes export and the doodle quantizer read played notes through the very-short-note filter; recording and acknowledgement do not.

## EXPECTATION
- Very short notes are absent from the Played notes lane.
- A very short note never starts, extends or shapes a Jam's quantized doodle.
- Kept played notes include very short notes.
- Very short notes never change acknowledgement.
