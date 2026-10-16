/**
 * The production workspace session: `createWorkspaceSession` builds a session without calling
 * `crypto.getRandomValues` eagerly, with a locked audio transport that never constructs an
 * `AudioContext`, reading the window's width through `matchMedia` (a jsdom stand-in here), and
 * posting a prewarm to its generation worker only when prewarm is enabled; the worker is created
 * once the client's module, loaded on demand, has loaded. No real browser `Worker` is ever
 * constructed.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createWorkspaceSession } from '@/components/workspace/create-workspace-session'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { createBrowserGenerationWorker } from '@/generation-worker/browser-generation-worker'
import { themeMixTokens } from '../../audio/transport-rig'
import { fakeSavedData } from './fake-workspace-dependencies'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

/** A port of the stand-in generation worker. */
interface FakeWorkerPort {
  readonly postMessage: ReturnType<typeof vi.fn>
}

/**
 * Intent: the port of the next generation worker created after `created` workers, once the
 * session's client, loaded on demand, has created it and handed it the calls made meanwhile.
 */
async function nextWorkerPort(created: number): Promise<FakeWorkerPort> {
  const results = vi.mocked(createBrowserGenerationWorker).mock.results
  // Checked on a timer, so the calls queued for the client have reached it by then.
  await vi.waitFor(() => expect(results.length).toBeGreaterThan(created))
  return results[created]!.value as FakeWorkerPort
}

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
  // Loaded once ahead, so each session's client and browser ports are created within its own test,
  // as every session's are in the app once the modules have loaded.
  beforeAll(async () => {
    await import('@/generation-worker/generation-worker-client')
    await import('@/components/workspace/browser-session-ports')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a production session without ever calling crypto.getRandomValues eagerly', () => {
    stubMatchMedia(false)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
      savedData: fakeSavedData(),
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
      savedData: fakeSavedData(),
    })

    expect(workspace.audio.isUnlocked()).toBe(false)
    expect(workspace.audio.isRunning()).toBe(false)
    expect(constructions).not.toHaveBeenCalled()

    workspace.dispose()
    expect(constructions).not.toHaveBeenCalled()
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_session_audio_mix]]
  it('starts its audio transport from the loaded mix, and Idle from the loaded controls', () => {
    stubMatchMedia(false)
    vi.stubGlobal('getComputedStyle', () => themeMixTokens())
    const mix = { clickOn: false, clickVolume: 0.4, backingOn: true, backingVolume: 0.3 }
    const controls = { ...DEFAULT_GENERATION_CONTROLS, tempo: 140 }
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
      savedData: fakeSavedData({ mix, controls }),
    })

    expect(workspace.audio.mix()).toEqual(mix)
    expect(workspace.session.state.controls).toEqual(controls)
    workspace.dispose()
  })

  // @test-link [[rule_generated_density_follows_window_width]]
  it("reads the window's width against bp-tablet-landscape through matchMedia", () => {
    const { matchMedia, listeners } = stubMatchMedia(true)
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
      savedData: fakeSavedData(),
    })

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 63.9375rem)')
    expect(workspace.session.state.noteDensityContext.belowTabletLandscape).toBe(true)
    expect(listeners.size).toBe(1)

    workspace.dispose()
    expect(listeners.size).toBe(0)
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts one prewarm for the default controls to the new worker with prewarm enabled', async () => {
    stubMatchMedia(false)
    const created = vi.mocked(createBrowserGenerationWorker).mock.results.length
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'enabled',
      pregenerationPolicy: 'disabled',
      savedData: fakeSavedData(),
    })

    const port = await nextWorkerPort(created)
    expect(port.postMessage).toHaveBeenCalledTimes(1)
    expect(port.postMessage.mock.calls[0]![0]).toMatchObject({
      type: 'prewarm',
      intent: { controls: { noteDensity: DEFAULT_GENERATION_CONTROLS.noteDensity } },
    })

    workspace.dispose()
  })

  // @test-link [[service_workspace_session_flow]]
  it('posts nothing to the new worker with prewarm disabled', async () => {
    stubMatchMedia(false)
    const created = vi.mocked(createBrowserGenerationWorker).mock.results.length
    const workspace = createWorkspaceSession({
      prewarmPolicy: 'disabled',
      pregenerationPolicy: 'disabled',
      savedData: fakeSavedData(),
    })
    workspace.session.actions.setControl('syncopation', 'Active displacement')

    const port = await nextWorkerPort(created)
    expect(port.postMessage).not.toHaveBeenCalled()

    workspace.dispose()
  })
})
