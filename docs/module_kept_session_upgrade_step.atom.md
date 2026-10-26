---
id: module_kept_session_upgrade_step
status: STABLE
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.1, storage, database, versioning, review]
human_name: Kept Sessions Carried Over to Data Version 2
version: 0.4
priority: 1
parents:
  - [[module_on_device_database]]
  - [[module_stored_profile_to_levels]]
  - [[rule_earlier_kept_sessions_carried_over]]
  - [[rule_preset_label_kept_with_session]]
dependents: []
---

# Kept Sessions Carried Over to Data Version 2

## INTENT
Carry every session kept at data version 1 over to the shapes that hold the figure levels and the preset label, once, when the database opens, without ever making the open fail on a stored value.

## THE RULE / LOGIC
Data version 2 is reached by one migration step, the second of the production list, appended after the step that creates the stores, so a database it upgrades is at data version 2 before any later step runs. One data version is given to each stored shape that changes, each with its own step, so each migration is tested on its own and a database is never left half-migrated. Each kept-session shape holds its own data version. This step changes two of them: the session-wide record, whose musical profile selection gives way to the preset label, a stored string, and the body, whose phrases hold the seven figure levels and no musical profile; both move to data version 2. The played notes' shape does not change, so their records keep data version 1 and still read. The step rewrites each session-wide record and body it can read, giving it data version 2; the records of every other store, and the kept played notes, keep their data version, as for every migration.

The phrases. Each body's phrases are read with the kept-session codec's data version 1 phrase reader, which takes all three phrase shapes that data version holds: the figure levels only, kept as they are; a musical profile only, mapped to that profile's levels through the stored-profile mapping; or both, kept when the stored levels equal the profile's mapped levels. Each phrase is written back with its levels only. The generated timelines, and every other field of the records, are kept as they are.

The label. Each session-wide record's musical profile selection becomes the session's preset label: the profile's name, "Neutral" or "Jazz", or "Custom, based on" that name when the selection was customized. It is written by the one preset-label function that also labels a new session at its start, so a session carried over and a session kept later are labelled alike. Whether the selection was customized is read from the selection the record holds, which every readable data version 1 session-wide record holds with its customized mark; a record without that mark is one the step cannot read.

The envelope. A rewritten record's envelope names the upgrading app as the app that wrote it, so the step is given the app version the database is opened with; the session-wide record's own field naming the app version that recorded the session is kept as it is.

Never failing the open. A record the step cannot read is left as it is, at data version 1, for the kept-session codec to report as unreadable. The step never throws on a stored value, in its own body or in any callback of the reads and writes it makes inside the upgrade transaction, since a throw there aborts the whole upgrade and every later open of the database then fails. A request the step makes that fails, for lack of space for instance, still aborts the upgrade: the database stays at data version 1 for that visit, and the next open runs the step again. The step runs inside the upgrade transaction, like every step, and an older tab open meanwhile becomes outdated by the database's version change.

## TECHNICAL INTERFACE
src/storage/migrations/kept-sessions-v2.ts exports the step, KEPT_SESSIONS_V2, a MigrationStep with toVersion 2, registered in PRODUCTION_MIGRATIONS (src/storage/database.ts) after CREATE_STORES, as the second step of the list; the runner gives it the opening's app version (MigrationUpgrade.appVersion, from DatabaseOpening.appVersion) for the envelopes it rewrites. It walks sessionSummaries, then sessionBodies, with a cursor, through rewriteInOrder and rewriteEach (src/storage/migrations/rewrite-each.ts), holding the upgrade (MigrationUpgrade.hold) until both walks end, rewriting each record through upgradedKeptSummary(stored, appVersion) and upgradedKeptBody(stored, appVersion), which give null, never a throw, for a record not at data version 1 or not readable; the cursor's update is guarded the same way. They read through the data version 1 readers of the kept-session codec, parseKeptSessionSummaryV1 (src/storage/records/kept-session-summary.ts) and parseKeptSessionBodyV1 (src/storage/records/kept-session-body.ts), whose phrases go through parseKeptIntentV1 (src/storage/records/kept-intent-parsers.ts), which maps a stored profile through src/storage/records/profile-to-levels.ts, and write the session-wide record and the body in the shapes the kept-session codec reads at data version 2 through rewrittenKeptSummaryRecordV2 and rewrittenKeptBodyRecordV2, each kept shape's own data version held in kept-reading.ts, the played notes' (kept-played-notes.ts) staying 1. The label comes from presetLabel(selection) in src/domain/controls/preset-label.ts, outside src/storage/, which labels a new session's selection too.

## EXPECTATION
- A database at data version 1 holding a session kept by v3.0, one whose phrases hold a profile and its levels, one whose phrases hold levels only, and one damaged record opens at data version 2: the three sessions are carried over, each phrase holding its levels only and each session-wide record its preset label; the damaged record is left as it is and read as unreadable; the open is never rejected.
- A v3.0 session kept with Neutral, with Jazz and with a customized Jazz is labelled "Neutral", "Jazz" and "Custom, based on Jazz", and its review's notation and both exports are byte-identical to before the upgrade.
- A carried-over session with played notes opens with them, its played-notes record still at data version 1.
- A phrase holding both a profile and levels that differ from the profile's, or a session-wide record whose selection lacks its customized mark, is left as it is and its session read as unreadable.
- No stored value makes the step throw, inside its read and write callbacks included: a database seeded with malformed session-wide records and bodies opens.
- A rewritten record's envelope carries the upgrading app's version; the app version that recorded the session is unchanged.
- The records of the stores whose shape does not change at data version 2 keep their data version.
