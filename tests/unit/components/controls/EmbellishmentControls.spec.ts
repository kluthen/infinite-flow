import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import EmbellishmentControls from '@/components/controls/EmbellishmentControls.vue'
import {
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'

/** Every figure at `level`. */
function allAt(level: FigureLevel): FigureLevels {
  return Object.fromEntries(FIGURE_IDS.map((figure) => [figure, level])) as FigureLevels
}

function mountGroup(figureLevels: FigureLevels = NEUTRAL_FIGURE_LEVELS, readonly = false) {
  return mount(EmbellishmentControls, { props: { figureLevels, readonly } })
}

/** The radiogroup of the figure labelled `label`. */
function group(wrapper: VueWrapper, label: string) {
  const found = wrapper
    .findAll('[role="radiogroup"]')
    .find((candidate) => candidate.attributes('aria-label') === label)
  if (found === undefined) throw new Error(`no radiogroup ${label}`)
  return found
}

/** The label of each radiogroup's checked segment, by its group's label. */
function checkedLabels(wrapper: VueWrapper): Record<string, string | undefined> {
  return Object.fromEntries(
    wrapper
      .findAll('[role="radiogroup"]')
      .map((radiogroup) => [
        radiogroup.attributes('aria-label'),
        radiogroup.find('[role="radio"][aria-checked="true"]').text(),
      ]),
  )
}

const LABELS = [
  'Passing tone',
  'Accented passing tone',
  'Neighbor tone',
  'Appoggiatura',
  'Diatonic enclosure',
  'Chromatic approach',
  'Chromatic enclosure',
] as const

describe('EmbellishmentControls', () => {
  // @test-link [[req_embellishment_figure_levels]]
  it('renders the Embellishments heading, its intro and the seven figure fields in order', () => {
    const wrapper = mountGroup()
    const section = wrapper.find('section.control-group.control-group-figures')
    expect(section.exists()).toBe(true)
    expect(section.find('h3').text()).toBe('Embellishments')
    expect(section.find('.control-group-intro').text()).toBe(
      'How often the app decorates the melody with each figure. A preference, never a promise: the rhythm decides where a figure fits.',
    )
    expect(section.findAll('.field-group')).toHaveLength(7)
    expect(section.findAll('.field-label').map((label) => label.text())).toEqual([...LABELS])
  })

  // @test-link [[req_embellishment_figure_levels]]
  it('names each figure note from its radiogroup with aria-describedby', () => {
    const wrapper = mountGroup()
    for (const field of wrapper.findAll('.field-group')) {
      const notes = field.findAll('.field-note')
      expect(notes).toHaveLength(1)
      const describedBy = field.find('[role="radiogroup"]').attributes('aria-describedby')
      expect(describedBy).toBe(notes[0]!.attributes('id'))
    }
    expect(group(wrapper, 'Chromatic approach').attributes('aria-describedby')).toBeDefined()
  })

  // @test-link [[req_embellishment_figure_levels]]
  it("checks the levels it is given: Neutral's on a first visit", () => {
    expect(checkedLabels(mountGroup())).toEqual({
      'Passing tone': 'Rarely',
      'Accented passing tone': 'Rarely',
      'Neighbor tone': 'Rarely',
      Appoggiatura: 'Off',
      'Diatonic enclosure': 'Off',
      'Chromatic approach': 'Off',
      'Chromatic enclosure': 'Off',
    })
  })

  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('emits set-figure-level with the figure and the level of the segment chosen', async () => {
    const wrapper = mountGroup()
    await group(wrapper, 'Chromatic approach').findAll('[role="radio"]')[2]!.trigger('click')
    await group(wrapper, 'Passing tone').findAll('[role="radio"]')[3]!.trigger('click')
    expect(wrapper.emitted('set-figure-level')).toEqual([
      [{ figure: 'chromaticApproach', level: 'favored' }],
      [{ figure: 'passingTone', level: 'stronglyFavored' }],
    ])
  })

  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('keeps every segment selectable with every figure Off, and in any other combination', async () => {
    const mixed: FigureLevels = {
      passingTone: 'off',
      accentedPassingTone: 'stronglyFavored',
      neighborTone: 'off',
      appoggiatura: 'favored',
      diatonicEnclosure: 'asToday',
      chromaticApproach: 'off',
      chromaticEnclosure: 'stronglyFavored',
    }
    for (const levels of [allAt('off'), mixed, allAt('stronglyFavored')]) {
      const wrapper = mountGroup(levels)
      expect(wrapper.findAll('[role="radio"][disabled]')).toHaveLength(0)
      expect(wrapper.findAll('.field-note')).toHaveLength(7)
      for (const label of LABELS) {
        const segments = group(wrapper, label).findAll('[role="radio"]')
        expect(segments.map((segment) => segment.text())).toEqual([
          'Off',
          'Rarely',
          'Often',
          'Very often',
        ])
        for (const segment of segments) await segment.trigger('click')
      }
      const emitted = wrapper.emitted('set-figure-level') ?? []
      const figures = FIGURE_IDS.flatMap((figure) =>
        FIGURE_LEVEL_IDS.map((level) => [{ figure, level }]),
      )
      // Every segment emits its level, as every other control's segments do; the session decides.
      expect(emitted).toEqual(figures)
    }
  })

  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('is read-only when told so: every field marked, every radiogroup read-only, nothing emitted', async () => {
    const wrapper = mountGroup(NEUTRAL_FIGURE_LEVELS, true)
    const fields = wrapper.findAll('.field-group')
    expect(fields.every((field) => field.classes('is-readonly'))).toBe(true)
    const groups = wrapper.findAll('[role="radiogroup"]')
    expect(groups).toHaveLength(7)
    expect(groups.every((radiogroup) => radiogroup.attributes('aria-readonly') === 'true')).toBe(
      true,
    )
    await group(wrapper, 'Appoggiatura').findAll('[role="radio"]')[3]!.trigger('click')
    expect(wrapper.emitted('set-figure-level')).toBeUndefined()
  })

  // @test-link [[rule_vary_settings_figure_step]]
  it('shows a level the session changes in place, the other six as they were', async () => {
    const wrapper = mountGroup(NEUTRAL_FIGURE_LEVELS, true)
    const fieldsBefore = wrapper.findAll('.field-group').map((field) => field.element)
    await wrapper.setProps({
      figureLevels: { ...NEUTRAL_FIGURE_LEVELS, accentedPassingTone: 'favored' },
    })
    expect(checkedLabels(wrapper)).toEqual({
      'Passing tone': 'Rarely',
      'Accented passing tone': 'Often',
      'Neighbor tone': 'Rarely',
      Appoggiatura: 'Off',
      'Diatonic enclosure': 'Off',
      'Chromatic approach': 'Off',
      'Chromatic enclosure': 'Off',
    })
    // The same fields, re-rendered in place: nothing added, removed or reordered.
    expect(wrapper.findAll('.field-group').map((field) => field.element)).toEqual(fieldsBefore)
  })
})
