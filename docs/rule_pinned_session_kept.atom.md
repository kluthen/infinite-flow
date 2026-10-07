---
id: rule_pinned_session_kept
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Pinned Session Kept Until the Player Removes It
tags: [v3, release-v3.0, storage, review]
parents:
  - [[req_kept_sessions]]
priority: 1
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
  - [[rule_favorite_pins_session]]
---

# Pinned Session Kept Until the Player Removes It

## INTENT
Let the player keep a session for good.

## THE RULE / LOGIC
From v3.0, the player can pin a kept session. A pinned session stays kept until the player unpins or deletes it; saving a new session never removes it. There is no limit on the number of pinned sessions, and the app never deletes one by itself, not even to make room when storage is full: Your data shows the space they use.

## TECHNICAL INTERFACE
A pin or unpin action on each kept session; pinned sessions are removed only by the player.

## EXPECTATION
- A pinned session survives any number of later sessions and reloads until the player unpins or deletes it.
- No pinned session is ever deleted without the player's action.
