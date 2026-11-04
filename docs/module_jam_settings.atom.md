---
id: module_jam_settings
status: REVIEW
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
version: 0.3
---

# Jam's Settings Model

## INTENT
Hold Jam's own small set of settings apart from session mode's: start it from where the player already is, save it as a group of its own, load it tolerantly, and keep all of it inside Jam's code.

## THE RULE / LOGIC
The settings. Jam's settings are its written key and collection, its tempo (60 to 180 BPM in steps of 10), its drift, its rhythm lock and the lock's allowed rhythm changes, harmonic motion, tension, and one Embellishments level, which a request carries as seven equal figure levels. Arpeggio chaos is held at Varied and is not a setting. The rhythm and shape controls come from the doodle (module_doodle_controls) and are not settings. The instrument, the controller, the audio mix and the theme are shared: they stay session mode's settings and records.

First values. A Jam setting with no readable record starts from its first value: the key and mode and the tempo from session mode's current values, the tempo kept inside 60 to 180 BPM; harmonic motion Gentle diatonic; tension Lift; Embellishments Rarely; drift Near; the lock off; every allowed rhythm change off. The key, the mode and the tempo taken from session mode for want of a readable record are saved once, as Jam mode first shows in a visit, so a later visit starts from the same values whatever session mode has become. Jam's settings made earlier in the visit, by the Use it of a Jam session's review, save no first values then: Jam mode, as it first shows, saves those still pending, leaving out every one a change has saved since. Until Jam's settings exist, a Jam session's review reads Jam's key and mode from their records or, for want of one, from session mode's current values, saving nothing.

Storage. Each Jam setting is one record of a jam group in the device's settings store, beside session mode's groups, as new records of the same kind: no upgrade step comes with them and the database's data version does not change. The settings records' code in the entry chunk lists the group's keys and writes and reads their values as given, without checking them; session mode's decoding ignores them, so the first load decodes nothing of Jam's. The load hands Jam's records undecoded, as it hands the kept sessions' summaries, and Jam's code decodes them, each on its own, when Jam's settings are first needed: a missing, unreadable, newer or invalid record gives that setting its first value and touches no other.

Saving. A change at Jam's Idle is saved at once through the visit's saver, one record per setting it changed; Jam's settings are editable at Jam's Idle only, read-only while Jam's code loads and during a Jam, so nothing is written during a session. In a visit that saves nothing they live in memory for the visit. Delete everything removes their records, so the next visit starts from the first values. Saving a Jam setting never writes a session-mode record.

The shared instrument on return. An instrument changed in Jam mode, my instrument's range or clef included, is saved as session mode's instrument, as any instrument change is; on returning to session mode, session mode applies it as an instrument switch made there: the phrase on screen checked and written again, its phrases generated ahead discarded. No other Jam change touches session mode, and Jam's settings never enter session mode's pre-generation key.

## TECHNICAL INTERFACE
src/jam/jam-settings.ts holds the model, inside Jam's code (module_jam_code_boundary): JamSettings; JAM_TEMPO_VALUES (60 to 180 in steps of 10); jamFirstValues(session), from session mode's tempo, tonal centre and collection (SessionModeStart); decodeJamSettings(records, session), giving DecodedJamSettings, the settings and the first values taken from session mode to save at once (startedFromSessionMode); jamSettingChanges(before, after), the records a change writes; jamFigureLevels(level), the seven equal figure levels; jamGenerationControls(settings, instrumentProfileId), the controls a Jam is generated with, arpeggio chaos at Varied; and createJamSettings({records, session, saveSettings, firstValuesDeferred?}), giving a JamSettingsStore (settings; change(change) saving each setting a change changed; saveFirstValues(), saving once the first values taken from session mode that no change has saved, called at once unless firstValuesDeferred). src/jam/JamControls.vue shows them (Foundation, Following your doodle, From your doodle; JamControlsProps in src/jam/jam-view-types.ts) and src/jam/DoodleReadings.vue the readings. Drift is the JamDrift of src/jam/steering-block-builder.ts. src/storage/records/settings-record.ts lists the jam group: JAM_SETTING_FIELDS, JAM_SETTING_KEYS and JamSettingKey (jam.<field>) in SettingKey, their values stored as given at the settings records' data version, with no upgrade step; jamSettingRecords(records) picks Jam's records out of the store's, undecoded, which the load hands as SavedDataLoad.jamSettingsRecords (module_saved_data_loader), App.vue passes to the workspace, and useJamSettings (src/components/workspace/use-jam-settings.ts, entry code reaching Jam's code by type only) turns into the store when Jam mode first shows, through the visit's saveSettings, or calls saveFirstValues() then when the store was made earlier. Its changeFromReview(jam, {tonalCenter, collection}), the review's Use it through REVIEW_JAM_PORTS (src/components/workspace/review-jam-ports.ts), makes the store with firstValuesDeferred: true when it does not exist yet, then changes it; its reviewKeyAndMode(jam) gives a Jam session's review Jam's key and mode, from the store or from decodeJamSettings over the records and session mode's current values, saving nothing. Jam's Idle prewarm (src/jam/jam-idle-prewarm.ts) takes Jam's own tension. The instrument on return: while Jam mode shows, WorkspaceShell.vue holds session mode's instrument switches (holdInstrumentSwitches(held), an InstrumentSwitchHold in src/composables/generation-session-profile-switch.ts, through src/composables/use-generation-session.ts), and releasing the hold on return applies the one owed as a switch made in session mode.

## EXPECTATION
- With nothing of Jam's saved, Jam's settings start from their first values, the key and mode and tempo from session mode's current values, the tempo kept inside 60 to 180 BPM.
- Each Jam setting survives a reload; a corrupt or invalid record loads that setting's first value and no other changes.
- No Jam change writes or changes a session-mode record, and the entry chunk decodes none of Jam's records.
- Jam's settings are editable at Jam's Idle only and saved at once there; nothing is written during a Jam.
- Delete everything resets Jam's settings to their first values.
- An instrument changed in Jam mode is applied to session mode on returning as an instrument switch there, its phrase written again and its prepared phrases discarded.
