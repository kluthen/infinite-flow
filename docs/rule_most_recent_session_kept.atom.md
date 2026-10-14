---
id: rule_most_recent_session_kept
status: DRAFT
parents:
  - [[req_kept_sessions]]
dependents:
  - [[module_kept_session_save]]
layer: BUSINESS
version: 0.3
type: RULE
priority: 1
human_name: Most Recent Session Kept Automatically
tags: [v3, release-v3.0, storage, review]
---

# Most Recent Session Kept Automatically

## INTENT
Keep the session the player just played without them having to ask.

## THE RULE / LOGIC
From v3.0, a session that sounded at least one phrase is saved when it ends and its review opens, and it survives a reload. When a new session is saved this way, every kept session that is not pinned is deleted, including one the player unpinned earlier. Until then the most recent session goes only when the player deletes it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning; when it goes that way, the session that just ended leaves memory with it, and its review can no longer be reached. The next session saved is kept as the most recent one, as always. A session that ends during its count-in produces no review and changes nothing that is kept.

## TECHNICAL INTERFACE
Each session end that opens a review saves that session as the most recent one and removes every other kept session that is not pinned.

## EXPECTATION
- The most recent session survives a reload and opens in its review.
- Saving a new session deletes every kept session that is not pinned, including one unpinned earlier, and keeps every pinned session.
- A session ended during its count-in changes nothing that is kept.
- A most recent session played with My instrument is deleted, after a warning, when the player deletes My instrument or saves a change to its range or transposition, and its review can no longer be reached.
