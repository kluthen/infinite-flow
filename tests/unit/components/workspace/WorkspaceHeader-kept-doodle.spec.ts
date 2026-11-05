/**
 * The header's phrase action in Jam mode with a kept doodle (`jamPhrase`): every row of the action
 * table applies over Jam's phrase 1, as session mode's over its Idle: `Regenerate phrase` at Ready,
 * secondary, writing a new phrase 1 from the doodle; disabled with `is-loading` in Loading;
 * `Retry generation` after every attempt failed and `Retry notation` after a notation error, both
 * primary, each acting on Jam's phrase 1, never session mode's; with no doodle kept, `Generate
 * phrase` disabled, as before.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowReactive } from 'vue'

import WorkspaceHeader from '@/components/workspace/WorkspaceHeader.vue'
import type { WorkspaceModeView } from '@/components/workspace/use-workspace-mode'
import type { IdlePhraseState } from '@/composables/generation-session-types'
import type {
  KeptDoodlePhraseResult,
  KeptDoodlePhraseView,
} from '@/components/workspace/use-kept-doodle-phrase'
import { NotationError } from '@/notation/notation-error'
import { createFakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, readyState } from './fake-generation-session'

const JAM_MODE: WorkspaceModeView = { mode: 'jam', checked: 'jam', opening: false, readonly: false }

/** A phrase 1 shown, as the header reads it: only its presence matters here. */
const SHOWN = {} as KeptDoodlePhraseResult

/** Intent: Jam's phrase 1 at Ready, kept or not, its actions spied on. */
function jamPhrase(kept = true) {
  const state = shallowReactive<IdlePhraseState<KeptDoodlePhraseResult>>({
    latestIntent: null,
    result: SHOWN,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: true,
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
  })
  const actions = {
    regenerate: vi.fn(async () => true),
    retryGeneration: vi.fn(async () => true),
    retryNotation: vi.fn(async () => true),
  }
  const view: KeptDoodlePhraseView = {
    kept,
    state,
    phrase: null,
    staff: {
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleLayoutInputs: () => {},
    },
    actions,
  }
  return { state, actions, view }
}

/** Intent: mount the header in Jam mode over session mode at Ready and Jam's phrase 1. */
function mountHeader(phrase: ReturnType<typeof jamPhrase>) {
  const session = fakeGenerationSession(readyState())
  const wrapper = mount(WorkspaceHeader, {
    props: {
      session: session.session,
      controller: createFakeSessionController({ canStart: true }).controller,
      controllerStatus: { kind: 'connect' },
      workspaceMode: JAM_MODE,
      jamStaffState: 'shown',
      jamCanStart: true,
      jamPhrase: phrase.view,
    },
    attachTo: document.body,
  })
  return { wrapper, session }
}

/** Intent: the phrase action, the header's first action slot. */
function phraseAction(wrapper: ReturnType<typeof mountHeader>['wrapper']) {
  return wrapper.get('.header-actions > button:not(.session-action)')
}

/** Intent: the session action, the header's second action slot. */
function sessionAction(wrapper: ReturnType<typeof mountHeader>['wrapper']) {
  return wrapper.get('.header-actions > button.session-action')
}

afterEach(() => {
  document.body.innerHTML = ''
})

// @test-link [[rule_held_doodle_phrase_one_at_idle]]
describe("WorkspaceHeader's phrase action on Jam's phrase 1 from the kept doodle", () => {
  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('offers Regenerate phrase at Ready, secondary, writing a new phrase 1 from the doodle', async () => {
    const phrase = jamPhrase()
    const { wrapper, session } = mountHeader(phrase)

    expect(phraseAction(wrapper).text()).toBe('Regenerate phrase')
    expect(phraseAction(wrapper).attributes('disabled')).toBeUndefined()
    expect(phraseAction(wrapper).classes()).not.toContain('btn-primary')
    expect(sessionAction(wrapper).text()).toBe('Start Jam')
    expect(sessionAction(wrapper).classes()).toContain('btn-primary')

    await phraseAction(wrapper).trigger('click')
    expect(phrase.actions.regenerate).toHaveBeenCalledOnce()
    expect(session.session.actions.regenerate).not.toHaveBeenCalled()
    expect(session.session.actions.generate).not.toHaveBeenCalled()
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it('is disabled and loading while phrase 1 is written', async () => {
    const phrase = jamPhrase()
    const { wrapper } = mountHeader(phrase)

    phrase.state.operation = 'generating'
    await wrapper.vm.$nextTick()

    expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
    expect(phraseAction(wrapper).classes()).toContain('is-loading')
  })

  // @test-link [[rule_held_doodle_phrase_one_at_idle]]
  it("offers Retry generation, then Retry notation, primary, each on Jam's phrase 1", async () => {
    const phrase = jamPhrase()
    const { wrapper } = mountHeader(phrase)

    phrase.state.result = null
    phrase.state.generationError = new Error('failed')
    await wrapper.vm.$nextTick()
    expect(phraseAction(wrapper).text()).toBe('Retry generation')
    expect(phraseAction(wrapper).classes()).toContain('btn-primary')
    await phraseAction(wrapper).trigger('click')
    expect(phrase.actions.retryGeneration).toHaveBeenCalledOnce()

    phrase.state.generationError = null
    phrase.state.result = SHOWN
    phrase.state.notationError = new NotationError('notation_engraving_failed', 'failed', {})
    await wrapper.vm.$nextTick()
    expect(phraseAction(wrapper).text()).toBe('Retry notation')
    await phraseAction(wrapper).trigger('click')
    expect(phrase.actions.retryNotation).toHaveBeenCalledOnce()
    expect(wrapper.emitted('retry-jam-notation')).toBeUndefined()
  })

  // @test-link [[module_workspace_mode]]
  it('keeps Generate phrase disabled with no doodle kept', () => {
    const { wrapper } = mountHeader(jamPhrase(false))

    expect(phraseAction(wrapper).text()).toBe('Generate phrase')
    expect(phraseAction(wrapper).attributes('disabled')).toBeDefined()
  })
})
