---
id: module_saved_data_loader
status: REVIEW
priority: 1
human_name: Saved Data Loader
type: MODULE
layer: ARCHITECTURE
tags: [v3, release-v3.0, storage]
parents:
  - [[module_save_policy]]
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_no_save_during_session]]
  - [[rule_saved_setting_is_players_choice]]
  - [[rule_settings_saved_on_change]]
dependents: []
version: 0.1
---

# Saved Data Loader

## INTENT
Read the player's saved data before the workspace is first drawn, say whether the visit started from it or from the defaults, and carry the player's own changes to the save policy, held while a session runs.

## THE RULE / LOGIC
Load. Before the app is mounted, the loader opens the storage port and reads through it the settings, the kept sessions' summaries and the remembered controller's records, under one start-up wait of 2,000 ms. The page shows only its background until the load ends; the workspace is then drawn once with what the load gives, so no control changes value after the first draw. A port that opens within the wait gets the visit's save policy at once. A read that ends within the wait gives the saved settings, each decoded on its own by the settings codec. A read the port refuses, or one still running when the wait ends, gives the defaults and turns saving off-unreadable; a read that finishes later is ignored. A port that opens only after the wait also gives the defaults: it gets its policy when it opens, and saving is turned off-unreadable at once, so a port that opened outdated keeps its policy off-outdated. Any other failure of the open or the read is a defect and is not caught.

Load outcome. The load says whether the visit started from the saved data read (a first visit with nothing saved included) or from the defaults, which the saving state alone cannot tell: off-outdated comes both with the saved data read and with the defaults on screen.

Starting values. The workspace starts from the loaded settings: the Idle session's controls, musical-profile selection and theme, the audio transport's mix, the review host's preferences, and the session controller's three session options, which enter at the controller's creation, never through its actions.

Saves. The visit's saves go through one saver over the policy the loader hands over: each change of the player's is one batch, one record per setting it changed. Calls made before the policy has loaded wait for it, and every call reaches the policy in the order it was made. The saver is called from the player's change handlers only: the Idle control, musical-profile, instrument-profile and theme actions, the audio mix's on/off switches and its volumes on slider release, the session options once the controller has accepted the change, and the review host's setters. It is never called from a watcher of setting values, so a value Vary settings set, the end-of-session restore and the rising tempo's reset are never saved. The session controller holds the saves at each accepted start and releases them when the session is torn down.

## TECHNICAL INTERFACE
src/storage-bootstrap.ts exports loadSavedData(deps), resolving a SavedDataLoad { outcome, settings, keptSessionSummaries, rememberedController, savePolicy }: outcome is a LoadOutcome ('saved-data-read' or 'started-from-defaults'), savePolicy a Promise<SavePolicy>, settled before the first draw when the port opened within the wait; STARTUP_WAIT_MS, the start-up wait (2,000); and browserSavedDataLoad(), the browser's dependencies (openPort, startupWait, mixDesign). src/main.ts waits for the load and mounts App with it as its savedData prop; App.vue gives it to the workspace session factory, and the workspace session exposes it as savedData and the saver's saveSettings. src/storage/settings-saver.ts exports createVisitSaves(policy, appVersion), giving saveSettings(changes), changes being SettingChanges by setting key, hold() and release(); and chosenControlChanges(before, after), the settings a control change changed. App.vue provides saveSettings under SAVE_SETTINGS (src/components/workspace/save-settings-injection.ts) to the components whose change handlers save; the session controller receives savedSessionOptions and saveHold among its dependencies.

## EXPECTATION
- The workspace is first drawn with every setting the load gave, and no control changes value after that draw.
- A read that fails, a read slower than the start-up wait, and a port that opens after it each give the defaults, saving off, and the outcome 'started-from-defaults'.
- A port that opened outdated and read gives the saved values, off-outdated and 'saved-data-read'; one that opened outdated whose read fails gives the defaults, off-outdated and 'started-from-defaults'.
- A saved Rising tempo on loads with no MIDI controller attached.
- Saves made before the policy has loaded reach it, in order, once it has.
- Only a change of the player's is saved, and between a session's accepted start and its teardown the saves are held.
