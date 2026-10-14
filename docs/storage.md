# On-device storage

This document records how the app keeps data on the player's device: the one directory that
touches browser storage, the port the rest of the app reaches it through, the database and its
stores, how stored records are versioned and migrated, what happens in a tab that a newer version
of the app has overtaken, the app version every record carries, the records a kept session is
stored as, and the save policy that decides when a write reaches the port. Its declared intent is
the ATD atom [`module_on_device_database`](module_on_device_database.atom.md).

As built in v3.0 chunks 4, 5, 9, 7 and 8, this is the storage core, the save policy, the
kept-session codec, the load of the saved settings before the first draw, the saves of the
player's settings as they change, and the notices that tell the player about saving. See
[Not here yet](#not-here-yet).

## Words used here

- **Port**: the interface the app sees, `StoragePort`. The app is handed one and never opens the
  browser's storage itself.
- **Store**: an IndexedDB object store, one per kind of record.
- **Record**: one stored value, written under a string key.
- **Data version**: an integer naming a stored shape. The database has one; each store's record
  shape has its own.
- **Codec**: the pure code that turns one kind of record into stored values and back
  (`src/storage/records/`: the settings codec and the kept-session codec so far).
- **Kept session**: a finished session stored on the device, as up to three records under one key.
- **Outdated tab**: a tab running an older app than the one that last wrote the data. It still
  reads, and never writes.
- **Batch**: a list of writes and deletes, possibly across stores, applied in one transaction.
- **Save policy**: the code between the app and the port that decides whether a write is saved at
  once, held until the session ends, or skipped because saving is off.
- **Start-up wait**: how long the first draw waits for the saved data before starting from the
  defaults.
- **Load outcome**: whether the visit started from the saved data read or from the defaults.

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

| File                              | What it holds                                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage-port.ts`                 | `openStoragePort(options)`, the `StoragePort` interface, `StorageChange` (one change of a batch), `StorageError` and its kinds, and `browserStorage()`, which gives the browser's own IndexedDB factory and storage manager. |
| `save-policy.ts`                  | `createSavePolicy(port)`, the `SavePolicy` interface, the saving states, the save outcomes and the failure kinds.                                                                                                            |
| `save-policy-requests.ts`         | The policy's requests beyond saving: persistent storage, the space used, whether the data is persistent, and Delete everything.                                                                                              |
| `database.ts`                     | The database name, the stores, the migration steps and their runner, and the raw IndexedDB transactions, over a small hand-written promise wrapper (no `idb` or other library).                                              |
| `record-envelope.ts`              | `RecordVersions`, the two version fields every record carries, the envelope reader `readEnvelope` and the write check `assertWritableVersions`.                                                                              |
| `app-version.ts`                  | `APP_VERSION`, the running app's package version.                                                                                                                                                                            |
| `records/settings-record.ts`      | The settings codec, which reads its records through the envelope.                                                                                                                                                            |
| `records/kept-session-record.ts`  | The kept-session codec: `encodeKeptSession`, `decodeKeptSession`, the decoded `KeptSession` and `KeptPhrase`, and the facts and records they take and give.                                                                  |
| `records/kept-session-summary.ts` | The session-wide record, its allowlist of keys, and `decodeKeptSessionSummary`, which reads it alone.                                                                                                                        |
| `records/kept-session-body.ts`    | The body record and the allowlist of a kept phrase's keys.                                                                                                                                                                   |
| `records/kept-played-notes.ts`    | The played-notes record and the allowlist of a kept note's keys.                                                                                                                                                             |
| `records/kept-phrase-parsers.ts`  | `parseKeptHarmony`, `parseKeptIntent`, `parseKeptProfileSelection`, and `isKeptPhraseRefusal`, the test of what counts as a refusal.                                                                                         |
| `records/kept-record-shape.ts`    | `KeptRecordError` and the shape readers the kept-session validators share.                                                                                                                                                   |
| `records/kept-reading.ts`         | `KEPT_SESSION_DATA_VERSION`, the `KeptReading` a decode gives, and `readKept`, which reads the envelopes first.                                                                                                              |

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
database. The port never exposes it: `read`, `readAll`, `readKeyed`, `write`, `delete` and each
change of a batch take one of the six data stores (`StoreName`), and any other name throws a plain `Error`, a
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

## The keyed read

`readKeyed(store)` gives every entry of a store as a `StoredEntry`, its `key` and its raw `value`,
in key order, read in one read-only transaction (`getAllKeys` and `getAll` in the same
transaction, so they pair up one to one). An entry whose key is not a string is left out, never
thrown on: the app writes string keys only. It is refused as `readAll` is: with `other` on an
unavailable or deleted port; an outdated tab still reads. `readAll` stays, for stores whose
records carry their own key (`settings`) or need none.

The load reads the kept sessions' summaries this way, and so does the session's save (see
[The session's save](#the-sessions-save)): a kept session's key is in no record, so only the
keyed read can name the body to open or the records to delete.

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

## Kept sessions

A kept session is stored as up to three records, all under one key: the session-wide record in
`sessionSummaries`, the body in `sessionBodies`, and the played notes in `playedNotes`, only when
the player keeps them. The key is `session-{startedAt}-{sessionSeed}`, both in decimal (the
session's wall-clock start in epoch milliseconds and its session seed), minted once by the
session's save (`keptSessionKey`). It is in no record, and no code reads a fact back from it.

`src/storage/records/kept-session-record.ts` is the codec:
`encodeKeptSession(history, facts, appVersion)` gives the records, and
`decodeKeptSession(stored)` reads them back. It is pure: it never opens the database, reads a
clock or draws a seed.

All three shapes are at data version 1 (`KEPT_SESSION_DATA_VERSION`). Every time in them is in
seconds from phrase 1's scheduled start, never on the audio clock.

### What each record holds

Each record holds the envelope's two versions, then exactly these keys, and no other:

| Record       | Keys                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session-wide | `startedAt`, `lengthSeconds`, `phraseCount`, `musicalProfile`, `instrument`, `startingTempo`, `tempoReached`, `pinned`, `favoritesCount`, `comment`, `playedNotesKept`, `recordedByAppVersion`, `sessionSeed`. |
| Body         | `phrases`, in sounding order, each with `phraseNumber`, `startsAt`, `request`, `timeline`, `harmony`, `intent`, `tempo`, `isRepeat`, `repeatOf` (only on a repeat), `favorite`, `clef`.                        |
| Played notes | `notes`, in onset order, each with `pitch`, `velocity`, `onset`, `release`.                                                                                                                                    |

The session-wide record holds what a list row shows:

- `startedAt`: the session's wall-clock start, in epoch milliseconds.
- `lengthSeconds`: from phrase 1's scheduled start to the end of the last phrase that sounded
  (four measures at its tempo).
- `phraseCount` and `favoritesCount`.
- `musicalProfile`: the selection at Start, the profile and whether it was customized.
- `instrument`: its `id` and its `displayName` as shown then.
- `startingTempo`, phrase 1's, and `tempoReached`, the last phrase's.
- `pinned`, `comment` (at most 500 characters, empty until written) and `playedNotesKept`.
- `recordedByAppVersion`: the app version that recorded the session. It is the session's own
  fact: the envelope's `appVersion` names the app that last wrote the record, and a migration
  rewrites it; this one never changes.
- `sessionSeed`: kept mainly for debugging. Nothing derived from it is stored.

A body phrase holds the generation request and the concert timeline as shown, the harmony its
chord symbols come from, and its generation intent, with the instrument profile as data. Its
`clef` is the clef the session history recorded the phrase in: the clef of the written phrase Idle
showed at Start, treble for a built-in instrument, treble or bass for my instrument. It is copied
from the history, never looked up from my instrument as it is now, so a later change of my
instrument's clef leaves a kept session as it was.

Nothing else is kept: no acknowledgement, no rhythm or tension provenance, no diagnostics. The
encoder copies every field by name onto fresh records, so what the history holds beyond them never
reaches storage. A played note is kept only when it falls in a phrase; one played before phrase 1
is not.

### Encoding

The encoder takes the finished session's history and the facts the history does not hold:
`pinned`, the numbers of the favorite phrases, the comment and whether the played notes are kept.
It throws a plain `Error`, a defect of the caller, for:

- a history with no phrase, or an empty app version;
- a comment over 500 characters;
- a favorite that is not a phrase of the session, or is listed twice;
- a phrase played on another instrument than the session's.

### Decoding

`decodeKeptSession` gives a `KeptReading`: `current` with the value, `newer` or `unreadable`. It
reads the envelopes first, of every record stored:

- any newer record leaves the whole session unread, as `newer`, whatever the others hold;
- otherwise any unreadable envelope makes it `unreadable`.

Current records are then validated, and anything invalid or inconsistent makes the session
`unreadable`. Nothing is repaired, defaulted or partly read. Every field is checked by the domain's
own parser where one exists: `parseGenerationRequest`, `parseConcertEventTimeline` and
`parseConcertPitch`, with `isInstrumentClef` for the clef. `kept-phrase-parsers.ts` adds
`parseKeptHarmony` and `parseKeptIntent` for what no domain parser covers. An intent's instrument
profile is read from the data it holds, through the domain's profile parser, and never rebuilt from
its id, so a phrase reads back as it was played.

The records must also agree:

- the body holds the summary's phrase count and favorites count;
- every phrase was played on the summary's instrument;
- a played-notes record exists exactly when `playedNotesKept` is true;
- each phrase's request and intent agree on the request id and the seed;
- phrase numbers and starts strictly increase, from phrase 1 at 0;
- `repeatOf` is present exactly on a repeat, and names an earlier phrase;
- the notes are in onset order, none before phrase 1's start, none released before its onset.

Only a refusal of a stored value turns into `unreadable`: an error that `isKeptPhraseRefusal`
recognizes, from the kept-session validators or the domain parsers they call. Any other error is a
defect and is thrown.

The decoded value is a `KeptSession`: the `summary` and the `phrases`, each a `KeptPhrase`. A
`KeptPhrase` is a `ReviewedPhrase` with its repeat mark, its favorite mark and its clef. Its
outcome holds only what the records hold: the `result` (the request id and seed of the stored
request, and the timeline) and `provenance.harmony`. The played notes are placed in the phrases by
`withPlayedNotes`, exactly as the session history places them.

`decodeKeptSessionSummary` reads the session-wide record alone, the same way, for the session list.

### What the review and the exports read

`ReviewedPhrase` and `ReviewedOutcome` (in `src/session/session-history.ts`) are the parts of a
phrase the review and the exports read. `SessionHistoryRecord` extends `ReviewedPhrase`, and the
review components, the export modules and `ExportableHistory` take the narrower type. So a decoded
kept session reviews and exports exactly as the live history did, byte for byte.
`src/session/` and `src/export/` still never import `src/storage/`.

### Size

A 30-minute session at 240 BPM in Jazz with Sixteenth density measures 4.07 MB (UTF-8 JSON) for
its session-wide record and body, about 9 KB a phrase: each phrase keeps its timeline, harmony and
intent in their domain form. The v3.0 spec estimated about 3.5 MB. Its played notes, at one note per
shown note, add about 1.47 MB.

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

The listener is told the kind of a failed save, `quota` or `other`, and whether the report starts
a run (`listener(kind, startsRun)`); an `outdated` refusal is never reported. A run of refusals
with no successful save between them is told at its first refusal (`startsRun` true), and again
each time a refusal's kind differs from the last one told in the run (`quota` after `other`, or the
reverse; `startsRun` false); a refusal of the same kind as the last one told is not told again.
The first refusal after a success starts a new run. A refusal made while no listener is attached
still counts toward its run. A release with nothing held reaches no port, so it does not end a
run. `startsRun` is what lets the notice row keep a dismissed notice away for the rest of its run
(see [The notices](#the-notices)).

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

`estimate()` and `persisted()` go straight to the port, for Your data. So does
`readKeptSession(key)`, the read of one kept session's records (summary, body and played notes,
raw, `undefined` where none is stored) for its review; saving off does not stop it, and a refusal
goes to the caller.

`deleteEverything()` runs while saving is on and in `off-unreadable`, so a visit whose saved data
could not be read still offers it. In `off-outdated` it is refused with `outdated` without reaching
the port. During a session it is a defect and throws a plain `Error`. Its refusal goes to the
caller, not to the failure listener.

After a successful Delete everything the port refuses every later write with `other`; the app
reloads the page then.

## The load before the first draw

`src/storage-bootstrap.ts`, beside `main.ts`, loads the saved data before the workspace is first
drawn. `main.ts` registers the service worker, then calls `loadSavedData(browserSavedDataLoad())`
and mounts the app with what it gives (`App.vue`'s `savedData` prop); until then the page shows
only its background, in the system's light or dark theme. The workspace is then drawn once, with
the loaded values, and no control changes value after it is drawn. Nothing is generated until the
player asks, as before. The workspace harness runs the same loader (see
[Saved data in the harness](testing.md#saved-data-in-the-harness)).

### What the load reads

`loadSavedData(dependencies)` opens the port, creates the visit's save policy over it, and reads,
in parallel, every record of `settings` and `controller`, and every entry of `sessionSummaries`
with its key (the keyed read). The settings go
through the settings codec (`decodeSettings`), each checked on its own: an unknown or no longer
valid value takes its setting's default, silently, and every other value is kept. My instrument is
not stored yet, so a saved selection of it falls back to the default instrument. The summaries,
with their keys, and the controller's records are handed on raw, for the session list, the most
recent session and the remembered controller to decode.

Its dependencies are injected: `openPort`, `startupWait` (a promise that resolves when the wait
ends) and `mixDesign` (the audio mix's defaults and range, from the stylesheet's `--mix-*`
tokens). `browserSavedDataLoad()` gives the app's: the port over the browser's IndexedDB at
`APP_VERSION`, the browser's timer, and the loaded stylesheet.

### The outcomes

The load races the open, then the read, against the start-up wait (`STARTUP_WAIT_MS`, 2 s). It
never rejects for a storage failure; it rejects only for a defect, of the open (see
[Migrations](#migrations)) or of the read (an error that is not a `StorageError`).

| Case                                                               | Settings | Saving state     | Load outcome            |
| ------------------------------------------------------------------ | -------- | ---------------- | ----------------------- |
| A read within the wait (a first visit, nothing saved, included)    | Saved    | `on`             | `saved-data-read`       |
| A port that opened outdated, and read                              | Saved    | `off-outdated`   | `saved-data-read`       |
| A read refused (any `StorageError`), or an unavailable port        | Defaults | `off-unreadable` | `started-from-defaults` |
| A read still running when the wait ends                            | Defaults | `off-unreadable` | `started-from-defaults` |
| A port that opened outdated, whose read fails or outlasts the wait | Defaults | `off-outdated`   | `started-from-defaults` |
| A port that opens only after the wait                              | Defaults | `off-unreadable` | `started-from-defaults` |
| A port that opens outdated only after the wait                     | Defaults | `off-outdated`   | `started-from-defaults` |

When the read fails or the wait ends first, the load calls `stopSavingUnreadable()`, so a failed
read never overwrites what is kept; an outdated port's policy is already `off-outdated` and stays
so. A read that finishes after the wait is ignored for the visit. A port that opens after the
wait gets its policy then, and `stopSavingUnreadable()` at once. A port that turns outdated later
in the visit turns the policy `off-outdated` through `onOutdated`, whatever the outcome.

### What the load gives

`loadSavedData` resolves with a `SavedDataLoad`:

| Field                  | Holds                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `outcome`              | The load outcome, `LoadOutcome`: `'saved-data-read'` or `'started-from-defaults'`.                                                            |
| `settings`             | Every setting the workspace is first drawn with (`SavedSettings`): saved, or its default.                                                     |
| `keptSessionSummaries` | The kept sessions' summaries as `StoredEntry` values, key and raw value, in key order; empty when the visit started from the defaults.        |
| `rememberedController` | The remembered controller's records, raw; empty when the visit started from the defaults.                                                     |
| `savePolicy`           | `Promise<SavePolicy>`: settled before the first draw when the port opened within the wait; otherwise once the port opens, saving already off. |

The load outcome is the one fact the saving state cannot carry: `off-outdated` comes both with the
saved data read and with the defaults on screen. The outdated-tab notice reads it for its wording.
The app reaches the load through `App.vue`'s `savedData` prop and, below it, the workspace
session's `savedData` (`composeWorkspaceSession` passes it on unchanged).

### Where the loaded values go

Each place gains its initial value; the saves come from the player's change handlers (see
[Saving the player's settings](#saving-the-players-settings)).

| Setting                                                   | Enters at                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The 14 controls, the musical profile selection, the theme | The Idle generation session's first state (`initialSettings`); `App.vue` applies the theme from that state before the first draw.                      |
| The audio mix                                             | The audio transport's `loadedMix`, read on its first use, its volumes checked against the design's range.                                              |
| The three "During a session" options                      | The session controller's creation (`savedSessionOptions`), never through its actions; until its chunk has loaded, the controls show the loaded values. |
| The review's preferences                                  | The review host's first values (`WorkspaceShell` and `ScorePanel`'s `savedReviewPreferences`).                                                         |
| `Keep my played notes`                                    | Decoded, not used yet.                                                                                                                                 |

A saved `Rising tempo` `On` loads even with no MIDI controller attached, which is the usual state
at load: the controller's flag holds the stored `On`, the option shows `Off` and disabled while it
is unavailable, and `On` again as soon as a controller attaches.

### The loaded profile selection

The settings codec decodes the musical profile selection and the seven values a preset controls
(harmonic motion, note density, rhythmic variety, syncopation, silence density, contour and
register) each on its own, so one of them can fall back to its default alone. After decoding, a
preset selection that is not customized, whose seven values are not all that preset's own, loads
customized with that preset's grammar, the state a manual edit of one of them leaves; a preset
whose seven values are all its own stays checked (spec D302). An unreadable selection falls back
to Neutral, so with Jazz's seven values it loads as a customized Neutral. Silent, like every
fallback of the load.

## Saving the player's settings

Each setting of the master spec's §4.2 table is saved when the player changes it, one record per
setting in the `settings` store, through the save policy. The saves come from the player's change
handlers only, never from a watcher on control values: a watcher would also save a setting
`Vary settings` changed during a session, the end-of-session restore and the rising tempo's reset,
none of which the player chose.

`src/storage/settings-saver.ts` builds the visit's saves over the policy the load hands over:
`createVisitSaves(savePolicy, appVersion)` gives `saveSettings(changes)`, which encodes one record
per changed setting and submits them as one batch (one transaction), and the session's `hold()`
and `release()`. Calls made before the policy promise settles wait in order; once it has, they
reach the policy at once, so the hold takes effect inside the Start click.
`composeWorkspaceSession` builds it once; `App.vue` provides `saveSettings` to the components
(`SAVE_SETTINGS`, `src/components/workspace/save-settings-injection.ts`).

| Setting                                | Saved from                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The 14 controls, the profile selection | The generation session's `setControl`, `selectMusicalProfile` and `selectInstrumentProfile`: what each change changed (`chosenControlChanges`). |
| The theme                              | The generation session's `setTheme`, when the theme changed.                                                                                    |
| The audio mix                          | `MixControls` (each on/off) and `MixVolumePanel` (each volume, on the slider's release: its `change` event, not each `input`).                  |
| The three "During a session" options   | `useSessionOptions`, once the session controller accepted the change.                                                                           |
| The review's preferences               | The review host's `setFormat`, `setBackingTrack` and `setPlayedNotesShown`.                                                                     |

The values saved are the player's choices: a chosen `Sixteenth` below `bp-tablet-landscape` is
saved as `Sixteenth`, though phrases are generated with `Eighth` there. The tempo a Rising-tempo
session reached is never saved.

The session controller calls `hold()` when it accepts a Start and `release()` in the teardown
every end and every undone start runs, so a theme or mix change made during a session is written
when it ends (see [The session hold](#the-session-hold)).

## The session's save

A session that ends with a review (phrase 1 sounded) is saved once, as its review opens, and every
older kept session that is not pinned is deleted in the same save. A session ended in its count-in
and a start undone part-way save, read and delete nothing.

`src/components/workspace/workspace-session-save.ts`, beside the session's ends, builds it:
`saveEndedSession(saves, history)` loads the kept-session codec on demand (a lazy chunk: the first
draw never needs it) and hands the visit's saves a `SessionChanges` function. The end calls it
without waiting (`workspace-session-ends.ts`), so a slow or refused save never delays the end or
the review. It runs in this order:

1. The settings flush: `release()`, a transaction of its own for the settings changed during the
   session, none when nothing changed.
2. The keyed read of `sessionSummaries`, at the save rather than from the load, so a session
   another tab saved meanwhile is counted. A refused read gives no summaries: nothing is deleted,
   and the new session is still saved.
3. One batch (`keptSessionChanges`), one transaction, all or none: first the deletion of the
   summary, body and played notes of every readable kept session that is not pinned, then the new
   session's summary and body under its new key (and its played notes, only when they are kept,
   which they never are before the opt-in). A summary that does not decode, or that a newer app
   wrote, is left in place with its records, since whether it is pinned is unknown (spec O200's
   proposed default). The deletions come first, so a kept session under the very same key is
   replaced, never deleted after the write.

The policy's `saveSession(changes)` runs steps 2 and 3, once no session holds the saves and the
release's flush has been applied; session saves run one after the other. If a new session starts
before the save has read, it waits for that session's end, then reads again. It resolves a
`SessionSaveOutcome` to its caller, apart from the failure listener:

| Outcome                       | When                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `{ status: 'saved' }`         | The batch was applied. It ends a run of refusals, as any successful save does.           |
| `{ status: 'refused', kind }` | The port refused the batch, `quota` or `other`: nothing was written or deleted.          |
| `{ status: 'saving-off' }`    | Saving is off for the visit, or the batch was refused as `outdated`, which turns it off. |

Only a `quota` refusal of the session's save is also told to the failure listener, so the notice
row raises Storage full; an `other` refusal is the caller's alone and raises no notice (Save
failed is for saves other than the session's own), and it leaves the run of refusals as it was.
While saving is off (an outdated tab, or a visit started from the defaults), the session's save
reads, writes and deletes nothing, and every kept session stays.

## The most recent session

The session controller holds the most recent session in `state.mostRecent`, a slot the next Start
does not clear (Start still hides the Review, `state.review = null`): within a visit, the last
session that ended with a review, saved or held in memory only; after a reload, the readable kept
session with the latest start. A session ended in its count-in leaves it as it was, so
`review-link` returns to it; only the next session that ends with a review replaces it.

- **At the end** (`workspace-session-ends.ts`), the Review opens over the session's history
  (`session-review-state.ts`), and the same session, its instrument named from phrase 1's own
  intent, never by id, becomes the most recent one. How it is kept starts as `not-pinned`, or
  `not-saved` at once while saving is off. Saving off is read from the load outcome and the
  policy's state (`keptSessionsOf` in `workspace-kept-sessions-seam.ts`), never by waiting on the
  save's promise, which a port that opens late or never does not settle. When the save resolves,
  `saved` keeps `not-pinned`, and `refused` or `saving-off` turns both the most recent session and
  its Review to `not-saved`.
- **After a reload**, the controller decodes the summaries the load read (`mostRecentKept` in
  `workspace-kept-session-read.ts`, in the controller's own chunk) and keeps the key of the
  readable one with the greatest start; a summary a newer version wrote, or one that does not
  decode, is passed over. `Review last session` then reads that session by its key
  (`readKeptSession`), `readingMostRecent` showing the read under way (`review-link` takes
  `is-loading` and `disabled`). The kept-session codec, loaded on demand, decodes it into the
  session the Review draws: its phrases and start, the summary's instrument name, its tempo reached
  and whether it is pinned. Once read it is held in memory, so showing it again reads nothing. A
  refused read, records this version cannot read, or a session started meanwhile show nothing.
- **The keep line** (`ReviewPanel.vue`): "Pinned: kept until you unpin or delete it.", "Not
  pinned: deleted when your next session is saved." or "Not saved on this device: export it to keep
  it."; below `bp-tablet-landscape` (the workspace staff's split layout) only the last. The title is
  "Last session" for the most recent session and the session date otherwise; the summary starts
  with the session date (`session-date.ts`) when the title does not hold it.

## The notices

The notice row at the top of the workspace (`AppNoticeRow.vue`) shows one notice at a time, chosen
by `useAppNotices` (`src/components/workspace/use-app-notices.ts`) from three things the load
gives `WorkspaceShell` (`App.vue`'s `savedData`): the load outcome, and the save policy's saving
state and failure report. The copy and the rules are the saved-data flow's (Notices).

| Saving state     | Notice                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `off-outdated`   | Outdated tab: the saved-data wording when the load outcome is `saved-data-read`, the defaults wording when it is `started-from-defaults`.    |
| `off-unreadable` | Unusable data.                                                                                                                               |
| `on`             | The save-problem notice once a save failed: Storage full for `quota`, Save failed for `other`, switched in place to the latest one reported. |

Before a late-opening port hands its policy over, a visit started from the defaults shows Unusable
data. The port's outdated report carries no cause, so after another tab's Delete everything the
outdated notice shows the newer version's wording, the design's fallback (spec D300). `Dismiss`
removes the save-problem notice until a report that starts a new run. While a session runs the row
keeps the notice it showed at Start, its buttons disabled; what arose meanwhile shows when the
session ends. `Your data` is disabled until the Your data sheet exists.

## The start-up wait (M2)

The start-up wait is `STARTUP_WAIT_MS`, 2 s, the design's proposal: at most 2 s, and well above the
slowest read measured. `npm run measure:startup-read` times the load (`loadMs`, from its start to
the settings decoded) on the workspace harness in Chromium, over a database seeded with the
settings and 0, 10, 100 and 500 kept sessions, each a session-wide record with a 500-character
comment and a body of about 100 kB (the load never reads bodies), cold (the first load after the
browser starts on its profile) and warm (five reloads).

Measured on 2026-10-14 on an AMD Ryzen 5 PRO 8640HS laptop (12 threads, no virtual machine),
headless Chromium through Playwright, two runs; the slower figure of the two, in milliseconds:

| Kept sessions | Cold | Warm, slowest of five |
| ------------- | ---- | --------------------- |
| 0             | 8.0  | 3.7                   |
| 10            | 15.4 | 3.1                   |
| 100           | 8.5  | 4.4                   |
| 500           | 23.0 | 13.9                  |

The slowest read, 23 ms, is about a hundredth of the wait, so 2 s stays: it is the design's
ceiling, and well above every read measured. "Cold" is the first load after the browser starts on
its profile; the operating system's file cache may still hold the database. Hand check H2 repeats
the measurement on the reference machine, and the tablet if at hand
([`HARDWARE-CHECKLIST.md`](../HARDWARE-CHECKLIST.md#h2-start-up-wait-chunk-7-about-10-min)).

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

The unit specs live in `tests/unit/storage/`. Those of the port and the policy run on an
in-memory IndexedDB (see
[Fake IndexedDB and storage manager](testing.md#fake-indexeddb-and-storage-manager)); the
kept-session codec's need no database (see
[Kept-session fixtures](testing.md#kept-session-fixtures)):

| Spec                                    | What it checks                                                                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `record-envelope.spec.ts`               | The three readings and the write check.                                                                                                                                                             |
| `database.spec.ts`                      | Opening at data version 0 and 1, the seven stores, `meta`, a synthetic step 1 → 2, untouched stores, and the open-time defects.                                                                     |
| `storage-port.spec.ts`                  | Writes and reads, the write check, quota and other failures, the storage manager, Delete everything, and an unavailable port.                                                                       |
| `storage-port-outdated.spec.ts`         | The four outdated triggers, listeners told once, reads that go on, and another tab's Delete everything.                                                                                             |
| `storage-port-batch.spec.ts`            | Batches across stores, list order, one transaction, all or none on a failure, the refusals, and defective batches.                                                                                  |
| `storage-port-keyed-read.spec.ts`       | The keyed read: keys and raw values in key order, non-string keys left out, one read-only transaction, `readAll` unchanged, and its refusal.                                                        |
| `save-policy.spec.ts`                   | The saving states and their changes, saving at once, skipping while off, and the session hold.                                                                                                      |
| `save-policy-reports.spec.ts`           | The failure report and its runs, and the request for persistent storage.                                                                                                                            |
| `save-policy-your-data.spec.ts`         | The estimate, persistence, and Delete everything in each saving state and during a session.                                                                                                         |
| `save-policy-kept-session-read.spec.ts` | The read of one kept session's records by its key, raw, in an outdated tab too, and its refusal.                                                                                                    |
| `save-policy-session.spec.ts`           | The session's own save: the keyed read at the save, its order after the flush, waiting for a hold, one save after the other, each outcome, the failure listener for `quota` only, and saving off.   |
| `app-version.spec.ts`                   | `APP_VERSION` is `package.json`'s version.                                                                                                                                                          |
| `settings-record.spec.ts`               | The settings codec, whose version check is the envelope's, and the loaded profile selection.                                                                                                        |
| `settings-saver.spec.ts`                | The saves of the player's settings: one batch per change, the order kept before and after the policy loads, the hold, and `chosenControlChanges`.                                                   |
| `storage-bootstrap.spec.ts`             | The load before the first draw: the saved settings, an invalid value's default, each failing, late and outdated case with its settings, saving state and load outcome, and the defects that reject. |
| `kept-phrase-parsers.spec.ts`           | The harmony and intent validators: real values read back, frozen copies, each refusal, and an intent's profile read from its data.                                                                  |
| `kept-session-record.spec.ts`           | The kept-session codec: exact keys, nothing kept beyond them, times in seconds from phrase 1, newer and unreadable records, the encoder's refusals, and the size of a 30-minute session.            |
| `kept-session-summary.spec.ts`          | The session-wide record: its facts, its length, the recording app version, and newer and unreadable records.                                                                                        |

`tests/unit/boundaries/eslint-boundaries.spec.ts` checks the import ban on `src/session/` and
`src/export/`.

## Not here yet

Chunks 4, 5, 9, 7, 8 and 10 build the storage core, the save policy, the kept-session codec, the
load before the first draw, the saves of the player's settings, with the session hold, the notices,
the session's save at its end, and the most recent session with its keep line. These come later:

- the Your data sheet the storage-full notice's `Your data` opens;
- the moment the app calls `requestProtection()`;
- the session list, and opening a kept session other than the most recent one; a read of the most
  recent one that fails shows nothing yet, where the design shows the list with that session's row
  failed to open (chunk 14).

The loader imports the port, the policy and the settings codec, so they are in the entry chunk;
the kept-session codec is loaded on demand, by the session's save and by the read of a kept
session; the summaries are decoded in the session controller's chunk.
