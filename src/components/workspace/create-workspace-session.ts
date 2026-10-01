/**
 * The root workspace-session composition, split into an explicit-dependency builder
 * (`composeWorkspaceSession`) and the production entry (`createWorkspaceSession`) that supplies
 * its real dependencies. Isolated in its own module (rather than inlined in `App.vue`) so a caller
 * can replace the whole factory, and `composeWorkspaceSession`'s seams individually, without ever
 * spinning a real browser `Worker` or touching `crypto` in a test or a harness.
 */
import type { InjectionKey, Ref } from 'vue'

import {
  createGenerationSession,
  type GenerationSession,
} from '@/composables/use-generation-session'
import {
  createNotationCoordinator,
  type NotationCoordinator,
} from '@/composables/use-notation-coordinator'
import {
  createWorkspaceGenerate,
  type WorkspaceSessionResult,
} from '@/composables/workspace-session-result'
import { makeRequestId } from '@/domain/generation/generation-request'
import type {
  GenerationIntent,
  GenerationIntentProviders,
} from '@/domain/generation/generation-intent'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'
import { createGenerationWorkerClient } from '@/generation-worker/generation-worker-client'
import { announcePhraseReplayKey } from '@/generation-worker/phrase-replay-key'
import type { ViewportWidthProvider } from '@/composables/viewport-width'
import {
  createSessionRunner,
  type SessionRunner,
  type SessionRunnerDependencies,
} from '@/session/session-runner'
import type { SessionStart } from '@/session/session-types'
import type { SessionBrowserPorts } from '@/session/session-browser-ports'
import type { AudioTransport } from '@/audio/audio-transport'
import { createBrowserAudioTransport } from '@/audio/browser-audio-transport'
import { createMidiController, type MidiController } from '@/midi/midi-controller'
import { createWebMidiAccessProvider } from '@/midi/web-midi-access'
import { createBrowserWakeTimerWorker, createWorkerWakeTimer } from '@/audio/worker-wake-timer'
import { createBrowserViewportWidth } from './browser-viewport-width'
import { createBrowserPageVisibility } from './browser-page-visibility'
import { createBrowserOrientationLock, createBrowserScreenWakeLock } from './browser-screen-locks'
import { createBrowserWindowShape } from './browser-window-shape'
import { createIdleLayoutGate } from './idle-layout-gate'
import { announcingSessionOutputs } from './phrase-replay-announcement'
import type { WorkspacePrewarmPolicy } from './prewarm-policy'
import type {
  SessionController,
  SessionControllerClock,
} from './workspace-session-controller-types'

/**
 * What a caller supplies to start a session runner from the workspace: the session's start and the
 * seams the workspace does not own (fit check, audio clock, output and error sinks).
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
export interface WorkspaceSessionRunnerInput extends Pick<
  SessionRunnerDependencies,
  'checkFit' | 'now' | 'onOutput' | 'onError'
> {
  readonly start: SessionStart
}

export interface WorkspaceSession {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: Ref<WrittenPhrase | null>
  readonly handleEngraved: () => void
  readonly handleNotationError: (error: NotationError) => void
  /**
   * Wire to `PhraseScore`'s `@session-staff-failed`: the staff failing to show a running session,
   * which ends it; it goes to the session alone, never to the Idle machinery.
   */
  // @spec-link [[module_session_rolling_display]]
  readonly handleSessionStaffFailed: (error: NotationError) => void
  /**
   * Wire to `PhraseScore`'s `@layout-inputs`: the staff's measured inputs, which the session's
   * pre-draw fit and room checks plan against. Until the staff reports once, every check fails as
   * a retryable notation error. While a practice session runs, this and the two engraving handlers
   * report to the session instead of the Idle machinery, which gets the latest back at its end.
   */
  // @spec-link [[module_idle_fit_round]]
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
  /**
   * Start a session runner bound to the same raw `generate` seam the Idle flow uses, and so the
   * app's one generation worker. Phrase 2 is generated during the one-measure count-in (1 s at
   * 240 BPM) and is on time only because phrase 1 already warmed the generator's rhythm-domain
   * memo, which lives once per worker; a cold phrase 2 takes about 0.95 s.
   */
  readonly createSessionRunner: (input: WorkspaceSessionRunnerInput) => SessionRunner
  /**
   * The app's one audio transport, locked until a player click. Chunk 15's Start and "Connect
   * controller" click handlers call `audio.unlock()` synchronously, and a session runner's `now`
   * reads `audio.now`, the audio clock.
   */
  // @spec-link [[req_session_audio_mix]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  readonly audio: AudioTransport
  /**
   * The app's one MIDI controller reading, its notes placed on `audio`'s clock. MIDI access is
   * requested only by `midi.connect()`, which chunk 13's "Connect controller" click handler calls
   * right after `audio.unlock()`; no screen uses it yet.
   */
  // @spec-link [[req_midi_controller_input]]
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly midi: MidiController
  /**
   * The browser capabilities a session uses around its run: the screen wake lock and the
   * landscape orientation lock (requested in the Start click, released at every end), the page
   * becoming hidden and the window's shape (both judged during a session). No screen uses them
   * yet; building the session asks for no lock and listens to nothing.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  readonly browser: SessionBrowserPorts
  /**
   * Build the controller of this workspace's practice sessions, over its Idle state, audio
   * transport, browser ports and runners, woken by the session clock's timer. The screen builds
   * one when it mounts and disposes of it when it unmounts; building it reads the window's shape.
   * The controller's module is loaded on this call, as its own chunk, so the entry chunk stays
   * within its size budget; the controller's `start` itself is synchronous, for the Start click.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  readonly createSessionController: () => Promise<SessionController>
  readonly dispose: () => void
}

/**
 * The explicit dependency surface `composeWorkspaceSession` needs: identity/seed providers, the
 * window-width provider, the raw orchestration-outcome `generate` seam (plus its teardown), the
 * prewarm policy and seam, the audio transport, the MIDI controller, the session browser ports and
 * the session controller's clock. Production supplies the cryptographic seed provider, the `matchMedia` width provider, the real
 * worker client, the Web Audio transport, the Web MIDI controller and the browser adapters; a
 * harness supplies deterministic, gated, or failure-injecting equivalents that still call through
 * to the real worker, a transport on a fake or a recorded real audio output, a controller on a fake
 * or the real MIDI access, and fake locks and page visibility beside the real window shape.
 */
