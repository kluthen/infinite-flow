/**
 * The score panel's place for the kept doodle's bar (`jam-bar`, the phrase workspace's handoff,
 * The kept doodle's bar): the bar the shell gives it (`jamBar`) is drawn after `score-toolbar`,
 * before the generation-failure banner's place and the cue row, with the props and listeners it
 * comes with; hidden with the staff area, still mounted, while the review mode shows; absent with
 * none given.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { JamBarView } from '@/components/workspace/use-jam-bar'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { transportRig } from '../../audio/transport-rig'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { fakeGenerationSession } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'
import { KEPT_DOODLE } from './reviewed-jam-part-fixture'

/** The bar's stand-in: its root, and a button that asks for a new doodle. */
const JamBarStub = defineComponent({
  name: 'JamBarStub',
  props: { held: { type: Boolean, default: false } },
  emits: ['new-doodle', 'use', 'keep'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'jam-bar', 'data-held': String(props.held) }, [
        h('button', { type: 'button', onClick: () => emit('new-doodle') }, 'New doodle'),
      ])
  },
})

/** Intent: the bar as the shell gives it, its listeners spied on. */
function barView(): JamBarView {
  return {
    component: JamBarStub,
    props: {
      doodle: KEPT_DOODLE.quantized,
      jam: { tonalCenter: 'C', collection: 'Major' },
      instrument: C_KEYBOARD_PROFILE,
      declined: false,
      loading: false,
      held: true,
    },
    listeners: { 'new-doodle': vi.fn(), use: vi.fn(), keep: vi.fn() },
  }
}

/** Intent: mount the panel with the bar `jamBar`, over `fake`'s controller. */
function mountPanel(
  jamBar: JamBarView | null,
  fake: FakeSessionController = createFakeSessionController(),
) {
  const generation = fakeGenerationSession({ generationError: new Error('boom') })
  return mount(ScorePanel, {
    props: {
      session: generation.session,
      pendingPhrase: null,
      handleEngraved: () => {},
      handleNotationError: () => {},
      handleSessionStaffFailed: () => {},
      handleLayoutInputs: () => {},
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      controller: fake.controller,
      matchesPhoneLayout: () => false,
      jamBar,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
  })
}

// @test-link [[module_kept_doodle]]
describe("ScorePanel and the kept doodle's bar", () => {
  it('draws it after score-toolbar, before the banner and the cue row, with its props and listeners', async () => {
    const view = barView()
    const wrapper = mountPanel(view)

    const order = Array.from(wrapper.get('.score-panel').element.children).map(
      (child) => child.classList[0],
    )
    expect(order.slice(0, 4)).toEqual([
      'score-toolbar',
      'jam-bar',
      'inline-alert',
      'session-cue-row',
    ])
    expect(wrapper.get('.jam-bar').attributes('data-held')).toBe('true')
    expect(wrapper.get('.jam-bar').attributes('hidden')).toBeUndefined()

    await wrapper.get('.jam-bar button').trigger('click')
    expect(view.listeners['new-doodle']).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('hides it with the staff area while the review mode shows, still mounted', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountPanel(barView(), fake)

    fake.state.listShowing = true
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.jam-bar').attributes('hidden')).toBeDefined()
    wrapper.unmount()
  })

  it('draws none with no bar given', () => {
    const wrapper = mountPanel(null)

    expect(wrapper.find('.jam-bar').exists()).toBe(false)
    wrapper.unmount()
  })
})
