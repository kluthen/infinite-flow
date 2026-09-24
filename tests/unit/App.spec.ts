import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { GenerationSession } from '../../src/composables/use-generation-session'
import type { WorkspaceSessionResult } from '../../src/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '../../src/domain/controls/profile-selection'
import type { WrittenPhrase } from '../../src/domain/notation/written-phrase-types'
import type { NotationMode } from '../../src/domain/notation/notation-mode'
import type {
  SessionOperation,
  ThemePreference,
} from '../../src/composables/use-generation-session'

let lastGenerate: ReturnType<typeof vi.fn> | null = null
let lastSetNotationMode: ReturnType<typeof vi.fn> | null = null

/**
 * Intent: a minimal idle-state session double so App.spec.ts never constructs the real
 * `createWorkspaceSession` factory, which would spin up a real browser `Worker` -- unavailable
 * and unwanted in jsdom. `setTheme` genuinely mutates its own reactive presentation state, so a
 * test can assert App.vue's DOM theme-application watcher reacts to a real state change.
 */
function fakeWorkspaceSession() {
  const generate = vi.fn(async () => false)
  const setNotationMode = vi.fn(async () => false)
  lastGenerate = generate
  lastSetNotationMode = setNotationMode
  const state = reactive({
    controls: DEFAULT_GENERATION_CONTROLS,
    profileSelection: DEFAULT_PROFILE_SELECTION,
    presentation: { theme: 'System', notationMode: 'B-flat tenor' } as {
      theme: ThemePreference
      notationMode: NotationMode
    },
    latestIntent: null,
    result: null,
    operation: 'idle' as SessionOperation,
    generationError: null,
    notationError: null,
    failedNotationMode: null,
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
      setNotationMode,
      generate,
      regenerate: async () => false,
      retryGeneration: async () => false,
      retryNotation: async () => false,
      reportNotationFailure: () => false,
      reportNotationRecovered: () => false,
    },
  }
  return {
    session,
    pendingPhrase: ref<WrittenPhrase | null>(null),
    handleEngraved: () => {},
    handleNotationError: () => {},
    dispose: () => {},
  }
}

vi.mock('../../src/components/workspace/create-workspace-session', () => ({
  createWorkspaceSession: fakeWorkspaceSession,
}))

import App from '../../src/App.vue'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('App', () => {
  it('mounts the client shell', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toBe('Infinite Flow')
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('leaves no data-theme override on mount while the preference is System', () => {
    mount(App)

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  // @test-link [[rule_presentation_preference_preserves_phrase]]
  it('applies data-theme on a theme selection without calling generate or setNotationMode', async () => {
    const wrapper = mount(App)

    const themeGroup = wrapper.get('[aria-label="Presentation theme"]')
    await themeGroup.findAll('button')[2]!.trigger('click')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(lastGenerate).not.toHaveBeenCalled()
    expect(lastSetNotationMode).not.toHaveBeenCalled()
  })
})
