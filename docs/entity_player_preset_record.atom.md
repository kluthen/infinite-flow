---
id: entity_player_preset_record
status: REVIEW
type: ENTITY
version: 0.2
priority: 1
human_name: Player Preset Record
parents:
  - [[module_on_device_database]]
  - [[module_preset_model]]
  - [[rule_player_presets_saved_on_device]]
  - [[rule_presets_load_tolerantly]]
layer: ARCHITECTURE
tags: [v3, release-v3.1, storage, presets]
dependents:
  - [[module_player_presets]]
---

# Player Preset Record

## INTENT
Keep each player preset on the device as one whole record, read on its own and field by field, so a damaged or older record never costs the player the others.

## THE RULE / LOGIC
Each player preset is one record of the `presets` store, under its internal id, which the record also holds. The record holds the preset's name; its ten preset-held controls; its seven figure levels, by figure id; and its key and mode restriction, each half either any or an ordered list of written keys or of modes, the first entry the preset's main sound; with the record envelope's data version, 3 for this shape, and the version of the app that wrote it. A built-in preset is never stored, and the restriction in force is not part of any record. Each save writes the whole record, so between two tabs the last save wins.

Reading is tolerant per record and per field. Each record is read on its own. An unknown or invalid control or level takes that setting's first-load value; a missing name, or one no player could save, becomes a numbered one, the first suggested name no built-in or other listed preset holds. A figure level missing because the record's data version predates that figure reads Off; one missing for a figure that existed at that data version is an invalid field and takes its first-load value. In a restriction an unknown key or mode is dropped from its list, and an empty list, or a missing restriction, reads any. A record that cannot be read at all (not a record, a damaged or newer envelope, or an id that is missing, differs from its key or is a built-in's) is left in the store, never rewritten, and not listed, with no notice; a record a newer version wrote is left unread. Reading never throws for anything stored.

## TECHNICAL INTERFACE
src/storage/records/preset-record.ts: the player preset record's shape, its encoder from a player Preset of the preset model (src/domain/presets/preset-selection.ts), and its tolerant decoder, which gives a player Preset or nothing for a record it cannot read at all, with the versions from src/storage/record-envelope.ts. The records live in the `presets` store of the on-device database (module_on_device_database), created by data version 3's step (module_settings_upgrade_step); the saved-data load reads them with the settings.

## EXPECTATION
- A player preset written and read back gives the same id, name, ten controls, seven levels and restriction.
- Each tolerant-loading case reads as stated, field by field, and no random corruption of a record makes reading throw or list an invalid preset.
- A record that cannot be read at all is not listed and is still in the store after the load.
- A level missing for a figure that did not exist at the record's data version reads Off; one missing for a figure that existed then takes its first-load value.
