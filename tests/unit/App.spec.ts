import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { GenerationSession } from '../../src/composables/use-generation-session'
import type { WorkspaceSessionResult } from '../../src/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '../../src/domain/controls/profile-selection'
import type { WrittenPhrase } from '../../src/domain/notation/written-phrase-types'
import type {
  SessionOperation,
  ThemePreference,
} from '../../src/composables/use-generation-session'

let lastGenerate: ReturnType<typeof vi.fn> | null = null

/** The fake session controller the next fake workspace's `createSessionController` resolves with. */
let nextController: FakeSessionController | null = null

/** Settles the next fake workspace's controller load: a test holds it to see the loading state. */
let controllerLoad: { promise: Promise<void>; resolve: () => void } | null = null

/**
 * Intent: a minimal idle-state session double so App.spec.ts never constructs the real
 * `createWorkspaceSession` factory, which would spin up a real browser `Worker` -- unavailable
 * and unwanted in jsdom. `setTheme` genuinely mutates its own reactive presentation state, so a
 * test can assert App.vue's DOM theme-application watcher reacts to a real state change.
 */
function fakeWorkspaceSession() {
  const generate = vi.fn(async () => false)
  lastGenerate = generate
  const state = reactive({
    controls: DEFAULT_GENERATION_CONTROLS,
    profileSelection: DEFAULT_PROFILE_SELECTION,
    presentation: { theme: 'System' } as {
      theme: ThemePreference
    },
    latestIntent: null,
    result: null,
    operation: 'idle' as SessionOperation,
    generationError: null,
    notationError: null,
    resultEngraved: false,
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const session: GenerationSession<WorkspaceSessionResult> = {
    state,
    actions: {
      setControl: () => false,
      selectMusicalProfile: () => false,
      selectInstrumentProfile: async () => 'rejected',
      setTheme: (theme: ThemePreference) => {
        state.presentation = { ...state.presentation, theme }
        return true
      },
      generate,
      regenerate: async () => false,
      retryGeneration: async () => false,
      retryNotation: async () => false,
      reportNotationFailure: () => false,
      reportNotationRecovered: () => false,
    },
    dispose: () => {},
  }
  return {
    session,
    pendingPhrase: ref<WrittenPhrase | null>(null),
    handleEngraved: () => {},
    handleNotationError: () => {},
    handleSessionStaffFailed: () => {},
    handleLayoutInputs: () => {},
    audio: transportRig().transport,
    midi: createControllerRig().controller,
    createSessionController: async () => {
      if (controllerLoad !== null) await controllerLoad.promise
      nextController ??= createFakeSessionController()
      return nextController.controller
    },
    dispose: () => {},
  }
}

/** Intent: hold the next controller load until the returned function is called. */
function holdControllerLoad(): () => void {
  let resolve!: () => void
  const promise = new Promise<void>((settle) => {
    resolve = settle
  })
  controllerLoad = { promise, resolve }
  return resolve
}

const { workspaceSessionFactoryKey } = vi.hoisted(() => ({
  workspaceSessionFactoryKey: Symbol('workspace-session-factory'),
}))

vi.mock('../../src/components/workspace/create-workspace-session', () => ({
  createWorkspaceSession: fakeWorkspaceSession,
  WORKSPACE_SESSION_FACTORY: workspaceSessionFactoryKey,
}))

import App from '../../src/App.vue'
import { transportRig } from './audio/transport-rig'
import { createControllerRig } from './midi/midi-controller-rig'
import { PHRASE_SCORE_STUB } from './components/workspace/test-workspace'
import {
  createFakeSessionController,
  type FakeSessionController,
} from './components/workspace/fake-session-controller'

/**
 * Stub PhraseScore, as every workspace component spec does: it is mounted in every state (it holds
 * the staff's reserved system positions), and its real engraving surface needs the browser layout
 * APIs (ResizeObserver, matchMedia, computed styles) that jsdom lacks.
 */
const STUBS = { PhraseScore: PHRASE_SCORE_STUB }

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  nextController = null
  controllerLoad = null
})

describe('App', () => {
  it('mounts the client shell', () => {
    const wrapper = mount(App, { global: { stubs: STUBS } })

    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('leaves no data-theme override on mount while the preference is System', () => {
    mount(App, { global: { stubs: STUBS } })

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('applies data-theme on a theme selection without calling generate', async () => {
    const wrapper = mount(App, { global: { stubs: STUBS } })

    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    await themeGroup.findAll('button')[2]!.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(lastGenerate).not.toHaveBeenCalled()
  })

  // @test-link [[service_workspace_session_flow]]
  it('uses an injected WORKSPACE_SESSION_FACTORY instead of the default createWorkspaceSession', () => {
    const injected = fakeWorkspaceSession()
    const injectedFactory = vi.fn(() => injected)

    const wrapper = mount(App, {
      global: { stubs: STUBS, provide: { [workspaceSessionFactoryKey]: injectedFactory } },
    })

    expect(injectedFactory).toHaveBeenCalledTimes(1)
    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })
})

// @test-link [[service_workspace_session_flow]]
// @test-link [[rule_session_start_conditions]]
describe('App session controller', () => {
  it('keeps Start session disabled until the session controller has loaded', async () => {
    const release = holdControllerLoad()
    const wrapper = mount(App, { global: { stubs: STUBS } })
    await flushPromises()

    expect(wrapper.get('button.session-action').attributes('disabled')).toBeDefined()

    release()
    await flushPromises()
    expect(wrapper.get('button.session-action').attributes('disabled')).toBeUndefined()
  })

  it('builds the controller once and disposes of it on unmount', async () => {
    const fake = createFakeSessionController()
    nextController = fake
    const wrapper = mount(App, { global: { stubs: STUBS } })
    await flushPromises()

    wrapper.unmount()

    expect(fake.dispose).toHaveBeenCalledOnce()
  })

  it('disposes of a controller that finishes loading after unmount', async () => {
    const fake = createFakeSessionController()
    nextController = fake
    const release = holdControllerLoad()
    const wrapper = mount(App, { global: { stubs: STUBS } })
    wrapper.unmount()

    release()
    await flushPromises()

    expect(fake.dispose).toHaveBeenCalledOnce()
  })
})
