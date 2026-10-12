---
id: module_on_device_database
status: DRAFT
human_name: On-Device Database
version: 0.1
notes: Created 2026-10-12 at DRAFT by the pre-code architecture capture for v3.0 build plan chunk 4, from master spec sections 4.3 and 4.6, the build plan's storage design and the decisions the coding leader settled. Describes intended v3.0 behaviour: no code implements it yet.
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
dependents: []
---

# On-Device Database

## INTENT
Keep the player's data in one versioned database on the device, reached through one port, so that the stored shape can change through migrations and an older open tab never misreads or overwrites what a newer version of the app wrote.

## THE RULE / LOGIC
All storage code lives in one directory, `src/storage/`. The rest of the app reaches the database only through an injected port, never by importing a browser storage API. The session history and the export modules never import the storage code at all, and a lint rule forbids it for them. Kept data belongs to the site's origin because the browser scopes the database to it; the module adds nothing for that.

There is one IndexedDB database for the app, named `infinite-flow`, used through a small hand-written promise wrapper over raw IndexedDB, with no library. It has seven object stores, fixed at data version 1: `meta`, `settings`, `instrument`, `controller`, `sessionSummaries`, `sessionBodies` and `playedNotes`. Keys are strings the caller supplies, kept outside the record, and no store has an index: any ordering, such as kept sessions by date, is done in memory over the summaries. A store added later needs its own upgrade step. `meta` holds one record, under the key `database`: the database's data version and the app version that last upgraded it.

One data-version numbering covers the whole database. The code's data version is one integer, 1 in v3.0: it is the IndexedDB version the database is opened with, the data version held in `meta`, and the number of migration steps. Every record carries a `dataVersion`, an integer of at least 1, and an `appVersion`, the non-empty package version of the app that wrote it. A record's `dataVersion` is the data version at which its store's current record shape was introduced, so it is never above the database's; each store's codec owns that number, and in v3.0 every one is 1. A migration to data version N rewrites only the stores whose shape changes at N, giving their records data version N; the records of every other store keep their number, so an older tab can still read them.

The record envelope defines the two version fields once, for every codec, and classifies a stored value against its codec's shape version in exactly one of three outcomes. Current: well formed, with the same version, and read. Newer: well formed, with a higher version, and left unread, never misread. Unreadable: not an object, a version field missing, ill-typed or empty, or a version below the shape's, which no migration would leave; a codec's tolerant loading treats it as a value it cannot use. Reading never throws for anything stored. Writing is stricter: the port refuses, by throwing, a record without valid versions or with a data version above the database's, since that is a defect of the caller, not stored data.

A migration step names the data version it reaches and how it changes the database. When opening finds a stored version below the code's, the runner, inside the upgrade transaction, runs in order every step above the stored version, then writes `meta`. The steps must run from 1 to N without a gap, or opening fails as a configuration defect. Step 1, from an empty database, creates the seven stores. The production list of steps is the default; whoever opens the database may pass its own list through the port's open options, so no other list needs a separate code path.

The port's status is `ready`, `outdated` or `unavailable`, the last when opening failed for any other reason. The port becomes outdated as soon as the tab learns that a newer app version has written data. At open, that is when the database refuses the code's version because a newer app upgraded it, in which case it is reopened without a version, for reading, or when `meta` holds a data version above the code's. While open, that is on a version change event, which closes the connection, or when a write or delete transaction, which always reads `meta` first, finds a data version above the code's and aborts. A version change event also comes from another tab's Delete everything: this tab then saves nothing more, and its reload never brings deleted data back. Outdated is permanent for that port: every write, delete and Delete everything is refused with `outdated` and touches nothing. Reads still work, through a connection opened without a version, reopened on demand after a version change closed the first one, so the tab reads what it can. The port tells its listeners once when it becomes outdated later in the visit, so that saving can be turned off.

While the port is unavailable, reads and writes are refused with `other`, but Delete everything still runs, since it needs no open connection, so a visit whose read failed can still offer it. Once the port is outdated, Delete everything is refused even then. Delete everything closes the connection and deletes the whole database; every later call is refused with `other`, the page then reloading.

Every refusal is a storage error of one of three kinds: `quota`, when the browser refuses a request or its transaction for lack of space; `outdated`; and `other`. The space estimate, whether the storage is persistent, and the request to make it persistent go to the injected browser storage manager; without one, as in an insecure context, they are refused with `other`. The port does not refuse a persistence request in an outdated tab: when to ask is the save policy's decision.

The module holds no save policy. Whether saving is on or off for the visit, holding writes while a session runs, the start-up wait, the notices and when persistence is requested belong to the save policy built on this port.

## TECHNICAL INTERFACE
`src/storage/storage-port.ts` declares the port the app sees: `read(store, key)`, `readAll(store)`, `write(store, key, record)`, `delete(store, key)`, `deleteEverything()`, `estimate()`, `persisted()`, `persist()`, `status()` returning `ready`, `outdated` or `unavailable`, and `onOutdated(listener)`; and `StorageError`, whose `kind` is `quota`, `outdated` or `other`. `src/storage/database.ts` opens the IndexedDB database `infinite-flow` at `DATABASE_DATA_VERSION` (1), runs the migration steps, each `{ toVersion, migrate }`, with the production list as the default and another list accepted through the open options, creates the stores `meta`, `settings`, `instrument`, `controller`, `sessionSummaries`, `sessionBodies` and `playedNotes` in step 1, and implements the port over raw IndexedDB with the storage manager injected. `src/storage/record-envelope.ts` holds the one definition of `RecordVersions` (`dataVersion`, `appVersion`), which the settings codec imports from it, and the envelope reader that returns `current`, `newer` or `unreadable`. `src/storage/app-version.ts` exports `APP_VERSION`, the package version injected at build time as a constant, and fails at load when it is not a non-empty string. A small helper file under `src/storage/` may take part of this code if size limits need it. An ESLint override forbids `src/session/` and `src/export/` from importing the storage code.

## EXPECTATION
- Every record written carries a `dataVersion` and an `appVersion`; a write without valid versions, or with a data version above the database's, is refused as a defect of the caller.
- Reading a stored value gives current, newer or unreadable and never throws: a well-formed record with a higher data version is newer and left unread; a value that is not an object, lacks a version field, has an ill-typed or empty one, or has a version below its shape's is unreadable.
- A database at data version 0 is brought to 1 on open, with its seven stores and its `meta` record; a further step passed through the open options runs after it, in order; steps with a gap make the open fail.
- A migration step leaves the records of the stores whose shape it does not change at their own data version.
- Opening a database that a newer app upgraded gives a connection that reads, and the status outdated.
- When a newer connection upgrades the database, or another tab deletes it, the open tab closes its connection, tells its listeners once that it is outdated, and never writes again.
- When a newer tab has raised the data version in `meta` without an upgrade, this tab's next write or delete aborts with `outdated` and touches nothing.
- An outdated port refuses every write, delete and Delete everything with `outdated`, and still reads.
- An unavailable port refuses reads and writes with `other`, and still runs Delete everything.
- Delete everything removes the whole database; every later call is refused with `other`.
- A refusal for lack of space is reported as `quota`.
- The space estimate, the persistence state and the persistence request reach the storage manager, and are refused with `other` without one.
- `src/session/` and `src/export/` never import the storage code.
