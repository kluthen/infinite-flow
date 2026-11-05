/**
 * The header's phrase action keeps focus through its Loading (ux D474): it keeps native `disabled`
 * and no focus moves while the Loading lasts; at its end focus returns to the phrase action if it
 * is still there or has dropped to the page, else goes to the session action, else to
 * `controller-status`; focus the player moved during the Loading is never taken back. A session
 * started by the starting note while the phrase action has focus moves focus to `Stop`.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick, shallowReactive } from 'vue'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import type {
  KeptDoodlePhraseResult,
  KeptDoodlePhraseView,
} from '@/components/workspace/use-kept-doodle-phrase'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'

/** Blocked from `bp-tablet-landscape` up, allowed below it. */
const SIXTEENTH_ONLY: GenerationControls = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
}

const NARROW = { belowTabletLandscape: true, sessionSteppedDown: false } as const
const WIDE = { belowTabletLandscape: false, sessionSteppedDown: false } as const

/** Intent: mount the header at session mode's Ready, its controller able to start. */
function mountReady(overrides: Parameters<typeof fakeGenerationSession>[0] = {}) {
  const session = fakeGenerationSession({ ...readyState(), ...overrides })
  const fake = createFakeSessionController({ canStart: true })
  const wrapper = mount(WorkspaceHeader, {
    props: {
      session: session.session,
      controller: fake.controller,
      controllerStatus: { kind: 'connect' },
    },
    attachTo: document.body,
  })
  return { wrapper, state: session.state, fake }
}

type Wrapper = ReturnType<typeof mountReady>['wrapper']

/** Intent: the phrase action, the header's first action slot. */
function phraseAction(wrapper: Wrapper): HTMLButtonElement {
  return wrapper.get('.header-actions > button:not(.session-action)').element as HTMLButtonElement
}

/** Intent: the session action, the header's second action slot. */
function sessionAction(wrapper: Wrapper): HTMLButtonElement {
  return wrapper.get('.header-actions > button.session-action').element as HTMLButtonElement
}

/** Intent: the header's `controller-status` button. */
function controllerStatus(wrapper: Wrapper): HTMLButtonElement {
  return wrapper.get('.context-group > button.controller-status').element as HTMLButtonElement
}

/** Intent: let a state change be drawn and any focus move asked for after it run. */
async function settle(): Promise<void> {
  await nextTick()
  await nextTick()
}

/**
 * Intent: a browser that drops focus from a button as it becomes disabled, as Chromium does: focus
 * falls to the page. jsdom keeps focus on a disabled button and ignores its `blur()`, so the button
 * is blurred enabled for a moment.
 */
function dropFocusIfDisabled(button: HTMLButtonElement): void {
  if (!button.disabled || document.activeElement !== button) return
  button.disabled = false
  button.blur()
  button.disabled = true
  expect(document.activeElement).toBe(document.body)
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[user_story_controlled_phrase_generation]]
describe("WorkspaceHeader's phrase action focus through its Loading", () => {
  // @test-link [[user_story_controlled_phrase_generation]]
  it.each([
    ['still on it', false],
    ['dropped to the page', true],
  ])('returns focus to the phrase action when its Loading ends, focus %s', async (_, dropped) => {
    const { wrapper, state, fake } = mountReady()
    phraseAction(wrapper).focus()

    state.operation = 'generating'
    fake.state.canStart = false
    await settle()
    expect(phraseAction(wrapper).disabled).toBe(true)
    if (dropped) dropFocusIfDisabled(phraseAction(wrapper))
    else expect(document.activeElement).toBe(phraseAction(wrapper))

    state.operation = 'idle'
    fake.state.canStart = true
    await settle()
    expect(phraseAction(wrapper).disabled).toBe(false)
    expect(document.activeElement).toBe(phraseAction(wrapper))
  })

  // @test-link [[rule_too_dense_notice_retry_rounds]]
  it('returns focus to the phrase action after a round of retries started by a viewport change', async () => {
    const { wrapper, state, fake } = mountReady()
    phraseAction(wrapper).focus()

    state.roomNotice = 'notes_too_wide'
    state.retriesRunning = true
    state.operation = 'generating'
    fake.state.canStart = false
    await settle()
    dropFocusIfDisabled(phraseAction(wrapper))

    state.roomNotice = null
    state.retriesRunning = false
    state.operation = 'idle'
    fake.state.canStart = true
    await settle()
    expect(document.activeElement).toBe(phraseAction(wrapper))
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  it.each([
    ['the session action when it is enabled', true, sessionAction],
    ['controller-status when the session action is disabled', false, controllerStatus],
  ])(
    'sends focus to %s when the Loading ends with the phrase action disabled',
    async (_, canStart, target) => {
      const { wrapper, state, fake } = mountReady({
        controls: SIXTEENTH_ONLY,
        noteDensityContext: NARROW,
      })
      phraseAction(wrapper).focus()

      state.operation = 'generating'
      fake.state.canStart = false
      await settle()
      dropFocusIfDisabled(phraseAction(wrapper))

      state.noteDensityContext = WIDE
      state.operation = 'idle'
      fake.state.canStart = canStart
      await settle()
      expect(phraseAction(wrapper).disabled).toBe(true)
      expect(document.activeElement).toBe(target(wrapper))
    },
  )

  // @test-link [[user_story_controlled_phrase_generation]]
  it('never takes back focus the player moved elsewhere during the Loading', async () => {
    const { wrapper, state, fake } = mountReady()
    phraseAction(wrapper).focus()

    state.operation = 'generating'
    fake.state.canStart = false
    await settle()
    controllerStatus(wrapper).focus()

    state.operation = 'idle'
    fake.state.canStart = true
    await settle()
    expect(document.activeElement).toBe(controllerStatus(wrapper))
  })

  // @test-link [[rule_session_start_conditions]]
  it('moves focus to Stop when the starting note starts a session with the phrase action focused', async () => {
    const { wrapper, fake } = mountReady()
    phraseAction(wrapper).focus()

    fake.start()
    await settle()
    expect(sessionAction(wrapper).textContent?.trim()).toBe('Stop')
    expect(phraseAction(wrapper).disabled).toBe(true)
    expect(document.activeElement).toBe(sessionAction(wrapper))
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("returns focus to the phrase action when Jam's phrase 1 from the kept doodle is written", async () => {
    const jamState = shallowReactive<IdlePhraseState<KeptDoodlePhraseResult>>({
      latestIntent: null,
      result: {} as KeptDoodlePhraseResult,
      operation: 'idle',
      generationError: null,
      notationError: null,
      resultEngraved: true,
      roomNotice: null,
      retriesRunning: false,
      roomNoticeAnnouncements: 0,
    })
    const jamPhrase: KeptDoodlePhraseView = {
      kept: true,
      state: jamState,
      phrase: null,
      staff: {
        handleEngraved: () => {},
        handleNotationError: () => {},
        handleLayoutInputs: () => {},
      },
      actions: {
        regenerate: async () => true,
        retryGeneration: async () => true,
        retryNotation: async () => true,
      },
    }
    const { wrapper } = mountReady()
    await wrapper.setProps({
      workspaceMode: { mode: 'jam', checked: 'jam', opening: false, readonly: false },
      jamStaffState: 'shown',
      jamCanStart: true,
      jamPhrase,
    })
    phraseAction(wrapper).focus()

    jamState.operation = 'generating'
    await settle()
    expect(phraseAction(wrapper).disabled).toBe(true)
    dropFocusIfDisabled(phraseAction(wrapper))

    jamState.operation = 'idle'
    await settle()
    expect(document.activeElement).toBe(phraseAction(wrapper))
  })
})
