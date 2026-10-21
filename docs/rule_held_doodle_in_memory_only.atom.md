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
version: 0.2
human_name: A Kept Doodle Lives in Memory Only
---

# A Kept Doodle Lives in Memory Only

## INTENT
Keep the kept doodle a convenience of the visit, not something saved.

## THE RULE / LOGIC
A kept doodle is never saved. After a reload the app opens in session mode and keeps no doodle; a kept Jam session's review offers its doodle again through Jam again on this doodle.

## TECHNICAL INTERFACE
The kept doodle is page state only.

## EXPECTATION
- After a reload no doodle is kept, and a kept Jam session's review offers Jam again on this doodle.
