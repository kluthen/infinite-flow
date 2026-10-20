---
id: module_on_device_database
status: STABLE
human_name: On-Device Database
version: 0.5
type: MODULE
layer: ARCHITECTURE
priority: 1
tags: [v3, release-v3.0, storage, database, versioning]
parents:
  - [[req_on_device_storage]]
  - [[req_your_data]]
  - [[rule_delete_everything]]
  - [[rule_ephemeral_session_state]]
  - [[rule_outdated_tab_reads_what_it_can]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_persistent_storage_requested]]
  - [[rule_saved_data_belongs_to_browser_profile]]
dependents:
  - [[entity_my_instrument_record]]
  - [[entity_remembered_controller_record]]
  - [[module_kept_session_changes]]
  - [[module_kept_session_upgrade_step]]
  - [[module_save_policy]]
---

# On-Device Database

## INTENT
Keep the player's data in one versioned database on the device, reached through one port, so that the stored shape can change through migrations and an older open tab never misreads or overwrites what a newer version of the app wrote.

## THE RULE / LOGIC
All storage code lives in one directory, `src/storage/`. The rest of the app reaches the database only through an injected port, never by importing a browser storage API. The session history and the export modules never import the storage code at all, and a lint rule forbids it for them. Kept data belongs to the site's origin because the browser scopes the database to it; the module adds nothing for that.

There is one IndexedDB database for the app, named `infinite-flow`, used through a small hand-written promise wrapper over raw IndexedDB, with no library. It has seven object stores, fixed at data version 1: `meta`, `settings`, `instrument`, `controller`, `sessionSummaries`, `sessionBodies` and `playedNotes`. Keys are strings the caller supplies, kept outside the record, and no store has an index: any ordering, such as kept sessions by date, is done in memory over the summaries. A store added later needs its own upgrade step. `meta` holds one record, under the key `database`: the database's data version and the app version that last upgraded it.

One data-version numbering covers the whole database. The code's data version is one integer, 2 in v3.1: it is the IndexedDB version the database is opened with, the data version held in `meta`, and the number of migration steps. Every record carries a `dataVersion`, an integer of at least 1, and an `appVersion`, the non-empty package version of the app that wrote it. A record's `dataVersion` is the data version at which its store's current record shape was introduced, so it is never above the database's; each store's codec owns that number: the kept sessions' session-wide records and bodies are at 2, every other shape, the kept played notes included, at 1. A migration to data version N rewrites only the stores whose shape changes at N, giving their records data version N; the records of every other store keep their number, so an older tab can still read them.

The record envelope defines the two version fields once, for every codec, and classifies a stored value against its codec's shape version in exactly one of three outcomes. Current: well formed, with the same version, and read. Newer: well formed, with a higher version, and left unread, never misread. Unreadable: not an object, a version field missing, ill-typed or empty, or a version below the shape's, which no migration would leave; a codec's tolerant loading treats it as a value it cannot use. Reading never throws for anything stored. Writing is stricter: the port refuses, by throwing, a record without valid versions or with a data version above the database's, since that is a defect of the caller, not stored data.

A migration step names the data version it reaches and how it changes the database. When opening finds a stored version below the code's, the runner, inside the upgrade transaction, runs in order every step above the stored version, then writes `meta`. The steps must run from 1 to N without a gap, or opening fails as a configuration defect. Step 1, from an empty database, creates the seven stores. Step 2 carries the kept sessions of data version 1 over to the figure levels and the preset label (module_kept_session_upgrade_step). A step is given the database, its upgrade transaction and the app version the database is opened with, which the records it rewrites carry. The production list of steps is the default; whoever opens the database may pass its own list through the port's open options, so no other list needs a separate code path.

