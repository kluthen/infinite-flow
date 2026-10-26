---
id: module_kept_session_jam_upgrade_step
status: DRAFT
version: 0.3
priority: 1
human_name: Kept Sessions Carried Over to v3.2's Shape
tags: [v3, release-v3.2, storage, session, jam]
type: MODULE
parents:
  - [[entity_kept_session_record]]
  - [[rule_earlier_sessions_open_without_doodle]]
  - [[rule_kept_session_content]]
  - [[rule_quantized_doodle_is_generation_input]]
dependents: []
layer: ARCHITECTURE
---

# Kept Sessions Carried Over to v3.2's Shape

## INTENT
Carry every session kept before v3.2 over to the kept-session shapes that hold Jam's and the rhythm lock's parts, once, when the database opens, without ever making the open fail on a stored value.

## THE RULE / LOGIC
Data version 4 is reached by one migration step, the fourth of the production list, appended after the step that carries the saved settings over to the presets, so the code's data version is 4. It is the only step v3.2 takes. It changes two kept-session shapes, the session-wide record and the body, which move to data version 4, the data version at which their shape is introduced; the played notes' shape does not change, so their records keep data version 1 and still read: a fresh Jam's raw doodle notes are told apart by the clock its body holds, not by a new played-notes layout. Each kept-session shape keeps its own data version.

The step rewrites each session-wide record and body at data version 2 that the kept-session codec's data version 2 readers can read, into its data version 4 shape, with no Jam part and no fresh Jam's clock. Those readers refuse a stored request holding a rhythm lock group or a steering block, as v3.1's reader did, so such a record is left as it is and reads as unreadable. A rewritten record has no Jam part: the session-wide record says the session is not a Jam session and holds no declined suggestion; the body holds no quantized doodle; every phrase's reproduction inputs hold no rhythm lock group, no steering block, and a carry-in only from a phrase, in the form it had. Every other field, the generated timelines included, is kept as it is, so the session reviews and exports exactly as before. A database at an earlier data version runs every earlier step first, in order, so a session kept by v3.0 reaches data version 4 through data version 2. The records of every other store keep their data version.

Sessions are carried over when the database opens, never when a session is read.

The envelope. A rewritten record's envelope names the upgrading app as the app that wrote it; the session-wide record's own field naming the app version that recorded the session is kept as it is.

Never failing the open. A record the step cannot read is left as it is, for the kept-session codec to report as unreadable. The step never throws on a stored value, in its own body or in any callback of the reads and writes it makes inside the upgrade transaction, since a throw there aborts the whole upgrade and every later open then fails. A request the step makes that fails, for lack of space for instance, still aborts the upgrade: the database stays at data version 3 for that visit, and the next open runs the step again.

## TECHNICAL INTERFACE
src/storage/migrations/kept-sessions-v4.ts exports the step, KEPT_SESSIONS_V4, a MigrationStep with toVersion 4, registered last in PRODUCTION_MIGRATIONS (src/storage/database.ts), after SETTINGS_V3, which makes DATABASE_DATA_VERSION 4; the runner gives it the opening's app version (MigrationUpgrade.appVersion) for the envelopes it rewrites, and runs it only once every earlier step's work is done. It walks sessionSummaries, then sessionBodies, with a cursor, through rewriteInOrder and rewriteEach (src/storage/migrations/rewrite-each.ts), holding the upgrade (MigrationUpgrade.hold) until both walks end, rewriting each record through upgradedKeptSummaryV4(stored, appVersion) and upgradedKeptBodyV4(stored, appVersion), which give null, never a throw, for a record not at data version 2 or not readable; the cursor's update is guarded the same way. They read through the kept-session codec's data version 2 readers, parseKeptSessionSummaryV2 (src/storage/records/kept-session-summary.ts) and parseKeptSessionBodyV2 (src/storage/records/kept-session-body.ts), whose phrases go through parseKeptIntentV2 (src/storage/records/kept-intent-parsers.ts) and refuse a stored request holding a rhythm lock group or a steering block, and write the session-wide record, with isJam false and no suggestionDeclined, and the body, with no doodle and no playedNotesClock, in the shapes the codec reads at data version 4, through rewrittenKeptSummaryRecord and rewrittenKeptBodyRecord; each kept shape's data version is held in src/storage/records/kept-reading.ts, the played notes' staying KEPT_PLAYED_NOTES_DATA_VERSION 1.

## EXPECTATION
- A database at data version 3 holding sessions kept by v3.1, pinned, with favorites, with played notes and with a comment, opens at data version 4; each session opens as before, its exports byte-identical, with no Jam part.
- A database at data version 1 or 2 is brought to 4 through every step in order.
- The kept played notes keep data version 1, and every other store's records keep theirs.
- No stored value makes the step throw, inside its read and write callbacks included; a record it cannot read is left as it is and read as unreadable; the open is never rejected for it.
- A rewritten record's envelope carries the upgrading app's version; the app version that recorded the session is unchanged.
- A data version 2 record whose stored request holds a rhythm lock group or a steering block is left as it is and read as unreadable.
- No session is rewritten when it is read.
