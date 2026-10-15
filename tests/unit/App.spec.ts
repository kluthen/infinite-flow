import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref, shallowRef } from 'vue'

import type { GenerationSession } from '../../src/composables/use-generation-session'
import type { WorkspaceSessionResult } from '../../src/composables/workspace-session-result'
import { DEFAULT_GENERATION_CONTROLS } from '../../src/domain/controls/profile-selection'
import type { WrittenPhrase } from '../../src/domain/notation/written-phrase-types'
import type {
  SessionOperation,
  ThemePreference,
} from '../../src/composables/use-generation-session'
import type { SavedDataLoad } from '../../src/storage-bootstrap'
import type { SettingChanges } from '../../src/storage/settings-saver'
import { fakeSavedData } from './components/workspace/fake-workspace-dependencies'

let lastGenerate: ReturnType<typeof vi.fn> | null = null

/** Every batch the latest fake workspace's saver was given, in order. */
let lastSaves: SettingChanges[] = []

/** The fake session controller the next fake workspace's `createSessionController` resolves with. */
let nextController: FakeSessionController | null = null

/** Settles the next fake workspace's controller load: a test holds it to see the loading state. */
let controllerLoad: { promise: Promise<void>; resolve: () => void } | null = null

/**
 * Intent: a minimal idle-state session double so App.spec.ts never constructs the real
 * `createWorkspaceSession` factory, which would spin up a real browser `Worker` -- unavailable
 * and unwanted in jsdom. It starts from the given saved data's controls, profile selection and
 * theme, as the real one does. `setTheme` genuinely mutates its own reactive presentation state,
 * so a test can assert App.vue's DOM theme-application watcher reacts to a real state change.
 * Its saver records every batch in `lastSaves`.
 */
function fakeWorkspaceSession(savedData: SavedDataLoad = fakeSavedData()) {
  const generate = vi.fn(async () => false)
  lastGenerate = generate
  const saves: SettingChanges[] = []
  lastSaves = saves
  const state = reactive({
    controls: savedData.settings.controls,
    profileSelection: savedData.settings.profileSelection,
    presentation: { theme: savedData.settings.theme } as {
      theme: ThemePreference
    },
    myInstrument: savedData.myInstrument,
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
      saveMyInstrument: async () => 'rejected',
      deleteMyInstrument: async () => 'rejected',
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
      startFreshPhrase: async () => false,
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
    connectionSheetOpen: shallowRef(false),
    createSessionController: async () => {
      if (controllerLoad !== null) await controllerLoad.promise
      nextController ??= createFakeSessionController()
      return nextController.controller
    },
    savedData,
    saveSettings: (changes: SettingChanges) => void saves.push(changes),
    rememberedController: noRememberedController(),
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
  createWorkspaceSession: (options: { readonly savedData: SavedDataLoad }) =>
    fakeWorkspaceSession(options.savedData),
  WORKSPACE_SESSION_FACTORY: workspaceSessionFactoryKey,
}))

import App from '../../src/App.vue'
import { loadConnectionSheet } from '../../src/components/controller-connection/load-connection-sheet'
import { transportRig } from './audio/transport-rig'
import { createControllerRig } from './midi/midi-controller-rig'
import { noRememberedController } from './components/workspace/quiet-saved-data'
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
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })

    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('leaves no data-theme override on mount while the preference is System', () => {
    mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('applies data-theme on a theme selection without calling generate', async () => {
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })

    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    await themeGroup.findAll('button')[2]!.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(lastGenerate).not.toHaveBeenCalled()
  })

  // @test-link [[service_workspace_session_flow]]
  it('uses an injected WORKSPACE_SESSION_FACTORY instead of the default createWorkspaceSession', () => {
    const savedData = fakeSavedData()
    const injected = fakeWorkspaceSession(savedData)
    const injectedFactory = vi.fn<(savedData: SavedDataLoad) => typeof injected>(() => injected)

    const wrapper = mount(App, {
      props: { savedData },
      global: { stubs: STUBS, provide: { [workspaceSessionFactoryKey]: injectedFactory } },
    })

    expect(injectedFactory).toHaveBeenCalledExactlyOnceWith(savedData)
    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })

  // @test-link [[rule_settings_saved_on_change]]
  it("provides the workspace's saver to the components whose handlers save", async () => {
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })

    const click = wrapper
      .findAll('.mix-controls .toggle-button')
      .find((button) => button.text().startsWith('Click'))
    if (click === undefined) throw new Error('no Click toggle')
    await click.trigger('click')

    expect(lastSaves).toEqual([{ 'mix.clickOn': false }])
  })
})

