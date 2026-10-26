---
id: rule_earlier_sessions_open_without_doodle
status: DRAFT
parents:
  - [[rule_quantized_doodle_is_generation_input]]
dependents:
  - [[module_kept_session_jam_upgrade_step]]
version: 0.1
priority: 1
tags: [v3, release-v3.2, jam, storage, review]
type: RULE
layer: BUSINESS
human_name: Sessions Kept Before v3.2 Open as Before
---

# Sessions Kept Before v3.2 Open as Before

## INTENT
Keep every session kept by an earlier version reviewable exactly as before.

## THE RULE / LOGIC
Sessions kept by an earlier version have no doodle and open as before. They are carried over to v3.2's kept-session layout when the on-device database first opens with v3.2, never when a session is read, with no doodle and otherwise unchanged.

## TECHNICAL INTERFACE
Kept sessions from before v3.2 are carried over when the database opens.

## EXPECTATION
- A session kept before v3.2 reviews and exports exactly as before, with no doodle section.
- It is carried over when the database opens, never when it is read.
