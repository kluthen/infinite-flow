---
id: module_player_presets
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: The Player Presets Composable
parents:
  - [[entity_player_preset_record]]
  - [[module_preset_model]]
  - [[module_save_policy]]
  - [[rule_deleting_base_preset_leaves_custom]]
  - [[rule_persistent_storage_requested]]
  - [[rule_player_presets_saved_on_device]]
  - [[rule_pregeneration_discarded_on_change]]
  - [[rule_preset_management_actions]]
  - [[rule_presets_in_visits_that_save_nothing]]
  - [[rule_refused_preset_save_told]]
type: MODULE
tags: [v3, release-v3.1, player-controls, presets, storage]
dependents: []
---

# The Player Presets Composable

## INTENT
Manage the player's own presets in one place, so the preset actions, the preset sheet and Your data list, save, rename and delete them by the same rules and the same storage path.

## THE RULE / LOGIC
The player presets composable owns the player presets of the visit. Its list is the presets the session knows, the eight built-ins then the player presets, the one list the preset box, the restriction in force and the pre-generation queue already read. It offers four actions, each applying the preset model's rules (module_preset_model): save as new, save changes, rename and delete. Save as new adds a player preset under a new id from the injected id source and makes it the selection; save changes overwrites the base player preset's values, and its restriction when the save asked for one, and makes it the selection; rename changes only the name, keeping the selection and Custom's base; delete removes the preset and, when it was the selection or Custom's base, leaves Custom with no base and the same values. None of them changes a generation setting or regenerates the phrase, and none runs during a session.

Each action writes one whole preset record (entity_player_preset_record), or deletes one, through the visit's save policy (module_save_policy), so between two tabs the last write wins and another tab sees the change after a reload. A save changes the list and the selection at once, whatever becomes of its write: a refused save keeps the preset for the visit and raises the save-problem notice at once, in its preset wording or its storage-full wording. A deletion changes them only once the record is deleted, and resolves whether it was, so a failed one leaves the preset listed and its confirmation open with its error line. Save as new and save changes ask for persistent storage, which the save policy asks the browser at most once per visit; rename and delete never ask. In a visit that saves nothing (an outdated tab, or a visit whose saved data could not be read), the actions change the list for the page only, write nothing, and delete is not offered.

A save or a deletion reports that it changed the restriction in force only through the state it changes: it replaces the session's preset list and, where the rules say, its selection, and the pre-generation queue's key holds the restriction in force worked out from them, so the ready phrases are discarded exactly when that restriction changed. The composable never calls the queue.

## TECHNICAL INTERFACE
src/components/workspace/use-player-presets.ts: the composable, giving the list and the four actions (save as new, save changes, rename, delete), the deletion resolving its outcome to the caller. It changes the Idle session's preset list and selection through the session, never by writing its state directly; it writes and deletes preset records through the visit's save policy, with the record codec of src/storage/records/preset-record.ts, and reaches persistent storage through the policy's once-per-visit request (src/storage/save-policy-requests.ts). The preset actions (src/components/controls/PresetActions.vue), the preset sheet (src/components/workspace/PresetSheet.vue) and Your data's preset list use it.

## EXPECTATION
- Save as new adds a player preset under a fresh id and selects it; save changes overwrites its base and selects it; rename keeps the selection and Custom's base; delete of the selection or of Custom's base leaves Custom with no base and the same values.
- Each action writes or deletes exactly one whole preset record; none writes during a session or in a visit that saves nothing.
- A refused save keeps the preset for the visit and shows the preset notice at once; a failed deletion resolves as failed and leaves the preset listed.
- The first save as new or save changes of a visit asks for persistent storage; rename and delete never ask.
- A save or deletion that changes the restriction in force discards the pre-generated phrases; one that changes neither a setting nor that restriction discards nothing.
