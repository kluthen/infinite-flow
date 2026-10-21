---
id: module_save_policy
status: STABLE
priority: 1
dependents:
  - [[entity_my_instrument_record]]
  - [[module_kept_session_changes]]
  - [[module_kept_session_save]]
  - [[module_player_presets]]
  - [[module_saved_data_loader]]
type: MODULE
version: 0.6
tags: [v3, release-v3.0, storage]
parents:
  - [[module_on_device_database]]
  - [[req_your_data]]
  - [[rule_delete_everything]]
  - [[rule_failed_save_never_disturbs_session]]
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_no_save_during_session]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_persistent_storage_requested]]
  - [[rule_settings_saved_on_change]]
human_name: Save Policy
layer: ARCHITECTURE
---

# Save Policy

## INTENT
Decide in one place when a change reaches the saved data, so that a running session never waits on storage, nothing is written while the visit may not save, and a refused save is reported without disturbing anything.

## THE RULE / LOGIC
The save policy sits on the storage port and is the one way the app changes its saved data. It is pure: the port is injected, and it keeps no clock.

Saving state. A visit's saving is on, off-outdated or off-unreadable. It starts on when the port opened ready, off-outdated when the port opened outdated, and off-unreadable when the port could not be opened. It turns off-unreadable when the start-up read of the saved data failed or took too long, and off-outdated as soon as the port reports that a newer version of the app has written data or refuses a change as outdated. Off-outdated is final and wins: nothing turns it back, and a newer version's data turns off-unreadable into off-outdated. Saving never turns back on during the visit. Listeners are told of each change of the state.

Saving. While saving is on and no session holds the saves, a write, a delete or a batch of writes and deletes is applied at once, the batch in one transaction. While saving is off, every write and delete is skipped, and is never applied later.

The session hold. At a session's start the saves are held, and at its end they are released. Between the two nothing touches the database: each change is queued, coalesced per store and key so that only the latest change to each record is kept, and at the release every held change is flushed in one batch, applied in one transaction, all or none. If saving turns off while the saves are held, the held changes are dropped and the release flushes nothing.

Failures. A save the port refuses never rejects: it resolves as failed. A refusal as outdated resolves as skipped instead, and turns saving off-outdated. A refusal for lack of space, or for any other reason, is reported with its kind, quota or other, to the one failure listener. A run of refusals with no successful save between them is reported at its first refusal, and again each time a refusal's kind differs from the last one reported in that run (quota after other, or the reverse); a refusal of the same kind as the last one reported in the run is not reported again. The first refusal after a success starts a new run.

The session's own save. At a session's end with a review, the session is saved by a call of its own, which resolves that save's own outcome to its caller: saved; refused, with the refusal's kind; saving off, when saving is off for the visit, a batch refused as outdated included, which turns saving off-outdated; or abandoned, when the page is going away. It runs once no session holds the saves and the release's flush is over, so it always follows the settings held during the session; a session started before it runs makes it wait for that session's end. Session saves run one after the other. At the save it reads the kept sessions' session-wide records with their keys through the port's keyed read, a refused read giving none, and applies in one batch the changes its caller builds from them. While saving is off it reads and applies nothing. Its caller hands it, with its changes, a check of whether the page is going away (reloaded, closed or left); the policy reads no browser event itself. It reads that check before the keyed read and before the batch, ahead of whether saving is off: once it reads true, the save stops there with nothing more read or written, resolves abandoned, and is told to no listener, the run of refusals unchanged. A refusal for lack of space is also told to the failure listener, under the run rules above; a refusal for any other reason is told to no listener and leaves the run of refusals as it was; a success ends the run. A session save that holds no change is a defect of the caller and throws.

Changes to kept sessions after their save. A change to a kept session after its own save, and a read of the kept sessions made for such a change, run in the same line as the session saves, after every one asked for before them, so a change made while a session's own save runs applies after it. Each runs once no session holds the saves and no flush is being applied: it reads what it needs through the port, then applies in one transaction the batch its caller built from that read; an empty batch writes nothing and resolves as unchanged. A session started while it read makes it wait for that session's end and read again. While saving is off it reads and applies nothing and resolves saving off; a refusal as outdated, of its read or its batch, also resolves saving off and turns saving off-outdated. Any other refusal never rejects: it resolves refused, with its kind, and is told to the failure listener, under the run rules above, only when its caller asks for that; a deletion's refusal goes to its caller alone. A batch applied ends the run of refusals. My instrument's deletion, and a save of my instrument that erases its kept sessions, take this line too: one batch holding the my-instrument record's delete or write with the deletes of those sessions' records, its refusal resolved to its caller alone (entity_my_instrument_record).

Persistent storage. The request for persistent storage is made of the browser at most once per visit, never while saving is off, where an attempt does not use up the visit's request, and never when the storage already is persistent. Made during a session, it waits for the release and runs right after the held changes are flushed. A refusal of the browser's storage manager resolves as failed and is not reported as a failed save.

