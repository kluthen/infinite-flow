/**
 * The workspace shell's moves in and out of the review mode: `Close review`, `Review last session`
 * and the cue row's `All sessions` (each scrolling the page instantly to its top, then moving
 * focus; a `Review last session` whose read fails, or finds its session damaged, shows the list
 * instead, spec D307, D310), and the focus
 * a session start leaves behind when it removes a focused cue-row link. The shell owns the elements
 * focus lands on; this holds only the order of the steps and the choice of target.
 */
import { nextTick, watch } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { reviewCloseFocusTarget, type SessionEndFocusTarget } from './session-end-focus'
import type { SessionController } from './workspace-session-controller-types'

/** What the header tells the moves: whether its two actions are enabled now. */
// @spec-link [[req_last_session_review]]
export interface ReviewNavigationHeader {
  readonly sessionActionEnabled: boolean
  readonly phraseActionEnabled: boolean
}

/** What the moves read and act through; every element they focus is the shell's. */
// @spec-link [[req_last_session_review]]
export interface ReviewNavigationDependencies {
  /** The loaded session controller; a move before it loads is a defect, so this throws. */
  readonly controller: () => SessionController
  readonly idle: () => Readonly<GenerationSessionState<WorkspaceSessionResult>>
  readonly sessionActive: () => boolean
  readonly header: () => ReviewNavigationHeader
  readonly scrollToPageTop: () => void
  /**
   * Focus the title of the level that shows (`review-title` of the Review or of the list), at once
   * if it is mounted, else once it mounts.
   */
  readonly focusReviewTitle: () => void
  readonly focusTarget: (target: SessionEndFocusTarget) => void
}

/** The moves the shell binds to `Close review`, `Review last session` and `All sessions`. */
// @spec-link [[req_last_session_review]]
export interface ReviewNavigation {
  readonly closeReview: () => Promise<void>
  readonly showReview: () => Promise<void>
  readonly showSessions: () => void
}

/**
 * Intent: the Review's moves for one shell, plus the watcher that gives focus to the session
 * action when a session start removes the focused `review-link`.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
export function useReviewNavigation(deps: ReviewNavigationDependencies): ReviewNavigation {
  /**
   * Intent: `Close review`: the Review stops showing and is kept, the page scrolls instantly to its
   * top, and once the staff area is rendered again focus moves by the idle state it shows: it
   * stays on the session action if enabled (`Start session` in Ready), else `room-notice`, else
   * the phrase action if enabled, else `controller-status`. Nothing is announced.
   */
  // @spec-link [[req_last_session_review]]
  async function closeReview(): Promise<void> {
    deps.controller().closeReview()
    deps.scrollToPageTop()
    await nextTick()
    const header = deps.header()
    deps.focusTarget(
      reviewCloseFocusTarget({
        sessionActionEnabled: header.sessionActionEnabled,
        roomNoticeShown: deps.idle().roomNotice !== null,
        phraseActionEnabled: header.phraseActionEnabled,
      }),
    )
  }

  /**
   * Intent: `Review last session`: the most recent session's Review shows (at once when held in
   * memory, once read when kept on the device), the page scrolls instantly to its top, then focus
   * moves to `review-title` once the panel is mounted. When its read fails, the session list shows
   * instead, that session's row marked as failed to open, focus on the list's title (spec D307);
   * when it finds the session damaged, the list shows once its deletion settled, without that
   * session's row, focus on the list's title (spec D310); when a session started meanwhile,
   * nothing moves.
   */
  // @spec-link [[req_last_session_review]]
  // @spec-link [[req_kept_session_review]]
  // @spec-link [[module_kept_session_reach]]
  async function showReview(): Promise<void> {
    if ((await deps.controller().showReview()) === 'superseded') return
    deps.scrollToPageTop()
    deps.focusReviewTitle()
  }

  /**
   * Intent: the cue row's `All sessions`: the session list shows in the review mode, the page
   * scrolls instantly to its top, and focus moves to the list's title.
   */
  // @spec-link [[req_kept_session_list]]
  function showSessions(): void {
    deps.controller().showList()
    deps.scrollToPageTop()
    deps.focusReviewTitle()
  }

  /**
   * Intent: a session start removes `review-link` and `sessions-link`; if one had focus (the
   * starting note started the session, with no click on the page), focus moves to the session
   * action once it is rendered. Run before the render, while the link is still there to hold focus.
   */
  // @spec-link [[rule_new_session_discards_review]]
  async function focusSessionActionWhenReviewLinkLeaves(
    active: boolean,
    wasActive: boolean,
  ): Promise<void> {
    if (!active || wasActive) return
    const focused = document.activeElement?.classList
    if (focused?.contains('review-link') !== true && focused?.contains('sessions-link') !== true)
      return
    await nextTick()
    deps.focusTarget('session-action')
  }

  watch(deps.sessionActive, focusSessionActionWhenReviewLinkLeaves)

  return { closeReview, showReview, showSessions }
}
