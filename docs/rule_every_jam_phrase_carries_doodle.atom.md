---
id: rule_every_jam_phrase_carries_doodle
status: DRAFT
layer: BUSINESS
version: 0.1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
priority: 1
human_name: Every Phrase of a Jam Carries the Doodle
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
dependents: []
---

# Every Phrase of a Jam Carries the Doodle

## INTENT
Keep the whole Jam in the doodle's shape, not only its first phrase.

## THE RULE / LOGIC
Every phrase of a Jam carries the doodle and the drift as generation inputs, so the whole session keeps its shape. Phrase 2 onward join the phrase before them as in any session; only phrase 1 joins the doodle. Every attempt for phrases 2 onward, the standalone attempt included, keeps the doodle's preferences. The doodle is independent of the key: its rhythm, its directions and its move sizes survive a key or mode change made by Vary settings during the Jam.

## TECHNICAL INTERFACE
Each Jam phrase's request holds the quantized doodle and the drift.

## EXPECTATION
- Every phrase of a Jam, standalone attempts included, is generated with the doodle and the drift.
- After a key or mode change, later phrases still follow the doodle's rhythm and moves.
