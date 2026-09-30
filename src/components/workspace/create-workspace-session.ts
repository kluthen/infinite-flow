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
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'
import { createGenerationWorkerClient } from '@/generation-worker/generation-worker-client'
import type { ViewportWidthProvider } from '@/composables/viewport-width'
import {
  createSessionRunner,
  type SessionRunner,
  type SessionRunnerDependencies,
} from '@/session/session-runner'
import type { SessionStart } from '@/session/session-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { createBrowserAudioTransport } from '@/audio/browser-audio-transport'
import { createBrowserViewportWidth } from './browser-viewport-width'

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
  readonly dispose: () => void
}

/**
 * The explicit dependency surface `composeWorkspaceSession` needs: identity/seed providers, the
 * window-width provider, the raw orchestration-outcome `generate` seam (plus its teardown) and the
 * audio transport. Production supplies the cryptographic seed provider, the `matchMedia` width
 * provider, the real worker client and the Web Audio transport; a harness supplies deterministic,
 * gated, or failure-injecting equivalents that still call through to the real worker, and a
 * transport on a fake or a recorded real audio output.
 */
export interface WorkspaceSessionDependencies {
  readonly providers: GenerationIntentProviders
  readonly viewport: ViewportWidthProvider
  readonly generate: (intent: GenerationIntent) => Promise<GenerationOutcome>
  /** The audio transport, passed through unchanged as `WorkspaceSession.audio`. */
  // @spec-link [[req_session_audio_mix]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  readonly audio: AudioTransport
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
 * the raw orchestration `generate` seam, its teardown, and the audio transport, exposed unchanged. Wires the same notation coordinator
 * and profile-switch policy production always uses, so the only thing a caller can vary is where
 * requests/seeds and generation outcomes come from. Session runners it starts share the Idle
 * flow's providers, window-width reading and raw `generate` seam (the one worker), so phrase 2
 * reuses the rhythm-domain memo phrase 1 warmed.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[service_session_runner]]
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
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
  })
  session = created

  return {
    session: created,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    createSessionRunner: (input) =>
      createSessionRunner(
        {
          generate: deps.generate,
          checkFit: input.checkFit,
          now: input.now,
          providers: deps.providers,
          viewport: deps.viewport,
          onOutput: input.onOutput,
          onError: input.onError,
        },
        input.start,
      ),
    audio: deps.audio,
    dispose: () => {
      created.dispose()
      deps.dispose()
    },
  }
}

/**
 * Intent: build the root workspace session used by `App.vue` in production: a real worker-backed
 * generation seam, the cryptographic seed provider, a monotonic request-id provider, the
 * window's own `matchMedia` width provider, and the Web Audio transport, still locked: no audio
 * context exists until a player click unlocks it.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_audio_unlocked_by_player_click]]
export function createWorkspaceSession(): WorkspaceSession {
  const port = createBrowserGenerationWorker()
  const client = createGenerationWorkerClient(port)
  return composeWorkspaceSession({
    providers: {
      nextRequestId: createRequestIdProvider(),
      nextSeed: nextCryptoSeed,
    },
    viewport: createBrowserViewportWidth(),
    generate: client.generate,
    audio: createBrowserAudioTransport(),
    dispose: client.dispose,
  })
}
