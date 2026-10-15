---
id: module_kept_session_reach
status: DRAFT
layer: ARCHITECTURE
version: 0.1
parents:
  - [[module_kept_session_changes]]
  - [[module_kept_session_save]]
  - [[module_saved_data_loader]]
  - [[req_kept_session_list]]
  - [[req_kept_session_review]]
  - [[rule_favorite_pins_session]]
  - [[rule_most_recent_session_kept]]
  - [[rule_outdated_tab_reads_what_it_can]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_persistent_storage_requested]]
  - [[rule_pinned_session_kept]]
  - [[service_session_controller]]
dependents: []
priority: 1
human_name: Kept Sessions Reached Beyond Memory
tags: [v3, release-v3.0, storage, review, session]
type: MODULE
---

# Kept Sessions Reached Beyond Memory

## INTENT
Let the session controller reach every kept session, not only those it holds in memory: open any kept session by its key, pin, unpin or delete one from its row without reading its body, and hold in memory the rows the session list shows, kept current for the whole visit, so the list shows at once.

## THE RULE / LOGIC
The rows in memory. The kept sessions' rows come from the summaries the saved-data load reads with the settings, before the first draw, each with its key. A summary this version reads gives a row with its facts: the session's start, its length, its phrase count, its musical profile, the instrument it was played with under the name it was played under, whether it is pinned, its favorites count, whether its played notes are kept, and its comment. A summary a newer version wrote gives a row marked as saved by a newer version, holding what this version can read of it; it cannot be opened, pinned or deleted. A summary that cannot be read gives no row and is not counted. A visit started from the defaults has no row. The rows are held for the visit, newest first by start, and never read from the device again: every save, change and deletion of the visit keeps them current. A session's own save that succeeds, at its end or by its retry, adds that session's row and removes the rows of the sessions it deleted; a refused save, or an end while saving is off, adds and removes none, so a session held in memory only has no row. A pin, an unpin, a favorite mark (its count, and the pin a mark brings), the comment, keeping or deleting one session's played notes, and deleting every kept played note change the rows they concern at once, as they change the sessions held in memory, and stay so for the visit when the device refuses them. A deletion of kept sessions removes their rows only once the device has made it; a refused deletion leaves them. Whether at least one row exists decides whether the list is offered.

Opening any kept session by its key. At Idle only, the controller opens a kept session by its row's key. A session already held in memory under that key shows at once. Otherwise its records are read by its key through the kept sessions' read, the opening shown as under way for that key; once read, the session is held in memory and its review shows, as the most recent session's does after a reload, and when the key is the most recent session's it is held as the most recent session too. One opening is pending at a time: a new opening replaces the pending one, whose read then shows nothing when it settles (the latest press wins); leaving the review mode cancels the pending opening the same way. A read that does not give the session (the device refuses or fails it, or the session is no longer stored) shows no review and marks that row as failed to open, until the session next opens; nothing is deleted. Review last session's read of the most recent kept session, when it fails so, shows no review either: the list shows instead, that session's row marked as failed to open, focus on the list's title. A damaged session found at an opening is deleted instead, with an apology; until that deletion is built, a session whose records this version cannot read takes the failed-to-open path too. The review draws one session at a time: opening another replaces the one it drew, which stays held in memory only while it is the most recent session.

Pin, unpin and delete of a session not held. Pin, unpin and Delete session apply to any listed kept session, held in memory or not, named by its row's key, at Idle only, through the path that changes a kept session after its save (module_kept_session_changes): what it rewrites is read at the change, and the change is one batch through the save policy; the session's body is never read for them. A pin or an unpin changes the row at once, and the held session too when it is held, then is saved; a refusal is told by the notice row and the change stays for the visit; while saving is off it holds for the visit only. A pin asks the save policy for persistent storage, as a pin from the review does. Unpinning a session that holds favorites asks first, from the list as from the review, the list reading the favorites count from the row. Delete session of a session not held deletes its records in one batch, then its row; a refusal changes nothing and is told to its caller alone; it is not offered while saving is off. Deleting the most recent session leaves no most recent session until the next session ends with a review. A row saved by a newer version offers none of these changes.

A deletion whose sheet is closed. A deletion under way finishes even if the player closes its confirmation meanwhile, and resolves its outcome to its caller either way. When it ends, the screen changes as after the same deletion confirmed with its sheet open, with no message. Focus that still sits on a control the deletion removed moves by that deletion's own rule: after Delete session in a review, to the list's title; after a row's Delete, to the next row's opening button, else the previous row's, else the list's title; focus anywhere else stays where the player put it. A refused deletion moves nothing.

## TECHNICAL INTERFACE
Decided, not built yet. The rows are held beside the session controller, built from the kept-sessions seam's summaries (KeptSessionsSeam.summaries, src/components/workspace/workspace-kept-sessions-seam.ts) by a new src/components/workspace/use-kept-sessions.ts, decoded with decodeKeptSessionSummary (src/storage/records/kept-session-summary.ts), and kept current by the controller's own saves and changes. The controller (src/components/workspace/workspace-session-controller.ts and workspace-session-controller-types.ts; service_session_controller) gains an opening by key beside showReview(), reading through readKeptReviewedSession (src/components/workspace/workspace-kept-session-read.ts) and telling a failed read apart from an opening replaced or cancelled; its state exposes the rows, the key whose opening is under way and the rows whose opening failed. setPinned and deleteSession (src/components/workspace/workspace-kept-session-edits.ts), which today throw for a session not held in memory, accept any listed key and reach changeKeptPinned and deleteKeptSession (src/components/workspace/kept-session-review-changes.ts) for it. The list (src/components/review/SessionList.vue and SessionRow.vue), its links (SessionCueRow.vue, use-review-navigation.ts) and the focus after a deletion (src/components/workspace/ReviewArea.vue) read them. Function names and signatures are left to the implementation.

## EXPECTATION
- The list's rows show at once, with no read, from the summaries the load read; a summary that cannot be read has no row and is not counted; one a newer version wrote has a row that cannot be opened, pinned or deleted.
- After each save, change and deletion of the visit, the rows match what is kept: a successful session save adds its row and removes those it deleted; a refused save or one made while saving is off adds none; a refused pin stays on its row for the visit; a refused deletion leaves its row.
- Any listed kept session opens by its key: its review shows once read; a later opening replaces a pending one, and leaving the review mode cancels it; a read the device refuses shows no review and marks the row as failed to open.
- Review last session whose read the device refuses shows the list, that session's row marked as failed to open, focus on the list's title.
- Pin, unpin and Delete session work on a kept session not held in memory, through one batch each, with no body read; unpinning one with favorites asks first.
- A deletion whose sheet the player closed while it ran finishes; focus moves only if it sat on a control the deletion removed, and a refusal moves nothing.
