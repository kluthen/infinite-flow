---
id: module_presets_and_kept_sessions_upgrade_step
status: DRAFT
version: 0.2
priority: 1
tags: [v3, release-v3.3, storage, presets, session, chords]
dependents: []
type: MODULE
layer: ARCHITECTURE
human_name: Player Presets and Kept Sessions Carried Over to v3.3's Shape
parents:
  - [[entity_kept_session_record]]
  - [[entity_player_preset_record]]
  - [[module_on_device_database]]
  - [[rule_earlier_kept_sessions_carried_over]]
  - [[rule_earlier_kept_sessions_read_at_off]]
  - [[rule_player_presets_saved_on_device]]
---

# Player Presets and Kept Sessions Carried Over to v3.3's Shape

## INTENT
Carry every player preset and every kept session saved before the Seventh chords level existed over to the shapes that hold it, once, when the database opens, changing nothing else in them and never making the open fail on a stored value.

## THE RULE / LOGIC
Data version 5 is reached by one migration step, the fifth of the production list, appended after the step that carries the kept sessions over to v3.2's shapes, so the code's data version is 5. It is the only step v3.3 takes. It changes two shapes, the player preset record and the kept session's body, which move to data version 5, the data version at which their shape is introduced: a player preset record holds its Seventh chords level, and each phrase of a body holds the level in its generation intent, and its harmony and the chord it carries may hold seventh chords. Every other shape keeps its data version: the kept session-wide record stays at 4 and the kept played notes at 1; in `settings`, the preset selection's record and the figure levels' records stay at 3 and every other setting's record at 1. The saved Seventh chords level is one more record of the settings store, keyed `chordFamilies.seventh-chords`, at data version 1, added with no step, as Jam's and the guides' settings records were: a database without it loads the level at Off.

The step rewrites each player preset record at data version 3, and each kept body at data version 4, that the codecs' earlier readers can read, into its data version 5 shape with the Seventh chords level at Off: in the preset, and in each phrase's generation intent. Nothing else changes: every other field is kept as it is, the harmony (all triads), the generated timelines, the carry-in and the resolved request included, so each player preset loads with the same values and each session reviews and exports exactly as before. A database at an earlier data version runs every earlier step first, in order. The records of every other store keep their data version.

The rewrite is what keeps the earlier records readable: a record below its shape's data version reads as unreadable, so a step that rewrote nothing would lose every earlier player preset and kept session. A tab of the earlier app open on the same device leaves a data version 5 record unread as newer instead of misreading it.

Records are carried over when the database opens, never when a record is read.

The envelope. A rewritten record's envelope names the upgrading app as the app that wrote it; the session-wide record's own field naming the app version that recorded the session is untouched.

Never failing the open. A record the step cannot read is left as it is, and after the upgrade reads as unreadable. The step never throws on a stored value, in its own body or in any callback of the reads and writes it makes inside the upgrade transaction, since a throw there aborts the whole upgrade and every later open then fails. A request the step makes that fails, for lack of space for instance, still aborts the upgrade: the database stays at data version 4 for that visit, and the next open runs the step again.

## TECHNICAL INTERFACE
src/storage/migrations/presets-and-kept-sessions-v5.ts exports the step, PRESETS_AND_KEPT_SESSIONS_V5, a MigrationStep with toVersion 5, registered last in PRODUCTION_MIGRATIONS (src/storage/database.ts), after KEPT_SESSIONS_V4, which makes DATABASE_DATA_VERSION 5; the runner gives it the opening's app version (MigrationUpgrade.appVersion) for the envelopes it rewrites. It walks `presets`, then `sessionBodies`, with a cursor, through rewriteInOrder and rewriteEach (src/storage/migrations/rewrite-each.ts), which hands each rewrite the stored value and the key it is stored under, holding the upgrade (MigrationUpgrade.hold) until both walks end. Each preset record goes through upgradedPresetV5(stored, key, appVersion), over carriedOverPresetRecord (src/storage/records/preset-record.ts), which reads a data version 3 record as the preset codec does, its id equal to its key, and gives it back at PRESET_RECORD_DATA_VERSION 5 with chordFamilies at Off and every other field as stored. Each body goes through upgradedKeptBodyV5(stored, appVersion), which reads a data version 4 body through parseKeptSessionBodyV4 (src/storage/records/kept-session-body-read.ts), whose phrases' intents go through parseKeptIntentV4 (src/storage/records/kept-intent-parsers.ts), at Off, and whose harmonies and carried chords are read as triads, a seventh refused, and writes it at KEPT_SESSION_BODY_DATA_VERSION 5 through rewrittenKeptBodyRecord (src/storage/records/kept-session-body.ts), the favorite marks, doodle and played-notes clock as read. Both give null, never a throw, for a record they cannot read, which stays as it is; the cursor's update is guarded the same way. The step to data version 4 keeps writing the data version 4 body it carries a data version 2 one to, through rewrittenKeptBodyRecordV4 (KeptSessionBodyRecordV4, its intents KeptIntentRecordV4 without the level, Off only); the app's own writers write only data version 5's body. The saved level's record is read and written by the settings codec (src/storage/records/settings-record.ts) under `chordFamilies.seventh-chords`, with no step.

## EXPECTATION
- A database at data version 4 holding v3.2's settings, player presets and kept sessions, pinned and Jam sessions included, opens at data version 5; each session opens as before, its exports byte-identical, each phrase's intent with the Seventh chords level at Off.
- Each player preset record is at data version 5 with the level at Off and every other value unchanged, and loads as before.
- The kept session-wide records, the kept played notes and every settings record keep their data versions; nothing else is rewritten.
- A database at data version 0 to 3 is brought to 5 through every step in order.
- No stored value makes the step throw, inside its read and write callbacks included; a record it cannot read is left as it is and read as unreadable; the open is never rejected for it.
- A tab of the earlier app leaves each data version 5 record unread as newer.
- No record is rewritten when it is read.
