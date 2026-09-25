/**
 * Unit coverage for the workspace-session DI seam: `composeWorkspaceSession` builds a working
 * session from explicit fake dependencies (never a real Worker or `crypto`), and
 * `createWorkspaceSession` wires the same composition to a real `GenerationWorkerClient`-shaped
 * `generate`/`dispose` pair without ever constructing a real browser `Worker`.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  createWorkspaceSession,
  type WorkspaceSessionDependencies,
} from '@/components/workspace/create-workspace-session'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { makeSeed } from '@/domain/random/seed'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

const CHEAP_CONTROLS = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Quarter',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
} as const

/** Intent: run one real, cheap generation for the given intent's own identity and seed. */
function cheapOutcome(requestId: string, seed: number): GenerationOutcome {
  const intent = createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    musicalProfile: DEFAULT_PROFILE_SELECTION,
  })
  return generatePhrase(intent)
}

/** Intent: build a fully fake dependency bundle whose seams a test can assert against directly. */
function fakeDependencies(): WorkspaceSessionDependencies & {
  readonly generateMock: ReturnType<typeof vi.fn>
  readonly disposeMock: ReturnType<typeof vi.fn>
} {
  let seedCounter = 0
  let requestCounter = 0
  // A real generate seam always answers under the caller's own request identity/seed; this fake
  // preserves that contract (notationInputFromOutcome rejects a mismatched requestId) while still
  // producing a real, cheap generatePhrase() result rather than a hand-rolled stand-in.
  const generateMock = vi.fn(async (intent: GenerationIntent): Promise<GenerationOutcome> => {
    return cheapOutcome(intent.requestId, intent.seed)
  })
  const disposeMock = vi.fn()
  return {
    providers: {
      nextRequestId: () => makeRequestId(`di-seam-request-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    generate: generateMock,
    dispose: disposeMock,
    generateMock,
    disposeMock,
  }
}

/**
 * Intent: start `generate()`, then settle its inner `notate()` the way a mounted `PhraseScore`
 * would (`handleEngraved` once the coordinator publishes a phrase to engrave), so a fake
 * dependency bundle with no real component tree can still exercise the whole operation.
 */
function generateAndEngrave(
  workspace: ReturnType<typeof composeWorkspaceSession>,
): Promise<boolean> {
  const running = workspace.session.actions.generate()
  void vi
    .waitFor(() => {
      if (workspace.pendingPhrase.value === null) throw new Error('not yet pending')
    })
    .then(() => workspace.handleEngraved())
  return running
}

describe('composeWorkspaceSession', () => {
  it('builds a session whose generate() delegates to the injected generate seam', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await generateAndEngrave(workspace)

    expect(succeeded).toBe(true)
    expect(deps.generateMock).toHaveBeenCalledTimes(1)
    expect(workspace.session.state.result).not.toBeNull()
  })

  it('surfaces a rejected generate() seam as the session generation error, never a default result', async () => {
    const deps = fakeDependencies()
    deps.generateMock.mockRejectedValueOnce(new Error('injected failure'))
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await workspace.session.actions.generate()

    expect(succeeded).toBe(false)
    expect(workspace.session.state.result).toBeNull()
    expect(workspace.session.state.generationError?.message).toContain('injected failure')
  })

  it('routes engraving through the shared notation coordinator: engraved -> ready result', async () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    const succeeded = await generateAndEngrave(workspace)

    expect(succeeded).toBe(true)
    expect(workspace.session.state.notationError).toBeNull()
  })

  it('dispose() forwards to the injected teardown', () => {
    const deps = fakeDependencies()
    const workspace = composeWorkspaceSession(deps)

    workspace.dispose()

    expect(deps.disposeMock).toHaveBeenCalledTimes(1)
  })
})

describe('createWorkspaceSession', () => {
  it('builds a production session without ever calling crypto.getRandomValues eagerly', () => {
    const workspace = createWorkspaceSession()

    expect(workspace.session.state.operation).toBe('idle')
    expect(workspace.session.state.controls).toEqual(DEFAULT_GENERATION_CONTROLS)

    workspace.dispose()
  })
})
