/**
 * The header's two action slots, the phrase action and the session action: which of them carries
 * the primary emphasis in each workspace state, by the handoff's action table. Exactly one does:
 * the next useful step. Pure and DOM-free; the header reads the facts from the Idle state and the
 * session controller.
 */

/** The workspace facts the action table is judged on. */
// @spec-link [[rule_session_start_conditions]]
export interface HeaderActionFacts {
  /** A session is running, count-in included. */
  readonly sessionActive: boolean
  /** An Idle operation is running (Loading): a generation, a fit round or a notation. */
  readonly operationRunning: boolean
  /** The generation-failure banner shows. */
  readonly generationErrorShown: boolean
  /** The notation error shows. */
  readonly notationErrorShown: boolean
  /** The "staff needs more room" notice shows. */
  readonly roomNoticeShown: boolean
  /** An Idle result is kept (Ready, or a phrase retained under an error). */
  readonly phraseShown: boolean
  /** The phrase on screen is the one the last session played (interim D-A, until the Review). */
  readonly phrasePlayedByLastSession: boolean
}

/** Which header action carries the primary emphasis. */
export type PrimaryHeaderAction = 'phrase' | 'session'

/**
 * Intent: the action that carries the primary emphasis. The session action does during a
 * session, in Loading (disabled until the new phrase lands), in Needs more room without a banner
 * (disabled until the notice clears) and in Ready. The phrase action does in Empty, under a
 * generation-failure banner or a notation error (its retry is the next step), and over the phrase
 * the last session played, which only a new phrase makes startable again.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
export function primaryHeaderAction(facts: HeaderActionFacts): PrimaryHeaderAction {
  if (facts.sessionActive || facts.operationRunning) return 'session'
  if (facts.generationErrorShown || facts.notationErrorShown) return 'phrase'
  if (facts.phrasePlayedByLastSession) return 'phrase'
  if (facts.roomNoticeShown || facts.phraseShown) return 'session'
  return 'phrase'
}
