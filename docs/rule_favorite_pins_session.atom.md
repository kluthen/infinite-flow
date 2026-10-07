---
id: rule_favorite_pins_session
status: DRAFT
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, storage, favorites]
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: removing a session's last favorite never unpins it. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
  - [[rule_new_session_never_asks_about_favorites]]
version: 0.2
priority: 1
human_name: A Favorite Pins Its Session
parents:
  - [[req_favorite_phrases]]
  - [[rule_pinned_session_kept]]
---

# A Favorite Pins Its Session

## INTENT
Never lose a favorite by starting a new session.

## THE RULE / LOGIC
From v3.0, marking a favorite pins its session, so the session and its favorites stay kept until the player unpins or deletes it. Removing a session's last favorite never unpins it; the player unpins it explicitly. Unpinning a session that holds favorites asks for confirmation first, since the session and its favorites will then be deleted when the next session is saved.

## TECHNICAL INTERFACE
Marking a favorite sets the session's pin; unpinning a session with favorites asks for confirmation.

## EXPECTATION
- Marking a favorite pins its session.
- Removing a session's last favorite leaves the session pinned.
- Unpinning a session that holds favorites asks for confirmation.
