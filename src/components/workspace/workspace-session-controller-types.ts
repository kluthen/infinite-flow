/**
 * The session controller's contract with the screen that binds to it and with the workspace that
 * builds it: the reactive state it exposes, its actions, the seams it is built from, and the error
 * it throws at a caller that breaks the contract. The controller itself is
 * `workspace-session-controller.ts`.
 */
import type {
  GenerationSessionActions,
  GenerationSessionState,
} from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { AudioTransport } from '@/audio/audio-transport'
import type { DisposableWakeTimer } from '@/audio/audio-ports'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { MidiController } from '@/midi/midi-controller-state'
import type { CountInDisplay } from '@/session/count-in-display'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { SessionHistory, WallClock } from '@/session/session-history'
import type { SessionRunner, SessionTransportEvent } from '@/session/session-runner'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { StartingNote } from '@/session/starting-note'
import type { SessionEndCause, SessionSettings } from '@/session/session-types'
import type { StaffLayout, StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffFitVerdict, StaffFixedParts } from '@/notation/staff-fit-types'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { SessionStaff } from '@/components/notation/session-staff'
import type { WorkspaceSessionRunnerInput } from './create-workspace-session'
import type { IdleLayoutPort } from './idle-layout-gate'
import type { ControllerLostCountdown } from './workspace-session-midi'

/** Where the session stands: no session, its count-in, or its phrases sounding. */
// @spec-link [[service_workspace_session_flow]]
export type SessionControllerPhase = 'idle' | 'count-in' | 'running'

/** A transport event without its time, which the controller raises to the engine's time floor. */
// @spec-link [[service_workspace_session_flow]]
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
// @spec-link [[service_workspace_session_flow]]
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
   * What the read-only controls show while a session runs: its start settings during the
   * count-in, then the settings the phrase now sounding was generated with; null with no session,
   * when the controls show the player's own choices, which a session never writes.
   */
  readonly shownSettings: SessionSettings | null
}

/** The session controller a screen binds to. */
// @spec-link [[service_workspace_session_flow]]
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
   * End a running session, stop reading the window and listening to the MIDI controller, and
   * dispose of the wake-up timer (its worker). Throws if called twice.
   */
  readonly dispose: () => void
}

/**
 * The display's frame loop: `request` runs `callback` once, at the next frame (the browser's
 * animation frame in the app), and returns a handle `cancel` takes to drop it.
 */
// @spec-link [[module_session_rolling_display]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface FramePort {
  readonly request: (callback: () => void) => number
  readonly cancel: (handle: number) => void
}

/**
 * The controller's time seams: `createWakeTimer` builds the timer that wakes it to read the audio
 * clock (called once, at the first start; disposed of with the controller), `wallClock` stamps
 * each session's history, and `frames` paces the playhead, read on the audio clock once a frame.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface SessionControllerClock {
  readonly createWakeTimer: () => DisposableWakeTimer
  readonly wallClock: WallClock
  readonly frames: FramePort
}

/** The staff planner's fit check of a written phrase, drawing nothing; the engraver's own. */
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
export type StaffFitPlanner = (
  phrase: WrittenPhrase,
  containerWidthPx: number,
  viewport: StaffViewport,
) => StaffFitVerdict

/**
 * What the controller drives: the Idle state, its fresh-phrase action (a session end once phrase 1
 * has sounded asks it for the next phrase), and the written phrase Idle shows (phrase 1, which a
 * session's staff keeps showing as the very same object), the audio, the browser, runners and its
 * clock; the gate of the staff's reports, which a session diverts from the Idle machinery while it
 * runs; the measurement of phrase 1's staff fixed parts, which the session window rule needs; the
 * staff planner, loaded with the engraver, that checks a phrase's fit in the held layout; and the
 * MIDI controller, with whether the connection sheet is open, for the starting note and the notes
 * a session reads.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_session_end_generates_next_phrase_one]]
export interface SessionControllerDependencies {
  readonly idle: {
    readonly state: Readonly<GenerationSessionState<WorkspaceSessionResult>>
    readonly actions: Pick<GenerationSessionActions, 'startFreshPhrase'>
  }
  /** The written phrase the staff shows at Idle; null when it shows none. */
  readonly idlePhrase: () => WrittenPhrase | null
  readonly audio: AudioTransport
  readonly browser: SessionBrowserPorts
  readonly createSessionRunner: (input: WorkspaceSessionRunnerInput) => SessionRunner
  readonly clock: SessionControllerClock
  readonly idleLayout: IdleLayoutPort
  readonly staffFixedParts: (phrase: WorkspaceSessionResult) => Promise<StaffFixedParts>
  /** The staff planner, once the engraver and its fonts are ready; a load failure rejects. */
  readonly staffFitPlanner: () => Promise<StaffFitPlanner>
  /** The app's one MIDI controller; the controller listens to it from its creation to `dispose`. */
  readonly midi: MidiController
  /** Whether the connection sheet is open, read reactively; no note starts a session while it is. */
  readonly connectionSheetOpen: () => boolean
}

/**
 * A caller broke the controller's contract: a start while blocked, a Stop with no session, a
 * Review closed or shown out of turn, adaptive tempo changed during a session or turned on with
 * no controller attached, `Vary settings` changed during a session.
 */
// @spec-link [[service_workspace_session_flow]]
export class SessionControllerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionControllerError'
  }
}
