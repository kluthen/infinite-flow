# On-device storage

This document records how the app keeps data on the player's device: the one directory that
touches browser storage, the port the rest of the app reaches it through, the database and its
stores, how stored records are versioned and migrated, what happens in a tab that a newer version
of the app has overtaken, the app version every record carries, and the save policy that decides
when a write reaches the port. Its declared intent is the
ATD atom [`module_on_device_database`](module_on_device_database.atom.md).

As built in v3.0 chunks 4 and 5, this is the storage core and the save policy. Nothing in the app
imports them yet; see [Not here yet](#not-here-yet).

## Words used here

- **Port**: the interface the app sees, `StoragePort`. The app is handed one and never opens the
  browser's storage itself.
- **Store**: an IndexedDB object store, one per kind of record.
- **Record**: one stored value, written under a string key.
- **Data version**: an integer naming a stored shape. The database has one; each store's record
  shape has its own.
- **Codec**: the pure code that turns one kind of record into stored values and back
  (`src/storage/records/`; the settings codec is the first).
- **Outdated tab**: a tab running an older app than the one that last wrote the data. It still
  reads, and never writes.
- **Batch**: a list of writes and deletes, possibly across stores, applied in one transaction.
- **Save policy**: the code between the app and the port that decides whether a write is saved at
  once, held until the session ends, or skipped because saving is off.

## One directory, one port

Everything that touches IndexedDB or the storage manager (`navigator.storage`) lives in
`src/storage/`: the database adapter and the codecs, so what the app saves can be audited in one
place. The ESLint and source-scan boundary gates allow those APIs there and nowhere else (see
[Runtime Constraints](../README.md#runtime-constraints)).

The rest of the app reaches the data only through an injected `StoragePort`, the pattern
`src/audio/` and `src/midi/` already use. `src/session/` and `src/export/` never import
`src/storage/` at all: the session history and the export modules stay storage-free. An ESLint
`no-restricted-imports` override for those two directories rejects `@/storage`, `@/storage/…` and
any relative path into a `storage` directory.

| File                         | What it holds                                                                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage-port.ts`            | `openStoragePort(options)`, the `StoragePort` interface, `StorageChange` (one change of a batch), `StorageError` and its kinds, and `browserStorage()`, which gives the browser's own IndexedDB factory and storage manager. |
| `save-policy.ts`             | `createSavePolicy(port)`, the `SavePolicy` interface, the saving states, the save outcomes and the failure kinds.                                                                                                            |
| `save-policy-requests.ts`    | The policy's requests beyond saving: persistent storage, the space used, whether the data is persistent, and Delete everything.                                                                                              |
| `database.ts`                | The database name, the stores, the migration steps and their runner, and the raw IndexedDB transactions, over a small hand-written promise wrapper (no `idb` or other library).                                              |
| `record-envelope.ts`         | `RecordVersions`, the two version fields every record carries, the envelope reader `readEnvelope` and the write check `assertWritableVersions`.                                                                              |
| `app-version.ts`             | `APP_VERSION`, the running app's package version.                                                                                                                                                                            |
| `records/settings-record.ts` | The settings codec, which reads its records through the envelope.                                                                                                                                                            |

The port takes its IndexedDB factory and storage manager as options (`factory`,
`storageManager`), with the running app's version (`appVersion`), and optionally its migration
steps (`migrations`) and the database name (`databaseName`). The app passes `browserStorage()`;
unit tests pass an in-memory factory (see
[Fake IndexedDB and storage manager](testing.md#fake-indexeddb-and-storage-manager)).

## The database and its stores

There is one database, named `infinite-flow`. The browser scopes it to the site's origin and the
browser profile; the code adds nothing for that.

| Store              | Holds                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `meta`             | One record, under the key `database`: `{ dataVersion, appVersion }`.                        |
| `settings`         | One record per setting, so each loads and fails on its own.                                 |
| `instrument`       | My instrument.                                                                              |
| `controller`       | The remembered controller.                                                                  |
| `sessionSummaries` | What a list row and Your data's counts show for each kept session.                          |
| `sessionBodies`    | A kept session's phrases, read only when the session is opened.                             |
| `playedNotes`      | One record per session, in a store of its own so the opt-in and the deletions are provable. |

Keys are strings the caller supplies, kept outside the record (out-of-line keys). No store has an
index: any ordering, such as kept sessions by date, is done in memory over the summaries. The set
of stores is fixed at data version 1; a store added later needs its own migration step.

`meta` holds the database's data version and the version of the app that last upgraded the
database. The port never exposes it: `read`, `readAll`, `write`, `delete` and each change of a
batch take one of the six data stores (`StoreName`), and any other name throws a plain `Error`, a
caller defect.

## Data versions

One numbering covers the whole database:

- **The database's data version** is one integer, `DATABASE_DATA_VERSION`, 1 in v3.0. It is the
  IndexedDB version the database is opened with, the `dataVersion` held in `meta`, and the number
  of migration steps.
- **A record's data version** is the data version at which its store's current record shape was
  introduced, so it is never above the database's. Each codec owns that number for its store
  (`SETTINGS_DATA_VERSION` for the settings); in v3.0 every one is 1.
- **A migration to data version N rewrites only the stores whose shape changes at N**, giving
  their records data version N. The records of every other store keep their number, so an older
  tab still reads them.

Every record also carries `appVersion`, the non-empty package version of the app that wrote it.

## The record envelope

`RecordVersions` (`dataVersion`, `appVersion`) is defined once, in `record-envelope.ts`, and every
codec builds its records on it.

Reading is tolerant. `readEnvelope(value, shapeVersion)` classifies a stored value against the
shape version its codec reads, in exactly one of three readings:

| Reading      | When                                                                                                                                   | What the codec does                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `current`    | A plain object with an integer `dataVersion` ≥ 1 equal to the shape version, and a non-empty `appVersion`.                             | Reads it.                                              |
| `newer`      | The same, but the data version is above the shape version.                                                                             | Leaves it unread: a newer app wrote it, never misread. |
| `unreadable` | Not a plain object; a version field missing, ill-typed or empty; or a data version below the shape version, which no migration leaves. | Treats it as a value it cannot use.                    |

It never throws for anything stored. "Rejected on read" always means unreadable, handled by the
codec's tolerant loading, never an exception.

Writing is strict. Before every write the port runs `assertWritableVersions(record, dataVersion)`:
a record without valid versions, or with a data version above the database's, throws a plain
`Error` before anything is stored. That is a defect of the caller, not stored data, so it crashes
early rather than being reported as a `StorageError`. Each write of a batch gets the same check.

## Batches

`apply(changes)` applies a list of `StorageChange` values, each a write (`store`, `key`, `record`)
or a delete (`store`, `key`), in one readwrite transaction spanning `meta` and every store the
batch names. The changes run in list order, so a later change to the same key wins.

It is all or none. The transaction reads `meta` first, as a single write does; when it finds a
newer data version, or a put fails for lack of space or anything else, nothing of the batch is
stored. It is refused like `write`: with `outdated` in an outdated tab, `other` on an unavailable
or deleted port, `quota` when the browser lacks space.

Before anything is stored the port checks every change. An empty batch, a store that is not a data
store, an unknown kind of change, or a write without valid versions throws a plain `Error`: a
defect of the caller, and nothing is written.

## Migrations

A migration step is `{ toVersion, migrate(upgrade) }`, where `upgrade` gives the database being
upgraded and its upgrade transaction. When opening finds a stored version below the code's, the
runner, inside the upgrade transaction, runs in order every step whose `toVersion` is above the
stored version, then writes `meta` with the code's data version and the running app's version.

- **Step 1**, from an empty database, creates the seven stores. `PRODUCTION_MIGRATIONS` holds it
  alone in v3.0.
- **The steps must run 1, 2, … N without a gap.** `migrationsDataVersion` checks the list when the
  port opens and throws otherwise, before any database is created: a configuration defect.
- **A step that throws** rolls the upgrade back and makes the open reject with a
  `MigrationStepError` naming the step: a defect, never reported as a storage failure.
- **An empty app version** also makes the open reject.

The production list is the default. A caller may pass its own list through the port's
`migrations` option; the unit tests use that to add a synthetic step 1 → 2, so no test-only branch
exists.

To change the stored data later, add a step; never edit a released one, since databases in the
field have already run it:

1. A new store, or a new record shape for an existing store, is a new step with the next
   `toVersion`, appended to `PRODUCTION_MIGRATIONS`. `DATABASE_DATA_VERSION` follows from the list.
2. The step creates the new store, or rewrites the records of each store whose shape changes,
   giving them the new data version. It leaves every other store alone.
3. The codec of each changed store raises its own shape version to the new number.
4. A unit test opens a database at the old version holding old records and checks what the step
   leaves, the untouched stores included.

## Outdated tabs and the port's states

`status()` gives the port's state:

| Status        | Meaning                                                                      | Reads                           | Writes, deletes, batches | Delete everything       |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------- | ------------------------ | ----------------------- |
| `ready`       | Open at the code's data version.                                             | Yes                             | Yes                      | Yes                     |
| `outdated`    | A newer app has written data. Permanent for that port.                       | Yes, through a versionless open | Refused with `outdated`  | Refused with `outdated` |
| `unavailable` | The open failed for any other reason (storage blocked, a damaged `meta`, …). | Refused with `other`            | Refused with `other`     | Yes                     |

Opening never rejects for a storage failure: it gives an `unavailable` port instead, so a visit
whose read failed can still offer Delete everything, which needs no open connection. It rejects
only for the defects listed under [Migrations](#migrations).

The port becomes outdated on any of four triggers:

1. **At open, a `VersionError`**: a newer app has already upgraded the database past the code's
   data version. The port reopens it without a version, for reading only.
2. **At open, a newer `meta`**: `meta` holds a data version above the code's.
3. **While open, a `versionchange` event**: another connection is upgrading the database (a newer
   tab) or deleting it (another tab's Delete everything). The port closes its connection so it
   never blocks that change.
4. **While open, a newer `meta` in a write, delete or batch**: every write, delete and batch runs
   in a transaction that reads `meta` first. When a newer tab has raised the data version without an
   upgrade, the transaction aborts, touches nothing, and the call is refused with `outdated`.

Once outdated, every write, delete, batch and Delete everything is refused with `outdated` and touches
nothing. Reads still work: after a `versionchange` closed the first connection, the next read
reopens the database without a version, on demand. That reopening never creates the database:
when another tab deleted it, the read is refused with `other`, so deleted data never comes back as
an empty database.

`onOutdated(listener)` tells each listener once when the port becomes outdated later in the visit,
after it opened `ready`, so the save policy can turn saving off; it returns an unsubscribe
function. A port that opens outdated tells nobody: its caller reads `status()`.

After Delete everything the port is in a fourth, internal state, deleted: `status()` reports
`unavailable`, and every later call is refused with `other`. The page then reloads.

## Errors

Every refusal is a `StorageError` whose `kind` is one of:

- `quota`: the browser refused a request or its transaction for lack of space (a
  `QuotaExceededError`);
- `outdated`: the tab is outdated (see above);
- `other`: any other storage failure, an unavailable or deleted port, or a missing storage
  manager.

The browser's own error is kept as the refusal's `cause`. Defects of the caller (an unknown store,
a record without valid versions, an empty batch, migration steps with a gap) throw a plain `Error`
instead.

## Delete everything

`deleteEverything()` closes the port's connection and deletes the whole `infinite-flow` database.
It runs on a `ready` or `unavailable` port and is refused with `outdated` on an outdated one, since
an outdated tab offers no deletion of any kind. Other tabs see a `versionchange`, close their
connections and become outdated. Every later call on the port is refused with `other`.

## Space and persistence

`estimate()`, `persisted()` and `persist()` go to the injected storage manager: the space used and
available, whether the browser keeps the data under storage pressure, and the request to make it
so. Without a storage manager (an insecure context), all three are refused with `other`. The port
does not refuse `persist()` in an outdated tab: when to ask is the save policy's decision (see
[Persistent storage](#persistent-storage)).

## The save policy

`createSavePolicy(port)` wraps an open port. The app saves through the policy, never through the
port directly, and the policy decides what reaches the port. It is pure: the port is injected, and
it keeps no clock.

### Saving states

`state()` gives one of three saving states, and `onStateChange(listener)` tells each change; it
returns an unsubscribe function.

| State            | Meaning                                             | Entered                                                                                           |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `on`             | The visit saves.                                    | At creation, over a `ready` port.                                                                 |
| `off-outdated`   | A newer version of the app has written data. Final. | At creation over an `outdated` port; when the port's `onOutdated` fires; on a refusal `outdated`. |
| `off-unreadable` | The saved data could not be read at start-up.       | At creation over an `unavailable` port; on `stopSavingUnreadable()`.                              |

The app calls `stopSavingUnreadable()` when the start-up read fails or takes too long. Both off
states last for the rest of the visit. `off-outdated` is final: newer data wins over a failed read,
so `off-unreadable` can still turn `off-outdated`, never the other way.

While saving is off, every write, delete and batch is skipped and reaches no database.

### Writing

`write(store, key, record)`, `delete(store, key)` and `save(changes)`, a batch, go to the port at
once while saving is on and no session runs. An empty batch is a defect and throws a plain `Error`.
Each resolves with one outcome:

- `saved`: the port stored it;
- `held`: a session runs, and it waits for the session's end;
- `skipped`: saving is off, or the port refused it as `outdated` (saving then turns `off-outdated`);
- `failed`: the port refused it for lack of space or another failure; it is reported.

A refusal never rejects: the call resolves `skipped` or `failed`. A defect of the caller, such as a
record without valid versions, still throws a plain `Error`.

### The session hold

`hold()` is called when a session starts, at Start; `release()` when it ends. Holding twice, or
releasing without a hold, is a defect.

While held, nothing reaches the database. Each write, delete and batch is queued and resolves
`held`; a later change to the same record (same store, same key) replaces the earlier one, so only the latest
change per record is kept. `release()` flushes the queue as one batch, in one transaction, and
resolves with its outcome: `saved` when nothing was held, without a call to the port. A defective
change held throws its plain `Error` here.

When saving turns off during a session, the queue is dropped and never flushed; `release()` then
resolves `skipped`. A flush the port refuses is not retried: its changes are lost, and the refusal
counts like any other. After the release, saves go to the port at once again.

### Failure report

`onFailure(listener)` takes one listener at a time; a second one is a defect. It returns an
unsubscribe function, after which a new listener may be set.

The listener is told the kind of a failed save, `quota` or `other`; an `outdated` refusal is never
reported. A run of refusals with no successful save between them is told once, at its first
refusal; the first refusal after a success starts a new run. A refusal made while no listener is
attached still counts toward its run. A release with nothing held reaches no port, so it does not
end a run.

### Persistent storage

`requestProtection()` asks the browser to keep the saved data under storage pressure, at most once
per visit. It resolves with one outcome:

- `granted` or `refused`: the browser's answer;
- `already-protected`: the data already is persistent, so nothing was asked;
- `not-asked`: saving is off, or the visit has already asked;
- `failed`: the storage manager refused the call, for example when there is none. It is not
  reported as a failed save.

It is never asked while saving is off, and a call made then does not use up the visit's request.
During a session the request waits for the release, and runs right after the session's saves are
flushed; when saving turns off meanwhile, it is not asked.

### Your data and Delete everything

`estimate()` and `persisted()` go straight to the port, for Your data.

`deleteEverything()` runs while saving is on and in `off-unreadable`, so a visit whose saved data
could not be read still offers it. In `off-outdated` it is refused with `outdated` without reaching
the port. During a session it is a defect and throws a plain `Error`. Its refusal goes to the
caller, not to the failure listener.

After a successful Delete everything the port refuses every later write with `other`; the app
reloads the page then.

## The app version

`src/storage/app-version.ts` exports `APP_VERSION`, the compile-time constant `__APP_VERSION__`
(declared in `src/env.d.ts`). It throws at load when the constant is not a non-empty string, so a
build that forgot to inject it fails loudly instead of writing records nothing could tell apart.
The app passes it to the port as `appVersion`.

`scripts/app-version-define.mjs` reads `package.json`'s `version` and returns the Vite `define`
entry `{ __APP_VERSION__: "<version>" }`; it throws when there is no non-empty version. Four
configs use it: `vite.config.ts` (the app), `vitest.config.ts` (the unit tests), and the two
harnesses, `vite.workspace-harness.config.ts` and `vite.notation-harness.config.ts`. The perf and
sweep Vitest configs never reach `src/storage/` and are left alone. A new config whose code
reaches `src/storage/app-version.ts` must add the same `define`, or that code fails at load.

## Tests

The unit specs live in `tests/unit/storage/`, on an in-memory IndexedDB (see
[Fake IndexedDB and storage manager](testing.md#fake-indexeddb-and-storage-manager)):

| Spec                            | What it checks                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `record-envelope.spec.ts`       | The three readings and the write check.                                                                                         |
| `database.spec.ts`              | Opening at data version 0 and 1, the seven stores, `meta`, a synthetic step 1 → 2, untouched stores, and the open-time defects. |
| `storage-port.spec.ts`          | Writes and reads, the write check, quota and other failures, the storage manager, Delete everything, and an unavailable port.   |
| `storage-port-outdated.spec.ts` | The four outdated triggers, listeners told once, reads that go on, and another tab's Delete everything.                         |
| `storage-port-batch.spec.ts`    | Batches across stores, list order, one transaction, all or none on a failure, the refusals, and defective batches.              |
| `save-policy.spec.ts`           | The saving states and their changes, saving at once, skipping while off, and the session hold.                                  |
| `save-policy-reports.spec.ts`   | The failure report and its runs, and the request for persistent storage.                                                        |
| `save-policy-your-data.spec.ts` | The estimate, persistence, and Delete everything in each saving state and during a session.                                     |
| `app-version.spec.ts`           | `APP_VERSION` is `package.json`'s version.                                                                                      |
| `settings-record.spec.ts`       | The settings codec, whose version check is the envelope's.                                                                      |

`tests/unit/boundaries/eslint-boundaries.spec.ts` checks the import ban on `src/session/` and
`src/export/`.

## Not here yet

Chunks 4 and 5 build the storage core and the save policy, and nothing that uses them. Nothing in
the app uses the policy until chunk 7 wires it. These come later:

- the start-up wait for saved settings, and the call to `stopSavingUnreadable()` when that read
  fails or is too slow;
- the calls to `hold()` and `release()` at a session's start and end;
- the notices the player sees, from the saving state and the failure report;
- the moment the app calls `requestProtection()`.

No application code imports the port or the policy yet, and the entry chunk does not include them.
