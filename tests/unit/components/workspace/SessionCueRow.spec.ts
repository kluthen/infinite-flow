import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import SessionCueRow from '@/components/workspace/SessionCueRow.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import type { SessionController } from '@/components/workspace/workspace-session-controller-types'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { StartingNote } from '@/session/starting-note'
import { transportRig } from '../../audio/transport-rig'
import { createFakeSessionController } from './fake-session-controller'

const STRUGGLING = 'The generator is struggling with these settings.'
const BANNER_CLAUSE = ' — plug it back in to keep playing'

/** A starting note: phrase 1's first attack, a concert A♭4 written as B♭4 (a B♭ instrument). */
const STARTING_NOTE: StartingNote = {
  identity: { phraseNumber: 1, measureIndex: 0, eventIndex: 0 },
  concertPitch: makeConcertPitch(68),
  label: 'B♭4',
}

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

// @test-link [[rule_controller_loss_mid_session]]
// @test-link [[rule_controller_reconnection_window]]
describe('SessionCueRow disconnect banner', () => {
  it('reads the whole sentence as one run, its clause and countdown inline spans', () => {
    const wrapper = mountRow(
      createFakeSessionController({ phase: 'running', controllerLost: { secondsLeft: 30 } })
        .controller,
    )

    const banner = wrapper.get('.session-cue-row > p.inline-alert.alert-error.session-alert')
    expect(banner.attributes('role')).toBeUndefined()
    const run = banner.get('span.session-alert-text')
    expect(banner.element.children).toHaveLength(1)
    expect(run.element.textContent).toBe(
      `Controller disconnected${BANNER_CLAUSE}. Session ends in 30 s.`,
    )
    expect(run.get('span.session-alert-clause').element.textContent).toBe(BANNER_CLAUSE)
    expect(run.get('span.session-alert-countdown').element.textContent).toBe('30 s')
  })

  it('reads the shorter wording without its clause, which the stylesheet removes below the breakpoint', () => {
    const wrapper = mountRow(
      createFakeSessionController({ phase: 'running', controllerLost: { secondsLeft: 12 } })
        .controller,
    )

    const run = wrapper.get('.session-alert-text').element.cloneNode(true) as HTMLElement
    run.querySelector('.session-alert-clause')?.remove()
    expect(run.textContent).toBe('Controller disconnected. Session ends in 12 s.')
  })

  it('counts down as the controller does', async () => {
    const fake = createFakeSessionController({
      phase: 'running',
      controllerLost: { secondsLeft: 30 },
    })
    const wrapper = mountRow(fake.controller)

    fake.state.controllerLost = { secondsLeft: 29 }
    await nextTick()

    expect(wrapper.get('.session-alert-countdown').text()).toBe('29 s')
  })

  it('takes the row from a running count-in, which shows again once the device reattaches', async () => {
    const fake = createFakeSessionController({
      phase: 'count-in',
      countIn: { over: false, beats: ['current', 'muted', 'muted', 'muted'], nextChangeAt: 1 },
      controllerLost: { secondsLeft: 30 },
    })
    const wrapper = mountRow(fake.controller)
    expect(wrapper.find('.count-in').exists()).toBe(false)
    expect(wrapper.find('.session-alert.alert-error').exists()).toBe(true)

    fake.state.countIn = {
      over: false,
      beats: ['past', 'current', 'muted', 'muted'],
      nextChangeAt: 2,
    }
    fake.state.controllerLost = null
    await nextTick()

    expect(wrapper.find('.session-alert').exists()).toBe(false)
    expect(wrapper.get('.count-in-beat.is-current').text()).toBe('2')
  })

  it('outranks the struggling notice, which shows again once the device reattaches', async () => {
    const fake = createFakeSessionController({
      phase: 'running',
      strugglingNotice: true,
      controllerLost: { secondsLeft: 5 },
    })
    const wrapper = mountRow(fake.controller)
    expect(wrapper.findAll('.session-alert')).toHaveLength(1)
    expect(wrapper.text()).not.toContain(STRUGGLING)

    fake.state.controllerLost = null
    await nextTick()

    expect(wrapper.get('.session-alert.alert-notice').text()).toBe(STRUGGLING)
  })

  it('keeps the compact Stop and Volume beside the banner', () => {
    const wrapper = mountRow(
      createFakeSessionController({ phase: 'running', controllerLost: { secondsLeft: 30 } })
        .controller,
    )

    expect(wrapper.find('.session-cue-actions').exists()).toBe(true)
  })
})

// @test-link [[rule_starting_note_named]]
// @test-link [[rule_midi_starting_note]]
describe('SessionCueRow starting-note line', () => {
  it('names the starting note, written as on the staff, in a strong', () => {
    const wrapper = mountRow(
      createFakeSessionController({ startingNote: STARTING_NOTE }).controller,
    )

    const line = wrapper.get('.session-cue-row > p.start-note-line')
    expect(line.text()).toBe('Play this note to start: B♭4')
    expect(line.get('strong').text()).toBe('B♭4')
    expect(line.attributes('role')).toBeUndefined()
  })

  it('goes when no note could start a session, leaving the row empty', async () => {
    const fake = createFakeSessionController({ startingNote: STARTING_NOTE })
    const wrapper = mountRow(fake.controller)

    fake.state.startingNote = null
    await nextTick()

    expect(wrapper.get('.session-cue-row').text()).toBe('')
  })

  it('gives way to the count-in and to the struggling notice', async () => {
    const fake = createFakeSessionController({ startingNote: STARTING_NOTE })
    const wrapper = mountRow(fake.controller)

    fake.state.countIn = {
      over: false,
      beats: ['current', 'muted', 'muted', 'muted'],
      nextChangeAt: 1,
    }
    await nextTick()
    expect(wrapper.find('.start-note-line').exists()).toBe(false)

    fake.state.countIn = null
    fake.state.strugglingNotice = true
    await nextTick()
    expect(wrapper.find('.start-note-line').exists()).toBe(false)
    expect(wrapper.find('.session-alert.alert-notice').exists()).toBe(true)
  })
})
