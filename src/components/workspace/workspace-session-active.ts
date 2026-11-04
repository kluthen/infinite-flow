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
import type { DoodleReadings } from '@/jam/doodle-controls'
import type { AudioTimeAgenda } from '@/session/session-agenda'
import type { SessionHistory } from '@/session/session-history'
import type { SessionRunner } from '@/session/session-runner'
import type {
  AudioTime,
  PhraseOneEvent,
  SessionOutput,
  SessionPhrase,
} from '@/session/session-types'
import type { AdaptiveTempoFlag } from './workspace-adaptive-tempo'
import type { SessionDisplay } from './workspace-session-display'
import type { SessionEndWatch } from './workspace-session-end-watchers'
import type { SessionMidi, SessionMidiRun } from './workspace-session-midi'
import type { SessionPhrases } from './workspace-session-phrases'
import type { WorkspacePregeneration } from './workspace-pregeneration'
import type { SessionLockAndGroups } from './workspace-session-lock-choices'
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
  /** The Idle phrase it started from; null for a session started without phrase 1. */
  readonly phraseOne: WorkspaceSessionResult | null
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
  /**
   * What a session started without phrase 1 takes when the engine readies phrase 1 at the
   * hand-over (./workspace-session-phrase-one-entry.ts); null in a session started with it, where
   * the engine never readies phrase 1.
   */
  enterPhraseOne: ((phrase: SessionPhrase) => void) | null
  /**
   * The controls a fresh Jam took from its doodle, recorded at phrase 1's hand-over for its
   * review's Jam part; null until then, and in a session started with phrase 1.
   */
  doodleControls: DoodleReadings | null
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
  | 'lastDeletion'
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
  /** The player's rhythm lock, its allowed changes and Vary settings' allowed groups. */
  readonly lockAndGroups: SessionLockAndGroups
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

/**
 * Intent: a phrase the engine readied: phrase 1 is handed over to a session started without it,
 * which then takes its display and phrase steps; every later phrase goes to the phrase steps. A
 * phrase 1 readied in a session started with it is a wiring defect.
 */
// @spec-link [[module_session_phrase_steps]]
// @spec-link [[module_session_start_without_phrase_one]]
export function phraseReadied(session: ActiveSession, phrase: SessionPhrase): void {
  if (phrase.phraseNumber !== 1) {
    phrasesOf(session).phraseReady(phrase)
    return
  }
  if (session.enterPhraseOne === null)
    throw new Error('session controller: phrase 1 readied in a session started with it')
  session.enterPhraseOne(phrase)
}

/**
 * Intent: send one event at `at` (raised to the floor) to the session's runner: a transport event,
 * or a phrase 1 event of a session started without phrase 1.
 */
// @spec-link [[service_session_controller]]
// @spec-link [[module_session_start_without_phrase_one]]
export function dispatchAt(
  session: ActiveSession,
  at: AudioTime,
  event: UntimedEvent | UntimedEvent<PhraseOneEvent>,
): void {
  runnerOf(session).dispatch({ ...event, at: engineTime(session, at) })
}
