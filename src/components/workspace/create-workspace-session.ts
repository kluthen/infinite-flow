/**
 * The production root composition: one long-lived generation worker, one workspace session built
 * from it, and the notation coordinator that drives the mounted `PhraseScore`. Isolated in its own
 * module (rather than inlined in `App.vue`) so a test can replace this factory wholesale and never
 * spin a real browser `Worker` in jsdom.
 */
import type { Ref } from 'vue'

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
import type { GenerationIntentProviders } from '@/domain/generation/generation-intent'
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
 * Intent: build the root workspace session used by `App.vue`: a real worker-backed generation
 * seam, the notation coordinator as the session's `notate` seam, and the profile-switch policy.
 */
export function createWorkspaceSession(): WorkspaceSession {
  const port = createBrowserGenerationWorker()
  const client = createGenerationWorkerClient(port)
  const nextRequestId = createRequestIdProvider()
  const providers: GenerationIntentProviders = {
    nextRequestId,
    nextSeed: nextCryptoSeed,
  }

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
    providers,
    generate: createWorkspaceGenerate(client.generate),
    notate: coordinator.notate,
    evaluateProfileSwitch: evaluateWorkspaceProfileSwitch,
  })
  session = created

  /** Intent: tear down the underlying worker when the workspace unmounts. */
  function dispose(): void {
    client.dispose()
  }

  return {
    session: created,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    dispose,
  }
}