/** Intent: the checked segment's label in the radiogroup named `name`, or null. */
function checkedSegment(wrapper: ReturnType<typeof mount>, name: string): string | null {
  const segment = wrapper
    .get(`[role="radiogroup"][aria-label="${name}"]`)
    .findAll('[role="radio"]')
    .find((radio) => radio.attributes('aria-checked') === 'true')
  return segment === undefined ? null : segment.text()
}

// @test-link [[rule_first_phrase_waits_for_saved_settings]]
describe('App: the saved data it is mounted with', () => {
  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[rule_settings_saved_on_change]]
  it('applies the loaded theme and shows the loaded controls at mount', () => {
    const wrapper = mount(App, {
      props: {
        savedData: fakeSavedData({
          theme: 'Dark',
          controls: { ...DEFAULT_GENERATION_CONTROLS, tension: 'Edge' },
        }),
      },
      global: { stubs: STUBS },
    })

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(checkedSegment(wrapper, 'Tension')).toBe('Edge')
  })

  // @test-link [[rule_first_phrase_waits_for_saved_settings]]
  // @test-link [[req_settings_mutation_flag]]
  it('shows the saved session options while the session controller loads', async () => {
    holdControllerLoad()
    const wrapper = mount(App, {
      props: {
        savedData: fakeSavedData({
          sessionOptions: { varySettings: true, tensionAcrossPhrases: true, risingTempo: false },
        }),
      },
      global: { stubs: STUBS },
    })
    await flushPromises()

    expect(checkedSegment(wrapper, 'Vary settings')).toBe('On')
    expect(checkedSegment(wrapper, 'Tension across phrases')).toBe('On')
  })
})

// @test-link [[service_session_controller]]
// @test-link [[rule_session_start_conditions]]
describe('App session controller', () => {
  it('keeps Start session disabled until the session controller has loaded', async () => {
    const release = holdControllerLoad()
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })
    await flushPromises()

    expect(wrapper.get('button.session-action').attributes('disabled')).toBeDefined()

    release()
    await flushPromises()
    expect(wrapper.get('button.session-action').attributes('disabled')).toBeUndefined()
  })

  it('builds the controller once and disposes of it on unmount', async () => {
    const fake = createFakeSessionController()
    nextController = fake
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })
    await flushPromises()

    wrapper.unmount()

    expect(fake.dispose).toHaveBeenCalledOnce()
  })

  it('disposes of a controller that finishes loading after unmount', async () => {
    const fake = createFakeSessionController()
    nextController = fake
    const release = holdControllerLoad()
    const wrapper = mount(App, { props: { savedData: fakeSavedData() }, global: { stubs: STUBS } })
    wrapper.unmount()

    release()
    await flushPromises()

    expect(fake.dispose).toHaveBeenCalledOnce()
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_midi_starting_note]]
describe('App connection sheet flag', () => {
  it("sets the workspace's flag inside the controller-status click, before the sheet loads", async () => {
    const injected = fakeWorkspaceSession()
    const wrapper = mount(App, {
      props: { savedData: fakeSavedData() },
      global: { stubs: STUBS, provide: { [workspaceSessionFactoryKey]: () => injected } },
    })
    expect(injected.connectionSheetOpen.value).toBe(false)

    ;(wrapper.get('button.controller-status').element as HTMLButtonElement).click()

    expect(injected.connectionSheetOpen.value).toBe(true)
    // Let the sheet's lazy chunk finish loading before the test environment goes.
    await loadConnectionSheet()
    wrapper.unmount()
  })
})
