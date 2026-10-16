/**
 * The session controller's review mode: its two levels, a session's Review and the session list,
 * and the moves between them. `Review last session` shows the most recent session, at once when
 * it is held in memory, once read when it is kept on the device; a row of the list opens any kept
 * session by its key, read the same way (the latest opening wins, leaving the mode cancels it);
 * `All sessions` and the cue row's link show the list; `Close review` leaves the mode from either
 * level. A read that does not give the session shows no review and marks its row as failed to
 * open, until it opens. A session the read finds damaged is deleted at once while the visit saves
 * (./workspace-damaged-session-deletions.ts), the opening under way until that settles; its row
 * then leaves, and `Review last session` shows the list. Once read, a session is held in memory as
 * the Review's, with the facts its row holds for the visit, and as the most recent session too
 * when it is that one.
 */
import { assertReviewMayShow, closedReview, shownReview } from './session-review-state'
import type { KeptSessionRows } from './use-kept-sessions'
import type { DamagedSessionDeletions } from './workspace-damaged-session-deletions'
import { readKeptReviewedSession } from './workspace-kept-session-read'
import type { SessionControllerCore } from './workspace-session-active'
import {
  SessionControllerError,
  type MostRecentSession,
  type ReviewedSession,
  type SessionOpening,
} from './workspace-session-controller-types'

/** The controller's moves in and out of the review mode. */
export interface ReviewMode {
  readonly showReview: () => Promise<SessionOpening>
  readonly openSession: (key: string) => Promise<SessionOpening>
  readonly showList: () => void
  readonly closeReview: () => void
  /** Drop the pending opening, if any, so its read shows nothing when it settles. */
  readonly cancelOpening: () => void
}

/**
 * What an opening's read came to: the session, with its row's facts; damaged, with the landing of
 * its deletion to apply; or failed, its row marked as failed to open.
 */
type KeptOpened =
  | { readonly kind: 'read'; readonly session: ReviewedSession }
  | { readonly kind: 'damaged'; readonly land: () => void }
  | { readonly kind: 'failed' }

const OPEN_FAILED: KeptOpened = Object.freeze({ kind: 'failed' })

/** Intent: the session held in memory under `key`, in the Review or as the most recent one. */
// @spec-link [[module_kept_session_reach]]
export function findHeldSession(
  state: Pick<SessionControllerCore['state'], 'review' | 'mostRecent'>,
  key: string,
): ReviewedSession | null {
  if (state.review?.key === key) return state.review
  const recent = state.mostRecent
  return recent?.kind === 'held' && recent.session.key === key ? recent.session : null
}

/**
 * Intent: a kept session read back from the device, with the facts its row holds for the visit
 * (a pin or a comment the device refused stays as the player made it); without a row, as read.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[rule_pinned_session_kept]]
function withRowFacts(read: ReviewedSession, rows: KeptSessionRows): ReviewedSession {
  const row = rows.row(read.key)
  if (row?.kind !== 'current') return read
  const { pinned, comment } = row.summary
  if (pinned === read.pinned && comment === read.comment) return read
  return Object.freeze({ ...read, pinned, comment, keeping: pinned ? 'pinned' : 'not-pinned' })
}

/**
 * Intent: build the review mode over the controller's core, the rows it holds and its deletions
 * of damaged sessions: each move at Idle only; one opening pending at a time.
 */
