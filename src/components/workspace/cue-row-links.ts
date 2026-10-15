/**
 * When the cue row's two links show, at Idle only and never while the review mode shows (a Review
 * or the session list): `review-link` while a most recent session exists (held in memory, or kept
 * and readable), `sessions-link` while the session list has at least one row. Both, one or none
 * may show. Pure over the controller's state.
 */
import type { SessionControllerState } from './workspace-session-controller-types'

/** The controller's state the links are decided from. */
type LinkFacts = Pick<SessionControllerState, 'phase' | 'review' | 'listShowing'>

/** Intent: whether the cue row may hold a link now: at Idle, the review mode not showing. */
function linksMayShow(state: LinkFacts): boolean {
  return state.phase === 'idle' && state.review?.showing !== true && !state.listShowing
}

/**
 * Intent: whether `review-link` shows: at Idle, while a most recent session exists and the review
 * mode does not show. A start removes it; the most recent session stays, so it returns at the end.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
// @spec-link [[rule_most_recent_session_kept]]
export function reviewLinkShown(state: LinkFacts & Pick<SessionControllerState, 'mostRecent'>) {
  return linksMayShow(state) && state.mostRecent !== null
}

/**
 * Intent: whether `sessions-link` ("All sessions") shows: at Idle, while the session list has at
 * least one row (a session saved by a newer version has one; one whose summary cannot be read has
 * none) and the review mode does not show.
 */
// @spec-link [[req_kept_session_list]]
// @spec-link [[module_kept_session_reach]]
export function sessionsLinkShown(state: LinkFacts & Pick<SessionControllerState, 'keptRows'>) {
  return linksMayShow(state) && state.keptRows.length > 0
}
