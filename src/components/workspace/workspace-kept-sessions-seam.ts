/**
 * The kept sessions as the session controller reaches them, for the most recent session and the
 * changes made to a kept session after its save: the seam's shape, and the workspace's own seam
 * over the saved data the load gave and the visit's saves. Types and one small builder only, so
 * the entry chunk that builds the workspace stays as it was; the decoding lives in the
 * controller's chunk (./workspace-kept-session-read.ts).
 */
import { shallowRef } from 'vue'

import type { SavedDataLoad } from '@/storage-bootstrap'
import type { StoredKeptSession } from '@/storage/records/kept-session-record'
import type { SavingState } from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StoredEntry } from '@/storage/storage-port'

/**
 * The kept sessions as the session controller reaches them: the summaries the load read, the read
 * of one kept session's records by its key, whether saving is off for the visit now, and the
 * changes to a kept session after its save, in the line of the session saves.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_saved_data_loader]]
// @spec-link [[req_kept_session_review]]
export interface KeptSessionsSeam {
  /** The kept sessions' summaries the load read, each with its key; none from the defaults. */
  readonly summaries: readonly StoredEntry[]
  /** Read a kept session's stored values by its key; a refusal rejects with a `StorageError`. */
  readonly read: (key: string) => Promise<StoredKeptSession>
  /**
   * Whether saving is off for the visit now: a visit started from the defaults, or an outdated
   * tab. Read at a session's end, so its keep line never waits on a save that may never settle;
   * reactive, so the deletions a Review offers leave the moment the tab turns outdated.
   */
  // @spec-link [[rule_outdated_tab_stops_saving]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savingOff: () => boolean
  /** The changes to kept sessions after their save, and the reads made at them. */
  // @spec-link [[module_kept_session_changes]]
  readonly changes: KeptSessionChanges
}

/**
 * Intent: the kept sessions as the session controller reaches them, over the saved data the load
 * gave and the visit's saves: the summaries it read, a session's records read by its key through
 * the visit's save policy, whether saving is off now, known without waiting on a policy that may
 * never settle (a visit started from the defaults, whose port opens late or never, saves nothing)
 * and followed as the policy's state changes, and the changes after a save through the saves.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_saved_data_loader]]
// @spec-link [[module_kept_session_changes]]
export function keptSessionsOf(
  savedData: SavedDataLoad,
  changes: KeptSessionChanges,
): KeptSessionsSeam {
  const saving = shallowRef<SavingState | null>(null)
  void savedData.savePolicy.then((loaded) => {
    saving.value = loaded.state()
    loaded.onStateChange((state) => {
      saving.value = state
    })
  })
  return {
    summaries: savedData.keptSessionSummaries,
    read: (key) => savedData.savePolicy.then((loaded) => loaded.readKeptSession(key)),
    savingOff: () =>
      savedData.outcome === 'started-from-defaults' ||
      (saving.value !== null && saving.value !== 'on'),
    changes,
  }
}
