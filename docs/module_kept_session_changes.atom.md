---
id: module_kept_session_changes
status: DRAFT
type: MODULE
layer: ARCHITECTURE
version: 0.5
human_name: Kept Session Changes After Its Save
tags: [v3, release-v3.0, storage, review, session]
parents:
  - [[entity_kept_session_record]]
  - [[module_kept_session_save]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[req_favorite_phrases]]
  - [[req_kept_session_list]]
  - [[rule_failed_save_never_disturbs_session]]
  - [[rule_favorite_pins_session]]
  - [[rule_kept_played_notes_deletable]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_pinned_session_kept]]
  - [[rule_played_notes_kept_only_after_opt_in]]
  - [[rule_session_comment]]
priority: 1
dependents:
  - [[module_kept_session_reach]]
---

# Kept Session Changes After Its Save

## INTENT
Save every change the player makes to a kept session after that session's own save, as one all-or-none batch through the save policy, so that a session's records never disagree, nothing is written while the visit may not save, and a refused change never disturbs the player.

## THE RULE / LOGIC
Scope. This module covers every change made to a session after its own save at the session's end (module_kept_session_save): keeping or deleting one session's played notes, deleting every kept played note, a favorite mark, a pin or an unpin, the comment, and Delete session. A change is made from the session's review or, for a pin, an unpin and Delete session, from the session's row in the session list, whether the session is held in memory or not (module_kept_session_reach); either way it takes this path, and a change from the list reads and rewrites only what this path says, never the session's body. The session's own save, and its retry, stay with module_kept_session_save.

One batch per change. Every change is one batch of writes and deletes given to the storage port's apply through the save policy, never a direct write, so it is held while a session runs, refused in an outdated tab and checked against `meta` like any other write. The batch is all or none: the records it names are all changed, or none is.

Read at the change. As the session's own save reads the kept summaries at the save, each change reads what it rewrites at the change, through the save policy, once no session holds the saves and no flush is being applied, queued with the session saves: the session's session-wide record by its key, and its body for a favorite mark; for deleting every kept played note, the key of every stored played-notes record and every session-wide record with its key. The read and the batch are separate transactions, the same narrow window the session's own save accepts. The batch applies only the player's change to what was read, never facts held in memory, so a fact another tab changed since the load stays as that tab left it. A change whose session-wide record is no longer stored, or cannot be read, writes nothing and recreates nothing; the change holds in memory for the visit, so Delete session still takes the session out of memory. A read the device refuses applies nothing and is told as a refused change. Whether there are played notes to delete, which decides whether turning Keep my played notes off opens its confirmation, is read at the switch the same way; a refused read there opens no confirmation and is told as a refused change.

What each change rewrites. The session's session-wide record is always rewritten, with its played-notes-kept fact, its pinned fact, its favorites count and its comment as they are after the change. Keeping a session's played notes writes its played-notes record in the same batch, and deleting them deletes that record in the same batch, so the session-wide record and the played-notes record never disagree. The body is rewritten only for a favorite mark, the favorite marks living in the body. Delete session deletes the session-wide record, the body and the played-notes record together. Deleting every kept played note is one batch that deletes every stored played-notes record, the played notes of a session whose session-wide record cannot be read included, and rewrites every readable session-wide record that said its played notes were kept, now saying they are not; a session-wide record that cannot be read, and its body, are left as they are.

Turning Keep my played notes on. Turning the switch on keeps the played notes of the most recent session when that session is still held in memory with its played notes, is kept on the device and holds at least one played note, whichever session the Review shows; no other session gains played notes, theirs being no longer in memory.

Which session. A change names the session by its key, the one its own save minted, never a key rebuilt from the session's facts. A change made while that session's own save is still running waits for the save, through the same queue, and then applies to what it saved.

Saving off. While saving is off for the visit (an outdated tab, or a visit started from the defaults because the saved data could not be read), a change holds in memory for the visit only: nothing is read, written or deleted, no deletion is offered, and turning Keep my played notes off asks nothing.

A refused change. Keeping a session's played notes, a favorite mark, a pin or an unpin, and the comment change memory at once and are saved after. When the browser refuses one, it stays in memory for the visit, as the player made it, and its refusal goes to the save policy's failure listener, so the workspace's notice row tells it once the player is back at Idle; it never interrupts a session. A deletion confirmed in its sheet (one session's played notes, every kept played note, Delete session) changes memory only once the device has made it. When the browser refuses it, nothing changes in memory either, and only its sheet tells it, its confirming action staying to try again; the notice row never does. A deletion already under way finishes even if the player closes its sheet meanwhile. Both differ from the session's own save, whose refusal only the session's keep line tells.

Persistent storage. A favorite mark and a pin each ask the save policy for persistent storage; the policy asks the browser at most once per visit.

