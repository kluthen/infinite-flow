/**
 * The session controller's contract with the screen that binds to it and with the workspace that
 * builds it: the reactive state it exposes, its actions, the seams it is built from, and the error
 * it throws at a caller that breaks the contract. The controller itself is
 * `workspace-session-controller.ts`.
 */
import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { AudioTransport } from '@/audio/audio-transport'
import type { DisposableWakeTimer } from '@/audio/audio-ports'
import type { CountInDisplay } from '@/session/count-in-display'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { SessionHistory, WallClock } from '@/session/session-history'
import type { SessionRunner } from '@/session/session-runner'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import type { SessionEndCause } from '@/session/session-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { StaffFixedParts } from '@/notation/staff-fit-types'
import type { WorkspaceSessionRunnerInput } from './create-workspace-session'
import type { IdleLayoutPort } from './idle-layout-gate'

/** Where the session stands: no session, its count-in, or its phrases sounding. */
// @spec-link [[service_workspace_session_flow]]
export type SessionControllerPhase = 'idle' | 'count-in' | 'running'

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

/** What the screen reads from the controller; every field is reactive. */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_start_conditions]]
export interface SessionControllerState {
  readonly phase: SessionControllerPhase
  /** The count-in row while the count-in runs, on the audio clock; null outside it. */
  readonly countIn: RunningCountIn | null
  readonly strugglingNotice: boolean
  /** The running session's locked tempo, in BPM; null with no session. */
  readonly sessionTempo: number | null
  /** The staff layout the running session holds, chosen at its start; null with no session. */
  readonly heldLayout: StaffLayout | null
  readonly canStart: boolean
  /** The first start condition that does not hold, or null when Start may be clicked. */
  readonly startBlocker: SessionStartBlocker | null
  readonly lastEnd: SessionEndSummary | null
  /** The closed history of the last session that ended, kept for the Review (chunk 20). */
  readonly lastHistory: SessionHistory | null
}

/** The session controller a screen binds to. */
// @spec-link [[service_workspace_session_flow]]
export interface SessionController {
  readonly state: SessionControllerState
  /** Start a session; call it synchronously inside the player's Start click. Throws when blocked. */
  readonly start: () => void
  /**
   * End the running session (the player's Stop). Throws with no session running. A session also
   * ends on its own, like Stop: the page hidden, the staff no longer shown (the window or the
   * engraving of phrase 1), or the audio interrupted.
   */
  readonly stop: () => void
  /**
   * End a running session, stop reading the window and dispose of the wake-up timer (its worker).
   * Throws if called twice.
   */
  readonly dispose: () => void
}

/**
 * The controller's time seams: `createWakeTimer` builds the timer that wakes it to read the audio
 * clock (called once, at the first start; disposed of with the controller), and `wallClock` stamps
 * each session's history.
 */
// @spec-link [[service_workspace_session_flow]]
export interface SessionControllerClock {
  readonly createWakeTimer: () => DisposableWakeTimer
  readonly wallClock: WallClock
}

/**
 * What the controller drives: the Idle state, the audio, the browser, runners and its clock; the
 * gate of the staff's reports, which a session diverts from the Idle machinery while it runs; and
 * the measurement of phrase 1's staff fixed parts, which the session window rule needs.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_ends_when_staff_too_small]]
export interface SessionControllerDependencies {
  readonly idle: { readonly state: Readonly<GenerationSessionState<WorkspaceSessionResult>> }
  readonly audio: AudioTransport
  readonly browser: SessionBrowserPorts
  readonly createSessionRunner: (input: WorkspaceSessionRunnerInput) => SessionRunner
  readonly clock: SessionControllerClock
  readonly idleLayout: IdleLayoutPort
  readonly staffFixedParts: (phrase: WorkspaceSessionResult) => Promise<StaffFixedParts>
}

/** A caller broke the controller's contract: a start while blocked, a Stop with no session. */
// @spec-link [[service_workspace_session_flow]]
export class SessionControllerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionControllerError'
  }
}
