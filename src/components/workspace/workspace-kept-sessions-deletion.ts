/**
 * The session controller's `Delete every session`, from Your data, beside its side of the Review's
 * changes (./workspace-kept-session-edits.ts): one change through the change path
 * (./kept-session-review-changes.ts), which deletes every kept session stored, one with no row
 * included. Once the device has made it, or has found nothing stored to delete (another tab
 * deleted them, or every session held was held in memory only), every session held in memory
 * goes, the most recent one included, and every row of the session list (./use-kept-sessions.ts);
 * there is then no most recent session until the next session ends with a review. A Review that
 * showed gives way to the session list, and an opening still pending is cancelled, so the session
 * it reads never shows. A refusal changes nothing, stored or in memory, and is
 * told to the caller alone. At Idle only, and never while saving is off.
 */
import { deleteEveryKeptSession } from './kept-session-review-changes'
import type { KeptSessionRows } from './use-kept-sessions'
import type { SessionControllerCore } from './workspace-session-active'
import { SessionControllerError, type SessionDeletion } from './workspace-session-controller-types'

/**
 * Intent: build `Delete every session` over the controller's core, the list's rows and the review
 * mode's cancelling of a pending opening: the device first, then memory, the rows and the pending
 * opening, only once the device has deleted them or found none.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_your_data]]
// @spec-link [[rule_most_recent_session_kept]]
export function createEverySessionDeletion(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
  rows: KeptSessionRows,
  cancelOpening: () => void,
): () => Promise<SessionDeletion> {
  const { state } = core
  const kept = core.deps.keptSessions

  /**
   * Intent: drop every session held in memory, every row and a pending opening; a showing Review
   * gives way.
   */
  const forgetEverySession = (): void => {
    cancelOpening()
    rows.removed(rows.rows().map((row) => row.key))
    if (state.review?.showing === true) state.listShowing = true
    state.review = null
    state.mostRecent = null
  }

  return async () => {
    if (state.phase !== 'idle')
      throw new SessionControllerError('session controller: Delete every session during a session')
    if (kept.savingOff())
      throw new SessionControllerError(
        'session controller: Delete every session while saving is off',
      )
    const outcome = await deleteEveryKeptSession(kept.changes)
    if (outcome.status === 'refused') return 'refused'
    if (outcome.status === 'saving-off') return 'saving-off'
    // Saved, or nothing stored to delete (spec D332): the same success.
    forgetEverySession()
    return 'deleted'
  }
}
