---
id: rule_every_jam_phrase_carries_doodle
status: DRAFT
layer: BUSINESS
version: 0.2
type: RULE
priority: 1
human_name: Every Phrase of a Jam Carries the Steering Block
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
dependents: []
---

# Every Phrase of a Jam Carries the Steering Block

## INTENT
Keep the whole Jam in the doodle's shape, not only its first phrase.

## THE RULE / LOGIC
Every phrase of a Jam is generated with the steering block taken from its doodle and its drift, so the whole session keeps the doodle's shape; the doodle itself and the drift never reach the generator. Phrase 2 onward join the phrase before them as in any session; only phrase 1 joins the doodle. Every attempt for phrases 2 onward, the standalone attempt included, keeps the steering block, as it keeps the rhythm lock, since the block only orders candidates. The steering block does not depend on the key: the doodle's rhythm, directions and move sizes survive a change of Jam's key and mode, such as accepting a key and mode suggestion.

## TECHNICAL INTERFACE
Each Jam phrase's request holds the steering block and neither the doodle nor the drift.

## EXPECTATION
- Every phrase of a Jam, standalone attempts included, is generated with the steering block.
- No generation request holds the doodle or the drift.
- After a change of Jam's key and mode, phrases still follow the doodle's rhythm and moves.
