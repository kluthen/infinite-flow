import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import SessionCueRow from '@/components/workspace/SessionCueRow.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import { transportRig } from '../../audio/transport-rig'
import { createFakeSessionController } from './fake-session-controller'

const STRUGGLING = 'The generator is struggling with these settings.'

/** Intent: mount the cue row over `controller` (null: the controller is still loading). */
function mountRow(controller: SessionController | null) {
  return mount(SessionCueRow, {
    props: {
      controller,
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
    },
    attachTo: document.body,
  })
}

// @test-link [[rule_count_in_shown_on_screen]]
// @test-link [[rule_struggling_generator_notice]]
describe('SessionCueRow', () => {
  it('is always present, empty at Idle, and never a live region', () => {
    const wrapper = mountRow(createFakeSessionController().controller)

    const row = wrapper.get('.session-cue-row')
    expect(row.text()).toBe('')
    expect(row.attributes('role')).toBeUndefined()
    expect(row.attributes('aria-live')).toBeUndefined()
    expect(wrapper.find('.session-cue-actions').exists()).toBe(false)
  })

  it('is present and empty before the controller has loaded', () => {
    const wrapper = mountRow(null)

    expect(wrapper.get('.session-cue-row').text()).toBe('')
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  it('shows the four count-in beats with the current and past ones marked', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountRow(fake.controller)
    fake.state.phase = 'count-in'
    fake.state.countIn = {
      over: false,
      beats: ['past', 'current', 'muted', 'muted'],
      nextChangeAt: 1,
    }
    await nextTick()

    const beats = wrapper.findAll('ol.count-in > li.count-in-beat')
    expect(beats.map((beat) => beat.text())).toEqual(['1', '2', '3', '4'])
    expect(beats.map((beat) => beat.classes())).toEqual([
      ['count-in-beat', 'is-past'],
      ['count-in-beat', 'is-current'],
      ['count-in-beat'],
      ['count-in-beat'],
    ])
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  it('empties once the count-in is over', async () => {
    const fake = createFakeSessionController({
      phase: 'count-in',
      countIn: { over: false, beats: ['past', 'past', 'past', 'current'], nextChangeAt: 2 },
    })
    const wrapper = mountRow(fake.controller)
    fake.state.phase = 'running'
    fake.state.countIn = null
    await nextTick()

    expect(wrapper.find('.count-in').exists()).toBe(false)
    expect(wrapper.find('.session-alert').exists()).toBe(false)
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('shows the struggling notice as a neutral session alert, never error-toned', () => {
    const wrapper = mountRow(
      createFakeSessionController({ phase: 'running', strugglingNotice: true }).controller,
    )

    const notice = wrapper.get('p.inline-alert.alert-notice.session-alert')
    expect(notice.get('span.session-alert-text').text()).toBe(STRUGGLING)
    expect(notice.classes()).not.toContain('alert-error')
    expect(notice.attributes('role')).toBeUndefined()
  })

  // @test-link [[rule_struggling_generator_notice]]
  it('gives the count-in priority over the struggling notice', () => {
    const wrapper = mountRow(
      createFakeSessionController({
        phase: 'count-in',
        countIn: { over: false, beats: ['current', 'muted', 'muted', 'muted'], nextChangeAt: 1 },
        strugglingNotice: true,
      }).controller,
    )

    expect(wrapper.find('.count-in').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(STRUGGLING)
  })

  // @test-link [[rule_stop_ends_session]]
  it('holds the compact Stop and Volume during a session, count-in included', async () => {
    const fake = createFakeSessionController()
    const wrapper = mountRow(fake.controller)
    fake.state.phase = 'count-in'
    await nextTick()

    const actions = wrapper.get('.session-cue-actions')
    const [stop, volume] = actions.findAll('button')
    expect(stop!.text()).toBe('Stop')
    expect(stop!.classes()).toEqual(['btn', 'btn-primary'])
    expect(volume!.text()).toBe('Volume')
    expect(volume!.attributes('aria-controls')).toBe('mix-volume-popover')

    await stop!.trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)

    fake.state.phase = 'running'
    await nextTick()
    expect(wrapper.find('.session-cue-actions').exists()).toBe(true)
    fake.state.phase = 'idle'
    await nextTick()
    expect(wrapper.find('.session-cue-actions').exists()).toBe(false)
  })
})
