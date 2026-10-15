---
id: module_kept_session_changes
status: DRAFT
type: MODULE
layer: ARCHITECTURE
version: 0.2
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
dependents: []
---

# Kept Session Changes After Its Save

## INTENT
Save every change the player makes to a kept session after that session's own save, as one all-or-none batch through the save policy, so that a session's records never disagree, nothing is written while the visit may not save, and a refused change never disturbs the player.

## THE RULE / LOGIC
Scope. This module covers every change made to a session after its own save at the session's end (module_kept_session_save): keeping or deleting one session's played notes, deleting every kept played note, a favorite mark, a pin or an unpin, the comment, and Delete session. The session's own save, and its retry, stay with module_kept_session_save.

One batch per change. Every change is one batch of writes and deletes given to the storage port's apply through the save policy, never a direct write, so it is held while a session runs, refused in an outdated tab and checked against `meta` like any other write. The batch is all or none: the records it names are all changed, or none is.

Read at the change. As the session's own save reads the kept summaries at the save, each change reads what it rewrites at the change, through the save policy, once no session holds the saves and no flush is being applied, queued with the session saves: the session's session-wide record by its key, and its body for a favorite mark; for deleting every kept played note, the key of every stored played-notes record and every session-wide record with its key. The read and the batch are separate transactions, the same narrow window the session's own save accepts. The batch applies only the player's change to what was read, never facts held in memory, so a fact another tab changed since the load stays as that tab left it. A change whose session-wide record is no longer stored, or cannot be read, writes nothing and recreates nothing; the change holds in memory for the visit. A read the device refuses applies nothing and is told as a refused change. Whether there are played notes to delete, which decides whether turning Keep my played notes off opens its confirmation, is read at the switch the same way.

What each change rewrites. The session's session-wide record is always rewritten, with its played-notes-kept fact, its pinned fact, its favorites count and its comment as they are after the change. Keeping a session's played notes writes its played-notes record in the same batch, and deleting them deletes that record in the same batch, so the session-wide record and the played-notes record never disagree. The body is rewritten only for a favorite mark, the favorite marks living in the body. Delete session deletes the session-wide record, the body and the played-notes record together. Deleting every kept played note is one batch that deletes every stored played-notes record, the played notes of a session whose session-wide record cannot be read included, and rewrites every readable session-wide record that said its played notes were kept, now saying they are not; a session-wide record that cannot be read, and its body, are left as they are.

Which session. A change names the session by its key, the one its own save minted, never a key rebuilt from the session's facts. A change made while that session's own save is still running waits for the save, through the same queue, and then applies to what it saved.

Saving off. While saving is off for the visit (an outdated tab, or a visit started from the defaults because the saved data could not be read), a change holds in memory for the visit only: nothing is read, written or deleted, no deletion is offered, and turning Keep my played notes off asks nothing.

A refused change. A change the browser refuses stays in memory for the visit, as the player made it. Its refusal goes to the save policy's failure listener, so the workspace's notice row tells it once the player is back at Idle; it never interrupts a session. This differs from the session's own save, whose refusal only the session's keep line tells.

A session whose own save failed. A session held in memory because its own save was refused is never changed through this path. Its next favorite, pin, unpin or comment instead runs the session's own save again, with the session's facts as they are at that moment, as the same batch the session's end would have built, under the same key, and with the unpinned kept sessions to delete read at the retry. When the retry succeeds, the keep line takes its pinned or not-pinned wording; a failed retry changes nothing shown.

## TECHNICAL INTERFACE
The change path sits beside the session's save in src/components/workspace/workspace-session-save.ts, or in a new module beside it if it outgrows that file, and reaches the database only through a save-policy call, beside saveSession, that reads at the change and applies the batch built from what it read, a list of StorageChange writes and deletes for the port's apply (module_save_policy); the plain save(changes), which reads nothing, is not used for these changes. The port may gain a keys-only read of a store (module_on_device_database), so deleting every played note never reads every played note. A kept session's records are encoded again after its save through src/storage/records/kept-session-record.ts (entity_kept_session_record). The session controller (src/components/workspace/workspace-session-controller.ts and its types) holds each session's facts in memory, for the session that ended in this visit and for a kept session read by its key, and calls the change path; the retry of a failed save runs the session's own save again (saveEndedSession). Function names and signatures are left to the implementation.

## EXPECTATION
- Every change made to a kept session after its save reaches the port as one batch through the save policy, held while a session runs and refused in an outdated tab.
- Each change rewrites the session-wide record; keeping or deleting played notes writes or deletes the played-notes record in the same batch; only a favorite mark rewrites the body; Delete session deletes all three records.
- Deleting every kept played note is one batch: every stored played-notes record is deleted, an unreadable session's included; every readable session-wide record that said they were kept now says they are not; an unreadable session-wide record and its body are left untouched.
- A change keeps every fact another tab stored since the load: only the player's change is applied to the records read at the change.
- A change to a session no longer stored writes nothing and recreates nothing.
- Turning Keep my played notes off offers the deletion when played notes are stored, as read at the switch, whichever tab kept them.
- An injected failure of a change's batch leaves every stored record as it was, keeps the change in memory, and raises the notice row once the player is back at Idle.
- A change made while the session's own save is still running applies after it, under the key that save minted.
- While saving is off, a change holds for the visit: nothing is read, written or deleted, no deletion is offered, and turning Keep my played notes off asks nothing.
- In a session whose own save failed, a favorite, pin, unpin or comment runs the session's own save again with the facts as they are then; on success the keep line takes its pinned or not-pinned wording, and a failed retry changes nothing shown.
