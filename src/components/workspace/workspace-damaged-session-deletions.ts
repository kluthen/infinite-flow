/**
 * The session controller's deletions of damaged kept sessions, while the visit saves, beside the
 * review mode (./workspace-kept-session-opening.ts) and the session's own save
 * (./workspace-session-save.ts, whose batch deletes them as it saves): the load's clean-up, run
 * once the controller is built, never in the entry chunk, and only when a summary the load read
 * is damaged; and the deletion of a session an opening found damaged. Each is one batch through
 * the kept-change line, its refusal resolved to the controller alone (never the failure
 * listener), built by ./workspace-kept-session-read.ts from what it reads at the change. Each is
 * told through the seam's reports, committed with how many went, refused with its kind; the
 * sessions it named leave the rows either way (a refused one stays unlisted for the visit, and
 * the next load tries again). When the most recent session was one of them, still a kept session
 * not read into memory, the readable kept session that started last becomes the most recent at
 * once, or none; one held in memory stays. Nothing is deleted while saving is off.
 */
import type { KeptChangeOutcome } from '@/storage/save-policy'
import type { KeptSessionRows } from './use-kept-sessions'
import {
  damagedSessionChanges,
  damagedSessionsCleanUp,
  damagedSummaryKeys,
  mostRecentKept,
} from './workspace-kept-session-read'
import type { SessionControllerCore } from './workspace-session-active'
import type { MostRecentSession } from './workspace-session-controller-types'

/** The controller's deletions of damaged kept sessions. */
export interface DamagedSessionDeletions {
  /** The load's clean-up; settles once it ran, or at once when nothing the load read is damaged. */
  readonly cleanUpAtLoad: () => Promise<void>
  /**
   * Delete the kept session under `key`, which its opening found damaged. Resolves the landing,
   * to apply with the opening's own change of state so they show together, once the deletion
   * committed or was refused; null when nothing was deleted or refused (saving off, or the
   * session no longer stored as damaged), the opening then taking the failed-to-open path.
   */
  readonly deleteOpened: (key: string) => Promise<(() => void) | null>
}

/**
 * Intent: build the deletions of damaged kept sessions over the controller's core and the rows it
 * holds.
 */
// @spec-link [[module_kept_session_save]]
// @spec-link [[rule_most_recent_session_kept]]
// @spec-link [[module_kept_session_reach]]
export function createDamagedSessionDeletions(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
  rows: KeptSessionRows,
): DamagedSessionDeletions {
  const { state } = core
  const kept = core.deps.keptSessions

  /**
   * Intent: the sessions under `keys` deleted, or left unlisted by a refusal: their rows leave and,
   * when the most recent session was one of them while not read into memory, `successor` gives
   * it now; then the deletion is told, committed or refused, with how many it named.
   */
  const land = (
    keys: readonly string[],
    outcome: Extract<KeptChangeOutcome, { status: 'saved' | 'refused' }>,
    successor: () => MostRecentSession | null,
  ): void => {
    rows.removed(keys)
    const recent = state.mostRecent
    if (recent?.kind === 'kept' && keys.includes(recent.key)) state.mostRecent = successor()
    const count = keys.length
    kept.reports.tell(
      outcome.status === 'saved'
        ? { status: 'deleted', count }
        : { status: 'refused', kind: outcome.kind, count },
    )
  }

  /** Intent: the readable kept session that started last among the rows held, or none. */
  const latestRow = (): MostRecentSession | null => {
    const row = rows.rows().find(({ kind }) => kind === 'current')
    return row === undefined ? null : Object.freeze({ kind: 'kept', key: row.key })
  }

  /**
   * Intent: the load's clean-up: when a summary the load read is damaged and saving is on, one
   * batch through the kept-change line deleting every session damaged at its re-read; a refused
   * read names the load's damaged sessions. Nothing damaged at the re-read, or saving off by
   * then, tells nothing.
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[rule_most_recent_session_kept]]
  const cleanUpAtLoad = async (): Promise<void> => {
    const atLoad = damagedSummaryKeys(kept.summaries)
    if (atLoad.length === 0 || kept.savingOff()) return
    const cleanUp = damagedSessionsCleanUp()
    const outcome = await kept.changes.changeKept(cleanUp.changes, 'caller')
    if (outcome.status !== 'saved' && outcome.status !== 'refused') return
    const found = cleanUp.found()
    if (found === null) {
      land(atLoad, outcome, () => state.mostRecent)
      return
    }
    land(found.damaged, outcome, () => mostRecentKept(found.summaries))
  }

  /**
   * Intent: delete the kept session under `key`, found damaged at its opening, in one batch
   * through the kept-change line; the landing it resolves removes its row, chooses the most
   * recent session again from the rows when it was that one, and tells the deletion.
   */
  // @spec-link [[module_kept_session_save]]
  // @spec-link [[module_kept_session_reach]]
  const deleteOpened = async (key: string): Promise<(() => void) | null> => {
    if (kept.savingOff()) return null
    const codec = await import('@/storage/records/kept-session-record')
    const outcome = await kept.changes.changeKept(damagedSessionChanges(codec, key), 'caller')
    if (outcome.status !== 'saved' && outcome.status !== 'refused') return null
    return () => {
      land([key], outcome, latestRow)
    }
  }

  return { cleanUpAtLoad, deleteOpened }
}
