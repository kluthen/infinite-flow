/**
 * The preset bar: the "Preset" box listing the built-ins in their two groups and the player's
 * presets, Custom's own option, the description line, and the read-only treatment that refuses a
 * keyboard change and reverts it. Nothing in it is announced.
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import PresetBar from '@/components/controls/PresetBar.vue'
import type { PresetActionsRow } from '@/components/controls/preset-bar-model'
import { BUILT_IN_PRESETS, builtInPreset } from '@/domain/presets/built-in-presets'
import { makePreset, type Preset, type PresetSelection } from '@/domain/presets/preset-selection'

const PRESETS: readonly Preset[] = [
  ...BUILT_IN_PRESETS,
  makePreset({ ...builtInPreset('jazz'), id: 'p-late', name: 'late night', kind: 'player' }),
  makePreset({ ...builtInPreset('jazz'), id: 'p-alpha', name: 'Alpha', kind: 'player' }),
]

const NEUTRAL: PresetSelection = { kind: 'preset', presetId: 'neutral' }

/** The actions row of a built-in selection: Save as new preset alone. */
const NO_PRESET_ACTIONS: PresetActionsRow = {
  saveChanges: false,
  rename: false,
  delete: false,
  limitReached: false,
}

afterEach(() => {
  document.body.innerHTML = ''
})

/** Intent: mount the bar over `selection`, its description from `descriptionSelection`. */
function mountBar(
  selection: PresetSelection = NEUTRAL,
  options: { readonly?: boolean; descriptionSelection?: PresetSelection } = {},
) {
  return mount(PresetBar, {
    props: {
      presets: PRESETS,
      selection,
      descriptionSelection: options.descriptionSelection ?? selection,
      readonly: options.readonly ?? false,
      actions: NO_PRESET_ACTIONS,
      actionsDisabled: false,
    },
    attachTo: document.body,
  })
}

/** Intent: the box's select element. */
function selectOf(wrapper: ReturnType<typeof mountBar>): HTMLSelectElement {
  return wrapper.get('select.preset-select').element as HTMLSelectElement
}

/** Intent: choose `value` in the box as the player would: set it, then fire the change. */
async function choose(wrapper: ReturnType<typeof mountBar>, value: string): Promise<void> {
  const select = wrapper.get('select.preset-select')
  await select.setValue(value)
}

