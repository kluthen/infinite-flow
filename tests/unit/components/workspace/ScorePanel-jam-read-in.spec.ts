/**
 * The score panel as a fresh Jam's phrase 1 enters: in Jam mode, once the controller's session
 * staff is set (the read-in, then the session), the session's staff viewport comes in sight,
 * first in DOM order, its frame `staff-ready` with none of session mode's overlays whatever session
 * mode's Idle shows, the generation-failure banner still hidden and session mode's state
 * untouched; Jam's view, laid over it, is told it leaves, then goes out of sight and inert once it
 * reports it left, still mounted; it comes back in sight, no longer leaving, when the session
 * staff goes. Jam's view here is a stand-in with the real one's root and events.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import ScorePanel from '@/components/workspace/ScorePanel.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionStaff } from '@/components/notation/session-staff'
import { NotationError } from '@/notation/notation-error'
import { transportRig } from '../../audio/transport-rig'
import { createFakeSessionController, type FakeSessionController } from './fake-session-controller'
import { fakeGenerationSession, type FakeIdleState } from './fake-generation-session'
import { PHRASE_SCORE_STUB } from './test-workspace'
import { provideSaveSettings } from './recording-save-settings'

/** Jam's view's stand-in: its root is a `staff-viewport`, it is told it leaves and says it left. */
const JamViewStub = defineComponent({
  name: 'JamViewStub',
  props: { leaving: { type: Boolean, default: false } },
  emits: ['left', 'staff-state'],
  setup(props) {
    return () => h('div', { class: 'staff-viewport', 'data-leaving': String(props.leaving) })
  },
})

/** Session mode's Idle under the Jam: a failed generation, a no-room notice, a notation error. */
function troubledIdle(): Partial<FakeIdleState> {
  return {
    generationError: new Error('boom'),
    roomNotice: 'no_room',
    notationError: new NotationError('notation_engraving_failed', 'failed', {}),
  }
}

/** Intent: mount the panel in Jam mode over session mode's Idle `idle` and the controller `fake`. */
function mountJamPanel(fake: FakeSessionController, idle: Partial<FakeIdleState> = troubledIdle()) {
  const generation = fakeGenerationSession(idle)
  const wrapper = mount(ScorePanel, {
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
      jamView: JamViewStub,
    },
    global: { stubs: { PhraseScore: PHRASE_SCORE_STUB }, provide: provideSaveSettings() },
    attachTo: document.body,
  })
  return { wrapper, state: generation.state }
}

/** Phrase 1 in the top system of the held one-system layout. */
const PHRASE_ONE_STAFF: SessionStaff = {
  layout: 'one-system',
  top: null,
  bottom: null,
  playhead: null,
}

/** Intent: the session's staff viewport: the first in DOM order. */
function sessionViewport(wrapper: ReturnType<typeof mountJamPanel>['wrapper']) {
  return wrapper.findAll('.staff-viewport')[0]!
}

// @test-link [[module_session_rolling_display]]
describe("ScorePanel as a fresh Jam's phrase 1 enters", () => {
  // @test-link [[module_session_rolling_display]]
  it("keeps the session's viewport out of sight in Jam mode before phrase 1", () => {
    const { wrapper } = mountJamPanel(createFakeSessionController({ phase: 'count-in' }))

    const viewport = sessionViewport(wrapper)
    expect(viewport.find('.phrase-score-stub').exists()).toBe(true)
    expect(viewport.classes()).toContain('is-out-of-sight')
    expect(viewport.attributes('inert')).toBeDefined()
    expect(wrapper.getComponent(JamViewStub).props('leaving')).toBe(false)
    wrapper.unmount()
  })

  // @test-link [[module_session_rolling_display]]
  it("brings the session's viewport in sight, ready, with none of session mode's overlays", async () => {
    const fake = createFakeSessionController({ phase: 'count-in' })
    const { wrapper, state } = mountJamPanel(fake)
    const before = { ...state }

    fake.state.sessionStaff = PHRASE_ONE_STAFF
    await flushPromises()

    const viewport = sessionViewport(wrapper)
    expect(viewport.find('.phrase-score-stub').exists()).toBe(true)
    expect(viewport.classes()).not.toContain('is-out-of-sight')
    expect(viewport.attributes('inert')).toBeUndefined()
    expect(viewport.get('.staff-frame').classes()).toEqual(['staff-frame', 'staff-ready'])
    expect(viewport.find('.staff-empty-copy').exists()).toBe(false)
    expect(viewport.find('.room-notice').exists()).toBe(false)
    expect(viewport.find('.inline-alert').exists()).toBe(false)
    expect(wrapper.get('.score-panel > .inline-alert').attributes('hidden')).toBeDefined()
    expect(wrapper.getComponent({ name: 'PhraseScore' }).props('session')).toEqual(PHRASE_ONE_STAFF)
    expect({ ...state }).toEqual(before)
    wrapper.unmount()
  })

  // @test-link [[module_session_rolling_display]]
  it("lays Jam's view over it while it leaves, then puts it out of sight once it has left", async () => {
    const fake = createFakeSessionController({ phase: 'count-in' })
    const { wrapper } = mountJamPanel(fake)
    const jam = wrapper.getComponent(JamViewStub)

    fake.state.sessionStaff = PHRASE_ONE_STAFF
    await flushPromises()
    expect(jam.props('leaving')).toBe(true)
    expect(jam.classes()).not.toContain('is-out-of-sight')
    const style = (jam.element as HTMLElement).style
    expect([style.position, style.inset]).toEqual(['absolute', '0px'])
    const container = jam.element.parentElement as HTMLElement
    expect(container.style.position).toBe('relative')
    expect(container.firstElementChild).toBe(sessionViewport(wrapper).element)

    jam.vm.$emit('left')
    await flushPromises()
    expect(jam.classes()).toContain('is-out-of-sight')
    expect(jam.attributes('inert')).toBeDefined()
    expect(wrapper.getComponent(JamViewStub).vm).toBe(jam.vm)
    wrapper.unmount()
  })

  // @test-link [[module_session_rolling_display]]
  it("brings Jam's view back in sight, no longer leaving, when the session staff goes", async () => {
    const fake = createFakeSessionController({ phase: 'count-in' })
    const { wrapper } = mountJamPanel(fake)
    const jam = wrapper.getComponent(JamViewStub)
    fake.state.sessionStaff = PHRASE_ONE_STAFF
    await flushPromises()
    jam.vm.$emit('left')
    await flushPromises()

    fake.state.phase = 'idle'
    fake.state.sessionStaff = null
    await flushPromises()

    expect(jam.props('leaving')).toBe(false)
    expect(jam.classes()).not.toContain('is-out-of-sight')
    expect(jam.attributes('inert')).toBeUndefined()
    expect((jam.element as HTMLElement).style.position).toBe('')
    expect(sessionViewport(wrapper).classes()).toContain('is-out-of-sight')
    expect(sessionViewport(wrapper).find('.room-notice').exists()).toBe(true)
    wrapper.unmount()
  })
})
