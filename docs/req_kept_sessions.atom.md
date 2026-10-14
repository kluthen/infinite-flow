---
id: req_kept_sessions
status: DRAFT
parents:
  - [[req_on_device_storage]]
  - [[req_rolling_practice_session]]
dependents:
  - [[req_kept_session_list]]
  - [[req_kept_session_review]]
  - [[rule_earlier_kept_sessions_carried_over]]
  - [[rule_kept_session_content]]
  - [[rule_most_recent_session_kept]]
  - [[rule_pinned_session_kept]]
  - [[rule_played_notes_kept_only_after_opt_in]]
  - [[rule_preset_label_kept_with_session]]
type: REQUIREMENT
layer: BUSINESS
version: 0.3
tags: [v3, release-v3.0, storage, review]
priority: 1
human_name: Kept Sessions
---

# Kept Sessions

## INTENT
Let the player come back to the sessions they played, after a reload and across visits.

## THE RULE / LOGIC
From v3.0, sessions are kept on the device: the most recent session is kept automatically, and any session the player pins is kept until they unpin or delete it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning. Only one session is ever kept without the player asking for it. Every kept session, the most recent one and the pinned ones alike, belongs to the instrument it was played with, named by its id in the session's own record. Only My instrument can be changed or deleted, so only its sessions are ever touched: deleting My instrument deletes every kept session played with it, with their favorites, comments and played notes, and so does saving a change to its written range or transposition, each after a warning; a change of its name or clef keeps them. When one of them is the session on screen, its review closes exactly as when the player deletes that session; the session that just ended, when played with My instrument, also leaves memory, and its review can no longer be reached. A kept session can be found in a list of kept sessions and reopened in its review. The player's own played notes are kept with a session only after the player opts in.

## TECHNICAL INTERFACE
Kept sessions live in the device's store and are reached through the list of kept sessions.

## EXPECTATION
- The most recent session, and every pinned session, survive a reload.
- Right after a new session is saved, it is the only kept session that is not pinned.
- Deleting My instrument, or saving a change to its range or transposition, deletes exactly the kept sessions played with it, after a warning; no session of another instrument is touched, and a change of its name or clef deletes none.
