/**
 * The session controller's contract with the screen that binds to it and with the workspace that
 * builds it: the reactive state it exposes, its actions, and the error it throws at a caller that
 * breaks the contract. The seams it is built from live in `workspace-session-controller-seams.ts`
 * and are re-exported here; the controller itself is `workspace-session-controller.ts`.
 */
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { CountInDisplay } from '@/session/count-in-display'
import type { SessionHistory } from '@/session/session-history'
import type { SessionTransportEvent } from '@/session/session-runner'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { StartingNote } from '@/session/starting-note'
import type { SessionEndCause, SessionSettings } from '@/session/session-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { SessionStaff } from '@/components/notation/session-staff'
import type { ControllerLostCountdown } from './workspace-session-midi'

export type {
  FramePort,
  SessionControllerClock,
  SessionControllerDependencies,
  StaffFitPlanner,
} from './workspace-session-controller-seams'

/** Where the session stands: no session, its count-in, or its phrases sounding. */
// @spec-link [[service_session_controller]]
export type SessionControllerPhase = 'idle' | 'count-in' | 'running'

/** A transport event without its time, which the controller raises to the engine's time floor. */
// @spec-link [[service_session_controller]]
export type UntimedEvent<E = SessionTransportEvent> = E extends unknown ? Omit<E, 'at'> : never

/** The count-in row while the count-in runs: one state per beat. */
// @spec-link [[rule_count_in_shown_on_screen]]
export type RunningCountIn = Extract<CountInDisplay, { over: false }>

/** How the last session ended: why, in which phase, and how many phrases had started sounding. */
// @spec-link [[rule_stop_ends_session]]
export interface SessionEndSummary {
  readonly cause: SessionEndCause
  readonly phase: 'count-in' | 'running'
  readonly soundedPhraseCount: number
}

/**
 * The last session's Review: its closed history, whether the player is in it, and the tempo the
 * session reached. It exists from a session end once phrase 1 has sounded until the next session
 * starts; each change replaces the frozen object, never mutates it.
 */
// @spec-link [[req_last_session_review]]
// @spec-link [[rule_new_session_discards_review]]
export interface SessionReview {
  readonly history: SessionHistory
  /** The Review shows, in place of the staff; false once closed, while it is kept. */
  readonly showing: boolean
  /** The last sounded phrase's tempo, in BPM: the highest the session reached. */
  readonly tempoReached: number
}

