/**
 * The workspace shell's saved-data source for specs that are not about the notice row: a visit
 * that read its saved data, whose save policy never arrives, so the row shows no notice.
 */
import type { RememberedControllerStore } from '@/components/workspace/use-controller-connection'
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
