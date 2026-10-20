import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ControlPanel from '@/components/controls/ControlPanel.vue'
import type { SessionStartSettings } from '@/components/controls/preset-bar-model'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import {
  BUILT_IN_PRESETS,
  builtInPreset,
  DEFAULT_PRESET_SELECTION,
} from '@/domain/presets/built-in-presets'
import { makePreset, type Preset, type PresetSelection } from '@/domain/presets/preset-selection'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import {
  UNSUPPORTED_RHYTHM_SETTINGS,
  UNSUPPORTED_RHYTHM_SETTING_MESSAGE,
} from '@/domain/controls/unsupported-rhythm-settings'

function mountPanel(
  controls: GenerationControls = DEFAULT_GENERATION_CONTROLS,
  selection: PresetSelection = DEFAULT_PRESET_SELECTION,
  readonly = false,
  presets: readonly Preset[] = BUILT_IN_PRESETS,
  startSettings: SessionStartSettings | null = null,
) {
  return mount(ControlPanel, {
    props: {
      controls,
      selection,
      presets,
      readonly,
      noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
      risingTempo: false,
      risingTempoAvailable: false,
      lastSessionReachedTempo: null,
      varySettings: false,
      tensionAcrossPhrases: false,
      sessionOptionsReadonly: readonly,
      startSettings,
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
      'Preset',
      'Tempo',
      'Written key',
      'Collection',
      'Instrument profile',
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
  it('emits select-preset with the preset id chosen in the preset box', async () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'neutral' })
    const box = wrapper.get('select.preset-select')
    await box.setValue('jazz')
    await box.setValue('speed-drill')
    expect(wrapper.emitted('select-preset')).toEqual([['jazz'], ['speed-drill']])
  })

  it("selects the selected preset's own option in the preset box", () => {
    /** Intent: the preset box's DOM value over `selection`. */
    const shown = (selection: PresetSelection) =>
      (
        mountPanel(DEFAULT_GENERATION_CONTROLS, selection).get('select.preset-select')
          .element as HTMLSelectElement
      ).value
    expect(shown({ kind: 'preset', presetId: 'jazz' })).toBe('jazz')
    expect(shown({ kind: 'preset', presetId: 'reel' })).toBe('reel')
  })

  // @test-link [[rule_profile_presets_apply_defined_controls]]
  it('shows Neutral in the preset box and its description by default', () => {
    const wrapper = mountPanel()
    const box = wrapper.get('select.preset-select')
    expect((box.element as HTMLSelectElement).value).toBe('neutral')
    expect(box.attributes('title')).toBe('Neutral')
    expect(wrapper.get('.preset-bar .field-note').text()).toBe(
      "Plain lines in the key, in quarter notes: the app's starting point.",
    )
  })

  // @test-link [[rule_custom_selection]]
  // @test-link [[rule_custom_names_its_base]]
  it('shows Custom naming its base in the preset box, with its description', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'jazz' })
    const box = wrapper.get('select.preset-select')
    expect((box.element as HTMLSelectElement).selectedOptions[0]!.text).toBe(
      'Custom, based on Jazz',
    )
    expect(box.attributes('title')).toBe('Custom, based on Jazz')
    expect(wrapper.get('.preset-bar .field-note').text()).toBe(
      'Changed from Jazz. Save as a new preset to keep these settings under a name.',
    )
  })

  // @test-link [[rule_custom_selection]]
  it('keeps a checked segment in every radiogroup in Custom', () => {
    const wrapper = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: 'jazz' })
    const groups = wrapper.findAll('[role="radiogroup"]')
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const checked = group
        .findAll('[role="radio"]')
        .filter((radio) => radio.attributes('aria-checked') === 'true')
      expect(checked, group.attributes('aria-label')).toHaveLength(1)
    }
  })

  // @test-link [[module_preset_bar_model]]
  it('renders the preset bar as the first row of the control section, before the groups', () => {
    const wrapper = mountPanel()
    const children = Array.from(wrapper.get('.control-section').element.children).map(
      (child) => child.className,
    )
    expect(children).toEqual([
      'control-section-title',
      'control-section-copy',
      'control-summary',
      'preset-bar',
      'control-group-row',
    ])
  })

  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_presets_read_at_start_up]]
  it('names a player preset it is given in the summary and the preset box', () => {
    const presets = [
      ...BUILT_IN_PRESETS,
      makePreset({ ...builtInPreset('jazz'), id: 'player-1', name: 'Late night', kind: 'player' }),
    ]
    const selected = mountPanel(
      DEFAULT_GENERATION_CONTROLS,
      { kind: 'preset', presetId: 'player-1' },
      false,
      presets,
    )
    expect(selected.get('.control-summary').text()).toBe('C Ionian · Late night · Lift · Shaped')
    expect(selected.get('select.preset-select').attributes('title')).toBe('Late night')
    expect(selected.get('.preset-bar .field-note').text()).toBe('Your preset.')

    const custom = mountPanel(
      DEFAULT_GENERATION_CONTROLS,
      { kind: 'custom', baseId: 'player-1' },
      false,
      presets,
    )
    expect(custom.get('.control-summary').text()).toBe(
      'C Ionian · Custom, based on Late night · Lift · Shaped',
    )
    expect(custom.get('select.preset-select').attributes('title')).toBe(
      'Custom, based on Late night',
    )
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
    expect(wrapper.get('select.preset-select').attributes('aria-readonly')).toBe('true')
    const fieldGroups = wrapper.findAll('.field-group')
    expect(fieldGroups.length).toBeGreaterThan(0)
    for (const fieldGroup of fieldGroups) {
      expect(fieldGroup.classes()).toContain('is-readonly')
    }
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  // @test-link [[module_preset_bar_model]]
  it("keeps the start settings' description while the preset box follows the shown selection", () => {
    const wrapper = mountPanel(
      DEFAULT_GENERATION_CONTROLS,
      { kind: 'custom', baseId: 'reel' },
      true,
      BUILT_IN_PRESETS,
      { selection: { kind: 'preset', presetId: 'reel' } },
    )
    expect(wrapper.get('select.preset-select').attributes('title')).toBe('Custom, based on Reel')
    expect(wrapper.get('.preset-bar .field-note').text()).toBe(
      'A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also try it in Ionian (a major key).',
    )
  })

  it('forwards the start settings to the key and mode marks, whatever the shown settings', () => {
    const wrapper = mountPanel(
      DEFAULT_GENERATION_CONTROLS,
      { kind: 'custom', baseId: 'reel' },
      true,
      BUILT_IN_PRESETS,
      {
        selection: { kind: 'preset', presetId: 'reel' },
        restriction: builtInPreset('reel').restriction,
      },
    )
    const marked = wrapper
      .get('[role="radiogroup"][aria-label="Collection"]')
      .findAll('.segment.is-marked')
      .map((segment) => segment.text())
    expect(marked).toEqual(['Dorian', 'Mixolydian'])
  })

  // @test-link [[rule_custom_names_its_base]]
  it('names the selected preset in the box, and Custom alone with no base', () => {
    const reel = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'preset', presetId: 'reel' })
    expect(reel.get('select.preset-select').attributes('title')).toBe('Reel')
    const noBase = mountPanel(DEFAULT_GENERATION_CONTROLS, { kind: 'custom', baseId: null })
    expect(
      (noBase.get('select.preset-select').element as HTMLSelectElement).selectedOptions[0]!.text,
    ).toBe('Custom')
    expect(noBase.get('.preset-bar .field-note').text()).toBe(
      'Your own settings. Save them as a preset to keep them under a name.',
    )
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('announces nothing in the preset bar, editable or read-only', () => {
    for (const readonly of [false, true]) {
      const bar = mountPanel(
        DEFAULT_GENERATION_CONTROLS,
        { kind: 'custom', baseId: 'jazz' },
        readonly,
      ).get('.preset-bar')
      expect(bar.find('[aria-live]').exists()).toBe(false)
      expect(bar.find('[role="status"]').exists()).toBe(false)
    }
  })
})