/** What the screen reads from the controller; every field is reactive. */
// @spec-link [[service_session_controller]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_starting_note]]
export interface SessionControllerState {
  readonly phase: SessionControllerPhase
  /** The count-in row while the count-in runs, on the audio clock; null outside it. */
  readonly countIn: RunningCountIn | null
  readonly strugglingNotice: boolean
  /**
   * The exact tempo in effect in the running session, in BPM: the starting tempo until a phrase
   * at another tempo starts sounding, then that phrase's; null with no session.
   */
  readonly sessionTempo: number | null
  /** The staff layout the running session holds, chosen at its start; null with no session. */
  readonly heldLayout: StaffLayout | null
  readonly canStart: boolean
  /** The first start condition that does not hold, or null when Start may be clicked. */
  readonly startBlocker: SessionStartBlocker | null
  readonly lastEnd: SessionEndSummary | null
  /** The closed history of the last session that ended. */
  readonly lastHistory: SessionHistory | null
  /** The last session's Review, showing or kept; null when none exists. */
  readonly review: SessionReview | null
  /**
   * What the staff shows while a session runs, from its start (phrase 1, the very phrase Idle
   * shows, in the held layout) to its end; null with no session, so the staff shows Idle.
   */
  readonly sessionStaff: SessionStaff | null
  /** The highest phrase number the running session has readied (1 until phrase 2); null with none. */
  readonly latestReady: number | null
  /**
   * The note that would start a session if played now: non-null exactly at Idle when Start may be
   * clicked, the MIDI controller is connected, the connection sheet is closed and the staff shows
   * Idle's phrase. The start line and the start marker are drawn from it.
   */
  readonly startingNote: StartingNote | null
  /** A lost controller's countdown while it runs, count-in included; null otherwise. */
  readonly controllerLost: ControllerLostCountdown | null
  /** The running session's acknowledged notes, in acknowledgement order; empty at Idle. */
  readonly acknowledged: readonly ExpectedNoteIdentity[]
  /** Whether the running session reads a controller (fixed at its start); null at Idle. */
  readonly sessionHasController: boolean | null
  /**
   * The page's adaptive-tempo flag: off at page load, kept from one session to the next, held in
   * memory only. A session runs adaptive tempo when it is on and the session has a controller at
   * its start.
   */
  readonly adaptiveTempo: boolean
  /** Whether adaptive tempo may be turned on: exactly while a controller is attached. */
  readonly adaptiveTempoAvailable: boolean
  /**
   * The tempo the last session that ran adaptive tempo reached (its last sounded phrase's), in
   * BPM, held in memory only: set by an end once phrase 1 has sounded of a session that ran it,
   * null after such an end of one that did not and before any; a start and an end during the
   * count-in leave it as it is.
   */
  readonly lastSessionReachedTempo: number | null
  /**
   * The page's `Vary settings` flag: off at page load, kept from one session to the next, held in
   * memory only. A session started with it on runs the engine's settings mutations.
   */
  readonly varySettings: boolean
  /**
   * The page's `Tension across phrases` flag: off at page load, kept from one session to the
   * next, held in memory only. A session started with it on runs the engine's multi-phrase tension
   * arc; the steps it gives the phrases never reach `shownSettings`.
   */
  readonly tensionAcrossPhrases: boolean
  /**
   * What the read-only controls show while a session runs: its start settings during the
   * count-in, then the settings the phrase now sounding was generated with; null with no session,
   * when the controls show the player's own choices, which a session never writes.
   */
  readonly shownSettings: SessionSettings | null
}

/** The session controller a screen binds to. */
// @spec-link [[service_session_controller]]
export interface SessionController {
  readonly state: SessionControllerState
  /**
   * Start a session; call it synchronously inside the player's Start click. Throws when blocked.
   * Playing the starting note takes this same path.
   */
  readonly start: () => void
  /**
   * End the running session (the player's Stop). Throws with no session running. A session also
   * ends on its own, like Stop: the page hidden, the staff no longer shown (the window, the
   * engraving of phrase 1, a phrase shown or waiting that no longer fits, or the session staff
   * failing), or the audio interrupted.
   */
  readonly stop: () => void
  /**
   * Whether any part of phrase `phraseNumber` is on the staff now; false with no session. Throws
   * on a phrase number that is not a positive integer.
   */
  readonly isPhraseOnScreen: (phraseNumber: number) => boolean
  /** Stop showing the Review (`Close review`), keeping it. Throws unless the Review shows. */
  readonly closeReview: () => void
  /**
   * Show the kept Review again (`Review last session`). Throws unless a Review exists, does not
   * show, and no session runs.
   */
  readonly showReview: () => void
  /**
   * Turn the page's adaptive-tempo flag on or off, at Idle only: throws during the count-in or a
   * running session, and when turning it on with no controller attached.
   */
  readonly setAdaptiveTempo: (on: boolean) => void
  /**
   * Turn the page's `Vary settings` flag on or off, at Idle or while the Review shows only:
   * throws during the count-in or a running session.
   */
  readonly setVarySettings: (on: boolean) => void
  /**
   * Turn the page's `Tension across phrases` flag on or off, at Idle or while the Review shows
   * only: throws during the count-in or a running session.
   */
  readonly setTensionAcrossPhrases: (on: boolean) => void
  /**
   * End a running session, stop reading the window and listening to the MIDI controller, and
   * dispose of the wake-up timer (its worker). Throws if called twice.
   */
  readonly dispose: () => void
}

/**
 * A caller broke the controller's contract: a start while blocked, a Stop with no session, a
 * Review closed or shown out of turn, adaptive tempo changed during a session or turned on with
 * no controller attached, `Vary settings` changed during a session.
 */
// @spec-link [[service_session_controller]]
export class SessionControllerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionControllerError'
  }
}
