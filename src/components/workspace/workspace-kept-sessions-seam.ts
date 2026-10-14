/**
 * The kept sessions as the session controller reaches them, for the most recent session: the
 * seam's shape, and the workspace's own seam over the saved data the load gave. Types and one
 * small builder only, so the entry chunk that builds the workspace stays as it was; the decoding
 * lives in the controller's chunk (./workspace-kept-session-read.ts).
 */
import type { SavedDataLoad } from '@/storage-bootstrap'
import type { StoredKeptSession } from '@/storage/records/kept-session-record'
import type { SavePolicy } from '@/storage/save-policy'
import type { StoredEntry } from '@/storage/storage-port'

/**
 * The kept sessions as the session controller reaches them: the summaries the load read, the read
 * of one kept session's records by its key, and whether saving is off for the visit now.
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
   * tab. Read at a session's end, so its keep line never waits on a save that may never settle.
   */
  // @spec-link [[rule_outdated_tab_stops_saving]]
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savingOff: () => boolean
}

/**
 * Intent: the kept sessions as the session controller reaches them, over the saved data the load
 * gave: the summaries it read, a session's records read by its key through the visit's save
 * policy, and whether saving is off now, known without waiting on a policy that may never settle
 * (a visit started from the defaults, whose port opens late or never, saves nothing).
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_saved_data_loader]]
export function keptSessionsOf(savedData: SavedDataLoad): KeptSessionsSeam {
  let policy: SavePolicy | null = null
  void savedData.savePolicy.then((loaded) => {
    policy = loaded
  })
  return {
    summaries: savedData.keptSessionSummaries,
    read: (key) => savedData.savePolicy.then((loaded) => loaded.readKeptSession(key)),
    savingOff: () =>
      savedData.outcome === 'started-from-defaults' || (policy !== null && policy.state() !== 'on'),
  }
}
