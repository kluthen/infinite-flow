/**
 * The cue row in Jam mode: Jam's Idle cue takes the starting-note line's place. The home note
 * shows in the starting-note line's own wording (its before-the-first-click form included);
 * without a connected controller, `jam-needs-controller` shows its wide and narrow labels, beside
 * the review links under their usual conditions, and is never a live region. While a fresh Jam
 * runs, the Jam's phase gives the row `jam-capture` or `jam-writing` below the controller's
 * count-in, and nothing in the count-in, the read-in or from phrase 1 on.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SessionCueRow from '@/components/workspace/SessionCueRow.vue'
import type { JamSessionCue } from '@/components/workspace/jam-session-cue'
import { createMixVolumePopover } from '@/components/workspace/mix-volume-popover'
import { JAM_NEEDS_CONTROLLER_ID, type JamCue } from '@/components/workspace/use-jam-idle-cue'
import JamCapture from '@/jam/JamCapture.vue'
import JamWriting from '@/jam/JamWriting.vue'
import type { JamPhase } from '@/jam/jam-phase'
import { transportRig } from '../../audio/transport-rig'
import {
  COUNT_IN_MUTED,
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

/** Jam's cue row parts as Jam's loaded code gives them. */
const PARTS: JamSessionCue['parts'] = { JamCapture, JamWriting }

/** Intent: mount the cue row while a fresh Jam runs in `phase`, the controller in `fake`. */
function mountJamRow(phase: JamPhase, fake = createFakeSessionController({ phase: 'count-in' })) {
  return mount(SessionCueRow, {
    props: {
      controller: fake.controller,
      audio: transportRig().transport,
      mixPopover: createMixVolumePopover('mix-volume-popover'),
      jamSession: { parts: PARTS, phase },
    },
    global: { provide: provideSaveSettings() },
    attachTo: document.body,
  })
}

/** Intent: which of the row's cues shows: its class, `count-in`, `jam-capture` or `jam-writing`. */
function shownCue(wrapper: ReturnType<typeof mountJamRow>): string[] {
  return ['.count-in', '.jam-capture', '.jam-writing']
    .filter((selector) => wrapper.find(`.session-cue-row > ${selector}`).exists())
    .map((selector) => selector.slice(1))
}

// @test-link [[rule_jam_live_view_never_shows_doodle]]
// @test-link [[rule_count_in_shown_on_screen]]
describe("SessionCueRow in a fresh Jam's capture", () => {
  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it("holds jam-capture during the capture, lit at the doodle's measure", () => {
    const wrapper = mountJamRow({ state: 'capture', beat: 2, doodleMeasure: 2 })

    expect(shownCue(wrapper)).toEqual(['jam-capture'])
    expect(wrapper.get('.jam-capture .is-current').text()).toBe('2')
    expect(wrapper.find('.session-cue-actions').exists()).toBe(true)
  })

  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it('holds jam-writing from a silent barline through the generation measure and its wait', () => {
    const phases: JamPhase[] = [
      { state: 'tentative-generation-measure', beat: 1, doodleMeasures: 2 },
      { state: 'generation-measure', beat: 3 },
      { state: 'extended-wait', beat: 1 },
    ]
    for (const phase of phases) {
      expect(shownCue(mountJamRow(phase))).toEqual(['jam-writing'])
    }
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  it("shows nothing of Jam's in the count-in, the read-in, phrase 1 on or once ended", () => {
    const phases: JamPhase[] = [
      { state: 'count-in', beat: 1 },
      { state: 'read-in', beat: 2 },
      { state: 'phrase-one' },
      { state: 'ended' },
    ]
    for (const phase of phases) {
      expect(shownCue(mountJamRow(phase))).toEqual([])
    }
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  it("lets the controller's count-in outrank Jam's part", () => {
    const fake = createFakeSessionController({ phase: 'count-in', countIn: COUNT_IN_MUTED })
    const wrapper = mountJamRow({ state: 'capture', beat: 1, doodleMeasure: null }, fake)

    expect(shownCue(wrapper)).toEqual(['count-in'])
  })

  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it("shows nothing of Jam's outside a session", () => {
    const fake = createFakeSessionController()
    const wrapper = mountJamRow({ state: 'generation-measure', beat: 1 }, fake)

    expect(shownCue(wrapper)).toEqual([])
  })
})