// @spec-link [[service_workspace_session_flow]]
export interface WorkspaceSessionDependencies {
  readonly providers: GenerationIntentProviders
  readonly viewport: ViewportWidthProvider
  readonly generate: (intent: GenerationIntent) => Promise<GenerationOutcome>
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

/**
 * Injection key for the whole session factory, so `App.vue` can accept a caller-supplied
 * `WorkspaceSession` builder (an e2e harness's `main.ts`) instead of always calling
 * `createWorkspaceSession`. Production `main.ts` never provides this key, so `App.vue` falls back
 * to the real production factory unchanged.
 */
export const WORKSPACE_SESSION_FACTORY: InjectionKey<() => WorkspaceSession> = Symbol(
  'workspace-session-factory',
)

/** Intent: draw one fresh 32-bit unsigned seed from the browser's cryptographic RNG. */
function nextCryptoSeed(): ReturnType<typeof makeSeed> {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return makeSeed(buffer[0]!)
}

/** Intent: build a monotonically increasing request-id provider, unique for this session's lifetime. */
function createRequestIdProvider(): () => ReturnType<typeof makeRequestId> {
  let counter = 0
  return () => makeRequestId(`workspace-request-${++counter}`)
}

/**
 * Intent: build one workspace session from explicit dependencies: the identity/seed providers,
 * the raw orchestration `generate` seam, its teardown, and the audio transport, MIDI controller and
 * session browser ports, all exposed unchanged. Wires the same notation coordinator
 * (which also answers the session's pre-draw fit and room checks from the staff's reported layout
 * inputs) and profile-switch policy production always uses, so the only thing a caller can vary is where
 * requests/seeds and generation outcomes come from. Session runners it starts share the Idle
 * flow's providers, window-width reading and raw `generate` seam (the one worker), so phrase 2
 * reuses the rhythm-domain memo phrase 1 warmed. With the prewarm policy enabled the session posts
 * a prewarm now, for the current width-resolved controls, and after each rhythm-setting change;
 * those prewarms land in the same worker's memo the runner's phrases read.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
// @spec-link [[module_idle_fit_round]]
// @spec-link [[module_phrase_replay_key]]
export function composeWorkspaceSession(deps: WorkspaceSessionDependencies): WorkspaceSession {
  let session: GenerationSession<WorkspaceSessionResult> | null = null

  /**
   * Intent: hand the coordinator's reporter callbacks the session they report into. They only
   * fire from PhraseScore events after construction; reaching here earlier is a wiring defect.
   */
  function requireSession(): GenerationSession<WorkspaceSessionResult> {
    if (session === null) {
      throw new Error('Workspace session reporter invoked before the session was constructed.')
    }
    return session
  }

  const coordinator: NotationCoordinator = createNotationCoordinator({
    reportNotationFailure: (error) => requireSession().actions.reportNotationFailure(error),
    reportNotationRecovered: () => requireSession().actions.reportNotationRecovered(),
  })

  const created = createGenerationSession<WorkspaceSessionResult>({
    providers: deps.providers,
    viewport: deps.viewport,
    generate: createWorkspaceGenerate(deps.generate),
    notate: coordinator.notate,
    checkFit: coordinator.checkFit,
    checkRoom: coordinator.checkRoom,
    staffLayout: coordinator.staffLayout,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
    ...(deps.prewarmPolicy === 'enabled' ? { prewarm: deps.prewarm } : {}),
    onPhraseAccepted: (intent) =>
      announcePhraseReplayKey(intent, { source: 'workspace' }, deps.logPhraseReplayKey),
  })
  session = created
  const staffReports = createIdleLayoutGate({
    layoutInputs: coordinator.handleLayoutInputs,
    engraved: coordinator.handleEngraved,
    notationError: coordinator.handleNotationError,
  })

