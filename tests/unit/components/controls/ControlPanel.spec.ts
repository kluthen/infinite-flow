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
  return mount(ControlPanel, {
    props: {
      controls,
      profileSelection,
      readonly,
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      risingTempo: false,
      risingTempoAvailable: false,
      lastSessionReachedTempo: null,
      varySettings: false,
      tensionAcrossPhrases: false,
      sessionOptionsReadonly: readonly,
      presetStatusLive: 'polite',
      myInstrument: null,
      instrumentActionsDisabled: false,
    },
  })
}

describe('ControlPanel', () => {
  it('renders the four control groups with their handoff headings', () => {
    const wrapper = mountPanel()
    const headings = wrapper.findAll('.control-group h3').map((h) => h.text())
    expect(headings).toEqual([
      'Foundation',
      'Rhythm',
      'Melodic shape',
      'Character',
      'During a session',
    ])
  })

  // @test-link [[module_generation_control_catalog]]
  it('renders every field label the handoff defines', () => {
    const wrapper = mountPanel()
    const labels = wrapper.findAll('.field-label').map((l) => l.text())
    expect(labels).toEqual([
      'Tempo',
      'Written key',
      'Collection',
      'Instrument profile',
      'Musical profile preset',
      'Harmonic motion',
      'Tension',
      'Note density',
      'Rhythmic variety',
      'Syncopation',
      'Silence density',
      'Contour',
      'Register',
      'Leapiness',
      'Arpeggio chaos',
      'Rising tempo',
      'Tension across phrases',
      'Vary settings',
    ])
  })

  it('shows the control-summary line and recomputes it on a control or profile-selection change', async () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')
    const edited: GenerationControls = { ...DEFAULT_GENERATION_CONTROLS, tension: 'Edge' }
    await wrapper.setProps({
      controls: edited,
      profileSelection: { musicalProfile: 'Neutral', isCustom: true },
    })
    expect(wrapper.get('.control-summary').text()).toBe(
      'C Ionian · Custom (Neutral grammar) · Edge · Shaped',
    )
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
    const inUse = wrapper.get('.preset-status-text:not(.is-reserve)')
    expect(inUse.text()).toBe(
      'Neutral preset applied. All seven preset-controlled values were replaced.',
    )
    expect(inUse.classes()).not.toContain('is-custom')
  })

  it('shows the retained-grammar custom status text and clears the preset selection', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, {
      musicalProfile: 'Jazz',
      isCustom: true,
    })
    const inUse = wrapper.get('.preset-status-text:not(.is-reserve)')
    expect(inUse.text()).toBe(
      'Custom configuration - Jazz grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
    )
    expect(inUse.classes()).toContain('is-custom')
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
  it('keeps the unsupported-rhythm status region mounted, empty, and unstyled for a supported combination', () => {
    const wrapper = mountPanel()
    const rhythmGroup = wrapper
      .findAll('.control-group')
      .find((group) => group.get('h3').text() === 'Rhythm')!
    const status = rhythmGroup.get('[role="status"]')
    expect(status.text()).toBe('')
    expect(status.classes()).not.toContain('inline-alert')
    expect(status.classes()).not.toContain('alert-notice')
    expect(status.attributes('aria-live')).toBe('polite')
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

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('holds both preset status texts in one cell, the other one invisible, emphasis on the custom one', () => {
    const preset = mountPanel()
    const presetReserve = preset.get('.preset-status-text.is-reserve')
    expect(presetReserve.attributes('aria-hidden')).toBe('true')
    expect(presetReserve.text()).toBe(
      'Custom configuration - Neutral grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
    )
    expect(presetReserve.classes()).toContain('is-custom')
    expect(preset.get('.preset-status').classes()).not.toContain('is-custom')

    const custom = mountPanel(DEFAULT_GENERATION_CONTROLS, {
      musicalProfile: 'Jazz',
      isCustom: true,
    })
    const customReserve = custom.get('.preset-status-text.is-reserve')
    expect(customReserve.text()).toBe(
      'Jazz preset applied. All seven preset-controlled values were replaced.',
    )
    expect(customReserve.classes()).not.toContain('is-custom')
    expect(custom.findAll('.preset-status-text')).toHaveLength(2)
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('announces the preset status politely, or not at all when told so', () => {
    expect(mountPanel().get('.preset-status').attributes('aria-live')).toBe('polite')
    const quiet = mount(ControlPanel, {
      props: {
        controls: DEFAULT_GENERATION_CONTROLS,
        profileSelection: DEFAULT_PROFILE_SELECTION,
        readonly: true,
        noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
        risingTempo: false,
        risingTempoAvailable: false,
        lastSessionReachedTempo: null,
        varySettings: false,
        tensionAcrossPhrases: false,
        sessionOptionsReadonly: true,
        presetStatusLive: 'off',
        myInstrument: null,
        instrumentActionsDisabled: false,
      },
    })
    expect(quiet.get('.preset-status').attributes('aria-live')).toBe('off')
    expect(quiet.get('.preset-status').attributes('role')).toBe('status')
  })
})
