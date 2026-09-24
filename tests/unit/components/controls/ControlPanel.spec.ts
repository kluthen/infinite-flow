import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  UNSUPPORTED_RHYTHM_SETTINGS,
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
} from '@/domain/controls/unsupported-rhythm-settings'

function mountPanel(
  controls: GenerationControls = DEFAULT_GENERATION_CONTROLS,
  profileSelection: ProfileSelection = DEFAULT_PROFILE_SELECTION,
  readonly = false,
) {
  return mount(ControlPanel, { props: { controls, profileSelection, readonly } })
}

describe('ControlPanel', () => {
  it('renders the four control groups with their handoff headings', () => {
    const wrapper = mountPanel()
    const headings = wrapper.findAll('.control-group h3').map((h) => h.text())
    expect(headings).toEqual(['Foundation', 'Rhythm', 'Melodic shape', 'Character'])
  })

  // @test-link [[module_generation_control_catalog]]
  it('renders every field label the handoff defines', () => {
    const wrapper = mountPanel()
    const labels = wrapper.findAll('.field-label').map((l) => l.text())
    expect(labels).toEqual([
      'Tempo',
      'Tonal center',
      'Collection',
      'Instrument profile',
      'Musical profile preset',
      'Harmonic motion',
      'Tension',
      'Note density',
      'Syncopation',
      'Silence density',
      'Contour',
      'Register',
      'Leapiness',
      'Arpeggio chaos',
    ])
  })

  it('shows the active profile range summary', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.profile-range-summary').text()).toBe(
      'Active range 46-70. Whole-phrase windows: Low 46-58, Middle 52-64, High 58-70.',
    )
  })

  it('emits a typed set-control event for a non-preset field change', async () => {
    const wrapper = mountPanel()
    const tensionGroup = wrapper
      .findAll('[role="radiogroup"]')
      .find((group) => group.attributes('aria-label') === 'Tension')!
    await tensionGroup.findAll('[role="radio"]')[2]!.trigger('click')
    expect(wrapper.emitted('set-control')).toEqual([[{ key: 'tension', value: 'Build' }]])
  })

  it('emits select-instrument-profile for the instrument profile group', async () => {
    const wrapper = mountPanel()
    const group = wrapper
      .findAll('[role="radiogroup"]')
      .find((g) => g.attributes('aria-label') === 'Instrument profile')!
    await group.findAll('[role="radio"]')[0]!.trigger('click')
    expect(wrapper.emitted('select-instrument-profile')).toEqual([['c-keyboard']])
  })

  // @test-link [[rule_selectable_generative_profiles]]
  it('emits select-musical-profile for the preset group', async () => {
    const wrapper = mountPanel()
    const group = wrapper
      .findAll('[role="radiogroup"]')
      .find((g) => g.attributes('aria-label') === 'Musical profile preset')!
    await group.findAll('[role="radio"]')[1]!.trigger('click')
    expect(wrapper.emitted('select-musical-profile')).toEqual([['Jazz']])
  })

  // @test-link [[rule_profile_presets_apply_defined_controls]]
  it('shows the applied-preset status text by default', () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.preset-status').text()).toBe(
      'Neutral preset applied. All six preset-controlled values were replaced.',
    )
    expect(wrapper.get('.preset-status').classes()).not.toContain('is-custom')
  })

  it('shows the retained-grammar custom status text and clears the preset selection', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, {
      musicalProfile: 'Jazz',
      isCustom: true,
    })
    expect(wrapper.get('.preset-status').text()).toBe(
      'Custom configuration - Jazz grammar retained. Choosing Neutral or Jazz replaces all six preset-controlled values.',
    )
    expect(wrapper.get('.preset-status').classes()).toContain('is-custom')
    const presetGroup = wrapper
      .findAll('[role="radiogroup"]')
      .find((g) => g.attributes('aria-label') === 'Musical profile preset')!
    expect(
      presetGroup.findAll('[role="radio"]').every((r) => r.attributes('aria-checked') === 'false'),
    ).toBe(true)
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  it.each(UNSUPPORTED_RHYTHM_SETTINGS)(
    'shows the unsupported-rhythm message and live region for %j',
    (setting) => {
      const controls: GenerationControls = { ...DEFAULT_GENERATION_CONTROLS, ...setting }
      const wrapper = mountPanel(controls)
      const alert = wrapper.get('.inline-alert.alert-notice')
      expect(alert.text()).toContain(UNSUPPORTED_RHYTHM_SETTING_MESSAGE)
      expect(alert.attributes('role')).toBe('status')
      expect(alert.attributes('aria-live')).toBe('polite')
      expect(alert.text()).toContain('Suggested change:')
    },
  )

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  it('hides the unsupported-rhythm message for a supported combination', () => {
    const wrapper = mountPanel()
    const alert = wrapper.get('.inline-alert.alert-notice')
    expect(alert.isVisible()).toBe(false)
  })

  // @test-link [[rule_unsupported_rhythm_settings_block_generation]]
  it('never emits set-control from the unsupported-rhythm suggestion text alone', () => {
    const setting = UNSUPPORTED_RHYTHM_SETTINGS[0]!
    const controls: GenerationControls = { ...DEFAULT_GENERATION_CONTROLS, ...setting }
    const wrapper = mountPanel(controls)
    expect(wrapper.emitted('set-control')).toBeUndefined()
  })

  it('propagates readonly to every control group', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, DEFAULT_PROFILE_SELECTION, true)
    const groups = wrapper.findAll('[role="radiogroup"]')
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group.attributes('aria-readonly')).toBe('true')
    }
    expect(wrapper.get('[role="spinbutton"]').attributes('aria-readonly')).toBe('true')
    const fieldGroups = wrapper.findAll('.field-group')
    expect(fieldGroups.length).toBeGreaterThan(0)
    for (const fieldGroup of fieldGroups) {
      expect(fieldGroup.classes()).toContain('is-readonly')
    }
  })
})