// @test-link [[module_preset_bar_model]]
describe('PresetBar', () => {
  it('names the box "Preset" by its label and describes it by the description line', () => {
    const wrapper = mountBar()
    const select = wrapper.get('select.preset-select')
    const label = wrapper.get('label.field-label')
    expect(label.text()).toBe('Preset')
    expect(label.attributes('for')).toBe(select.attributes('id'))
    const note = wrapper.get(`#${select.attributes('aria-describedby')}`)
    expect(note.classes()).toContain('field-note')
    expect(note.text()).toBe("Plain lines in the key, in quarter notes: the app's starting point.")
    expect(wrapper.find('.preset-bar > .field-group').exists()).toBe(true)
  })

  // @test-link [[module_preset_bar_model]]
  // @test-link [[rule_player_preset_names]]
  it('lists the eight built-ins in Practice and Styles, then Your presets sorted ignoring case', () => {
    const wrapper = mountBar()
    const groups = wrapper.findAll('optgroup').map((group) => ({
      label: group.attributes('label'),
      options: group.findAll('option').map((option) => option.text()),
    }))
    expect(groups).toEqual([
      { label: 'Practice', options: ['Neutral', 'Gentle', 'Speed drill'] },
      { label: 'Styles', options: ['Jazz', 'Bebop', 'Pop song', 'Reel', 'Modal (Dorian)'] },
      { label: 'Your presets', options: ['Alpha', 'late night'] },
    ])
  })

  // @test-link [[rule_custom_names_its_base]]
  // @test-link [[rule_custom_selection]]
  it("shows Custom through a first option, selected, disabled and hidden, its text the box's title", () => {
    const wrapper = mountBar({ kind: 'custom', baseId: 'p-late' })
    const first = wrapper.get('select.preset-select > option')
    expect(first.text()).toBe('Custom, based on late night')
    const element = first.element as HTMLOptionElement
    expect(element.selected).toBe(true)
    expect(element.disabled).toBe(true)
    expect(element.hidden).toBe(true)
    expect(selectOf(wrapper).selectedIndex).toBe(0)
    expect(wrapper.get('select.preset-select').attributes('title')).toBe(
      'Custom, based on late night',
    )
  })

  // @test-link [[rule_custom_selection]]
  it("has no Custom option outside Custom, and selects the preset's own option", () => {
    const wrapper = mountBar({ kind: 'preset', presetId: 'reel' })
    expect(wrapper.find('select.preset-select > option').exists()).toBe(false)
    expect(selectOf(wrapper).value).toBe('reel')
    expect(wrapper.get('select.preset-select').attributes('title')).toBe('Reel')
    const selected = wrapper
      .findAll('option')
      .filter((o) => (o.element as HTMLOptionElement).selected)
    expect(selected.map((option) => option.text())).toEqual(['Reel'])
  })

  // @test-link [[rule_choosing_preset_sets_its_settings]]
  it('reports the chosen preset id, and shows the props again when the parent keeps them', async () => {
    const wrapper = mountBar()
    await choose(wrapper, 'jazz')
    await choose(wrapper, 'p-alpha')
    expect(wrapper.emitted('select-preset')).toEqual([['jazz'], ['p-alpha']])
    await nextTick()
    expect(selectOf(wrapper).value).toBe('neutral')
  })

  // @test-link [[rule_vary_settings_marks_custom]]
  it('follows its selection into Custom and out of it', async () => {
    const wrapper = mountBar()
    await wrapper.setProps({ selection: { kind: 'custom', baseId: 'neutral' } })
    expect(selectOf(wrapper).selectedOptions[0]!.text).toBe('Custom, based on Neutral')
    await wrapper.setProps({ selection: { kind: 'preset', presetId: 'bebop' } })
    expect(selectOf(wrapper).value).toBe('bebop')
    expect(wrapper.find('select.preset-select > option').exists()).toBe(false)
  })

  // @test-link [[rule_readonly_controls_keep_contrast]]
  // @test-link [[rule_session_settings_locked]]
  it('is read-only and focusable, refusing a keyboard change and reverting it at once', async () => {
    const wrapper = mountBar(NEUTRAL, { readonly: true })
    const select = wrapper.get('select.preset-select')
    expect(select.classes()).toContain('is-readonly')
    expect(select.attributes('aria-readonly')).toBe('true')
    expect(select.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.field-group').classes()).toContain('is-readonly')
    ;(select.element as HTMLSelectElement).focus()
    await choose(wrapper, 'jazz')
    expect(wrapper.emitted('select-preset')).toBeUndefined()
    expect(selectOf(wrapper).value).toBe('neutral')
    expect(document.activeElement).toBe(select.element)
  })

  it('carries no read-only marks while editable', () => {
    const select = mountBar().get('select.preset-select')
    expect(select.classes()).not.toContain('is-readonly')
    expect(select.attributes('aria-readonly')).toBeUndefined()
  })

  // @test-link [[rule_vary_settings_marks_custom]]
  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('works out the description from its own selection, not the one the box shows', () => {
    const wrapper = mountBar(
      { kind: 'custom', baseId: 'neutral' },
      { descriptionSelection: NEUTRAL },
    )
    expect(wrapper.get('select.preset-select > option').text()).toBe('Custom, based on Neutral')
    expect(wrapper.get('.field-note').text()).toBe(
      "Plain lines in the key, in quarter notes: the app's starting point.",
    )
  })

  // @test-link [[rule_automatic_change_updates_controls_quietly]]
  it('announces nothing: no live region, no status role', () => {
    const wrapper = mountBar({ kind: 'custom', baseId: 'jazz' })
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
