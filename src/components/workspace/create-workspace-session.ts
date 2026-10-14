/**
 * The root workspace-session composition, split into an explicit-dependency builder
 * (`composeWorkspaceSession`) and the production entry (`createWorkspaceSession`) that supplies
 * its real dependencies. Isolated in its own module (rather than inlined in `App.vue`) so a caller
 * can replace the whole factory, and `composeWorkspaceSession`'s seams individually, without ever
 * spinning a real browser `Worker` or touching `crypto` in a test or a harness. The types both
 * take and return live in type-only modules (`workspace-session-dependencies.ts`,
 * `workspace-session-types.ts`), re-exported here. The builders, and so the session's lazy
 * `import()` calls, stay in this module beside the entry's own static imports: moved to a module
 * of their own, they made the bundler split shared modules out of the entry into an extra chunk.
 */
import { shallowRef, type InjectionKey } from 'vue'

import {
  createGenerationSession,
  type GenerationSession,
} from '@/composables/use-generation-session'
import {
  createNotationCoordinator,
  type NotationCoordinator,
} from '@/composables/use-notation-coordinator'
import {
  createPregenerationSlot,
  yieldingToPlayer,
} from '@/composables/generation-session-pregeneration'
import {
  createWorkspaceGenerate,
  withSessionSeed,
  type WorkspaceGeneratedPhrase,
  type WorkspaceSessionResult,
} from '@/composables/workspace-session-result'
import { makeRequestId } from '@/domain/generation/generation-request-envelope'
import { makeSeed } from '@/domain/random/seed'
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'
import type { GenerationWorkerClient } from '@/generation-worker/generation-worker-client'
import { createBrowserAudioTransport } from '@/audio/browser-audio-transport'
import type { SavedDataLoad } from '@/storage-bootstrap'
import { APP_VERSION } from '@/storage/app-version'
import { createVisitSaves } from '@/storage/settings-saver'
import { createMidiController } from '@/midi/midi-controller'
import { createWebMidiAccessProvider } from '@/midi/web-midi-access'
import { createBrowserWakeTimerWorker, createWorkerWakeTimer } from '@/audio/worker-wake-timer'
import { createBrowserViewportWidth } from './browser-viewport-width'
import { createBrowserPageVisibility } from './browser-page-visibility'
import { createBrowserOrientationLock, createBrowserScreenWakeLock } from './browser-screen-locks'
import { createBrowserWindowShape } from './browser-window-shape'
import { createIdleLayoutGate } from './idle-layout-gate'
import { createPhraseReplayAnnouncer } from './phrase-replay-announcer'
import type { WorkspacePregenerationPolicy, WorkspacePrewarmPolicy } from './prewarm-policy'
import type {
  WorkspaceSessionDependencies,
  WorkspaceSessionRunnerStarter,
} from './workspace-session-dependencies'
import type { WorkspaceSession } from './workspace-session-types'

export type {
  WorkspaceSessionDependencies,
  WorkspaceSessionRunnerInput,
  WorkspaceSessionRunnerStarter,
} from './workspace-session-dependencies'
export type { WorkspaceSession } from './workspace-session-types'

/**
 * Injection key for the whole session factory, so `App.vue` can accept a caller-supplied
 * `WorkspaceSession` builder (an e2e harness's `main.ts`) instead of always calling
 * `createWorkspaceSession`. Production `main.ts` never provides this key, so `App.vue` falls back
 * to the real production factory unchanged. The factory is given the saved data the app loaded
 * before its first draw.
 */
export const WORKSPACE_SESSION_FACTORY: InjectionKey<
  (savedData: SavedDataLoad) => WorkspaceSession
> = Symbol('workspace-session-factory')

