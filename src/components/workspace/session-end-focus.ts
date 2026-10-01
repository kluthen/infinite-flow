/**
 * Where focus goes when a session ends, judged once the Idle rules have applied in the layout the
 * window gives afresh. Pure; the shell moves focus to the element it names.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { SessionEndSummary } from './workspace-session-controller-types'

/** The element focus moves to at a session end. */
// @spec-link [[rule_stop_ends_session]]
export type SessionEndFocusTarget = 'session-action' | 'room-notice' | 'phrase-action'

/** The Idle facts the choice reads. */
type IdleFocusFacts = Pick<
  GenerationSessionState<WorkspaceSessionResult>,
  'roomNotice' | 'operation'
>

/**
 * Intent: the focus target after `end`. Whenever the Idle rules show `room-notice`, there, after
 * any end. Otherwise, once phrase 1 has sounded, the phrase action (interim D-A, until chunk 20's
 * Review takes it to `Close review`); an end during the count-in goes to the session action, now
 * `Start session`. When the Idle rules regenerate phrase 1 (Loading) the handoff names
 * `controller-status`, which does not exist yet: the session action stands in until chunk 13
 * builds it.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_stop_ends_session]]
export function sessionEndFocusTarget(
  end: SessionEndSummary,
  idle: IdleFocusFacts,
): SessionEndFocusTarget {
  if (idle.roomNotice !== null) return 'room-notice'
  if (end.soundedPhraseCount >= 1) return 'phrase-action'
  // Chunk 13: while phrase 1 regenerates (`idle.operation` not idle), focus `controller-status`.
  return 'session-action'
}

/**
 * Intent: whether Needs more room landing after the end's focus move should still take focus.
 * After a window end the staff re-engraves phrase 1 in the layout chosen afresh, and finding no
 * room there can show the notice only after focus has moved; the notice then takes it (the
 * session action it may have gone to is disabled under the notice). Other ends leave the window
 * as it was, and an end that already focused the notice has nothing left to move.
 */
// @spec-link [[rule_count_in_ending_returns_to_idle]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export function awaitsLateRoomNotice(
  end: SessionEndSummary,
  target: SessionEndFocusTarget,
): boolean {
  return end.cause === 'staff-not-shown' && target !== 'room-notice'
}
