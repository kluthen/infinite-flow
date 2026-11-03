---
id: module_jam_settings
status: DRAFT
priority: 1
human_name: Jam's Settings Model
tags: [v3, release-v3.2, jam, player-controls, storage]
parents:
  - [[req_jam_settings]]
  - [[rule_jam_embellishments_one_level]]
  - [[rule_jam_in_visits_that_save_nothing]]
  - [[rule_jam_settings_first_values]]
  - [[rule_jam_settings_load_tolerantly]]
  - [[rule_jam_settings_saved_on_change]]
  - [[rule_jam_tempo_range]]
  - [[rule_shared_setting_changed_in_jam_mode]]
dependents: []
type: MODULE
layer: ARCHITECTURE
version: 0.1
---

# Jam's Settings Model

## INTENT
Hold Jam's own small set of settings apart from session mode's: start it from where the player already is, save it as a group of its own, load it tolerantly, and keep all of it inside Jam's code.

## THE RULE / LOGIC
The settings. Jam's settings are its written key and collection, its tempo (60 to 180 BPM in steps of 10), its drift, its rhythm lock and the lock's allowed rhythm changes, harmonic motion, tension, and one Embellishments level, which a request carries as seven equal figure levels. Arpeggio chaos is held at Varied and is not a setting. The rhythm and shape controls come from the doodle (module_doodle_controls) and are not settings. The instrument, the controller, the audio mix and the theme are shared: they stay session mode's settings and records.

First values. A Jam setting with no readable record starts from its first value: the key and mode and the tempo from session mode's current values, the tempo kept inside 60 to 180 BPM; harmonic motion Gentle diatonic; tension Lift; Embellishments Rarely; drift Near; the lock off; every allowed rhythm change off.

Storage. Each Jam setting is one record of a jam group in the device's settings store, beside session mode's groups, as new records of the same kind: no upgrade step comes with them and the database's data version does not change. The settings records' code in the entry chunk lists the group's keys and writes and reads their values as given, without checking them; session mode's decoding ignores them, so the first load decodes nothing of Jam's. The load hands Jam's records undecoded, as it hands the kept sessions' summaries, and Jam's code decodes them, each on its own, when Jam's settings are first needed: a missing, unreadable, newer or invalid record gives that setting its first value and touches no other.

Saving. A change at Jam's Idle is saved at once through the visit's saver, one record per setting it changed; Jam's settings are editable at Jam's Idle only, read-only while Jam's code loads and during a Jam, so nothing is written during a session. In a visit that saves nothing they live in memory for the visit. Delete everything removes their records, so the next visit starts from the first values. Saving a Jam setting never writes a session-mode record.

The shared instrument on return. An instrument changed in Jam mode, my instrument's range or clef included, is saved as session mode's instrument, as any instrument change is; on returning to session mode, session mode applies it as an instrument switch made there: the phrase on screen checked and written again, its phrases generated ahead discarded. No other Jam change touches session mode, and Jam's settings never enter session mode's pre-generation key.

## TECHNICAL INTERFACE
src/jam/jam-settings.ts holds the model: the settings, their first values, their tolerant decoding and the changes to save; src/jam/JamControls.vue shows them (Foundation, Following your doodle, From your doodle) and src/jam/DoodleReadings.vue the readings, all inside Jam's code (module_jam_code_boundary). Drift is the JamDrift of src/jam/steering-block-builder.ts. src/storage/records/settings-record.ts gains the jam group's keys in SettingKey, with their values stored as given. The load's handing of Jam's records extends module_saved_data_loader, a contract atom whose new wording waits for the owner. src/components/workspace/WorkspaceShell.vue and src/composables/use-generation-session.ts apply the instrument on return. Not built yet; until it is, Jam mode shows session mode's controls.

## EXPECTATION
- With nothing of Jam's saved, Jam's settings start from their first values, the key and mode and tempo from session mode's current values, the tempo kept inside 60 to 180 BPM.
- Each Jam setting survives a reload; a corrupt or invalid record loads that setting's first value and no other changes.
- No Jam change writes or changes a session-mode record, and the entry chunk decodes none of Jam's records.
- Jam's settings are editable at Jam's Idle only and saved at once there; nothing is written during a Jam.
- Delete everything resets Jam's settings to their first values.
- An instrument changed in Jam mode is applied to session mode on returning as an instrument switch there, its phrase written again and its prepared phrases discarded.
