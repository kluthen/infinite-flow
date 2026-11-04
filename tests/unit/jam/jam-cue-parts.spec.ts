/**
 * The cue row's two parts before a fresh Jam's phrase 1: `jam-capture` lights the doodle's
 * measure now and the ones before it, none before the doodle's first note, under its wide and
 * narrow labels; `jam-writing` is one static line with its wide and narrow labels. Neither is a
 * live region.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { DoodleMeasureCount } from '@/domain/doodle/quantized-doodle'
import JamCapture from '@/jam/JamCapture.vue'
import JamWriting from '@/jam/JamWriting.vue'

/** Intent: each beat item's number and lit state, in order, for the doodle's measure `measure`. */
function beatsAt(measure: DoodleMeasureCount | null) {
  const wrapper = mount(JamCapture, { props: { doodleMeasure: measure } })
  return wrapper.findAll('.jam-capture > ol.count-in > li.count-in-beat').map((beat) => {
    if (beat.classes('is-current')) return `${beat.text()} current`
    return beat.classes('is-past') ? `${beat.text()} past` : beat.text()
  })
}

// @test-link [[module_jam_capture]]
// @test-link [[rule_jam_live_view_never_shows_doodle]]
describe("The Jam's cue row parts", () => {
  // @test-link [[module_jam_capture]]
  it("lights no measure before the doodle's first note", () => {
    expect(beatsAt(null)).toEqual(['1', '2', '3', '4'])
  })

  // @test-link [[module_jam_capture]]
  it("lights the doodle's measure now, the ones before it past, the ones after it unlit", () => {
    expect(beatsAt(1)).toEqual(['1 current', '2', '3', '4'])
    expect(beatsAt(3)).toEqual(['1 past', '2 past', '3 current', '4'])
  })

  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it('labels the capture "Your doodle", "Doodle" on the phone, and announces nothing', () => {
    const wrapper = mount(JamCapture, { props: { doodleMeasure: 2 } })

    const part = wrapper.get('div.jam-capture')
    expect(part.get('.cue-label-wide').text()).toBe('Your doodle')
    expect(part.get('.cue-label-narrow').text()).toBe('Doodle')
    expect(part.find('[aria-live]').exists()).toBe(false)
    expect(part.find('[role]').exists()).toBe(false)
  })

  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it('says the app is writing, "Writing" on the phone, as one static line', () => {
    const wrapper = mount(JamWriting)

    const line = wrapper.get('p.jam-writing')
    expect(line.get('.cue-label-wide').text()).toBe('Writing your first phrase')
    expect(line.get('.cue-label-narrow').text()).toBe('Writing')
    expect(line.attributes('aria-live')).toBeUndefined()
    expect(line.attributes('role')).toBeUndefined()
  })
})
