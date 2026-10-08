---
id: rule_kept_played_notes_deletable
status: DRAFT
priority: 1
human_name: Kept Played Notes Can Be Deleted
type: RULE
version: 0.1
tags: [v3, release-v3.0, storage, midi, privacy, changes-in-v3.2]
parents:
  - [[rule_played_notes_kept_only_after_opt_in]]
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): deleting played notes deletes the raw doodle notes and keeps the quantized doodle (rule_deleting_played_notes_keeps_quantized_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
layer: BUSINESS
---

# Kept Played Notes Can Be Deleted

## INTENT
Let the player remove their kept played notes without losing their sessions.

## THE RULE / LOGIC
From v3.0, the player can delete the kept played notes of one session, or of every session, without deleting the sessions themselves. Turning Keep my played notes off offers to delete the played notes already kept.

## TECHNICAL INTERFACE
Per-session and all-sessions played-note deletion; turning the switch off offers the all-sessions deletion.

## EXPECTATION
- Deleting one session's played notes, or every session's, removes those played notes and nothing else.
- Turning the switch off offers to delete the played notes already kept.
