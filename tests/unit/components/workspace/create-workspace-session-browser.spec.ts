/**
 * The workspace session's browser ports: `composeWorkspaceSession` carries the injected ports
 * unchanged without using them, and `createWorkspaceSession` builds the browser adapters over the
 * page's own `navigator`, `screen`, `document` and `window` (jsdom, with hand-made stand-ins where
 * it has no such API), asking for no lock and adding nothing to the page until a port is used.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  composeWorkspaceSession,
  createWorkspaceSession,
} from '@/components/workspace/create-workspace-session'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { createMidiController } from '@/midi/midi-controller'
import { transportRig } from '../../audio/transport-rig'
import { createFakeViewportWidth } from '../../composables/fake-viewport-width'
import { createFakeMidiAccess } from '../../midi/fake-midi-access'
import { createFakeSessionBrowser } from '../../session/fake-session-browser'
import { fixedWallClock } from '../../session/session-harness'
import { createFakeFrames } from './fake-frames'

vi.mock('@/generation-worker/browser-generation-worker', () => ({
  createBrowserGenerationWorker: vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    terminate: vi.fn(),
  })),
}))

/** Intent: a jsdom stand-in for `window.matchMedia`, for a window wider than every breakpoint. */
function stubWideWindow(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  )
}

/** Intent: give jsdom's navigator a stand-in `wakeLock` whose requests are recorded. */
function stubWakeLock(): { readonly requests: string[] } {
  const requests: string[] = []
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: (type: string) => {
        requests.push(type)
        return Promise.resolve({ release: () => Promise.resolve() })
      },
    },
  })
  return { requests }
}

// @test-link [[service_session_controller]]
describe('composeWorkspaceSession: the session browser ports', () => {
  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_hidden_tab_ends_session]]
  it('carries the injected ports unchanged, asking for no lock and listening to nothing', () => {
    const browser = createFakeSessionBrowser()
    const { rig, transport } = transportRig()
    let counter = 0
    const workspace = composeWorkspaceSession({
      providers: {
        nextRequestId: () => makeRequestId(`browser-spec-${++counter}`),
        nextSeed: () => makeSeed(++counter),
      },
      viewport: createFakeViewportWidth(),
      generate: vi.fn(),
      prewarmPolicy: 'disabled',
      prewarm: vi.fn(),
      audio: transport,
      midi: createMidiController({
        provider: createFakeMidiAccess(),
        clock: { anchor: () => transport.clockAnchor() },
      }),
      browser,
      sessionClock: {
        createWakeTimer: rig.createExtraWakeTimer,
        wallClock: fixedWallClock,
        frames: createFakeFrames().port,
      },
      logPhraseReplayKey: vi.fn(),
      dispose: () => undefined,
    })

    expect(workspace.browser).toBe(browser)
    expect(browser.wakeLock.log()).toEqual([])
    expect(browser.orientationLock.log()).toEqual([])
    expect(browser.pageVisibility.listenerCount()).toBe(0)
    expect(browser.windowShape.listenerCount()).toBe(0)
    workspace.dispose()
  })
})

// @test-link [[service_session_controller]]
describe('createWorkspaceSession: the browser adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'wakeLock')
    Reflect.deleteProperty(document, 'visibilityState')
    document.body.replaceChildren()
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  it("asks the browser's navigator.wakeLock for a screen lock, only when requested", async () => {
    stubWideWindow()
    const browser = stubWakeLock()
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })
    expect(browser.requests).toEqual([])

    expect(await workspace.browser.wakeLock.request()).toEqual({ kind: 'held' })
    expect(browser.requests).toEqual(['screen'])
    workspace.browser.wakeLock.release()
    workspace.dispose()
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_landscape_lock_during_session]]
  it('reads both locks as unsupported in a browser without the APIs, without failing', async () => {
    stubWideWindow()
    expect('wakeLock' in navigator).toBe(false)
    vi.stubGlobal('screen', {})
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })

    expect(await workspace.browser.wakeLock.request()).toEqual({ kind: 'unsupported' })
    expect(await workspace.browser.orientationLock.lock()).toEqual({ kind: 'unsupported' })
    workspace.dispose()
  })

  // @test-link [[rule_hidden_tab_ends_session]]
  it("hears the document's visibilitychange to hidden", () => {
    stubWideWindow()
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })
    let hidden = 0
    workspace.browser.pageVisibility.onHidden(() => {
      hidden += 1
    })

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(hidden).toBe(1)
    workspace.dispose()
  })

  // @test-link [[rule_session_ends_when_staff_too_small]]
  it("reads the window's width and its probe's small viewport height, adding the probe lazily", () => {
    stubWideWindow()
    const workspace = createWorkspaceSession({ prewarmPolicy: 'disabled' })
    expect(document.body.children).toHaveLength(0)

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: 0, height: 600 }),
    )
    expect(workspace.browser.windowShape.read()).toEqual({
      widthPx: window.innerWidth,
      smallHeightPx: 600,
      remPx: 16,
    })
    expect(document.body.children).toHaveLength(1)
    workspace.dispose()
  })
})
