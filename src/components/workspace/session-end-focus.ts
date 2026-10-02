/**
 * Where focus goes when a session ends, judged once the Idle rules have applied in the layout the
 * window gives afresh, and where `Close review` sends it. Pure; the shell moves focus to the
 * element it names.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { SessionEndSummary } from './workspace-session-controller-types'

/** The element focus moves to at a session end. */
// @spec-link [[rule_stop_ends_session]]
export type SessionEndFocusTarget =
  'session-action' | 'room-notice' | 'phrase-action' | 'controller-status'

/** The Idle facts the choice reads. */
type IdleFocusFacts = Pick<
  GenerationSessionState<WorkspaceSessionResult>,
  'roomNotice' | 'operation'
>

/**
 * Intent: the focus target after `end`. Once phrase 1 has sounded the Review shows, and focus goes
 * to the session action, now `Close review`, whatever the hidden Idle state (its room notice is
 * hidden with the staff). An end during the count-in goes to `room-notice` whenever the Idle rules
 * show it, else to the session action, now `Start session`, unless the Idle rules regenerate
 * phrase 1 (Loading): both header actions are disabled while it loads, so focus goes to
 * `controller-status`.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_last_session_review]]
export function sessionEndFocusTarget(
  end: SessionEndSummary,
  idle: IdleFocusFacts,
): SessionEndFocusTarget {
  if (end.soundedPhraseCount >= 1) return 'session-action'
  if (idle.roomNotice !== null) return 'room-notice'
  if (idle.operation !== 'idle') return 'controller-status'
  return 'session-action'
}

/**
 * Intent: whether Needs more room landing after the end's focus move should still take focus.
 * After a window end during the count-in the staff re-engraves phrase 1 in the layout chosen
 * afresh, and finding no room there can show the notice only after focus has moved; the notice
 * then takes it (the session action it may have gone to is disabled under the notice). Other ends
 * leave the window as it was, an end that already focused the notice has nothing left to move, and
 * an end once phrase 1 has sounded opens the Review, which hides the notice with the staff.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function awaitsLateRoomNotice(
  end: SessionEndSummary,
  target: SessionEndFocusTarget,
): boolean {
  return end.soundedPhraseCount === 0 && end.cause === 'staff-not-shown' && target !== 'room-notice'
}

/** The workspace facts `Close review` sends focus by, read once the Review stops showing. */
// @spec-link [[req_last_session_review]]
export interface ReviewCloseFocusFacts {
  /** The session action, now `Start session`, is enabled (Ready). */
  readonly sessionActionEnabled: boolean
  /** The "staff needs more room" notice shows. */
  readonly roomNoticeShown: boolean
  /** The phrase action is enabled. */
  readonly phraseActionEnabled: boolean
}

/**
 * Intent: the focus target after `Close review`: it stays on the session action when that is
 * enabled (`Start session` in Ready); otherwise it moves once to `room-notice` in Needs more room,
 * else to the phrase action if enabled, else to `controller-status`.
 */
// @spec-link [[req_last_session_review]]
export function reviewCloseFocusTarget(facts: ReviewCloseFocusFacts): SessionEndFocusTarget {
  if (facts.sessionActionEnabled) return 'session-action'
  if (facts.roomNoticeShown) return 'room-notice'
  if (facts.phraseActionEnabled) return 'phrase-action'
  return 'controller-status'
}
