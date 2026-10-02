/**
 * When a session may start, judged from the plain facts the workspace knows at Idle. Pure and
 * DOM-free; no MIDI fact is an input, since no MIDI state ever blocks a start. No session starts
 * while the last session's Review shows.
 */

/** The workspace facts the start conditions are judged on. */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_never_blocks_session]]
// @spec-link [[req_last_session_review]]
export interface SessionStartFacts {
  /** An Idle result is engraved on the staff. */
  readonly phraseShown: boolean
  /** Any Idle generation is running: generate, regenerate or the fit retries. */
  readonly generationRunning: boolean
  /** The notation error shows. */
  readonly notationError: boolean
  /** The generation-failure banner shows. */
  readonly generationFailureShown: boolean
  /** The rhythm settings are a combination that blocks generation. */
  readonly rhythmUnsupported: boolean
  /** The rotate-device notice shows (a portrait-shaped view below bp-desktop). */
  readonly orientationNoticeShown: boolean
  /** The "staff needs more room" notice shows. */
  readonly roomNoticeShown: boolean
  /** A session is running, count-in included. */
  readonly sessionActive: boolean
  /** The last session's Review shows (in place of the staff): it must be closed first. */
  readonly reviewShowing: boolean
}

/** The first condition that blocks a start, in the order `sessionStartBlocker` checks them. */
// @spec-link [[rule_session_start_conditions]]
export type SessionStartBlocker =
  | 'session_active'
  | 'review_showing'
  | 'no_phrase'
  | 'generation_running'
  | 'notation_error'
  | 'generation_failure'
  | 'rhythm_unsupported'
  | 'orientation_notice'
  | 'room_notice'

/**
 * Intent: the first start condition that does not hold, or null when a session may start: no
 * session running, the Review not showing, a phrase shown, no Idle generation running (generate,
 * regenerate or fit retries), no notation error, no failure banner, a supported rhythm
 * combination, and the staff shown (no rotate-device notice, no room notice).
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[req_last_session_review]]
export function sessionStartBlocker(facts: SessionStartFacts): SessionStartBlocker | null {
  if (facts.sessionActive) return 'session_active'
  if (facts.reviewShowing) return 'review_showing'
  if (!facts.phraseShown) return 'no_phrase'
  if (facts.generationRunning) return 'generation_running'
  if (facts.notationError) return 'notation_error'
  if (facts.generationFailureShown) return 'generation_failure'
  if (facts.rhythmUnsupported) return 'rhythm_unsupported'
  if (facts.orientationNoticeShown) return 'orientation_notice'
  if (facts.roomNoticeShown) return 'room_notice'
  return null
}

/** Intent: whether a session may start now; MIDI state never enters the judgement. */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_never_blocks_session]]
export function canStartSession(facts: SessionStartFacts): boolean {
  return sessionStartBlocker(facts) === null
}