// @spec-link [[module_kept_session_reach]]
// @spec-link [[req_kept_session_review]]
// @spec-link [[req_last_session_review]]
export function createReviewMode(
  core: Pick<SessionControllerCore, 'state' | 'deps'>,
  rows: KeptSessionRows,
  damaged: Pick<DamagedSessionDeletions, 'deleteOpened'>,
): ReviewMode {
  const { state, deps } = core
  /** Counts openings; a read that settles under an older count shows nothing. */
  let openings = 0

  /** Intent: drop the pending opening, if any, so its read shows nothing when it settles. */
  const cancelOpening = (): void => {
    openings += 1
    state.openingKey = null
  }

  /** Intent: show `session`'s Review in the list's place, held in memory as the Review's. */
  const show = (session: ReviewedSession): void => {
    state.review = shownReview(session)
    state.listShowing = false
  }

  /**
   * Intent: read the kept session under `key`; resolve it with its row's facts; damaged, once its
   * deletion settled, with that deletion's landing; or failed when the read does not give it or
   * the damaged session was not deleted (its row then says it failed to open).
   */
  // @spec-link [[module_kept_session_save]]
  const readKept = async (key: string): Promise<KeptOpened> => {
    const read = await readKeptReviewedSession(deps.keptSessions.read, key)
    if (read.kind === 'read') {
      rows.opened(key)
      return Object.freeze({ kind: 'read', session: withRowFacts(read.session, rows) })
    }
    const land = read.kind === 'damaged' ? await damaged.deleteOpened(key) : null
    if (land !== null) return Object.freeze({ kind: 'damaged', land })
    rows.openFailed(key)
    return OPEN_FAILED
  }

  /**
   * Intent: `Review last session`: the most recent session's Review shows, only at Idle; else
   * throws. One held in memory shows at once. A kept one is read first by its key, the read shown
   * as under way; once read it is held in memory and shows, unless a session started or the most
   * recent session changed meanwhile ('superseded'); a read that does not give it shows the list
   * instead, its row marked as failed to open ('failed'); one that finds it damaged deletes it,
   * then shows the list without its row ('damaged').
   */
  // @spec-link [[req_last_session_review]]
  // @spec-link [[req_kept_session_review]]
  // @spec-link [[module_kept_session_reach]]
  const showReview = (): Promise<SessionOpening> => {
    if (state.listShowing)
      throw new SessionControllerError('session controller: the session list shows')
    const recent = assertReviewMayShow(
      state.mostRecent,
      state.review,
      state.phase,
      state.readingMostRecent,
    )
    if (recent.kind === 'held') {
      show(recent.session)
      return Promise.resolve('shown')
    }
    return showKept(recent)
  }

  /** Intent: read the kept most recent session `recent`, then show it if still in turn. */
  // @spec-link [[req_kept_session_review]]
  const showKept = async (recent: Extract<MostRecentSession, { kind: 'kept' }>) => {
    state.readingMostRecent = true
    let opened: KeptOpened
    try {
      opened = await readKept(recent.key)
    } finally {
      state.readingMostRecent = false
    }
    if (opened.kind !== 'read') {
      // The list shows instead: without a damaged session's row, which its deletion removed
      // (spec D310), or with the session's row marked as failed to open (spec D307).
      if (opened.kind === 'damaged') opened.land()
      if (state.phase === 'idle' && state.review?.showing !== true) state.listShowing = true
      return opened.kind
    }
    if (state.mostRecent !== recent || state.phase !== 'idle') return 'superseded' as const
    state.mostRecent = Object.freeze({ kind: 'held', session: opened.session })
    show(opened.session)
    return 'shown' as const
  }

  /**
   * Intent: open the kept session under `key` from its row, at Idle only: one held in memory shows
   * at once; any other is read by its key, `openingKey` saying so meanwhile, then held and shown
   * ('shown'), or its row marked as failed to open ('failed'), or, found damaged, deleted and its
   * row gone ('damaged'). A later opening, or leaving the mode, replaces a pending one, whose read
   * then shows nothing ('superseded'). Throws during a session, and for a key with no row this
   * version can open.
   */
  // @spec-link [[module_kept_session_reach]]
  // @spec-link [[req_kept_session_list]]
  // @spec-link [[req_kept_session_review]]
  const openSession = (key: string): Promise<SessionOpening> => {
    if (state.phase !== 'idle')
      throw new SessionControllerError('session controller: no session opens during a session')
    const held = findHeldSession(state, key)
    if (held === null && rows.row(key)?.kind !== 'current')
      throw new SessionControllerError(`session controller: no kept session "${key}" can open`)
    cancelOpening()
    if (held !== null) {
      show(held)
      return Promise.resolve('shown')
    }
    return openKept(key)
  }

  /** Intent: read the kept session under `key` for its row's opening, then show it if in turn. */
  // @spec-link [[module_kept_session_reach]]
  const openKept = async (key: string): Promise<SessionOpening> => {
    const opening = openings
    state.openingKey = key
    let opened: KeptOpened
    try {
      opened = await readKept(key)
    } finally {
      if (opening === openings) state.openingKey = null
    }
    // A damaged session's deletion lands even when the opening was replaced meanwhile.
    if (opened.kind === 'damaged') opened.land()
    if (opening !== openings || state.phase !== 'idle') return 'superseded'
    if (opened.kind !== 'read') return opened.kind
    const recent = state.mostRecent
    if (recent?.kind === 'kept' && recent.key === key)
      state.mostRecent = Object.freeze({ kind: 'held', session: opened.session })
    show(opened.session)
    return 'shown'
  }

  /**
   * Intent: show the session list in the review mode's place, at Idle only: from the cue row, or
   * from a Review (`All sessions`), which is kept without showing. Throws during a session and
   * while the list already shows.
   */
  // @spec-link [[req_kept_session_list]]
  // @spec-link [[module_kept_session_reach]]
  const showList = (): void => {
    if (state.phase !== 'idle')
      throw new SessionControllerError('session controller: no list shows during a session')
    if (state.listShowing)
      throw new SessionControllerError('session controller: the session list already shows')
    if (state.review?.showing === true) state.review = closedReview(state.review)
    state.listShowing = true
  }

  /**
   * Intent: `Close review`: leave the review mode from either level, the Review kept without
   * showing, a pending opening cancelled; throws when the mode does not show.
   */
  // @spec-link [[req_last_session_review]]
  // @spec-link [[module_kept_session_reach]]
  const closeReview = (): void => {
    if (state.listShowing) {
      cancelOpening()
      state.listShowing = false
      return
    }
    state.review = closedReview(state.review)
  }

  return { showReview, openSession, showList, closeReview, cancelOpening }
}