Your data and Delete everything. The policy passes on the browser's estimate of the space used and whether the storage is persistent. Delete everything runs when saving is on and when it is off-unreadable, so a visit whose saved data could not be read still offers it; in an outdated tab it is refused as outdated without reaching the port. Its refusal goes to the caller, not to the failure listener. The policy also passes on the read of one kept session's records by its key, raw, for its codec to decode; saving off does not stop it, so an outdated tab reads what it can, and its refusal goes to the caller.

## TECHNICAL INTERFACE
src/storage/save-policy.ts exports createSavePolicy(port), which gives a SavePolicy: state(), a SavingState ('on', 'off-outdated' or 'off-unreadable'); onStateChange(listener); stopSavingUnreadable(); write(store, key, record), delete(store, key) and save(changes), each resolving a SaveOutcome ('saved', 'held', 'skipped' or 'failed'); hold() and release(); saveSession(changes, pageGoingAway), the session's own save, where changes is a SessionChanges function from the kept summaries read at the save (StoredEntry values, each a key and its raw value, none when that read was refused) to the StorageChange list to apply, and pageGoingAway a PageGoingAway, a check () => boolean of whether the page is going away, resolving a SessionSaveOutcome ({ status: 'saved' }, { status: 'refused', kind }, { status: 'saving-off' } or { status: 'abandoned' }) and never rejecting for a refusal; changeKept(changes, refusal) and readKept(read, refusal), built by createKeptChangeRunner in src/storage/save-policy-kept-changes.ts, where changes is a KeptChanges and read a KeptRead, functions of a KeptRecordsReader (read(store, key), readKeyed(store), readKeys(store)) giving the StorageChange list to apply or the value read, and refusal is 'notice' (also told to the failure listener) or 'caller' (resolved only), resolving a KeptChangeOutcome ({ status: 'saved' }, { status: 'unchanged' }, { status: 'refused', kind } or { status: 'saving-off' }) or a KeptReadOutcome ({ status: 'read', value }, refused or saving off), never rejecting for a refusal; and onFailure(listener), told a SaveFailureKind ('quota' or 'other') and whether the report starts a run: true for a run's first refusal (the visit's first, or the first after a success), false for a change of kind within the run. src/storage/save-policy-requests.ts builds the requests beyond saving through createVisitRequests: requestProtection(), resolving a ProtectionOutcome ('granted', 'refused', 'already-protected', 'not-asked' or 'failed'), estimate(), persisted(), deleteEverything() and readKeptSession(key), resolving a StoredKeptSession (the summary, the body and the played notes as stored, each undefined when none is stored). The visit's saver (src/storage/settings-saver.ts) queues saveSession behind the release of the session hold, handing the page-going-away check on, and passes changeKept and readKept on; my instrument's plain saves (createMyInstrumentSaves in src/storage/my-instrument-saves.ts; entity_my_instrument_record) go through save(changes) and requestProtection(), and its deletion and a save of it that erases its kept sessions through changeKept with the refusal 'caller'. A batch and the flush at release go to the port's apply(changes), a list of StorageChange writes and deletes. Holding twice, releasing without a hold, an empty batch, a session save holding no change, a second failure listener and Delete everything during a session are defects of the caller and throw.

## EXPECTATION
- Between hold() and release() the port sees no call; at release() it receives each held record once, with its latest change, in one batch.
- While saving is off no write or delete reaches the port, and nothing skipped or held is applied later.
- Saving that turns off while the saves are held drops them, and the release flushes nothing.
- Off-outdated is never left, and data written by a newer version turns off-unreadable into off-outdated.
- A quota or other refusal resolves as failed and is reported with its kind; a second refusal in a row of the same kind is not reported again, one of the other kind is, and one after a success is.
- A refusal as outdated resolves as skipped and turns saving off-outdated.
- Persistent storage is asked for at most once per visit, never while saving is off, never when already persistent, and during a session only after the release.
- Delete everything runs when saving is on or off-unreadable, and is refused as outdated in an outdated tab.
- The session's own save runs after the release's flush and never while a session holds the saves; it reads the kept summaries with their keys at the save, applies its changes in one batch and resolves saved.
- While saving is off the session's save reads and applies nothing and resolves saving off; a batch refused as outdated also resolves saving off and turns saving off-outdated.
- A refusal of the session's save for lack of space resolves refused, with its kind, and is told to the failure listener; any other refusal resolves refused and is told to no listener, the run of refusals unchanged.
- Reading a kept session by its key works while saving is off, and a refusal of that read reaches its caller.
- A change to a kept session runs after the session saves asked for before it and never while a session holds the saves; it reads at the change and applies its batch in one transaction, an empty batch writing nothing; a session started while it read makes it read again after that session.
- While saving is off a change to a kept session reads and applies nothing; a refusal as outdated resolves saving off; any other refusal resolves refused, with its kind, and is told to the failure listener only when its caller asks for that.
- A session save whose page-going-away check reads true before the keyed read or before the batch stops there with nothing more read or written, resolves abandoned, and is told to no listener.
- Deleting my instrument, or saving it with the erasing of its kept sessions, applies the record's change and the sessions' deletes in one transaction through the kept-change line, all or none, after the session saves asked for before it; a refusal other than as outdated resolves refused to the caller alone, never to the failure listener.
