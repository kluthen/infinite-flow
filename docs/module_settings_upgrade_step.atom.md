---
id: module_settings_upgrade_step
status: DRAFT
version: 0.2
tags: [v3, release-v3.1, storage, database, versioning, presets]
parents:
  - [[module_on_device_database]]
  - [[module_stored_profile_to_levels]]
  - [[rule_player_presets_saved_on_device]]
  - [[rule_saved_profile_becomes_preset]]
dependents: []
layer: ARCHITECTURE
priority: 1
human_name: Settings Carried Over to Data Version 3
type: MODULE
---

# Settings Carried Over to Data Version 3

## INTENT
Carry v3.0's saved settings over to the preset selection and the figure levels, and create the store the player presets live in, once, when the database opens, without ever making the open fail on a stored value.

## THE RULE / LOGIC
Data version 3 is reached by one migration step, the third of the production list, appended after the step that carries the kept sessions over to data version 2, so the code's data version is 3. A database at an earlier data version runs every step above it in order, in the one upgrade, when v3.1 first opens it, and never later.

The store. The step creates the object store `presets`, which holds one record per player preset under the preset's internal id (entity_player_preset_record). It is empty after the step, since v3.0 has no player presets.

The settings. In the `settings` store, v3.0's record of the musical-profile selection gives way to a record of the preset selection and to one record per figure level, keyed in the store's existing group-and-field form. The selection Neutral or Jazz becomes that built-in preset, selected; customized, it becomes Custom based on that built-in. The seven level records take that built-in's levels, the levels v3.0's profile generated with (module_stored_profile_to_levels), so nothing the player hears changes. The step compares no saved value with the preset's: whether the loaded settings still match the selected preset is decided at every load by the rule that saved values win, so a Jazz selection saved with Tension at Build loads as Custom based on Jazz. v3.0's selection record is deleted only once the step has read it and written those records in its place. The records the step writes, the preset selection's and the seven levels', carry data version 3, the data version of their shape, and the upgrading app's version; every other settings record, and every other store's records, keeps its data version, as for every migration.

Never failing the open. A v3.0 selection record the step cannot read is left as it is, and no selection or level record is written in its place; the settings codec then loads the first-load selection and levels, as for any setting it cannot use. The step never throws on a stored value, in its own body or in any callback of the requests it makes inside the upgrade transaction. A request that fails, for lack of space for instance, still aborts the upgrade: the database stays at its stored data version for that visit, and the next open runs the steps again.

## TECHNICAL INTERFACE
src/storage/migrations/settings-v3.ts exports the step, a MigrationStep with toVersion 3, registered in PRODUCTION_MIGRATIONS (src/storage/database.ts) after KEPT_SESSIONS_V2, which makes DATABASE_DATA_VERSION 3; DATA_STORES gains `presets`, created by this step and not by step 1. It reads v3.0's selection record with the settings codec's data version 1 reader of it (src/storage/records/settings-record.ts) and writes the preset selection and the level records in the shapes that codec reads at data version 3 (PRESET_SETTINGS_DATA_VERSION; every other setting's record stays at SETTINGS_DATA_VERSION, 1), deleting v3.0's record under its key (V30_PROFILE_SELECTION_KEY, profileSelection) after them, given the opening's app version (MigrationUpgrade.appVersion) for their envelopes.

## EXPECTATION
- A database at data version 2 opens at 3 with an empty `presets` store; one at data version 0 or 1 runs steps 1, 2 and 3 in order.
- A v3.0 selection of Neutral, of Jazz and of a customized Jazz becomes Neutral, Jazz and Custom based on Jazz, each with that built-in's seven levels.
- A v3.0 database with a Jazz selection and Tension at Build then loads as Custom based on Jazz, with Jazz's levels and Tension at Build.
- An unreadable v3.0 selection record is left as it is and the visit loads the first-load selection and levels; no stored value makes the step throw, inside its request callbacks included.
- The records of every store and setting whose shape does not change at data version 3 keep their data version.
