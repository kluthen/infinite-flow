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
notes: Revised 2026-10-12 to version 0.2 (previous version 0.1) on the owner's rulings of 2026-10-12, spec D295 and D296, master spec Part A v1.10 (section 5.1), relayed to documentalist: a pinned session also goes when the player deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning. Both are the player's own confirmed actions, so the app still never deletes a pinned session by itself. Status unchanged (DRAFT). Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
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
