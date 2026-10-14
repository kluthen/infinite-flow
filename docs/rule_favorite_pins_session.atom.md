---
id: rule_favorite_pins_session
status: DRAFT
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, storage, favorites]
dependents:
  - [[rule_new_session_never_asks_about_favorites]]
version: 0.3
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
From v3.0, marking a favorite pins its session, so the session and its favorites stay kept until the player unpins or deletes it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning. A favorite goes only with its session. Removing a session's last favorite never unpins it; the player unpins it explicitly. Unpinning a session that holds favorites asks for confirmation first, since the session and its favorites will then be deleted when the next session is saved.

## TECHNICAL INTERFACE
Marking a favorite sets the session's pin; unpinning a session with favorites asks for confirmation.

## EXPECTATION
- Marking a favorite pins its session.
- Removing a session's last favorite leaves the session pinned.
- Unpinning a session that holds favorites asks for confirmation.
- A favorite goes only with its session: when the player deletes that session, unpins it and a later session is saved, or deletes or changes the range or transposition of the my instrument it was played with.
