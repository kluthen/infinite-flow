/**
 * The control panel's Embellishments group in the panel: its place among the groups, the figure
 * levels it shows and forwards, and its controls following the panel's readonly state.
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'

import { mountPanel } from './control-panel-mount'

describe('ControlPanel, the Embellishments group', () => {
  // @test-link [[req_embellishment_figure_levels]]
  it('renders the control groups with their handoff headings, Embellishments before "During a session"', () => {
    const wrapper = mountPanel()
    const headings = wrapper.findAll('.control-group h3').map((h) => h.text())
    expect(headings).toEqual([
      'Foundation',
      'Rhythm',
      'Melodic shape',
      'Character',
      'Embellishments',
      'During a session',
    ])
  })

  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('shows the figure levels it is given and forwards a level change as set-figure-level', async () => {
    const wrapper = mountPanel()
    const group = wrapper
      .findAll('[role="radiogroup"]')
      .find((candidate) => candidate.attributes('aria-label') === 'Diatonic enclosure')!
    expect(group.get('[role="radio"][aria-checked="true"]').text()).toBe('Off')
    await group.findAll('[role="radio"]')[3]!.trigger('click')
    expect(wrapper.emitted('set-figure-level')).toEqual([
      [{ figure: 'diatonicEnclosure', level: 'stronglyFavored' }],
    ])
    expect(wrapper.emitted('set-control')).toBeUndefined()
  })

  // @test-link [[rule_readonly_controls_keep_contrast]]
  it('propagates readonly to every control group', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, DEFAULT_PRESET_SELECTION, true)
    const groups = wrapper.findAll('[role="radiogroup"]')
    expect(groups.length).toBeGreaterThan(0)
    expect(wrapper.findAll('.control-group-figures [role="radiogroup"]')).toHaveLength(7)
    for (const group of groups) {
      expect(group.attributes('aria-readonly')).toBe('true')
    }
    expect(wrapper.get('[role="spinbutton"]').attributes('aria-readonly')).toBe('true')
    expect(wrapper.get('select.preset-select').attributes('aria-readonly')).toBe('true')
    const fieldGroups = wrapper.findAll('.field-group')
    expect(fieldGroups.length).toBeGreaterThan(0)
    for (const fieldGroup of fieldGroups) {
      expect(fieldGroup.classes()).toContain('is-readonly')
    }
  })
})
