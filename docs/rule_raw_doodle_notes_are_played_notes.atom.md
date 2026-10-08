---
id: rule_raw_doodle_notes_are_played_notes
status: DRAFT
version: 0.1
human_name: The Doodle's Raw Notes Stay Played Notes
tags: [v3, release-v3.2, session, jam, privacy, midi]
layer: BUSINESS
priority: 1
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_deleting_played_notes_keeps_quantized_doodle]]
type: RULE
---

# The Doodle's Raw Notes Stay Played Notes

## INTENT
Keep the player's actual playing as private in a Jam as anywhere else.

## THE RULE / LOGIC
The doodle's raw notes, exactly as played, are played notes under every rule for played notes: in memory only unless Keep my played notes is on, shown only in the review's played-notes lane, which covers them too, and leaving the device only through the played-notes export the player triggers.

## TECHNICAL INTERFACE
Raw doodle notes are recorded and kept as played notes.

## EXPECTATION
- With Keep my played notes off, no raw doodle note is ever written to storage.
- Raw doodle notes appear only in the played-notes lane and the played-notes export.
