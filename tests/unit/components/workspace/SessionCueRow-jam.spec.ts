/**
 * The cue row in Jam mode: Jam's Idle cue takes the starting-note line's place. The home note
 * shows in the starting-note line's own wording (its before-the-first-click form included);
 * without a connected controller, `jam-needs-controller` shows its wide and narrow labels, beside
 * the review links under their usual conditions, and is never a live region.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SessionCueRow from '@/components/workspace/SessionCueRow.vue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import { JAM_NEEDS_CONTROLLER_ID, type JamCue } from '@/components/workspace/use-jam-idle-cue'
import { transportRig } from '../../audio/transport-rig'
import {
  createFakeSessionController,
  fakeReview,
  fakeReviewHistory,
  heldSessionOf,
} from './fake-session-controller'
import { provideSaveSettings } from './recording-save-settings'

/** Intent: mount the cue row at Idle with Jam's Idle cue `jamCue`. */
function mountRow(jamCue: JamCue | null, fake = createFakeSessionController()) {
  return mount(SessionCueRow, {
    props: {
      controller: fake.controller,
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      jamCue,
    },
    global: { provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

// @test-link [[rule_jam_starting_note_is_home_note]]
// @test-link [[rule_jam_needs_controller]]
describe('SessionCueRow in Jam mode', () => {
  // @test-link [[rule_jam_starting_note_is_home_note]]
  it('names the home note in the starting-note line, the note in a strong', () => {
    const wrapper = mountRow({ kind: 'starting-note', label: 'G4', awaitsClick: false })

    const line = wrapper.get('p.start-note-line')
    expect(line.text()).toBe('Play this note to start: G4')
    expect(line.get('strong').text()).toBe('G4')
    expect(wrapper.find('.jam-needs-controller').exists()).toBe(false)
  })

  // @test-link [[rule_jam_starting_note_is_home_note]]
  it("asks for the page's first click first, its clauses dropped on the phone", () => {
    const wrapper = mountRow({ kind: 'starting-note', label: 'B♭3', awaitsClick: true })

    const line = wrapper.get('p.start-note-line')
    expect(line.text().replace(/\s+/g, ' ')).toBe(
      'Click the page once, then play this note to start: B♭3',
    )
    expect(line.findAll('.cue-clause').map((clause) => clause.text())).toEqual([
      'the page',
      'this note',
    ])
  })

  // @test-link [[rule_jam_needs_controller]]
  it('shows jam-needs-controller with its two labels, static, by its id', () => {
    const wrapper = mountRow({ kind: 'needs-controller' })

    const line = wrapper.get('p.jam-needs-controller')
    expect(line.attributes('id')).toBe(JAM_NEEDS_CONTROLLER_ID)
    expect(line.get('.cue-label-wide').text()).toBe(
      'A Jam needs a connected controller. Connect one to start.',
    )
    expect(line.get('.cue-label-narrow').text()).toBe('Connect a controller to start.')
    expect(line.attributes('aria-live')).toBeUndefined()
    expect(line.attributes('role')).toBeUndefined()
    expect(wrapper.find('p.start-note-line').exists()).toBe(false)
  })

  // @test-link [[rule_jam_needs_controller]]
  it('sits beside the review link under its usual conditions', () => {
    const held = heldSessionOf(fakeReview(fakeReviewHistory(), false))
    const fake = createFakeSessionController({ mostRecent: held })
    const wrapper = mountRow({ kind: 'needs-controller' }, fake)

    expect(wrapper.find('p.jam-needs-controller').exists()).toBe(true)
    expect(wrapper.find('button.review-link').exists()).toBe(true)
  })

  it('shows nothing in its place with no Jam cue', () => {
    const wrapper = mountRow(null)

    expect(wrapper.get('.session-cue-row').text()).toBe('')
  })
})