Memory. A change also changes the session list's rows held in memory, as module_kept_session_reach says. A deletion changes the sessions held in memory, never the controller's closed history of the last session that ended, which is kept for debugging only, never shown or stored: it still holds that session's played notes until the next session ends.

A session whose own save failed. A session held in memory because its own save was refused is never changed through this path. Its next favorite, pin, unpin or comment instead runs the session's own save again, with the session's facts as they are at that moment, as the same batch the session's end would have built, under the same key, and with the unpinned kept sessions to delete read at the retry. When the retry succeeds, the keep line takes its pinned or not-pinned wording; a failed retry changes nothing shown.

A session whose own save was abandoned. A session whose own save the page's going away abandoned (module_kept_session_save) is never changed through this path and never saved again, not even when the browser brings the page back: its favorite, pin, unpin and comment hold in memory for the visit only.

## TECHNICAL INTERFACE
The change path is in src/components/workspace/kept-session-changes.ts (keeping or deleting one session's played notes, deleting every kept played note, and the count read at the switch) and src/components/workspace/kept-session-review-changes.ts (a favorite mark, a pin or an unpin, the comment and Delete session). Each change is a KeptChanges, a function from a KeptRecordsReader (read(store, key), readKeyed(store), readKeys(store)) to the StorageChange list to apply, run through the visit's saves (src/storage/settings-saver.ts), which reach the save policy's changeKept(changes, refusal) and readKept(read, refusal) (src/storage/save-policy-kept-changes.ts, through src/storage/save-policy.ts; module_save_policy); the plain save(changes), which reads nothing, is not used for these changes. The refusal is 'notice', told to the failure listener, or 'caller', resolved to the caller alone, which the deletions use. A change resolves a KeptChangeOutcome: saved; unchanged, when what it would change is no longer stored or cannot be read; refused, with its kind; or saving off. The port's keys-only read, readKeys(store) (module_on_device_database), lists the stored played-notes records, so deleting every played note never reads one. A kept session's records are encoded again after its save by rewriteKeptSummary (src/storage/records/kept-session-summary.ts) and rewriteKeptBodyFavorite (src/storage/records/kept-session-record.ts) (entity_kept_session_record), the codec loaded on demand. The session controller holds each session's facts in memory and calls the change path, at Idle only, for a session held in memory or, for a pin, an unpin and Delete session, for any listed kept session (module_kept_session_reach), through createKeptPlayedNotes (src/components/workspace/workspace-kept-played-notes.ts) and createKeptSessionEdits (src/components/workspace/workspace-kept-session-edits.ts). The latter retries a refused own save through saveEndedSession (src/components/workspace/workspace-session-save.ts), told of the refusal by the session's end through saveRefused (src/components/workspace/workspace-session-ends.ts), and asks for persistent storage through requestProtection on the kept-sessions seam (src/components/workspace/workspace-kept-sessions-seam.ts).

## EXPECTATION
- Every change made to a kept session after its save reaches the port as one batch through the save policy, held while a session runs and refused in an outdated tab.
- Each change rewrites the session-wide record; keeping or deleting played notes writes or deletes the played-notes record in the same batch; only a favorite mark rewrites the body; Delete session deletes all three records.
- Deleting every kept played note is one batch: every stored played-notes record is deleted, an unreadable session's included; every readable session-wide record that said they were kept now says they are not; an unreadable session-wide record and its body are left untouched.
- A change keeps every fact another tab stored since the load: only the player's change is applied to the records read at the change.
- A change to a session no longer stored writes nothing and recreates nothing.
- Turning Keep my played notes off offers the deletion when played notes are stored, as read at the switch, whichever tab kept them.
- An injected failure of a change's batch, other than a deletion's, leaves every stored record as it was, keeps the change in memory, and raises the notice row once the player is back at Idle.
- A refused deletion changes nothing stored or in memory and is told by its sheet only, never by the notice row; a deletion under way finishes even if its sheet is closed.
- Delete session on a session whose session-wide record is no longer stored, or cannot be read, writes nothing, and the session leaves memory.
- Turning Keep my played notes on keeps the played notes of the most recent session still held in memory, when it is kept on the device and holds a played note.
- A change made while the session's own save is still running applies after it, under the key that save minted.
- While saving is off, a change holds for the visit: nothing is read, written or deleted, no deletion is offered, and turning Keep my played notes off asks nothing.
- In a session whose own save failed, a favorite, pin, unpin or comment runs the session's own save again with the facts as they are then; on success the keep line takes its pinned or not-pinned wording, and a failed retry changes nothing shown.
- A pin, an unpin and Delete session made from the session list to a kept session not held in memory take this path, keyed by the row, and never read the session's body.
- A change to a session whose own save was abandoned as the page went away holds in memory only: nothing is read, written or retried.
