/**
 * The workspace shell's saved-data source for specs that are not about the notice row: a visit
 * that read its saved data, whose save policy never arrives, so the row shows no notice; and the
 * remembered-controller and player-preset stores for specs that are not about them.
 */
import type { RememberedControllerStore } from '@/components/workspace/use-controller-connection'
import type { PresetStore } from '@/components/workspace/use-preset-sheet'
import type { SavedDataLoad } from '@/storage-bootstrap'
import type { SavePolicy } from '@/storage/save-policy'

/** Intent: a load outcome and save policy that give the notice row nothing to show. */
export function quietSavedData(): Pick<SavedDataLoad, 'outcome' | 'savePolicy'> {
  return { outcome: 'saved-data-read', savePolicy: new Promise<SavePolicy>(() => undefined) }
}

/**
 * Intent: a remembered-controller store for specs that are not about it: nothing remembered at
 * load, and its saves go nowhere (a spec connecting a controller makes the shell remember it).
 */
export function noRememberedController(): RememberedControllerStore {
  return { loaded: null, remember: () => {}, forget: () => {} }
}

/**
 * Intent: a player-preset store for specs that are not about presets: every write and deletion
 * saved at once, ids `preset-1`, `preset-2`... in order.
 */
export function quietPresetStore(): PresetStore {
  return {
    saves: {
      savePreset: () => Promise.resolve('saved'),
      saveRenamedPreset: () => Promise.resolve('saved'),
      deletePreset: () => Promise.resolve('saved'),
    },
    nextPresetId: countingPresetIds(),
  }
}

/** Intent: a new player preset's id source counting up: `preset-1`, `preset-2`... */
export function countingPresetIds(): () => string {
  let ids = 0
  return () => `preset-${String(++ids)}`
}
