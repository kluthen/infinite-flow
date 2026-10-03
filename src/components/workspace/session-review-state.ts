/**
 * The last-session Review's transitions, as the session controller applies them: it opens showing
 * at a session end once phrase 1 has sounded, `Close review` keeps it without showing it, and
 * `Review last session` shows it again, only at Idle. Each transition returns a new frozen Review;
 * one asked for out of turn throws. Pure; the controller holds the current Review in its state.
 */
import type { SessionHistory } from '@/session/session-history'
import {
  SessionControllerError,
  type SessionControllerPhase,
  type SessionReview,
} from './workspace-session-controller-types'

/**
 * Intent: the Review a session end opens, showing, over that session's closed history, with the
 * tempo it reached (its last sounded phrase's); a history in which no phrase sounded opens none
 * and throws.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
export function openedReview(history: SessionHistory): SessionReview {
  const tempoReached = history.tempoReached()
  if (tempoReached === null) {
    throw new Error('session review: no phrase sounded, so no Review opens')
  }
  return Object.freeze({ history, showing: true, tempoReached })
}

/** Intent: the Review `Close review` leaves: kept, not showing; closing one not showing throws. */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
export function closedReview(review: SessionReview | null): SessionReview {
  if (review === null || !review.showing) {
    throw new SessionControllerError('session controller: no Review shows')
  }
  return Object.freeze({ ...review, showing: false })
}

/**
 * Intent: the kept Review shown again by `Review last session`; with none kept, one already
 * showing, or a session running, the request is out of turn and throws.
 */
// @spec-link [[req_last_session_review]]
export function shownReview(
  review: SessionReview | null,
  phase: SessionControllerPhase,
): SessionReview {
  if (review === null) throw new SessionControllerError('session controller: no Review exists')
  if (review.showing)
    throw new SessionControllerError('session controller: the Review already shows')
  if (phase !== 'idle') {
    throw new SessionControllerError('session controller: no Review shows during a session')
  }
  return Object.freeze({ ...review, showing: true })
}
