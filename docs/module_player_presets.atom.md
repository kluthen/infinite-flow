---
id: module_player_presets
status: DRAFT
layer: ARCHITECTURE
version: 0.3
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
  - [[service_idle_generation_session]]
type: MODULE
tags: [v3, release-v3.1, player-controls, presets, storage]
dependents: []
---

# The Player Presets Composable

## INTENT
Manage the player's own presets in one place, so the preset actions, the preset sheet and Your data list, save, rename and delete them by the same rules and the same storage path.

## THE RULE / LOGIC
The player presets composable owns the player presets of the visit. Its list is the presets the session knows, the eight built-ins then the player presets, the one list the preset box, the restriction in force and the pre-generation queue already read. It offers four actions, each applying the preset model's rules (module_preset_model): save as new, save changes, rename and delete. Save as new adds a player preset under a new id from the injected id source and makes it the selection; save changes overwrites the base player preset's values, and its restriction when the save asked for one, and makes it the selection; rename changes only the name, keeping the selection and Custom's base; delete removes the preset and, when it was the selection or Custom's base, leaves Custom with no base and the same values. None of them changes a generation setting or regenerates the phrase. The composable refuses every action while a session runs, count-in included, reading the session controller's phase (any phase but idle), the way the workspace tells a session is active; it never waits for a phrase being generated or drawn, so the actions work at Idle, during Loading and in the review mode.

Each action writes one whole preset record (entity_player_preset_record), or deletes one, through the visit's save policy (module_save_policy), so between two tabs the last write wins and another tab sees the change after a reload. A save changes the list and the selection at once, whatever becomes of its write: a refused save keeps the preset for the visit and raises the save-problem notice at once, in its preset wording or its storage-full wording. The selection is saved by the session's preset-list action, never by the composable or the preset saves, so a refused write still saves the selection; a reload then finds a selection naming no saved preset and loads Custom with no base and the same values, since on loading the saved values win. A deletion changes them only once the record is deleted, and resolves whether it was, so a failed one calls no session action, saves nothing, and leaves the preset listed and its confirmation open with its error line. The writes and deletions go through the visit's preset saves, one part of the visit's saves beside my instrument's, each resolving its outcome. Save as new and save changes ask for persistent storage, the preset saves asking it themselves after the write, as my instrument's saves do, and the save policy asks the browser at most once per visit; rename and delete never ask. In a visit that saves nothing (an outdated tab, or a visit whose saved data could not be read), the actions change the list for the page only, write nothing, and delete is not offered.

A save or a deletion reports that it changed the restriction in force only through the state it changes: it replaces the session's preset list and, where the rules say, its selection, through the Idle session's preset-list action (service_idle_generation_session), which checks no operation, and the pre-generation queue's key holds the restriction in force worked out from them, so the ready phrases are discarded exactly when that restriction changed. The composable never calls the queue.

## TECHNICAL INTERFACE
src/components/workspace/use-player-presets.ts: the composable, giving the list and the four actions (save as new, save changes, rename, delete), the deletion resolving its outcome to the caller. It reads the session controller's phase to refuse every action while a session runs, and changes the session's preset list and selection only through the Idle session's preset-list action (in src/composables/generation-session-control-actions.ts, typed in generation-session-types.ts and exposed by use-generation-session.ts), never by writing its state directly. It writes and deletes preset records through src/storage/preset-saves.ts, the preset saves, part of VisitSaves (src/storage/settings-saver.ts) as my instrument's saves (src/storage/my-instrument-saves.ts) are: each writes one whole preset record, encoded with src/storage/records/preset-record.ts, or deletes one through the visit's save policy and resolves the policy's SaveOutcome; on save as new and save changes it calls the policy's once-per-visit requestProtection (src/storage/save-policy-requests.ts) itself. The preset actions (src/components/controls/PresetActions.vue), the preset sheet (src/components/workspace/PresetSheet.vue) and Your data's preset list use the composable.

## EXPECTATION
- Save as new adds a player preset under a fresh id and selects it; save changes overwrites its base and selects it; rename keeps the selection and Custom's base; delete of the selection or of Custom's base leaves Custom with no base and the same values.
- Each action writes or deletes exactly one whole preset record; none writes during a session or in a visit that saves nothing.
- Every action is refused while a session runs, count-in included; every action works while a phrase is being generated or drawn.
- A refused save keeps the preset for the visit, shows the preset notice at once and still saves the selection, so a reload shows Custom with no base and the same values; a failed deletion resolves as failed, calls no session action and leaves the preset listed.
- Neither the composable nor the preset saves ever save the selection; only the session's preset-list action does.
- The first save as new or save changes of a visit asks for persistent storage; rename and delete never ask.
- A save or deletion that changes the restriction in force discards the pre-generated phrases; one that changes neither a setting nor that restriction discards nothing.
