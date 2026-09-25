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
  evaluateWorkspaceProfileSwitch,
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

export interface WorkspaceSession {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: Ref<WrittenPhrase | null>
  readonly handleEngraved: () => void
  readonly handleNotationError: (error: NotationError) => void
  readonly dispose: () => void
}

/**
 * The explicit dependency surface `composeWorkspaceSession` needs: identity/seed providers and
 * the raw orchestration-outcome `generate` seam (plus its teardown). Production supplies the
 * cryptographic seed provider and the real worker client; a harness supplies deterministic,
 * gated, or failure-injecting equivalents that still call through to the real worker.
 */
export interface WorkspaceSessionDependencies {
  readonly providers: GenerationIntentProviders
  readonly generate: (intent: GenerationIntent) => Promise<GenerationOutcome>
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
 * the raw orchestration `generate` seam, and its teardown. Wires the same notation coordinator
 * and profile-switch policy production always uses, so the only thing a caller can vary is where
 * requests/seeds and generation outcomes come from.
 */
// @spec-link [[service_workspace_session_flow]]
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
    generate: createWorkspaceGenerate(deps.generate),
    notate: coordinator.notate,
    evaluateProfileSwitch: evaluateWorkspaceProfileSwitch,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
  })
  session = created

  return {
    session: created,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    dispose: deps.dispose,
  }
}

/**
 * Intent: build the root workspace session used by `App.vue` in production: a real worker-backed
 * generation seam, the cryptographic seed provider, and a monotonic request-id provider.
 */
// @spec-link [[service_workspace_session_flow]]
export function createWorkspaceSession(): WorkspaceSession {
  const port = createBrowserGenerationWorker()
  const client = createGenerationWorkerClient(port)
  return composeWorkspaceSession({
    providers: {
      nextRequestId: createRequestIdProvider(),
      nextSeed: nextCryptoSeed,
    },
    generate: client.generate,
    dispose: client.dispose,
  })
}
