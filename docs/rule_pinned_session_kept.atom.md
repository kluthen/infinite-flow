---
id: rule_pinned_session_kept
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
human_name: Pinned Session Kept Until the Player Removes It
tags: [v3, release-v3.0, storage, review]
parents:
  - [[req_kept_sessions]]
priority: 1
dependents:
  - [[module_kept_session_changes]]
  - [[module_kept_session_reach]]
  - [[rule_favorite_pins_session]]
---

# Pinned Session Kept Until the Player Removes It

## INTENT
Let the player keep a session for good.

## THE RULE / LOGIC
From v3.0, the player can pin a kept session. A pinned session stays kept until the player unpins or deletes it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning; saving a new session never removes it. There is no limit on the number of pinned sessions, and the app never deletes one by itself, not even to make room when storage is full: Your data shows the space they use.

## TECHNICAL INTERFACE
A pin or unpin action on each kept session; pinned sessions are removed only by the player.

## EXPECTATION
- A pinned session survives any number of later sessions and reloads until the player unpins or deletes it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition.
- No pinned session is ever deleted without the player's action.
