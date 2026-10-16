/**
 * The session controller's side of my instrument's kept sessions (spec D295, D326), beside its
 * `Delete every session` (./workspace-kept-sessions-deletion.ts): the sessions a warning or a
 * confirmation counts, and their leaving memory once the batch that erases them is saved. The
 * sessions of my instrument are the rows of the session list (./use-kept-sessions.ts) whose
 * summary names `my-instrument`, and the session that just ended when it was played with it and
 * has no row yet. The batch names each counted session stored on the device by its key, the one
 * that just ended by the key its save minted, so it is erased after that save; one held in memory
 * only because its own save failed has nothing on the device to delete and only leaves memory,
 * so its retry has nothing left to save (spec D338). Leaving memory, as `Delete session` does:
 * the rows go, a pending opening of one of them is cancelled, a Review of one gives way to the
 * session list when it showed, and a most recent one goes, leaving none.
 */
import type { MyInstrumentSessions } from '@/composables/use-generation-session'
import { MY_INSTRUMENT_ID } from '@/domain/profile/instrument-profiles'
import { keptSessionsDeletes } from './kept-session-review-changes'
import type { KeptSessionRows } from './use-kept-sessions'
import type { SessionControllerCore } from './workspace-session-active'
import type { ReviewedSession } from './workspace-session-controller-types'

/** Intent: whether a session held in memory was played with my instrument. */
function playedWithMyInstrument(session: ReviewedSession): boolean {
  return session.history.phrases()[0]?.intent.instrumentProfile.id === MY_INSTRUMENT_ID
}

/**
 * Intent: count the kept sessions of my instrument over the controller's state, the list's rows
 * and the review mode's cancelling of a pending opening; each count holds its sessions' deletes
 * and their leaving memory, by the keys it counted, whatever changes after it.
 */
// @spec-link [[entity_my_instrument_record]]
// @spec-link [[req_kept_sessions]]
// @spec-link [[module_kept_session_reach]]
// @spec-link [[rule_most_recent_session_kept]]
export function createMyInstrumentSessions(
  core: Pick<SessionControllerCore, 'state'>,
  rows: KeptSessionRows,
  cancelOpening: () => void,
): () => MyInstrumentSessions {
  const { state } = core

  /** Intent: the sessions held in memory: the most recent one, and the one a Review draws. */
  const heldSessions = (): ReviewedSession[] => {
    const held: ReviewedSession[] = []
    const recent = state.mostRecent
    if (recent?.kind === 'held') held.push(recent.session)
    if (state.review !== null && !held.some((session) => session.key === state.review?.key))
      held.push(state.review)
    return held
  }

  /** Intent: the sessions under `keys` leave memory, as `Delete session` makes one leave. */
  const leave = (keys: readonly string[]): void => {
    if (state.openingKey !== null && keys.includes(state.openingKey)) cancelOpening()
    rows.removed(keys)
    if (state.review !== null && keys.includes(state.review.key)) {
      if (state.review.showing) state.listShowing = true
      state.review = null
    }
    const recent = state.mostRecent
    if (recent !== null && keys.includes(recent.kind === 'held' ? recent.session.key : recent.key))
      state.mostRecent = null
  }

  return () => {
    const stored = rows
      .rows()
      .flatMap((row) =>
        row.kind === 'current' && row.summary.instrument.id === MY_INSTRUMENT_ID ? [row.key] : [],
      )
    const unlisted = heldSessions().filter(
      (session) => playedWithMyInstrument(session) && !stored.includes(session.key),
    )
    const counted = Object.freeze([...stored, ...unlisted.map((session) => session.key)])
    const named = [
      ...stored,
      ...unlisted.filter((session) => session.keeping !== 'not-saved').map(({ key }) => key),
    ]
    return Object.freeze({
      count: counted.length,
      deletes: keptSessionsDeletes(named),
      leave: () => leave(counted),
    })
  }
}
