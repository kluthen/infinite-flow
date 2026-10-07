---
id: req_kept_sessions
status: DRAFT
parents:
  - [[req_on_device_storage]]
  - [[req_rolling_practice_session]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
  - [[req_kept_session_list]]
  - [[req_kept_session_review]]
  - [[rule_kept_session_content]]
  - [[rule_most_recent_session_kept]]
  - [[rule_pinned_session_kept]]
  - [[rule_played_notes_kept_only_after_opt_in]]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.0, storage, review]
priority: 1
human_name: Kept Sessions
---

# Kept Sessions

## INTENT
Let the player come back to the sessions they played, after a reload and across visits.

## THE RULE / LOGIC
From v3.0, sessions are kept on the device: the most recent session is kept automatically, and any session the player pins is kept until they unpin or delete it. Only one session is ever kept without the player asking for it. A kept session can be found in a list of kept sessions and reopened in its review. The player's own played notes are kept with a session only after the player opts in.

## TECHNICAL INTERFACE
Kept sessions live in the device's store and are reached through the list of kept sessions.

## EXPECTATION
- The most recent session, and every pinned session, survive a reload.
- At most one unpinned session is kept at any time.
