---
id: rule_held_doodle_dropped_on_change
status: REVIEW
dependents:
  - [[module_kept_doodle]]
layer: BUSINESS
human_name: How Long Jam Mode Keeps a Doodle
tags: [v3, release-v3.2, session, jam, idle]
parents:
  - [[rule_jam_again_on_this_doodle]]
type: RULE
version: 0.4
priority: 1
---

# How Long Jam Mode Keeps a Doodle

## INTENT
Keep the player's doodle ready for another Jam until they choose otherwise.

## THE RULE / LOGIC
After every Jam that reached phrase 1, Jam mode keeps that Jam's doodle, the kept doodle, for the next Jam. The kept doodle goes only when the player asks for a new doodle, an explicit action at Jam mode's Idle, after which Idle shows no phrase and the next Jam captures a new doodle; when the player leaves Jam mode; or when the kept Jam session it comes from is deleted, since deleted data is gone and a later Jam cannot put it back into a kept session. That session is deleted by the player's deletion of one session, by Delete everything, or by deleting my instrument or saving a change to its written range or transposition, which erase the sessions played with my instrument; a doodle whose session was played with another instrument stays. The session a kept doodle comes from is the latest session played on it: a Jam on the kept doodle keeps the same doodle in its own session, so when that Jam's session replaces an earlier unpinned one, the doodle stays. Every other change keeps it, a change of my instrument's name or clef included. Its key and mode suggestion goes with it.

## TECHNICAL INTERFACE
A new-doodle action at Jam mode's Idle lets the kept doodle go.

## EXPECTATION
- After a Jam that reached phrase 1, its doodle is kept at Jam mode's Idle.
- The kept doodle goes only on a new doodle, on leaving Jam mode, or when the latest kept session played on it is deleted: by the player's deletion of that session, by Delete everything, or by deleting my instrument or saving a change to its written range or transposition when that session was played with my instrument.
- A kept doodle whose session was played with another instrument stays through my instrument's deletion and through a change of its range or transposition; a change of its name or clef keeps any kept doodle.
- When a Jam on the kept doodle replaces an earlier unpinned session, the doodle stays kept.
