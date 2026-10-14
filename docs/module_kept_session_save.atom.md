---
id: module_kept_session_save
status: DRAFT
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: Session Save and Most Recent Session
tags: [v3, release-v3.0, storage, review, session]
parents:
  - [[entity_kept_session_record]]
  - [[module_save_policy]]
  - [[req_last_session_review]]
  - [[rule_failed_save_never_disturbs_session]]
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_most_recent_session_kept]]
  - [[rule_no_save_during_session]]
  - [[rule_outdated_tab_stops_saving]]
---

# Session Save and Most Recent Session

## INTENT
Save the session that just ended once, as its review opens, so that it and the pinned sessions are what is kept, and say which session is the most recent one, both within the visit and after a reload.

## THE RULE / LOGIC
When. The session's save runs at a session's end that opens a review, that is, after at least one phrase sounded. A session ended during its count-in has no review: its end reads, saves and deletes nothing, and the most recent session does not change.

Order. At an end with a review, three steps run in this order. First, the settings flush: the release of the save policy's session hold, which writes the settings changed during the session in a transaction of its own, and opens no transaction when no setting changed. Second, the keyed read of the session-wide records of the kept sessions, each with its key, read at the save rather than taken from the load, so that a session another tab saved meanwhile is counted. Third, one batch, applied in one transaction, all or none, that writes the new session under the key the save mints for it (its session-wide record and its body, and its played notes only when Keep my played notes is on) and deletes the session-wide record, the body and the played notes of every readable kept session that is not pinned. The settings and the session are kept in separate transactions so that a storage-full refusal of the session never loses the player's setting changes, and so that a refusal is known to be the session's own or a setting's.

Readable and unreadable kept sessions. A kept session is readable when its session-wide record decodes; a session-wide record that does not decode is left in place, with its body and played notes, since whether it is pinned is unknown: the save never deletes what it cannot read. A keyed read that is refused deletes nothing, and the new session is still saved in a batch with no deletions.

The session's own save, marked by its result. The policy call that saves the session returns that save's own outcome to its caller: saved; refused, with the refusal's kind; or not attempted, because saving is off. This outcome is separate from the save policy's one failure listener, which drives the notice row for every other save. Saved: the session is kept as the most recent one, and its keep line gives its pin state. Refused: nothing is written or deleted, the session is held in memory as the most recent one, every control of its review works in memory, and its keep line reads "Not saved on this device: export it to keep it."; a refusal for lack of space also raises the storage-full notice, and a refusal for any other reason raises no notice, the Save failed notice being for saves other than the session's own.

Saving off. While saving is off for the visit (an outdated tab, or a visit started from the defaults because the saved data could not be read), the end reads, saves and deletes nothing: the session is held in memory as after a refused save, its keep line reads "Not saved on this device: export it to keep it.", and every kept session stays.

The most recent session. Within the visit, it is the last session that ended with a review, saved or held in memory. After a reload, it is the readable kept session with the latest start. It stays in memory across the next Start, which hides its review but does not clear it, until the next session ends with a review and takes its place; a session ended during its count-in leaves it in place.

## TECHNICAL INTERFACE
The save runs from the session's end with a review, in src/components/workspace/workspace-session-ends.ts or a module beside it if the save outgrows it. It releases the hold through the visit's saver (release()), reads the kept summaries through the on-device database's keyed read, decodes each value with module_kept_session_codec's decodeKeptSessionSummary, encodes the new session with encodeKeptSession, mints its key as `session-${startedAt}-${sessionSeed}` in decimal (entity_kept_session_record), and applies the writes and deletes as one list of StorageChange values through the port's apply. src/storage/save-policy.ts gives the session's save as a policy call that resolves that save's own outcome (saved; refused, with its kind; or not attempted, saving being off) to its caller, apart from onFailure; the exact signature is the builder's. The most recent session is held in a slot of the session controller's state that Start does not clear (src/components/workspace/session-review-state.ts, workspace-session-controller.ts, workspace-session-controller-types.ts); src/components/workspace/workspace-session-start.ts is not changed for it. After a reload the slot is filled from the loader's keyed kept summaries: the readable one with the greatest startedAt, its body read by its key when the review opens.

## EXPECTATION
- At an end with a review, a setting changed during the session is flushed in a transaction before the session's batch; with no setting changed, the only transaction is the session's batch.
- After a second session's save, one unpinned kept session remains, under a key of the form `session-{startedAt}-{sessionSeed}`; every pinned kept session remains.
- A kept session whose session-wide record cannot be read survives the next session's save.
- A refused keyed read still saves the new session and deletes nothing.
- A refused session save writes and deletes nothing, keeps the session in memory as the most recent one, and its keep line reads "Not saved on this device: export it to keep it."; a refusal for lack of space also raises the storage-full notice, and any other refusal raises no notice.
- The policy call that saves the session returns that save's own outcome, saved, refused with its kind, or not attempted, apart from the failure listener.
- While saving is off, a session's end reads, saves and deletes nothing, every kept session stays, and the keep line reads "Not saved on this device: export it to keep it."
- A session ended during its count-in changes nothing kept and leaves the most recent session in place.
- The most recent session stays in memory across the next Start until the next session ends with a review.
- After a reload, the most recent session is the readable kept session with the latest start, including when the unpinned one was deleted and only pinned ones remain.
