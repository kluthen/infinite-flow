---
id: entity_session_option_records
status: DRAFT
version: 0.1
dependents: []
human_name: The Session Options' Setting Records
layer: ARCHITECTURE
priority: 2
tags: [v3, release-v3.2, storage, player-controls]
parents:
  - [[rule_no_save_during_session]]
  - [[rule_saved_settings_load_tolerantly]]
  - [[rule_settings_saved_on_change]]
type: ENTITY
---

# The Session Options' Setting Records

## INTENT
Store each "During a session" option of session mode as a setting of its own, so each is saved when it changes and loaded on its own.

## THE RULE / LOGIC
Session mode's options for during a session are stored as one setting record each, in the session options group of the device's settings store: Vary settings, Tension across phrases and Rising tempo, and from v3.2 the rhythm lock (on or off), its allowed rhythm changes (the kinds allowed) and Vary settings' allowed groups (the groups allowed). Each is saved when the player changes it outside a session. The v3.2 records are new records beside the existing ones, of the same kind: no upgrade step comes with them and the database's data version does not change for them. Each record is read on its own: a missing record, as in every store written before v3.2, or an invalid value loads that setting's default (the lock off, no change allowed, all six groups allowed), every other record still loaded. A stored choice the lock disables, the Rhythm group, loads as stored. Jam's own lock and allowed changes are not in this group.

## TECHNICAL INTERFACE
src/storage/records/settings-record.ts: the `sessionOptions` group's records, keyed `sessionOptions.<field>`, one parser per field (SESSION_OPTION_PARSERS), listed in SETTING_KEYS; their values and defaults are SessionOptionChoices and defaultSettings (src/storage/records/setting-defaults.ts). The three v3.2 fields are not built yet; their names are filled in once built. Saved from src/components/workspace/use-session-options.ts.

## EXPECTATION
- Each of the six values survives a reload, and changing one writes only its own record.
- A store written before v3.2, or a missing or corrupt v3.2 record, loads the lock off, no change allowed and all six groups allowed, every other setting as saved.
- A stored Rhythm group choice is kept while the lock disables it.
