/**
 * The production workspace session: `createWorkspaceSession` builds a session without calling
 * `crypto.getRandomValues` eagerly, with a locked audio transport that never constructs an
 * `AudioContext`, reading the window's width through `matchMedia` (a jsdom stand-in here), and
 * posting a prewarm to its generation worker only when prewarm is enabled. No real browser `Worker`
 * is ever constructed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

/** Intent: a jsdom stand-in for `window.matchMedia`, recording the query and its listeners. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<unknown>()
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    matches,
    addEventListener: (_type: string, listener: unknown) => listeners.add(listener),
    removeEventListener: (_type: string, listener: unknown) => listeners.delete(listener),
  }))
  vi.stubGlobal('matchMedia', matchMedia)
  return { matchMedia, listeners }
}

describe('createWorkspaceSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a production session without ever calling crypto.getRandomValues eagerly', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
    })

    expect(workspace.session.state.operation).toBe('idle')
    expect(workspace.session.state.controls).toEqual(DEFAULT_GENERATION_CONTROLS)

    workspace.dispose()
  })

  // @test-link [[rule_audio_unlocked_by_player_click]]
  it('builds a locked audio transport that never constructs an AudioContext', () => {
    stubMatchMedia(false)
    const constructions = vi.fn()
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          constructions()
        }
      },
    )
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
    })

    expect(workspace.audio.isUnlocked()).toBe(false)
    expect(workspace.audio.isRunning()).toBe(false)
    expect(constructions).not.toHaveBeenCalled()

    workspace.dispose()
    expect(constructions).not.toHaveBeenCalled()
  })

  // @test-link [[rule_generated_density_follows_window_width]]
  it("reads the window's width against bp-tablet-landscape through matchMedia", () => {
    const { matchMedia, listeners } = stubMatchMedia(true)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
    })

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 63.9375rem)')
    expect(workspace.session.state.noteDensityContext.belowTabletLandscape).toBe(true)
    expect(listeners.size).toBe(1)

    workspace.dispose()
    expect(listeners.size).toBe(0)
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm for the default controls to the new worker with prewarm enabled', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'enabled',
      pregenerationPolicy: 'disabled',
    })

    const port = vi.mocked(createBrowserGenerationWorker).mock.results.at(-1)!.value as {
      postMessage: ReturnType<typeof vi.fn>
    }
    expect(port.postMessage).toHaveBeenCalledTimes(1)
    expect(port.postMessage.mock.calls[0]![0]).toMatchObject({
      type: 'prewarm',
      intent: { controls: { noteDensity: DEFAULT_GENERATION_CONTROLS.noteDensity } },
    })

    workspace.dispose()
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts nothing to the new worker with prewarm disabled', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
    })
    workspace.session.actions.setControl('syncopation', 'Active displacement')

    const port = vi.mocked(createBrowserGenerationWorker).mock.results.at(-1)!.value as {
      postMessage: ReturnType<typeof vi.fn>
    }
    expect(port.postMessage).not.toHaveBeenCalled()

    workspace.dispose()
  })
})
