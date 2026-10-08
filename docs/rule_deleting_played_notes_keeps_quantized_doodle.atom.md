---
id: rule_deleting_played_notes_keeps_quantized_doodle
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: Deleting Played Notes Keeps the Quantized Doodle
tags: [v3, release-v3.2, session, jam, privacy, storage]
parents:
  - [[rule_raw_doodle_notes_are_played_notes]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
version: 0.1
---

# Deleting Played Notes Keeps the Quantized Doodle

## INTENT
Let the player remove their playing without breaking the music it generated.

## THE RULE / LOGIC
Deleting a kept Jam session deletes its doodle in both forms. Deleting a session's played notes, for one session or every session, deletes the raw doodle notes and keeps the quantized doodle, which belongs to the music.

## TECHNICAL INTERFACE
Deletion of played notes removes raw doodle notes only.

## EXPECTATION
- After deleting a Jam session's played notes, its raw doodle notes are gone and its quantized doodle remains.
- After deleting a Jam session, neither form remains.
