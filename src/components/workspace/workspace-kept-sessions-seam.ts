/**
 * The kept sessions as the session controller reaches them, for the most recent session and the
 * changes made to a kept session after its save: the seam's shape, and the workspace's own seam
 * over the saved data the load gave and the visit's saves. Beside it, the channel the reports of
 * the deletions of damaged kept sessions reach the notices by: built with the workspace, before the
 * controller's chunk loads, handed to the seam for the controller to tell through, and to the
 * notices to hear. Types and two small builders only, so the entry chunk that builds the
 * workspace stays small; the decoding and the deletions live in the controller's chunk
 * (./workspace-kept-session-read.ts, ./workspace-damaged-session-deletions.ts).
 */
import { shallowRef } from 'vue'

import type { SavedDataLoad } from '@/storage-bootstrap'
import type { StoredKeptSession } from '@/storage/records/kept-session-record'
import type { KeptRefusalKind, SavingState } from '@/storage/save-policy'
import type { KeptSessionChanges } from '@/storage/settings-saver'
import type { StoredEntry } from '@/storage/storage-port'

/**
 * What became of a deletion of damaged kept sessions, at load, at a session's save or at an
 * opening: committed, with how many sessions it deleted; or refused by the device, with the
 * refusal's kind and how many sessions it named. The count is at least 1.
 */
// @spec-link [[module_kept_session_save]]
export type DamagedSessionsReport =
  | { readonly status: 'deleted'; readonly count: number }
  | { readonly status: 'refused'; readonly kind: KeptRefusalKind; readonly count: number }

/** The channel the reports of the deletions of damaged kept sessions go through. */
// @spec-link [[module_kept_session_save]]
export interface DamagedSessionReports {
  /** Tell `report` to every listener now; a count below 1 is a defect. */
  readonly tell: (report: DamagedSessionsReport) => void
  /** Hear every report told from now on; returns the way to stop. */
  readonly listen: (listener: (report: DamagedSessionsReport) => void) => () => void
}

/**
 * Intent: the channel of the reports of the deletions of damaged kept sessions, one per
 * workspace: a report reaches the listeners attached when it is told, and nothing keeps it after.
 */
// @spec-link [[module_kept_session_save]]
export function createDamagedSessionReports(): DamagedSessionReports {
  const listeners = new Set<(report: DamagedSessionsReport) => void>()
  return {
    tell: (report) => {
      if (!(Number.isInteger(report.count) && report.count >= 1))
        throw new Error(`damaged session reports: ${String(report.count)} sessions is no count`)
      for (const listener of [...listeners]) listener(report)
    },
    listen: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

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
  /** The visit started from the defaults: the kept sessions could not be read in it. */
  readonly startedFromDefaults: boolean
  /** The changes to kept sessions after their save, and the reads made at them. */
  // @spec-link [[module_kept_session_changes]]
  readonly changes: KeptSessionChanges
  /**
   * Ask the browser for persistent storage, without waiting: the save policy asks at most once
   * per visit, never while saving is off, and not when the storage already is persistent.
   */
  readonly requestProtection: () => void
  /** Where the controller tells each deletion of damaged kept sessions, committed or refused. */
  readonly reports: Pick<DamagedSessionReports, 'tell'>
}

/**
 * Intent: the kept sessions as the session controller reaches them, over the saved data the load
 * gave and the visit's saves: the summaries it read, a session's records read by its key through
 * the visit's save policy, whether saving is off now, known without waiting on a policy that may
 * never settle (a visit started from the defaults, whose port opens late or never, saves nothing)
 * and followed as the policy's state changes, the changes after a save through the saves, the
 * request for persistent storage through the policy, and the deletions of damaged kept sessions
 * told through `reports`.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[module_saved_data_loader]]
// @spec-link [[module_kept_session_changes]]
export function keptSessionsOf(
  savedData: SavedDataLoad,
  changes: KeptSessionChanges,
  reports: Pick<DamagedSessionReports, 'tell'>,
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
    startedFromDefaults: savedData.outcome === 'started-from-defaults',
    changes,
    requestProtection: () => {
      void savedData.savePolicy.then((loaded) => loaded.requestProtection())
    },
    reports,
  }
}
