---
id: rule_held_doodle_dropped_on_change
status: DRAFT
dependents: []
layer: BUSINESS
human_name: How Long Jam Mode Keeps a Doodle
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
type: RULE
version: 0.3
priority: 1
---

# How Long Jam Mode Keeps a Doodle

## INTENT
Keep the player's doodle ready for another Jam until they choose otherwise.

## THE RULE / LOGIC
After every Jam that reached phrase 1, Jam mode keeps that Jam's doodle, the kept doodle, for the next Jam. The kept doodle goes only when the player asks for a new doodle, an explicit action at Jam mode's Idle, after which Idle shows no phrase and the next Jam captures a new doodle; when the player leaves Jam mode; or when the player deletes the kept Jam session it comes from, one session or by Delete everything, since deleted data is gone and a later Jam cannot put it back into a kept session. The session a kept doodle comes from is the latest session played on it: a Jam on the kept doodle keeps the same doodle in its own session, so when that Jam's session replaces an earlier unpinned one, the doodle stays. Every other change keeps it. Its key and mode suggestion goes with it.

## TECHNICAL INTERFACE
A new-doodle action at Jam mode's Idle lets the kept doodle go.

## EXPECTATION
- After a Jam that reached phrase 1, its doodle is kept at Jam mode's Idle.
- The kept doodle goes only on a new doodle, on leaving Jam mode, or when the player deletes the latest kept session played on it.
- When a Jam on the kept doodle replaces an earlier unpinned session, the doodle stays kept.
