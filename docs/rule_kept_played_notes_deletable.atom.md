---
id: rule_kept_played_notes_deletable
status: STABLE
priority: 1
human_name: Kept Played Notes Can Be Deleted
type: RULE
version: 0.2
tags: [v3, release-v3.0, storage, midi, privacy, changes-in-v3.2]
parents:
  - [[rule_played_notes_kept_only_after_opt_in]]
dependents:
  - [[module_kept_session_changes]]
layer: BUSINESS
---

# Kept Played Notes Can Be Deleted

## INTENT
Let the player remove their kept played notes without losing their sessions.

## THE RULE / LOGIC
From v3.0, the player can delete the kept played notes of one session, or of every session, without deleting the sessions themselves. Turning Keep my played notes off offers to delete the played notes already kept. A Jam session's raw doodle notes are played notes and are deleted with them; its quantized doodle belongs to the music and stays.

## TECHNICAL INTERFACE
Per-session and all-sessions played-note deletion; turning the switch off offers the all-sessions deletion.

## EXPECTATION
- Deleting one session's played notes, or every session's, removes those played notes, a Jam's raw doodle notes included, and nothing else; a Jam session keeps its quantized doodle.
- Turning the switch off offers to delete the played notes already kept.
