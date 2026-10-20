/**
 * What the session controller's parts share: the running session's record, the controller-wide
 * core (its dependencies, the state it writes, the running session, the wake-up timer and whether
 * it is disposed of), the sides it builds once for its life (MIDI, adaptive tempo, the page's
 * flags), and the few steps every part takes on a running session: raising a time to the engine's
 * floor and dispatching a transport event to the runner. The controller itself is
 * `workspace-session-controller.ts`.
 */
import type { DisposableWakeTimer, WakeTimer } from '@/audio/audio-ports'
import type { TransportTimeline } from '@/audio/audio-transport'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { AudioTimeAgenda } from '@/session/session-agenda'
import type { SessionHistory } from '@/session/session-history'
import type { SessionRunner } from '@/session/session-runner'
import type { AudioTime, SessionOutput } from '@/session/session-types'
import type { AdaptiveTempoFlag } from './workspace-adaptive-tempo'
import type { SessionDisplay } from './workspace-session-display'
import type { SessionEndWatch } from './workspace-session-end-watchers'
import type { SessionMidi, SessionMidiRun } from './workspace-session-midi'
import type { SessionPhrases } from './workspace-session-phrases'
import type { WorkspacePregeneration } from './workspace-pregeneration'
import type {
  SessionShownSettings,
  TensionAcrossPhrasesFlag,
  VarySettingsFlag,
} from './workspace-session-settings'
import type {
  SessionControllerDependencies,
  SessionControllerState,
  UntimedEvent,
} from './workspace-session-controller-types'

/** The ended output, the one that closes a session. */
// @spec-link [[service_session_end]]
export type EndedOutput = Extract<SessionOutput, { kind: 'ended' }>

/**
 * The running session: its timeline, starting tempo (phrase 1's and the count-in's, which its
 * settings keep), history, runner, agenda, display, phrase steps and audio-time floor.
 */
// @spec-link [[service_session_controller]]
export interface ActiveSession {
  readonly timeline: TransportTimeline
  readonly startingTempo: number
  readonly phraseOne: WorkspaceSessionResult
  readonly history: SessionHistory
  readonly agenda: AudioTimeAgenda
  runner: SessionRunner | null
  /** The latest time handed to the engine: its events must never go back in time. */
  floor: AudioTime
  /** The steps of phrases 2 on, from the start until the session is torn down. */
  phrases: SessionPhrases | null
  ended: EndedOutput | null
  /** The watchers of the session's other ends, once it is fully started. */
  watch: SessionEndWatch | null
  /** The rolling display, from the start until the session is torn down. */
  display: SessionDisplay | null
  /** The session's MIDI handling, from the start until the session is torn down. */
  midi: SessionMidiRun | null
  /** The settings its read-only controls show, from its start settings on. */
  readonly shown: SessionShownSettings
}

/** The fields of the controller's state its parts write; the rest are read through its sides. */
type WritableStateKey =
  | 'phase'
  | 'countIn'
  | 'strugglingNotice'
  | 'sessionTempo'
  | 'heldLayout'
  | 'lastEnd'
  | 'lastHistory'
  | 'review'
  | 'mostRecent'
  | 'readingMostRecent'
  | 'listShowing'
  | 'openingKey'
  | 'sessionStaff'
  | 'latestReady'
  | 'shownSettings'
  | 'startSettings'

/** The controller's reactive state as its parts write it. */
// @spec-link [[service_session_controller]]
export type SessionControllerWritableState = {
  -readonly [K in WritableStateKey]: SessionControllerState[K]
}

/**
 * What every part of one controller shares for its life: its dependencies, the state it writes,
 * the running session (null with none), the wake-up timer (built at the first start, disposed of
 * with the controller), that timer while it is started (from a start's wake-ups to that session's
 * end), and whether the controller is disposed of.
 */
// @spec-link [[service_session_controller]]
export interface SessionControllerCore {
  readonly deps: SessionControllerDependencies
  readonly state: SessionControllerWritableState
  active: ActiveSession | null
  timer: DisposableWakeTimer | null
  startedTimer: WakeTimer | null
  disposed: boolean
}

/** The sides the controller builds once for its life and every session reads. */
// @spec-link [[service_session_controller]]
export interface SessionControllerSides {
  readonly sessionMidi: SessionMidi
  readonly adaptiveTempo: AdaptiveTempoFlag
  readonly varySettings: VarySettingsFlag
  readonly tensionAcrossPhrases: TensionAcrossPhrasesFlag
  /** The Idle pre-generation queue, whose ready phrases each start takes. */
  readonly pregeneration: WorkspacePregeneration
}

/** Intent: an audio time for the engine, never before one it already handled. */
// @spec-link [[service_session_controller]]
export function engineTime(session: ActiveSession, at: AudioTime): AudioTime {
  session.floor = Math.max(session.floor, at)
  return session.floor
}

/** Intent: the running session's runner; reaching here before it exists is a wiring defect. */
function runnerOf(session: ActiveSession): SessionRunner {
  if (session.runner === null) throw new Error('session controller: the runner is not built yet')
  return session.runner
}

/** Intent: the running session's phrase steps; reaching here before they exist is a wiring defect. */
export function phrasesOf(session: ActiveSession): SessionPhrases {
  if (session.phrases === null) throw new Error('session controller: no phrase steps yet')
  return session.phrases
}

/** Intent: send one transport event at `at` (raised to the floor) to the session's runner. */
// @spec-link [[service_session_controller]]
export function dispatchAt(session: ActiveSession, at: AudioTime, event: UntimedEvent): void {
  runnerOf(session).dispatch({ ...event, at: engineTime(session, at) })
}
