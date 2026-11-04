/**
 * Jam's "From your doodle" list (`doodle-readings`): seven lines in the handoff's order, each named
 * as session mode's control with its value in that control's option words; "(default)" for what
 * the doodle left unsaid; the rhythmic variety's line by ux D355 (raised: "(to work with the other
 * rhythm values)", whether the doodle's value or the default was raised; else a default reads
 * "(default)"; else the value alone); a Sixteenth below the tablet-landscape width reads "Eighth
 * notes (Sixteenth on larger screens)" (ux D448); and the note in its place while no doodle is
 * kept.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { DoodleReadings as Readings } from '@/jam/doodle-controls'
import DoodleReadings from '@/jam/DoodleReadings.vue'

/** A doodle's readings: every value shown by the doodle, overridable per line. */
function readings(overrides: Partial<Readings> = {}): Readings {
  return {
    noteDensity: { value: 'Eighth', source: 'doodle' },
    rhythmicVariety: { value: 'Slightly varied', source: 'doodle', raised: false },
    syncopation: { value: 'Occasional offbeats', source: 'doodle' },
    silenceDensity: { value: 'Conversational', source: 'doodle' },
    contour: { value: 'Arch', source: 'doodle' },
    leapiness: { value: 'Leaping', source: 'doodle' },
    register: { value: 'Middle', source: 'doodle', window: null },
    ...overrides,
  }
}

/** Intent: mount the list with these readings at a wide window unless told narrow. */
function mountReadings(shown: Readings | null, belowTabletLandscape = false) {
  return mount(DoodleReadings, { props: { readings: shown, belowTabletLandscape } })
}

/** Intent: each line as "name: value", in the order shown. */
function lines(wrapper: ReturnType<typeof mountReadings>): string[] {
  return wrapper
    .findAll('.doodle-readings > div')
    .map((row) => `${row.get('dt').text()}: ${row.get('dd').text()}`)
}

/** Intent: the rhythmic variety line's value. */
function varietyLine(wrapper: ReturnType<typeof mountReadings>): string {
  const row = wrapper
    .findAll('.doodle-readings > div')
    .find((each) => each.get('dt').text() === 'Rhythmic variety')
  if (row === undefined) throw new Error('no Rhythmic variety line')
  return row.get('dd').text()
}

// @test-link [[rule_doodle_sets_jam_controls]]
describe('DoodleReadings', () => {
  // @test-link [[rule_doodle_sets_jam_controls]]
  it("shows the seven lines in order, in the controls' option words", () => {
    expect(lines(mountReadings(readings()))).toEqual([
      'Note density: Eighth notes',
      'Rhythmic variety: Slightly varied',
      'Syncopation: Occasional offbeats',
      'Silence density: Conversational space',
      'Contour: Arch',
      'Leapiness: Leaping',
      'Register: Middle',
    ])
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('marks what the doodle left unsaid "(default)", the mark muted in its span', () => {
    const wrapper = mountReadings(
      readings({
        syncopation: { value: 'Straight', source: 'default' },
        contour: { value: 'Wandering', source: 'default' },
      }),
    )
    expect(lines(wrapper)).toContain('Syncopation: Straight (default)')
    expect(lines(wrapper)).toContain('Contour: Wandering (default)')
    expect(wrapper.findAll('.doodle-readings dd span').map((span) => span.text())).toEqual([
      '(default)',
      '(default)',
    ])
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('reads a doodle variety the step raised "(to work with the other rhythm values)"', () => {
    const wrapper = mountReadings(
      readings({ rhythmicVariety: { value: 'Heavily varied', source: 'doodle', raised: true } }),
    )
    expect(varietyLine(wrapper)).toBe('Heavily varied (to work with the other rhythm values)')
  })

  // @test-link [[rule_doodle_controls_always_supported]]
  it('reads a default the step raised "(to work with the other rhythm values)", never "(default)"', () => {
    const wrapper = mountReadings(
      readings({ rhythmicVariety: { value: 'Slightly varied', source: 'default', raised: true } }),
    )
    expect(varietyLine(wrapper)).toBe('Slightly varied (to work with the other rhythm values)')
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('reads an unraised default variety "(default)"', () => {
    const wrapper = mountReadings(
      readings({ rhythmicVariety: { value: 'Strict', source: 'default', raised: false } }),
    )
    expect(varietyLine(wrapper)).toBe('Strict (default)')
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('reads an unraised doodle variety as the value alone', () => {
    const wrapper = mountReadings(
      readings({ rhythmicVariety: { value: 'Strict', source: 'doodle', raised: false } }),
    )
    expect(varietyLine(wrapper)).toBe('Strict')
  })

  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('reads a Sixteenth as Eighth below the tablet-landscape width, Sixteenth from it up', () => {
    const sixteenth = readings({ noteDensity: { value: 'Sixteenth', source: 'doodle' } })
    expect(lines(mountReadings(sixteenth, true))[0]).toBe(
      'Note density: Eighth notes (Sixteenth on larger screens)',
    )
    expect(lines(mountReadings(sixteenth, false))[0]).toBe('Note density: Sixteenth')
    expect(lines(mountReadings(readings(), true))[0]).toBe('Note density: Eighth notes')
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('shows its note in place of the list while no doodle is kept', () => {
    const wrapper = mountReadings(null)
    expect(wrapper.find('.doodle-readings').exists()).toBe(false)
    expect(wrapper.get('p.field-note').text()).toBe("They show here once you've played a doodle.")
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
  })
})
