/**
 * The player presets' saves among the visit's saves (`settings-saver.ts`): each writes one whole
 * preset record, or deletes one, as one batch through the visit's save policy, so it is held
 * during a session, refused in an outdated tab and skipped in a visit that saves nothing, and each
 * resolves what became of it (the policy's `SaveOutcome`) to its caller, which tells a refused
 * save in the preset wording and keeps a failed deletion's confirmation. A save as new and a save
 * of changes also ask the policy for persistent storage, which asks the browser at most once per
 * visit; a rename and a deletion never ask. The preset selection is never saved here. Pure: no
 * browser API.
 */

import type { Preset, PresetId } from '@/domain/presets/preset-selection'

import type { SubmitToPolicy } from './my-instrument-saves'
import { encodePresetRecord } from './records/preset-record'
import type { SaveOutcome } from './save-policy'
import type { StorageChange } from './storage-port'

/** The saves of the player preset records. */
// @spec-link [[module_player_presets]]
// @spec-link [[rule_player_presets_saved_on_device]]
export interface PresetSaves {
  /**
   * Write a player preset's whole record, made by a save as new or changed by a save of changes,
   * replacing any stored under its id; then ask for persistent storage. Resolves what became of
   * the write.
   */
  readonly savePreset: (preset: Preset) => Promise<SaveOutcome>
  /** Write a renamed player preset's whole record, asking nothing more. Resolves its outcome. */
  readonly saveRenamedPreset: (preset: Preset) => Promise<SaveOutcome>
  /** Delete the player preset record under `id`, asking nothing more. Resolves its outcome. */
  readonly deletePreset: (id: PresetId) => Promise<SaveOutcome>
}

/**
 * Intent: the player presets' saves over the visit's line of calls to the policy, so each reaches
 * it in the order made: a preset's record before the selection that names it. Each resolves the
 * policy's outcome of its one batch (a defect rejects); a save as new or of changes asks for
 * persistent storage right after its write, as my instrument's write does.
 */
// @spec-link [[module_player_presets]]
// @spec-link [[rule_player_presets_saved_on_device]]
// @spec-link [[rule_persistent_storage_requested]]
export function createPresetSaves(submit: SubmitToPolicy, appVersion: string): PresetSaves {
  /** Intent: apply `change` as one batch in line, then ask for protection when `protect` says. */
  const saved = (change: StorageChange, protect: boolean): Promise<SaveOutcome> =>
    new Promise((resolve, reject) => {
      submit((policy) => {
        policy.save([change]).then(resolve, reject)
        if (protect) void policy.requestProtection()
      })
    })

  /** Intent: the write of a player preset's whole record, under its id. */
  const written = (preset: Preset): StorageChange => ({
    kind: 'write',
    store: 'presets',
    key: preset.id,
    record: encodePresetRecord(preset, appVersion),
  })

  return {
    savePreset: (preset) => saved(written(preset), true),
    saveRenamedPreset: (preset) => saved(written(preset), false),
    deletePreset: (id) => saved({ kind: 'delete', store: 'presets', key: id }, false),
  }
}
