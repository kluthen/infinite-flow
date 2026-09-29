/**
 * The workspace-session e2e harness entry point: mounts the real production `App` tree (App.vue ->
 * WorkspaceShell.vue -> the real ControlPanel/ScorePanel/PhraseScore components), exactly as
 * src/main.ts does, except `App.vue`'s workspace session is built by `composeWorkspaceSession`
 * (the DI seam in src/components/workspace/create-workspace-session.ts) with deterministic seams
 * wrapped around the real worker-backed generation client, injected through App.vue's documented
 * `WORKSPACE_SESSION_FACTORY` provide/inject point -- never a test branch inside src/ itself:
 *
 * - a deterministic seed queue and monotonic request-id provider, so a spec can queue exact seeds
 *   and read back exact request ids instead of racing `crypto` randomness;
 * - a generation gate (`holdGeneration`/`releaseGeneration`) the `generate` wrapper awaits before
 *   ever delegating to the real worker client, so a spec can assert concurrent-operation
 *   prevention deterministically;
 * - one-shot failure injection for generation (`failNextGeneration`, resolving with the real
 *   `GenerationOutcome` failure shape orchestration itself produces) and for notation
 *   (`failNextNotation`, armed through the `@/notation/vexflow-engraver-loader` alias configured in
 *   vite.workspace-harness.config.ts, which substitutes this directory's
 *   `vexflow-engraver-loader-seam.ts` for the real loader so PhraseScore's genuine `redraw()`
 *   catch/emit('notation-error') and Retry-notation path run end to end, never a fabricated result).
 *
 * The lazy VexFlow engraver, the real generation Worker, real notation, and the real `matchMedia`
 * window-width provider all run for real (a spec moves the window across `bp-tablet-landscape`
 * with `page.setViewportSize`); only randomness, timing, and fault injection are made
 * deterministic.
 */
import { createApp } from 'vue'

import App from '../../../src/App.vue'
import '../../../src/styles/index.css'
import {
  WORKSPACE_SESSION_FACTORY,
  composeWorkspaceSession,
  type WorkspaceSession,
} from '../../../src/components/workspace/create-workspace-session'
import type { WorkspaceSessionResult } from '../../../src/composables/workspace-session-result'
import type { GenerationIntent } from '../../../src/domain/generation/generation-intent'
import { makeRequestId, type RequestId } from '../../../src/domain/generation/generation-request'
import type {
  GenerationDiagnostics,
  GenerationOutcome,
} from '../../../src/domain/generation/orchestration/orchestration-types'
import { makeSeed, type Seed } from '../../../src/domain/random/seed'
import { createBrowserGenerationWorker } from '../../../src/generation-worker/browser-generation-worker'
import { createGenerationWorkerClient } from '../../../src/generation-worker/generation-worker-client'
import { createBrowserViewportWidth } from '../../../src/components/workspace/browser-viewport-width'
import { armNextNotationFailure } from './vexflow-engraver-loader-seam'

/** Intent: a deterministic seed provider -- a spec-filled queue, falling back to a plain counter. */
function createSeedProvider(): {
  readonly nextSeed: () => Seed
  readonly queueSeeds: (seeds: readonly number[]) => void
} {
  let counter = 0
  const queue: number[] = []
  return {
    nextSeed: () => makeSeed(queue.length > 0 ? queue.shift()! : ++counter),
    queueSeeds: (seeds) => queue.push(...seeds),
  }
}

/** Intent: a deterministic, monotonic request-id provider unique to this harness page load. */
function createRequestIdProvider(): () => RequestId {
  let counter = 0
  return () => makeRequestId(`workspace-harness-request-${++counter}`)
}

/** Intent: a held/released gate a `generate` wrapper awaits before ever reaching the real worker client. */
function createGenerationGate(): {
  readonly hold: () => void
  readonly release: () => void
  readonly wait: () => Promise<void>
} {
  let gatePromise: Promise<void> = Promise.resolve()
  let releaseFn: (() => void) | null = null
  return {
    hold: () => {
      if (releaseFn !== null) return
      gatePromise = new Promise((resolve) => {
        releaseFn = resolve
      })
    },
    release: () => {
      releaseFn?.()
      releaseFn = null
      gatePromise = Promise.resolve()
    },
    wait: () => gatePromise,
  }
}

/** A real, minimal GenerationDiagnostics value for one fabricated failure outcome -- never an invented shape. */
const EMPTY_DIAGNOSTICS: GenerationDiagnostics = {
  version: 'generation-diagnostics-v1',
  harmonyDomainSize: 0,
  rhythmDomainSize: 0,
  windows: [],
  successfulRegisters: [],
}

const seedProvider = createSeedProvider()
const requestIdProvider = createRequestIdProvider()
const gate = createGenerationGate()
let armedFailureCode: WorkspaceHarnessGenerationFailureCode | null = null

const port = createBrowserGenerationWorker()
const client = createGenerationWorkerClient(port)

/** Intent: gate, then optionally fail with a real orchestration failure shape, then delegate for real. */
async function harnessGenerate(intent: GenerationIntent): Promise<GenerationOutcome> {
  await gate.wait()
  if (armedFailureCode !== null) {
    const code = armedFailureCode
    armedFailureCode = null
    return { kind: 'generation_failure', code, diagnostics: EMPTY_DIAGNOSTICS }
  }
  return client.generate(intent)
}

let workspace: WorkspaceSession | null = null

/** Intent: the latest session state's requestId/seed/timeline/operation/mode, for replay/isolation assertions. */
function snapshot(): WorkspaceHarnessSnapshot {
  if (workspace === null) {
    throw new Error('Workspace harness snapshot() was requested before the session mounted.')
  }
  const state = workspace.session.state
  const result: WorkspaceSessionResult | null = state.result
  return {
    operation: state.operation,
    instrumentProfileId: state.controls.instrumentProfileId,
    writtenTonalCenter: result === null ? null : result.intent.writtenTonalCenter,
    concertTonalCenter: result === null ? null : result.intent.controls.tonalCenter,
    requestId: result === null ? null : result.intent.requestId,
    seed: result === null ? null : result.intent.seed,
    timeline: result === null ? null : JSON.stringify(result.outcome.result.timeline),
    chosenNoteDensity: state.controls.noteDensity,
    generatedNoteDensity: result === null ? null : result.intent.controls.noteDensity,
  }
}

window.__workspaceHarness = {
  queueSeeds: (seeds) => seedProvider.queueSeeds(seeds),
  holdGeneration: () => gate.hold(),
  releaseGeneration: () => gate.release(),
  failNextGeneration: (code) => {
    armedFailureCode = code
  },
  failNextNotation: () => armNextNotationFailure(),
  snapshot,
}

const app = createApp(App)
app.provide(WORKSPACE_SESSION_FACTORY, () => {
  workspace = composeWorkspaceSession({
    providers: { nextRequestId: requestIdProvider, nextSeed: seedProvider.nextSeed },
    viewport: createBrowserViewportWidth(),
    generate: harnessGenerate,
    dispose: client.dispose,
  })
  return workspace
})
app.mount('#app')
