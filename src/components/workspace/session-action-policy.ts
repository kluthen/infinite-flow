/**
 * The header's two action slots, the phrase action and the session action: which of them carries
 * the primary emphasis in each workspace state, by the handoff's action table, and when the phrase
 * action is disabled. Exactly one slot carries the emphasis: the next useful step. Pure and
 * DOM-free; the header reads the facts from the Idle state and the session controller. It also
 * judges when a fresh Jam (Jam mode at Idle, no doodle kept) could start.
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
  /** The last session's Review shows, in place of the staff; the session action reads `Close review`. */
  readonly reviewShowing: boolean
}

/** Which header action carries the primary emphasis. */
export type PrimaryHeaderAction = 'phrase' | 'session'

/**
 * Intent: the action that carries the primary emphasis. The session action does during a
 * session, while the Review shows (it reads `Close review`, whatever the hidden Idle state), in
 * Loading (disabled until the new phrase lands), in Needs more room without a banner (disabled
 * until the notice clears) and in Ready. The phrase action does in Empty, and under a
 * generation-failure banner or a notation error (its retry is the next step).
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[req_last_session_review]]
export function primaryHeaderAction(facts: HeaderActionFacts): PrimaryHeaderAction {
  if (facts.sessionActive || facts.reviewShowing || facts.operationRunning) return 'session'
  if (facts.generationErrorShown || facts.notationErrorShown) return 'phrase'
  if (facts.roomNoticeShown || facts.phraseShown) return 'session'
  return 'phrase'
}

/** The facts the phrase action's disabled state is judged on. */
// @spec-link [[rule_session_settings_locked]]
export interface PhraseActionFacts {
  /** An Idle operation is running (Loading). */
  readonly operationRunning: boolean
  /** The rhythm combination blocks the action's new generation (never Retry notation). */
  readonly blockedByUnsupportedRhythm: boolean
  /** A session is running, count-in included. */
  readonly sessionActive: boolean
  /** The last session's Review shows. */
  readonly reviewShowing: boolean
}

/**
 * Intent: whether the phrase action is disabled: while an operation runs, under an unsupported
 * rhythm, during a session, and in place while the Review shows (the hidden phrase is not the
 * player's to change from there).
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[req_last_session_review]]
export function phraseActionDisabled(facts: PhraseActionFacts): boolean {
  return (
    facts.operationRunning ||
    facts.blockedByUnsupportedRhythm ||
    facts.sessionActive ||
    facts.reviewShowing
  )
}

/** The facts a fresh Jam's start (Jam mode at Idle, no doodle kept) is judged on. */
// @spec-link [[rule_jam_start_conditions]]
export interface FreshJamStartFacts {
  /** The session controller has loaded: every start goes through it. */
  readonly controllerLoaded: boolean
  /** A MIDI controller is connected (`controller-status` shows its connected badge). */
  readonly controllerConnected: boolean
  /** A session is running, count-in included. */
  readonly sessionActive: boolean
  /** The review mode shows: a Review, or the session list. */
  readonly reviewShowing: boolean
  /** A sheet is open (the connection, My instrument, Your data or preset sheet, with its confirmations). */
  readonly sheetOpen: boolean
  /** The rotate-device notice shows (a portrait-shaped view below bp-desktop). */
  readonly orientationNoticeShown: boolean
  /** Jam's staff shows its empty system: neither Needs more room nor a notation error. */
  readonly jamStaffShown: boolean
}

/**
 * Intent: whether a fresh Jam could start now: every condition of a session start except the three
 * that need a phrase (a phrase on screen, no new phrase being generated, a supported rhythm
 * combination), and a controller connected: the controller loaded, no session running, the review
 * mode not showing, no sheet or confirmation open, and the staff shown (no rotate-device notice,
 * no Needs more room, no Notation error).
 */
// @spec-link [[rule_jam_start_conditions]]
// @spec-link [[rule_jam_needs_controller]]
export function freshJamCanStart(facts: FreshJamStartFacts): boolean {
  return (
    facts.controllerLoaded &&
    facts.controllerConnected &&
    !facts.sessionActive &&
    !facts.reviewShowing &&
    !facts.sheetOpen &&
    !facts.orientationNoticeShown &&
    facts.jamStaffShown
  )
}
