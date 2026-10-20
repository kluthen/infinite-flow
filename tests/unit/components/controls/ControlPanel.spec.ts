import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { DEFAULT_PRESET_SELECTION } from '@/domain/presets/built-in-presets'
import type { PresetSelection } from '@/domain/presets/preset-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  UNSUPPORTED_RHYTHM_SETTINGS,
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
} from '@/domain/controls/unsupported-rhythm-settings'

function mountPanel(
  controls: GenerationControls = DEFAULT_GENERATION_CONTROLS,
  selection: PresetSelection = DEFAULT_PRESET_SELECTION,
  readonly = false,
) {
  return mount(ControlPanel, {
    props: {
      controls,
      selection,
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

  // @test-link [[rule_custom_names_its_base]]
  it('shows the control-summary line with the preset label and recomputes it on a control or selection change', async () => {
    const wrapper = mountPanel()
    expect(wrapper.get('.control-summary').text()).toBe('C Ionian · Neutral · Lift · Shaped')
    const edited: GenerationControls = { ...DEFAULT_GENERATION_CONTROLS, tension: 'Edge' }
    await wrapper.setProps({
      controls: edited,
      selection: { kind: 'custom', baseId: 'jazz' },
    })
    expect(wrapper.get('.control-summary').text()).toBe(
      'C Ionian · Custom, based on Jazz · Edge · Shaped',
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
  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('emits select-preset with the Neutral or Jazz built-in id for the preset group', async () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'neutral' })
    const group = wrapper
      .findAll('[role="radiogroup"]')
      .find((g) => g.attributes('aria-label') === 'Musical profile preset')!
    const radios = group.findAll('[role="radio"]')
    expect(radios.map((radio) => radio.text())).toEqual(['Neutral', 'Jazz'])
    await radios[1]!.trigger('click')
    await radios[0]!.trigger('click')
    expect(wrapper.emitted('select-preset')).toEqual([['jazz'], ['neutral']])
  })

  it('checks the Jazz segment while Jazz is selected, and none for another preset', () => {
    const segment = (selection: PresetSelection) =>
      mountPanel(DEFAULT_GENERATION_CONTROLS, selection)
        .findAll('[role="radiogroup"]')
        .find((g) => g.attributes('aria-label') === 'Musical profile preset')!
        .findAll('[role="radio"]')
        .map((radio) => radio.attributes('aria-checked'))
    expect(segment({ kind: 'preset', presetId: 'jazz' })).toEqual(['false', 'true'])
    expect(segment({ kind: 'preset', presetId: 'reel' })).toEqual(['false', 'false'])
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

  // @test-link [[rule_custom_selection]]
  // @test-link [[rule_custom_names_its_base]]
  it("shows Custom's status text naming its base and checks no preset segment", () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'jazz' })
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
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, DEFAULT_PRESET_SELECTION, true)
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
  it('holds both preset status texts in one cell for a preset selection, the other one invisible, emphasis on the custom one', () => {
    const preset = mountPanel()
    const presetReserve = preset.get('.preset-status-text.is-reserve')
    expect(presetReserve.attributes('aria-hidden')).toBe('true')
    expect(presetReserve.text()).toBe(
      'Custom configuration - Neutral grammar retained. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
    )
    expect(presetReserve.classes()).toContain('is-custom')
    expect(preset.get('.preset-status').classes()).not.toContain('is-custom')

    const custom = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'jazz' })
    const customReserve = custom.get('.preset-status-text.is-reserve')
    expect(customReserve.text()).toBe(
      'Jazz preset applied. All seven preset-controlled values were replaced.',
    )
    expect(customReserve.classes()).not.toContain('is-custom')
    expect(custom.findAll('.preset-status-text')).toHaveLength(2)
  })

  // @test-link [[rule_custom_names_its_base]]
  it('names the selected preset in the status, and no base for Custom with none', () => {
    const reel = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'preset', presetId: 'reel' })
    expect(reel.get('.preset-status-text:not(.is-reserve)').text()).toBe(
      'Reel preset applied. All seven preset-controlled values were replaced.',
    )
    const noBase = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: null })
    const inUse = noBase.get('.preset-status-text:not(.is-reserve)')
    expect(inUse.text()).toBe(
      'Custom configuration. Choosing Neutral or Jazz replaces all seven preset-controlled values.',
    )
    expect(inUse.classes()).toContain('is-custom')
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('announces the preset status politely, or not at all when told so', () => {
    expect(mountPanel().get('.preset-status').attributes('aria-live')).toBe('polite')
    const quiet = mount(ControlPanel, {
      props: {
        controls: DEFAULT_GENERATION_CONTROLS,
        selection: DEFAULT_PRESET_SELECTION,
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
