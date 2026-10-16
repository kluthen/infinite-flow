---
id: rule_most_recent_session_kept
status: STABLE
parents:
  - [[req_kept_sessions]]
dependents:
  - [[module_kept_session_reach]]
  - [[module_kept_session_save]]
  - [[service_session_end]]
layer: BUSINESS
version: 0.6
type: RULE
priority: 1
human_name: Most Recent Session Kept Automatically
tags: [v3, release-v3.0, storage, review]
---

# Most Recent Session Kept Automatically

## INTENT
Keep the session the player just played without them having to ask.

## THE RULE / LOGIC
From v3.0, a session that sounded at least one phrase is saved when it ends and its review opens, and it survives a reload. A session cut short by closing or reloading the page, or by leaving it for another address, is not saved and changes nothing that is kept, even when the browser brings the page back from its back-forward cache, where that session's review says it is not saved. A session that starts after the page is brought back is saved as any other. After a reload, the most recent session is the readable kept session that started last. When a new session is saved this way, every other kept session that is not pinned is deleted, including one the player unpinned earlier, and so is every kept session the app cannot read correctly because its records are damaged, pinned or not; the player then gets an apology. A kept session saved by a newer version is never deleted, and when the device refuses to read the kept sessions at that save, nothing is deleted. Until then the most recent session goes only when the player deletes it, or deletes the my instrument it was played with or saves a change to that instrument's range or transposition, each after a warning, or when the app finds it damaged; when the player's action removes it, the session that just ended leaves memory with it, and its review can no longer be reached. When the app finds the most recent session damaged, when the saved data loads or when the player opens it, while it is kept on the device and not yet opened or played in this visit, it is deleted, with an apology, and the most recent session becomes at once the readable kept session that started last, or there is none; after the player's own deletion there is none until the next session ends with a review. The next session saved is kept as the most recent one, as always. A session that ends during its count-in produces no review and changes nothing that is kept.

## TECHNICAL INTERFACE
Each session end that opens a review saves that session as the most recent one and removes every other kept session that is not pinned and every damaged one, never one a newer version saved, and none when the read of the kept sessions is refused, unless the page is going away (closed, reloaded or left), when nothing is saved or removed.

## EXPECTATION
- The most recent session survives a reload and opens in its review.
- Saving a new session deletes every other kept session that is not pinned, including one unpinned earlier, and every damaged kept session, with an apology; it keeps every readable pinned session and every session a newer version saved; a refused read deletes nothing.
- A session ended during its count-in changes nothing that is kept.
- A most recent session played with My instrument is deleted, after a warning, when the player deletes My instrument or saves a change to its range or transposition, and its review can no longer be reached.
- After a reload, the most recent session is the readable kept session that started last.
- A session cut short by closing, reloading or leaving the page is not saved and deletes no kept session, even when the page is brought back; a session played after the page is brought back is saved.
- When the most recent session, kept on the device and not yet opened, is found damaged at load or when opened, it is deleted with an apology, and the readable kept session that started last becomes the most recent at once, or there is none.
