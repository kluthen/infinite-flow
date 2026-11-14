/**
 * The control panel's Seventh chords control in the panel: its place in the foundation group, its
 * four segments and note, the level it shows and forwards, and its read-only state.
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'

import { mountPanel } from './control-panel-mount'

describe('ControlPanel, the Seventh chords control', () => {
  const SEVENTH_NOTE =
    'How often a chord gets one more note stacked on top, as G7 (G, B, D, F) instead of G (G, B, D): a richer, jazzier sound. A preference, never a promise.'

  /** Intent: the panel's Seventh chords field, mounted with the level at `level`. */
  function seventhField(
    level: 'off' | 'sometimes' | 'favored' | 'stronglyFavored' = 'off',
    readonly = false,
  ) {
    const wrapper = mountPanel(
      DEFAULT_GENERATION_CONTROLS,
      { kind: 'preset', presetId: 'neutral' },
      readonly,
      BUILT_IN_PRESETS,
      null,
      { 'seventh-chords': level },
    )
    const field = wrapper
      .findAll('.field-group')
      .find((candidate) => candidate.find('.field-label').text() === 'Seventh chords')!
    return { wrapper, field, group: field.get('[role="radiogroup"]') }
  }

  // @test-link [[module_seventh_chords_level_options]]
  // @test-link [[req_seventh_chords_level]]
  it('sits in the foundation group after Harmonic motion and before Tension', () => {
    const foundation = mountPanel().findAll('.control-group')[0]!
    expect(foundation.get('h3').text()).toBe('Foundation')
    const labels = foundation.findAll('.field-label').map((label) => label.text())
    expect(labels.slice(labels.indexOf('Harmonic motion'))).toEqual([
      'Harmonic motion',
      'Seventh chords',
      'Tension',
    ])
  })

  // @test-link [[module_seventh_chords_level_options]]
  it('shows four segments, Off, Sometimes, Often, Always, the level it is given checked', () => {
    const { group } = seventhField('favored')
    expect(group.attributes('aria-label')).toBe('Seventh chords')
    expect(group.findAll('[role="radio"]').map((radio) => radio.text())).toEqual([
      'Off',
      'Sometimes',
      'Often',
      'Always',
    ])
    expect(group.get('[role="radio"][aria-checked="true"]').text()).toBe('Often')
    expect(seventhField().group.get('[role="radio"][aria-checked="true"]').text()).toBe('Off')
  })

  // @test-link [[module_seventh_chords_level_options]]
  it('names its note as the radiogroup description, worded as the handoff says', () => {
    const { field, group } = seventhField()
    const note = field.get('.field-note')
    expect(note.text()).toBe(SEVENTH_NOTE)
    expect(note.attributes('id')).toBeTruthy()
    expect(group.attributes('aria-describedby')).toBe(note.attributes('id'))
  })

  // @test-link [[module_seventh_chords_level_options]]
  // @test-link [[rule_custom_selection]]
  it('forwards a segment choice as set-chord-family-level for the seventh-chords family', async () => {
    const { wrapper, group } = seventhField()
    await group.findAll('[role="radio"]')[3]!.trigger('click')
    expect(wrapper.emitted('set-chord-family-level')).toEqual([
      [{ family: 'seventh-chords', level: 'stronglyFavored' }],
    ])
    expect(wrapper.emitted('set-control')).toBeUndefined()
    expect(wrapper.emitted('set-figure-level')).toBeUndefined()
  })

  // @test-link [[rule_session_settings_locked]]
  it('is read-only with the panel, showing the level it is given and emitting nothing', async () => {
    const { wrapper, field, group } = seventhField('sometimes', true)
    expect(field.classes()).toContain('is-readonly')
    expect(group.attributes('aria-readonly')).toBe('true')
    expect(group.get('[role="radio"][aria-checked="true"]').text()).toBe('Sometimes')
    await group.findAll('[role="radio"]')[2]!.trigger('click')
    expect(wrapper.emitted('set-chord-family-level')).toBeUndefined()
  })

  // @test-link [[req_seventh_chords_level]]
  it('announces nothing: no live region in its field', () => {
    const { field } = seventhField('stronglyFavored')
    expect(field.find('[aria-live]').exists()).toBe(false)
    expect(field.find('[role="status"]').exists()).toBe(false)
  })
})