  /**
   * Intent: start a runner on the Idle flow's providers, width reading and `generate` seam, its
   * outputs forwarded unchanged once each accepted session phrase has announced its replay key.
   */
  // @spec-link [[module_phrase_replay_key]]
  function startRunner(input: WorkspaceSessionRunnerInput): SessionRunner {
    return createSessionRunner(
      {
        generate: deps.generate,
        checkFit: input.checkFit,
        now: input.now,
        providers: deps.providers,
        viewport: deps.viewport,
        onOutput: announcingSessionOutputs(input.onOutput, deps.logPhraseReplayKey),
        onError: input.onError,
      },
      input.start,
    )
  }

  return {
    session: created,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: staffReports.engraved,
    handleNotationError: staffReports.notationError,
    handleSessionStaffFailed: staffReports.sessionStaffFailed,
    handleLayoutInputs: staffReports.layoutInputs,
    createSessionRunner: startRunner,
    audio: deps.audio,
    midi: deps.midi,
    browser: deps.browser,
    createSessionController: async () => {
      const [
        { createSessionController },
        { measureSessionStaffFixedParts, loadSessionStaffFitPlanner },
      ] = await Promise.all([
        import('./workspace-session-controller'),
        import('./session-staff-fixed-parts'),
      ])
      return createSessionController({
        idle: created,
        idlePhrase: () => coordinator.pendingPhrase.value,
        audio: deps.audio,
        browser: deps.browser,
        createSessionRunner: startRunner,
        clock: deps.sessionClock,
        idleLayout: staffReports,
        staffFixedParts: measureSessionStaffFixedParts,
        staffFitPlanner: loadSessionStaffFitPlanner,
      })
    },
    dispose: () => {
      created.dispose()
      deps.dispose()
    },
  }
}

/**
 * Intent: write one accepted phrase's replay-key line to the developer console, production builds
 * included, as information rather than a warning or an error.
 */
// @spec-link [[module_phrase_replay_key]]
function logPhraseReplayKeyToConsole(line: string): void {
  console.info(line)
}

/** What the production root chooses when it builds the workspace session. */
// @spec-link [[service_workspace_session_flow]]
export interface ProductionWorkspaceSessionOptions {
  /** Read by App.vue from the page URL (`?prewarm=off`, the latency measurement switch). */
  readonly prewarmPolicy: WorkspacePrewarmPolicy
}

/**
 * Intent: build the root workspace session used by `App.vue` in production: a real worker-backed
 * generation seam and its prewarm under the given policy, the cryptographic seed provider, a
 * monotonic request-id provider, the window's own `matchMedia` width provider, the Web Audio
 * transport, still locked: no audio context exists until a player click unlocks it, the Web
 * MIDI controller on that transport's clock, which requests no MIDI access until `connect()`, and
 * the browser adapters of the session's wake lock, orientation lock, page visibility and window
 * shape, none of which asks or listens for anything until used, and the session clock: a wake-up
 * Worker timer, created only when a session controller first starts a session, the system's
 * wall clock for session histories, and the browser's animation frames for the playhead.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_chromium_only_support]]
export function createWorkspaceSession(
  options: ProductionWorkspaceSessionOptions,
): WorkspaceSession {
  const port = createBrowserGenerationWorker()
  const client = createGenerationWorkerClient(port)
  const audio = createBrowserAudioTransport()
  const midi = createMidiController({
    provider: createWebMidiAccessProvider(navigator),
    clock: { anchor: () => audio.clockAnchor() },
  })
  return composeWorkspaceSession({
    providers: {
      nextRequestId: createRequestIdProvider(),
      nextSeed: nextCryptoSeed,
    },
    viewport: createBrowserViewportWidth(),
    generate: client.generate,
    prewarmPolicy: options.prewarmPolicy,
    prewarm: client.prewarm,
    audio,
    midi,
    browser: {
      wakeLock: createBrowserScreenWakeLock(),
      orientationLock: createBrowserOrientationLock(),
      pageVisibility: createBrowserPageVisibility(),
      windowShape: createBrowserWindowShape(),
    },
    sessionClock: {
      createWakeTimer: () => createWorkerWakeTimer(createBrowserWakeTimerWorker()),
      wallClock: () => Date.now(),
      frames: {
        request: (callback) => requestAnimationFrame(() => callback()),
        cancel: (handle) => cancelAnimationFrame(handle),
      },
    },
    logPhraseReplayKey: logPhraseReplayKeyToConsole,
    dispose: client.dispose,
  })
}
