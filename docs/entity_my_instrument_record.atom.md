---
id: entity_my_instrument_record
status: DRAFT
dependents: []
type: ENTITY
version: 0.4
priority: 1
human_name: My-Instrument Record
layer: ARCHITECTURE
tags: [v3, release-v3.0, storage, my-instrument]
parents:
  - [[entity_my_instrument]]
  - [[module_kept_session_changes]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[module_saved_data_loader]]
  - [[req_kept_sessions]]
  - [[req_my_instrument]]
  - [[rule_delete_everything]]
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_no_save_during_session]]
  - [[rule_outdated_tab_reads_what_it_can]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_persistent_storage_requested]]
  - [[rule_saved_settings_load_tolerantly]]
---

# My-Instrument Record

## INTENT
Keep my instrument on the device as one record that loads whole or not at all, read before the first draw so a saved selection of my instrument holds exactly when my instrument itself loaded.

## THE RULE / LOGIC
Shape. My instrument is stored as one record in the on-device database's instrument store, under one fixed key, in the record envelope with its two versions. It holds what my instrument is built from, never what is derived from it: the id `my-instrument`, the template, the display name, the clef, the written range (its lowest and highest written note) and the transposition (octaves, semitones and one direction), with the input kind, MIDI controller. The concert range, the interval name and the generator-facing profile are derived again at each load.

Loading whole or not at all. The record loads only when it is a current record of this version and building my instrument from it succeeds, so every validity rule of my instrument applies at load, the clef's bound included; then it gives my instrument, unchanged. A record that does not decode, one that building my instrument refuses, one whose id is not `my-instrument`, and one a newer version wrote all load as absent: no part of it is kept, nothing is repaired or clamped, and no error or notice is raised. With no record, my instrument is absent.

The start-up read. The saved-data load reads the instrument store with the settings, the kept sessions' summaries and the remembered controller, under the same start-up wait, before the first draw. The record's read side, with building my instrument, is loaded on demand only when the store holds a record, so an empty store gives no my instrument without loading anything more, and the first load stays small. Whether my instrument loaded is given to the settings decode, so a saved selection of my instrument is kept only when my instrument itself loaded, and falls back to the default instrument otherwise. A visit started from the defaults reads no record: my instrument is absent, and one made during that visit holds for the visit only.

Saving. The record is written, whole, when the player saves my instrument (creating it, or changing it from its sheet or through the controller-transposition check), and deleted when the player deletes my instrument; a Save that changes nothing writes nothing. Each write and delete goes through the save policy, as every write does: held while a session runs, refused in an outdated tab, nothing written in a visit that saves nothing. The visit's saves reach the policy in the order made, so the record is saved before a selection that names it. A save that erases nothing (creating my instrument, a change of its name or clef, or a change of its written range or transposition while it has no kept session) is the plain write, one batch through the policy's save: a save made while a generation runs writes the record at once, a refusal is told by the notice row, and my instrument still applies for the visit. Each save of my instrument asks the save policy for persistent storage, which asks the browser at most once per visit. Delete everything removes the record with the rest of the database. The kept sessions played with my instrument are not part of this record; they go with it in the batch below.

The batch with its kept sessions. Deleting my instrument, whatever the number of its kept sessions, and saving a change to its written range or transposition while it has kept sessions (from its sheet's erase warning or the controller-transposition check's Use and erase) are each one batch, in one transaction, all or none: the record's delete, or its whole write, and the deletes of the session-wide record, the body and the played notes of each kept session of my instrument. The batch goes through the save policy's kept-change line, its refusal resolved to its caller alone, never as the plain write or delete and never as a record write followed by separate deletions. It names exactly the sessions the warning or confirmation counted, by their keys, never by a key rebuilt from their facts: the session list's rows in memory that name my instrument, and the session that just ended when played with it. It runs in that line after every session save asked for before it, so the session that just ended is saved first and erased by the key its save minted; a session held in memory only because its own save failed has no record to delete and only leaves memory. A counted session already gone from the device is a delete that changes nothing. A session of my instrument that another tab kept after this tab read the summaries is not in the batch, since nothing goes that the player was not told about: it stays, listed under my instrument, until a later change or deletion of my instrument erases it.

Saved, refused, saving off. Only once the batch is saved does anything change in memory: my instrument is changed or deleted, its sessions leave the session list and memory, the selection returns to the template when the deleted my instrument was selected, that selection then saved through the visit's saves after the batch, the phrase is replaced as on an instrument switch where the design says so, and the save asks for persistent storage. A refusal, for lack of space or any other reason, the read under the batch included, changes nothing on the device or in memory: my instrument stays as it was, every session stays, a review on screen stays open, the warning or confirmation stays open with its error line and its action tries again, and the notice row tells nothing. When the batch resolves saving off (the tab turned outdated while the warning or confirmation was open, or the batch was refused as outdated), nothing changes either, and the sheet returns to its form, deleting and erasing nothing, its range and transposition back to their saved values. With no kept session to erase, a deletion while saving is off applies for the visit only, as every change then does; a visit whose saved data could not be read read no kept session, so it erases none.