Reads. The port reads one record by its key; every value of a store, without its key (`readAll`); through its keyed read, every entry of a store as its key and its raw value; and, through its keys-only read, the key of every record of a store, without reading any value. The keyed read and the keys-only read give their results in key order, each in one read-only transaction, and are refused as `readAll` is. Neither decodes a value: their callers do. A key that is not a string was not written by the app and is left out, never thrown on. The keys-only read is how every record of a store, such as every kept played note, is found for deletion without being read. The keyed read is how a record kept under a key the record does not hold, such as a kept session's, is found again after a reload; `readAll` stays for the stores whose keys the caller already knows, the settings and the remembered controller.

Besides one write or one delete at a time, the port applies a batch: a list of changes, each the write of a record under a key or the delete of a key, in any of the data stores. The batch is applied in list order, a later change to the same key winning, in one transaction spanning `meta` and every store it names, which reads `meta` first like any write. It is all or none: when the transaction finds a newer data version it aborts, and when the browser refuses it, for lack of space or any other reason, nothing of the batch is written or deleted. Each change is checked as a single write or delete is: an empty batch, a change naming another store or an unknown kind, or a write without valid versions is a defect of the caller and throws, touching nothing.

The port's status is `ready`, `outdated` or `unavailable`, the last when opening failed for any other reason. The port becomes outdated as soon as the tab learns that a newer app version has written data. At open, that is when the database refuses the code's version because a newer app upgraded it, in which case it is reopened without a version, for reading, or when `meta` holds a data version above the code's. While open, that is on a version change event, which closes the connection, or when a write, delete or batch transaction, which always reads `meta` first, finds a data version above the code's and aborts. A version change event also comes from another tab's Delete everything: this tab then saves nothing more, and its reload never brings deleted data back. Outdated is permanent for that port: every write, delete, batch and Delete everything is refused with `outdated` and touches nothing. Reads still work, through a connection opened without a version, reopened on demand after a version change closed the first one, so the tab reads what it can. The port tells its listeners once when it becomes outdated later in the visit, so that saving can be turned off.

While the port is unavailable, reads, writes, deletes and batches are refused with `other`, but Delete everything still runs, since it needs no open connection, so a visit whose read failed can still offer it. Once the port is outdated, Delete everything is refused even then. Delete everything closes the connection and deletes the whole database; every later call is refused with `other`, the page then reloading.

Every refusal is a storage error of one of three kinds: `quota`, when the browser refuses a request or its transaction for lack of space; `outdated`; and `other`. The space estimate, whether the storage is persistent, and the request to make it persistent go to the injected browser storage manager; without one, as in an insecure context, they are refused with `other`. The port does not refuse a persistence request in an outdated tab: when to ask is the save policy's decision.

The module holds no save policy. Whether saving is on or off for the visit, holding writes while a session runs, the start-up wait, the notices and when persistence is requested belong to the save policy built on this port. That policy is `module_save_policy`.

