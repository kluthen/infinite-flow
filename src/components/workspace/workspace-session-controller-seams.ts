/**
 * The seams the session controller is built from: the Idle state it drives, the audio, the browser,
 * its runners, its clock and frame loop, the staff's fixed parts and fit check, and the MIDI
 * controller. The workspace supplies them; `workspace-session-controller-types.ts` re-exports them
 * beside the controller's state and actions.
 */
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type {
  GenerationSessionActions,
  GenerationSessionState,
} from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { AudioTransport } from '@/audio/audio-transport'
import type { DisposableWakeTimer } from '@/audio/audio-ports'
import type { MidiController } from '@/midi/midi-controller-state'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { WallClock } from '@/session/session-history'
import type { SessionRunner } from '@/session/session-runner'
import type { StaffViewport } from '@/notation/notation-layout-policy'
import type { StaffFitVerdict, StaffFixedParts } from '@/notation/staff-fit-types'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { WorkspaceSessionRunnerInput } from './workspace-session-dependencies'
import type { IdleLayoutPort } from './idle-layout-gate'
import type { SessionOptionChoices } from '@/storage/records/setting-defaults'
import type { WorkspacePregenerationFactory } from './workspace-pregeneration'
import type { SessionSaveHold } from '@/storage/settings-saver'
import type { KeptSessionsSeam } from './workspace-kept-sessions-seam'

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
// @spec-link [[service_session_controller]]
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface SessionControllerClock {
  readonly createWakeTimer: () => DisposableWakeTimer
  readonly wallClock: WallClock
  readonly frames: FramePort
}

/**
 * The staff planner's fit check of a written phrase, drawing nothing; the engraver's own. The
 * shared system-position size is the built-in one when not given.
 */
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
export type StaffFitPlanner = (
  phrase: WrittenPhrase,
  containerWidthPx: number,
  viewport: StaffViewport,
  systemPositionUnits?: number,
) => StaffFitVerdict

/**
 * What the controller drives: the Idle state, its fresh-phrase action (a session end once phrase 1
 * has sounded asks it for the next phrase), and the written phrase Idle shows (phrase 1, which a
 * session's staff keeps showing as the very same object), the audio, the browser, runners and its
 * clock; the gate of the staff's reports, which a session diverts from the Idle machinery while it
 * runs; the measurement of phrase 1's staff fixed parts, which the session window rule needs; the
 * staff planner, loaded with the engraver, that checks a phrase's fit in the held layout; the
 * MIDI controller, with whether the connection sheet is open, for the starting note and the notes
 * a session reads; and the builder of the Idle pre-generation queue, whose ready phrases Start
 * takes; the player's saved "During a session" choices, which the page's flags start from; and
 * the hold of the player's saves, held from an accepted start to the session's end.
 */
// @spec-link [[service_session_controller]]
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
  /** Measure phrase 1's staff fixed parts in the session's clef, the clef Idle drew it in. */
  readonly staffFixedParts: (
    phrase: WorkspaceSessionResult,
    clef: InstrumentClef,
  ) => Promise<StaffFixedParts>
  /** The staff planner, once the engraver and its fonts are ready; a load failure rejects. */
  readonly staffFitPlanner: () => Promise<StaffFitPlanner>
  /** The app's one MIDI controller; the controller listens to it from its creation to `dispose`. */
  readonly midi: MidiController
  /** Whether the connection sheet is open, read reactively; no note starts a session while it is. */
  readonly connectionSheetOpen: () => boolean
  /**
   * Build the Idle pre-generation queue's orchestrator over the controller's run conditions and
   * Idle reading; the workspace binds it to the one generation worker, the slot and the policy.
   */
  // @spec-link [[module_idle_pregeneration_queue]]
  readonly pregeneration: WorkspacePregenerationFactory
  /**
   * The player's saved "During a session" choices, loaded before the first draw: the `Vary
   * settings`, `Tension across phrases` and `Rising tempo` flags start from them.
   */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savedSessionOptions: SessionOptionChoices
  /** The player's saved `Keep my played notes`, loaded before the first draw. */
  // @spec-link [[rule_first_phrase_waits_for_saved_settings]]
  readonly savedKeepPlayedNotes: boolean
  /**
   * The hold of the player's saves: held at each accepted start, released once at its end (any
   * end, or a start undone part-way), so a change made during a session is written when it ends.
   */
  readonly saveHold: SessionSaveHold
  /**
   * The kept sessions as the controller reaches them, for the most recent session and the
   * changes made to a kept session after its save.
   */
  readonly keptSessions: KeptSessionsSeam
}