/**
 * Intent: build one workspace session from explicit dependencies: the identity/seed providers,
 * the session-seed provider each published Idle phrase 1 draws its session seed from, the raw
 * orchestration `generate` seam, its teardown, and the audio transport, MIDI controller and
 * session browser ports, all exposed unchanged. Wires the same notation coordinator
 * (which also answers the session's pre-draw fit and room checks from the staff's reported layout
 * inputs) and profile-switch policy production always uses, so the only thing a caller can vary is where
 * requests/seeds and generation outcomes come from. Session runners it starts share the Idle
 * flow's providers, window-width reading and raw `generate` seam (the one worker), so phrase 2
 * reuses the rhythm-domain memo phrase 1 warmed. With the prewarm policy enabled the session posts
 * a prewarm now, for the current width-resolved controls, and after each rhythm-setting change;
 * those prewarms land in the same worker's memo the runner's phrases read. Under the
 * pre-generation policy, the session controller's Idle pre-generation queue runs its background
 * attempts on that same seam, after the prewarm, through the Idle background slot, which every
 * Idle request yields to first. Idle starts from the loaded settings' controls, profile selection
 * and theme, and each session controller's flags from its "During a session" choices, so the
 * workspace is first drawn with them; the load itself is exposed unchanged. The visit's saves go
 * through the loaded save policy: Idle's control actions and the screen's change handlers save the
 * player's changes through them, and each session controller holds them while a session runs.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
// @spec-link [[module_idle_fit_round]]
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[module_session_seed_plan]]
export function composeWorkspaceSession(deps: WorkspaceSessionDependencies): WorkspaceSession {
  let session: GenerationSession<WorkspaceSessionResult> | null = null
  const announcer = createPhraseReplayAnnouncer(deps.logPhraseReplayKey)

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

  const connectionSheetOpen = shallowRef(false)
  const slot = createPregenerationSlot()
  const { controls, profileSelection, theme, sessionOptions } = deps.savedData.settings
  const saves = createVisitSaves(deps.savedData.savePolicy, APP_VERSION)
  const created = createGenerationSession<WorkspaceSessionResult, WorkspaceGeneratedPhrase>({
    providers: deps.providers,
    nextSessionSeed: deps.nextSessionSeed,
    withSessionSeed,
    viewport: deps.viewport,
    generate: createWorkspaceGenerate(yieldingToPlayer(slot, deps.generate)),
    notate: coordinator.notate,
    checkFit: coordinator.checkFit,
    checkRoom: coordinator.checkRoom,
    staffLayout: coordinator.staffLayout,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
    ...(deps.prewarmPolicy === 'enabled' ? { prewarm: deps.prewarm } : {}),
    onPhraseAccepted: announcer.announceWorkspacePhrase,
    initialSettings: { controls, profileSelection, theme },
    saveSettings: saves.saveSettings,
  })
  session = created
  const staffReports = createIdleLayoutGate({
    layoutInputs: coordinator.handleLayoutInputs,
    engraved: coordinator.handleEngraved,
    notationError: coordinator.handleNotationError,
  })

  /**
   * Intent: load the runner's module and, before settling, the replay-key announcer, then hand
   * back a starter of runners on the Idle flow's request-id provider (every attempt seed, and the
   * mutation seed of a session with `Vary settings` on, derived from the start's session seed),
   * width reading and `generate` seam, reading the caller's display,
   * their outputs forwarded unchanged once each accepted session phrase has announced its replay
   * key. The runner's module is imported by its `@/` path, the one a test harness may substitute.
   * A load failure is not caught: it rejects the returned promise.
   */
  // @spec-link [[module_phrase_replay_key]]
  // @spec-link [[req_settings_mutation_flag]]
  async function loadSessionRunner(): Promise<WorkspaceSessionRunnerStarter> {
    const [{ startWorkspaceSessionRunner }] = await Promise.all([
      import('@/components/workspace/workspace-session-runner'),
      announcer.loaded,
    ])
    return (input) =>
      startWorkspaceSessionRunner(
        {
          generate: deps.generate,
          checkFit: input.checkFit,
          now: input.now,
          providers: deps.providers,
          viewport: deps.viewport,
          display: input.display,
          onOutput: announcer.announcingSessionOutputs(input.onOutput),
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
    loadSessionRunner,
    audio: deps.audio,
    midi: deps.midi,
    connectionSheetOpen,
    browser: deps.browser,
    createSessionController: async () => {
      // The runner starter settles only once the replay-key announcer has loaded, so the
      // announcer is ready before the controller starts any runner.
      const [
        { createSessionController },
        { measureSessionStaffFixedParts, loadSessionStaffFitPlanner },
        { createWorkspacePregeneration },
        startRunner,
      ] = await Promise.all([
        import('./workspace-session-controller'),
        import('./session-staff-fixed-parts'),
        import('./workspace-pregeneration'),
        loadSessionRunner(),
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
        midi: deps.midi,
        connectionSheetOpen: () => connectionSheetOpen.value,
        pregeneration: (seams) =>
          createWorkspacePregeneration({
            ...seams,
            generate: deps.generate,
            providers: deps.providers,
            viewport: deps.viewport,
            slot,
            policy: deps.pregenerationPolicy,
          }),
        savedSessionOptions: sessionOptions,
        saveHold: { hold: saves.hold, release: saves.release },
      })
    },
    savedData: deps.savedData,
    saveSettings: saves.saveSettings,
    dispose: () => {
      created.dispose()
      deps.dispose()
    },
  }
}

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
 * Intent: write one accepted phrase's replay-key line to the developer console, production builds
 * included, as information rather than a warning or an error.
 */
// @spec-link [[module_phrase_replay_key]]
function logPhraseReplayKeyToConsole(line: string): void {
  console.info(line)
}

/**
 * Intent: the generation seam over a worker client whose module is still loading. Every call waits
 * for the client, in call order, then goes to it unchanged: the client, its protocol and its
 * response parsers are not needed before the first draw, so they load on demand and leave the
 * entry chunk. A load failure is not caught: `generate` rejects with it, as the client's own
 * failures do.
 */
function loadingGenerationWorkerClient(
  loading: Promise<GenerationWorkerClient>,
): GenerationWorkerClient {
  return {
    generate: (intent, signal) => loading.then((client) => client.generate(intent, signal)),
    prewarm: (intent) => {
      void loading.then((client) => client.prewarm(intent))
    },
    dispose: () => {
      void loading.then((client) => client.dispose())
    },
  }
}

/** What the production root chooses when it builds the workspace session. */
// @spec-link [[service_workspace_session_flow]]
export interface ProductionWorkspaceSessionOptions {
  /** Read by App.vue from the page URL (`?prewarm=off`, the latency measurement switch). */
  readonly prewarmPolicy: WorkspacePrewarmPolicy
  /** Read by App.vue from the page URL (`?pregeneration=off`, the measurement switch). */
  readonly pregenerationPolicy: WorkspacePregenerationPolicy
  /** The saved data `main.ts` loaded before mounting the app: what the workspace starts from. */
  // @spec-link [[service_workspace_session_flow]]
  readonly savedData: SavedDataLoad
}

/**
 * Intent: build the root workspace session used by `App.vue` in production: a real worker-backed
 * generation seam, its client loaded on demand, one browser worker at a time replaced on a
 * session's cancellation and then re-warmed under the given prewarm policy, and its prewarm under
 * that policy, the cryptographic
 * seed provider (for phrase seeds and, drawn separately, session seeds), a monotonic request-id
 * provider, the window's own `matchMedia` width provider, the Web Audio transport, still locked: no
 * audio context exists until a player click unlocks it, the Web MIDI controller on that transport's
 * clock, which requests no MIDI access until `connect()`, and the browser adapters of the session's
 * wake lock, orientation lock, page visibility and window shape, none of which asks or listens for
 * anything until used, and the session clock: a wake-up Worker timer, created only when a session
 * controller first starts a session, the system's wall clock for session histories, and the
 * browser's animation frames for the playhead. Everything starts from the saved data loaded before
 * the first draw, the audio mix included.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_audio_unlocked_by_player_click]]
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_chromium_only_support]]
// @spec-link [[module_generation_worker_cancellation]]
export function createWorkspaceSession(
  options: ProductionWorkspaceSessionOptions,
): WorkspaceSession {
  const client = loadingGenerationWorkerClient(
    import('@/generation-worker/generation-worker-client').then(
      ({ createGenerationWorkerClient }) =>
        createGenerationWorkerClient(createBrowserGenerationWorker, {
          prewarmEnabled: options.prewarmPolicy === 'enabled',
        }),
    ),
  )
  const audio = createBrowserAudioTransport({ loadedMix: () => options.savedData.settings.mix })
  const midi = createMidiController({
    provider: createWebMidiAccessProvider(navigator),
    clock: { anchor: () => audio.clockAnchor() },
  })
  return composeWorkspaceSession({
    providers: {
      nextRequestId: createRequestIdProvider(),
      nextSeed: nextCryptoSeed,
    },
    nextSessionSeed: nextCryptoSeed,
    viewport: createBrowserViewportWidth(),
    generate: client.generate,
    prewarmPolicy: options.prewarmPolicy,
    pregenerationPolicy: options.pregenerationPolicy,
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
    savedData: options.savedData,
    dispose: client.dispose,
  })
}