## TECHNICAL INTERFACE
`src/storage/storage-port.ts` declares the port the app sees: `read(store, key)`, `readAll(store)`, `readKeyed(store)`, the keyed read of a whole store, resolving a list of `StoredEntry` values, each `{ key, value }`, a string key with its raw value, `readKeys(store)`, the keys-only read, resolving the store's string keys, `write(store, key, record)`, `delete(store, key)`, `apply(changes)`, a batch of `StorageChange` values, each `{ kind: 'write', store, key, record }` or `{ kind: 'delete', store, key }`, `deleteEverything()`, `estimate()`, `persisted()`, `persist()`, `status()` returning `ready`, `outdated` or `unavailable`, and `onOutdated(listener)`; and `StorageError`, whose `kind` is `quota`, `outdated` or `other`. `src/storage/database.ts` opens the IndexedDB database `infinite-flow` at `DATABASE_DATA_VERSION` (2), runs the migration steps, each `{ toVersion, migrate }`, `migrate` given a `MigrationUpgrade` (`database`, `transaction`, and `appVersion`, the opening's `DatabaseOpening.appVersion`), with the production list `PRODUCTION_MIGRATIONS` (`CREATE_STORES`, then `KEPT_SESSIONS_V2` from `src/storage/migrations/kept-sessions-v2.ts`) as the default and another list accepted through the open options, creates the stores `meta`, `settings`, `instrument`, `controller`, `sessionSummaries`, `sessionBodies` and `playedNotes` in step 1, and implements the port over raw IndexedDB with the storage manager injected; its `readKeyedValues` reads a store's keys and values in one read-only transaction and pairs them, and its `readKeys` reads a store's keys alone. Every write, delete and batch runs through `changeStores`, one readwrite transaction over `meta` and the stores it names, reading `meta` first. `src/storage/record-envelope.ts` holds the one definition of `RecordVersions` (`dataVersion`, `appVersion`), which the settings codec imports from it, and the envelope reader that returns `current`, `newer` or `unreadable`. `src/storage/app-version.ts` exports `APP_VERSION`, the package version injected at build time as a constant, and fails at load when it is not a non-empty string. A small helper file under `src/storage/` may take part of this code if size limits need it. An ESLint override forbids `src/session/` and `src/export/` from importing the storage code. `openStoragePort(options)` never rejects for a storage failure (a database that cannot be opened gives an unavailable port, one a newer app wrote an outdated one); it rejects only for a defect: an empty app version, migration steps with a gap, or a migration step that throws (`MigrationStepError`, the upgrade rolled back). An upgrade that aborts after its steps have returned, through a throw inside a callback of a request a step made or a request that fails (for lack of space, say), is rolled back too but is not a `MigrationStepError`: the open then fails like any other, so the port is unavailable for that visit, the database stays at its stored version, and the next open runs the upgrade again. The port names only the six data stores; `meta` is internal, and naming any other store is a caller defect that throws. `browserStorage()` gives the browser's own IndexedDB factory and storage manager, the latter absent in an insecure context.

## EXPECTATION
- The keyed read gives every entry of a store as its key and its raw value, in key order; an entry whose key is not a string is left out and nothing is thrown; `readAll` still gives the values alone.
- The keys-only read gives every string key of a store, in key order, without its value.
- The keyed read and the keys-only read are refused as `readAll` is: with `other` by an unavailable or deleted port, and it still reads in an outdated tab.
- Every record written carries a `dataVersion` and an `appVersion`; a write without valid versions, or with a data version above the database's, is refused as a defect of the caller.
- Reading a stored value gives current, newer or unreadable and never throws: a well-formed record with a higher data version is newer and left unread; a value that is not an object, lacks a version field, has an ill-typed or empty one, or has a version below its shape's is unreadable.
- A database at data version 0 is brought to 2 on open, through steps 1 and 2 in order, with its seven stores and its `meta` record; a further step passed through the open options runs after them, in order; steps with a gap make the open fail.
- A migration step leaves the records of the stores whose shape it does not change at their own data version.
- Opening a database that a newer app upgraded gives a connection that reads, and the status outdated.
- When a newer connection upgrades the database, or another tab deletes it, the open tab closes its connection, tells its listeners once that it is outdated, and never writes again.
- When a newer tab has raised the data version in `meta` without an upgrade, this tab's next write or delete aborts with `outdated` and touches nothing.
- An outdated port refuses every write, delete, batch and Delete everything with `outdated`, and still reads.
- A batch of writes and deletes across stores is applied in list order in one transaction; when it is refused, for lack of space or any other reason, none of its changes is stored.
- A batch in a tab whose `meta` a newer tab raised aborts with `outdated` and touches nothing; an unavailable or deleted port refuses a batch with `other`.
- An empty batch, or one naming another store, an unknown kind or a write without valid versions, is refused as a defect of the caller and touches nothing.
- An unavailable port refuses reads and writes with `other`, and still runs Delete everything.
- Delete everything removes the whole database; every later call is refused with `other`.
- A refusal for lack of space is reported as `quota`.
- The space estimate, the persistence state and the persistence request reach the storage manager, and are refused with `other` without one.
- `src/session/` and `src/export/` never import the storage code.
