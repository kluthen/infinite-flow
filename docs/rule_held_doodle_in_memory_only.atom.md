---
id: rule_held_doodle_in_memory_only
status: DRAFT
tags: [v3, release-v3.2, session, jam, storage]
parents:
  - [[rule_jam_again_on_this_doodle]]
priority: 1
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
human_name: A Held Doodle Lives in Memory Only
---

# A Held Doodle Lives in Memory Only

## INTENT
Keep the held doodle a short-lived convenience, not something saved.

## THE RULE / LOGIC
A held doodle is never saved. After a reload Idle holds none; the kept Jam session's review offers it again.

## TECHNICAL INTERFACE
The held doodle is page state only.

## EXPECTATION
- After a reload no doodle is held, and the kept Jam session's review offers Jam again on this doodle.