## TECHNICAL INTERFACE
src/storage/records/my-instrument-record.ts holds the record's shape, MyInstrumentRecord (the envelope's RecordVersions from src/storage/record-envelope.ts, then id, template, name, clef, writtenRange, transposition and inputKind), its data version MY_INSTRUMENT_DATA_VERSION (1), its fixed key MY_INSTRUMENT_RECORD_KEY ('my-instrument') and its encoder encodeMyInstrumentRecord(instrument, appVersion); it stays small and eager, so the visit's saves put a write in the save policy's line at once. The read side, decodeMyInstrument(records) in src/storage/records/my-instrument-record-read.ts, takes the instrument store's records and gives my instrument built by makeMyInstrument (src/domain/profile/my-instrument.ts; entity_my_instrument) from the first current record whose fields read and which building accepts, or null, a refusal of building (MyInstrumentError) turning into none and any other error thrown as a defect; nothing imports it statically but tests. src/storage-bootstrap.ts reads the store with the port's readAll('instrument') beside the other start-up reads and import()s the read side only when the store holds a record (loadMyInstrument); it passes myInstrumentLoaded, true exactly when a my instrument loaded, to decodeSettings (src/storage/records/settings-record.ts), and hands the loaded value, or null, on the SavedDataLoad as myInstrument (module_saved_data_loader), from which the workspace's Idle session starts. The instrument store exists at data version 1 (src/storage/database.ts; module_on_device_database); no data version was added. src/storage/my-instrument-saves.ts gives createMyInstrumentSaves(submit, appVersion), composed into the visit's saves (VisitSaves, src/storage/settings-saver.ts): saveMyInstrument(instrument), the plain write: the encoded record as one StorageChange batch through the save policy's save, followed by its requestProtection(). Deleting my instrument, and a save that erases its kept sessions, are instead one KeptChanges batch through the visit saves' changeKept(changes, 'caller') (module_save_policy), never the plain save: the record's delete or its encoded write, and, for each counted session key, the deletes of its `sessionSummaries`, `sessionBodies` and `playedNotes` records, as Delete session deletes them (deleteKeptSession in src/components/workspace/kept-session-review-changes.ts; module_kept_session_changes); its KeptChangeOutcome (saved, unchanged, refused with its kind, or saving off) reaches the sheet's delete confirmation, its erase warning and the check's Use and erase, and nothing changes in memory before it resolves saved. The Idle session's actions on my instrument (createMyInstrumentActions in src/composables/generation-session-my-instrument.ts, loaded on demand through src/composables/load-my-instrument-actions.ts) call them: a save that changes nothing writes nothing, deleting the selected my instrument selects its template once the batch is saved, and saveAndSelectMyInstrument(instrument), the transposition check's save, saves as saveMyInstrument does and also selects a my instrument that exists but is not selected, once its record is written.

## EXPECTATION
- The instrument store holds at most one my-instrument record, under its fixed key, in the record envelope, holding the id, template, display name, clef, written range, transposition and input kind, and nothing derived.
- A saved my instrument is back after a reload, unchanged, and a saved selection of it holds.
- A record that does not decode, one makeMyInstrument refuses, or one a newer version wrote loads as absent, with no error and no notice, and a saved selection of my instrument then falls back to the default instrument.
- The record is read before the first draw, within the start-up wait; a visit started from the defaults has no my instrument.
- Saving writes the record whole and deleting my instrument deletes it, each one batch through the save policy: nothing is written during a session until it ends, in an outdated tab or in a visit that saves nothing.
- The first save of my instrument in a visit makes one persist request.
- Delete everything removes the record.
- With no record in the instrument store, the record's read side is not loaded; deleting the selected my instrument saves its template's selection after the batch that deletes the record.
- Deleting my instrument, whatever the number of its kept sessions, and saving a change to its range or transposition while it has kept sessions, are one batch through the save policy's kept-change line: the record's delete or write and the three records of every counted session, all or none; another instrument's sessions are untouched.
- The batch deletes exactly the sessions the warning or confirmation counted, by their keys, the session that just ended included once its own save has run; a session another tab kept after the summaries were read stays.
- A refused batch changes nothing on the device or in memory: my instrument keeps its old values in the sheet and after a reload, every session stays listed, the warning or confirmation keeps its error line, and the notice row shows nothing.
- A change of name or clef, and a change of range or transposition with no kept session, is the plain write, whose refusal the notice row tells while my instrument applies for the visit.
