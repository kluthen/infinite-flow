---
id: module_kept_session_upgrade_step
status: DRAFT
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.1, storage, database, versioning, review]
human_name: Kept Sessions Carried Over to Data Version 2
version: 0.1
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
Data version 2 is reached by one migration step, the second of the production list, appended after the step that creates the stores, so the code's data version is 2. One data version is given to each stored shape that changes, each with its own step, so each migration is tested on its own and a database is never left half-migrated. This step changes the shape of two kept-session stores: the session-wide record, whose musical profile selection gives way to the preset label, a stored string; and the body, whose phrases hold the seven figure levels and no musical profile. It rewrites each record of those two stores that it can read, giving it data version 2. The records of every other store keep their data version, as for every migration.

The phrases. Each body's phrases are read with the kept-session codec's data version 1 phrase reader, which takes all three phrase shapes that data version holds: the figure levels only, kept as they are; a musical profile only, mapped to that profile's levels through the stored-profile mapping; or both, kept when the stored levels equal the profile's mapped levels. Each phrase is written back with its levels only. The generated timelines, and every other field of the records, are kept as they are.

The label. Each session-wide record's musical profile selection becomes the session's preset label, in the form the session list shows it: the profile's name, "Neutral" or "Jazz", or "Custom, based on" that name when the selection was customized. Whether it was customized is read from the selection the record holds; for a record whose selection lacks that mark, from phrase 1's reproduction inputs, which hold the session's start state.

Never failing the open. A record the step cannot read is left as it is, at data version 1, for the kept-session codec to report as unreadable: the step never throws on a stored value, since a step that throws rolls the whole upgrade back and every later open of the database then fails. The step runs inside the upgrade transaction, like every step, and an older tab open meanwhile becomes outdated by the database's version change.

## TECHNICAL INTERFACE
src/storage/migrations/kept-sessions-v2.ts exports the step, a MigrationStep with toVersion 2, registered in PRODUCTION_MIGRATIONS (src/storage/database.ts) after CREATE_STORES, which makes DATABASE_DATA_VERSION 2. It reads each phrase through the data version 1 phrase reader of src/storage/records/kept-phrase-parsers.ts, which maps a stored profile through src/storage/records/profile-to-levels.ts, and writes the session-wide record and the body in the shapes the kept-session codec reads at data version 2 (src/storage/records/kept-session-record.ts, kept-session-summary.ts, kept-reading.ts). Not built yet.

## EXPECTATION
- A database at data version 1 holding a session kept by v3.0, one whose phrases hold a profile and its levels, one whose phrases hold levels only, and one damaged record opens at data version 2: the three sessions are carried over, each phrase holding its levels only and each session-wide record its preset label; the damaged record is left as it is and read as unreadable; the open is never rejected.
- A v3.0 session kept with Neutral, with Jazz and with a customized Jazz is labelled "Neutral", "Jazz" and "Custom, based on Jazz", and its review's notation and both exports are byte-identical to before the upgrade.
- A phrase holding both a profile and levels that differ from the profile's is left as it is and its session read as unreadable.
- No stored value makes the step throw.
- The records of the stores whose shape does not change at data version 2 keep their data version.
