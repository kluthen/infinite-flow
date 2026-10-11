/**
 * What the explicit-dependency builder of the workspace session, `composeWorkspaceSession`, takes
 * (`WorkspaceSessionDependencies`) and the session-runner starter it hands out. Types only: the
 * builder itself, and every lazy `import()` it makes, stay in `create-workspace-session.ts`, which
 * re-exports these, so moving them here leaves the bundle's chunks as they were.
 */
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import type { Seed } from '@/domain/random/seed'
import type { ViewportWidthProvider } from '@/composables/viewport-width'
import type { SessionRunner, SessionRunnerDependencies } from '@/session/session-runner'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { AudioTransport } from '@/audio/audio-transport'
import type { MidiController } from '@/midi/midi-controller'
import type { WorkspacePrewarmPolicy } from './prewarm-policy'
import type { WorkspaceSessionStart } from '@/components/workspace/workspace-session-runner'
import type { SessionControllerClock } from './workspace-session-controller-seams'

/**
 * What a caller supplies to start a session runner from the workspace: the session's start, its
 * adaptive-tempo and `Vary settings` choices included (the starter turns the latter into the
 * settings-mutation flag, its seed derived from the start's session seed), and the seams the
 * workspace does not own (fit check, audio clock, the display reading of whether a phrase is on
 * screen, output and error sinks).
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
// @spec-link [[req_settings_mutation_flag]]
export interface WorkspaceSessionRunnerInput extends Pick<
  SessionRunnerDependencies,
  'checkFit' | 'now' | 'display' | 'onOutput' | 'onError'
> {
  readonly start: WorkspaceSessionStart
}

/** Starts one session runner from the workspace, synchronously, once its module has loaded. */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
export type WorkspaceSessionRunnerStarter = (input: WorkspaceSessionRunnerInput) => SessionRunner

/**
 * The explicit dependency surface `composeWorkspaceSession` needs: identity/seed providers, the
 * session-seed provider, the window-width provider, the raw orchestration-outcome `generate` seam
 * (plus its teardown), the prewarm policy and seam, the audio transport, the MIDI controller, the
 * session browser ports and the session controller's clock. Production supplies the cryptographic
 * seed provider, the `matchMedia` width provider, the real worker client, the Web Audio transport,
 * the Web MIDI controller and the browser adapters; a harness supplies deterministic, gated, or
 * failure-injecting equivalents that still call through to the real worker, a transport on a fake
 * or a recorded real audio output, a controller on a fake or the real MIDI access, and fake locks
 * and page visibility beside the real window shape.
 */
// @spec-link [[service_workspace_session_flow]]
export interface WorkspaceSessionDependencies {
  readonly providers: GenerationIntentProviders
  /**
   * The session seed drawn for each phrase 1 the Idle session publishes, separate from
   * `providers.nextSeed` (production: the same cryptographic source, drawn on its own).
   */
  // @spec-link [[module_session_seed_plan]]
  readonly nextSessionSeed: () => Seed
  readonly viewport: ViewportWidthProvider
  /** The one generation seam; a session runner passes each attempt's abort signal, Idle none. */
  readonly generate: (intent: GenerationIntent, signal?: AbortSignal) => Promise<GenerationOutcome>
  /** Whether `prewarm` is ever called; `disabled` posts nothing at all. */
  readonly prewarmPolicy: WorkspacePrewarmPolicy
  /** The same worker's fire-and-forget rhythm-domain prewarm (the client's `prewarm`). */
  readonly prewarm: (intent: GenerationIntent) => void
  /** The audio transport, passed through unchanged as `WorkspaceSession.audio`. */
  // @spec-link [[req_session_audio_mix]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  readonly audio: AudioTransport
  /**
   * The MIDI controller, reading the clock of `audio`, passed through unchanged as
   * `WorkspaceSession.midi`. Building the session never requests MIDI access.
   */
  // @spec-link [[req_midi_controller_input]]
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly midi: MidiController
  /** The session browser ports, passed through unchanged as `WorkspaceSession.browser`. */
  // @spec-link [[service_workspace_session_flow]]
  readonly browser: SessionBrowserPorts
  /**
   * The session controller's time seams: the wake-up timer that has it read the audio clock
   * (production: a Web Worker timer; the harness: a timer stepped by its fake audio clock), the
   * wall clock that stamps a session's history, and the frame loop its playhead is read in (the
   * browser's animation frames).
   */
  // @spec-link [[service_workspace_session_flow]]
  readonly sessionClock: SessionControllerClock
  /**
   * The console sink each accepted phrase's single replay-key line is handed to: an Idle phrase
   * the fit run publishes, and a session phrase readied with a carry-in or standalone. Production
   * and the e2e harness write to `console.info`; a unit test records the lines.
   */
  // @spec-link [[module_phrase_replay_key]]
  readonly logPhraseReplayKey: (line: string) => void
  readonly dispose: () => void
}
