/**
 * Jam's controls, "Shape your Jam": the title, copy and summary line; three groups, Foundation
 * (Tempo 60 to 180 in steps of 10, Written key, Collection, the shared instrument with its range
 * summary and actions, Harmonic motion, Jam's own Seventh chords level with session mode's options
 * and note, Tension, one Embellishments level), Following your doodle
 * (Drift, Jam's own rhythm lock with its allowed rhythm changes under it) and From your doodle (the
 * readings, empty without a doodle); no preset bar, no key and mode marks, no "During a session"
 * options, no Arpeggio chaos. Each change is reported as a change of Jam's settings, the
 * instrument as session mode's selection; every field read-only when told. `tap-tempo` sits in the
 * Tempo field after the stepper, disabled when read-only, its press and end passed on.
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { SEVENTH_CHORDS_NOTE, seventhChordsOptions } from '@/components/controls/control-options'
import { jamFirstValues, type JamSettings } from '@/jam/jam-settings'
import type { JamControlsProps } from '@/jam/jam-view-types'
import JamControls from '@/jam/JamControls.vue'

const SETTINGS: JamSettings = jamFirstValues({ tempo: 90, tonalCenter: 'C', collection: 'Dorian' })

/** Intent: mount Jam's controls over these props, Jam's first values at Idle by default. */
function mountControls(overrides: Partial<JamControlsProps> = {}) {
  const props: JamControlsProps = {
    settings: SETTINGS,
    instrumentProfileId: 'bb-tenor',
    myInstrument: null,
    readonly: false,
    instrumentActionsDisabled: false,
    readings: null,
    belowTabletLandscape: false,
    tapTempo: { listening: false, note: { kind: 'rest' }, controllerConnected: true },
    ...overrides,
  }
  return mount(JamControls, { props, attachTo: document.body })
}

type Wrapper = ReturnType<typeof mountControls>

/** Intent: the radiogroup labelled `label`. */
function group(wrapper: Wrapper, label: string) {
  const found = wrapper
    .findAll('[role="radiogroup"]')
    .find((each) => each.attributes('aria-label') === label)
  if (found === undefined) throw new Error(`no radiogroup ${label}`)
  return found
}

/** Intent: press the segment reading `text` in the radiogroup labelled `label`. */
async function press(wrapper: Wrapper, label: string, text: string): Promise<void> {
  const segment = group(wrapper, label)
    .findAll('[role="radio"]')
    .find((each) => each.text() === text)
  if (segment === undefined) throw new Error(`no ${text} in ${label}`)
  await segment.trigger('click')
}

/** Intent: the segment labels of the radiogroup labelled `label`, and the one checked. */
function segments(wrapper: Wrapper, label: string) {
  const radios = group(wrapper, label).findAll('[role="radio"]')
  return {
    labels: radios.map((radio) => radio.text()),
    checked: radios.find((radio) => radio.attributes('aria-checked') === 'true')?.text(),
  }
}

// @test-link [[req_jam_settings]]
describe('JamControls', () => {
  // @test-link [[req_jam_settings]]
  it('shows "Shape your Jam" with its copy, its summary line and the three groups in order', () => {
    const wrapper = mountControls()
    expect(wrapper.get('h2.control-section-title').text()).toBe('Shape your Jam')
    expect(wrapper.get('.control-section-copy').text()).toBe(
      "Set these before you start. Jam keeps its own key, mode and tempo; the rhythm and the melody's shape come from your doodle.",
    )
    expect(wrapper.get('.control-summary').text()).toBe('C Dorian · Drift: Near · Rhythm lock: Off')
    expect(wrapper.findAll('.control-group > h3').map((h3) => h3.text())).toEqual([
      'Foundation',
      'Following your doodle',
      'From your doodle',
    ])
    expect(wrapper.findAll('.field-label').map((label) => label.text())).toEqual([
      'Tempo',
      'Written key',
      'Collection',
      'Instrument profile',
      'Harmonic motion',
      'Seventh chords',
      'Tension',
      'Embellishments',
      'Drift',
      'Rhythm lock',
    ])
  })

  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  // @test-link [[module_seventh_chords_level_options]]
  it("offers Jam's own Seventh chords level after Harmonic motion, its note naming the radiogroup", async () => {
    const wrapper = mountControls({ settings: { ...SETTINGS, 'seventh-chords': 'favored' } })
    const foundation = wrapper.findAll('.control-group')[0]!
    expect(foundation.findAll('.field-label').map((label) => label.text())).toEqual([
      'Tempo',
      'Written key',
      'Collection',
      'Instrument profile',
      'Harmonic motion',
      'Seventh chords',
      'Tension',
      'Embellishments',
    ])
    expect(segments(wrapper, 'Seventh chords')).toEqual({
      labels: seventhChordsOptions.map((option) => option.label),
      checked: seventhChordsOptions.find((option) => option.value === 'favored')!.label,
    })
    expect(segments(wrapper, 'Seventh chords').labels).toHaveLength(4)
    const noteId = group(wrapper, 'Seventh chords').attributes('aria-describedby')
    expect(noteId).toBeTruthy()
    const note = wrapper.get(`#${noteId}`)
    expect(note.classes()).toContain('field-note')
    expect(note.text()).toBe(SEVENTH_CHORDS_NOTE)

    await press(wrapper, 'Seventh chords', seventhChordsOptions.at(-1)!.label)
    await press(wrapper, 'Seventh chords', seventhChordsOptions[0]!.label)
    expect(wrapper.emitted('change')).toEqual([
      [{ 'seventh-chords': 'stronglyFavored' }],
      [{ 'seventh-chords': 'off' }],
    ])
  })

  // @test-link [[rule_jam_has_own_seventh_chords_level]]
  it('holds the Seventh chords level read-only when told, reporting no change', async () => {
    const wrapper = mountControls({ readonly: true })
    expect(group(wrapper, 'Seventh chords').attributes('aria-readonly')).toBe('true')
    expect(group(wrapper, 'Seventh chords').element.closest('.field-group')?.classList).toContain(
      'is-readonly',
    )
    await press(wrapper, 'Seventh chords', seventhChordsOptions.at(-1)!.label)
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  // @test-link [[req_jam_settings]]
  it('holds no preset bar, no key and mode marks, no session options and no arpeggio chaos', () => {
    const wrapper = mountControls()
    expect(wrapper.find('.preset-bar').exists()).toBe(false)
    expect(wrapper.find('.is-marked').exists()).toBe(false)
    const labels = wrapper
      .findAll('[role="radiogroup"]')
      .map((each) => each.attributes('aria-label'))
    for (const absent of ['Arpeggio chaos', 'Rising tempo', 'Vary settings', 'Note density'])
      expect(labels).not.toContain(absent)
  })

  // @test-link [[rule_jam_settings_first_values]]
  it("shows Jam's first values in its controls", () => {
    const wrapper = mountControls()
    expect(wrapper.get('.input-stepper').text()).toContain('90')
    expect(segments(wrapper, 'Written key').checked).toBe('C')
    expect(segments(wrapper, 'Collection').checked).toBe('Dorian')
    expect(segments(wrapper, 'Harmonic motion').checked).toBe('Gentle diatonic')
    expect(segments(wrapper, 'Seventh chords').checked).toBe('Off')
    expect(segments(wrapper, 'Tension').checked).toBe('Lift')
    expect(segments(wrapper, 'Embellishments').checked).toBe('Rarely')
    expect(segments(wrapper, 'Drift').checked).toBe('Near')
    expect(segments(wrapper, 'Rhythm lock').checked).toBe('Off')
    expect(wrapper.find('.field-dependent').exists()).toBe(false)
  })

  // @test-link [[rule_jam_embellishments_one_level]]
  it('offers one Embellishments level, Off to Very often, its note naming the radiogroup', async () => {
    const wrapper = mountControls()
    expect(segments(wrapper, 'Embellishments').labels).toEqual([
      'Off',
      'Rarely',
      'Often',
      'Very often',
    ])
    const noteId = group(wrapper, 'Embellishments').attributes('aria-describedby')
    expect(wrapper.get(`#${noteId}`).text()).toBe(
      'How often the app decorates the melody with passing tones, neighbor tones and the other figures. A preference, never a promise.',
    )
    await press(wrapper, 'Embellishments', 'Very often')
    expect(wrapper.emitted('change')).toEqual([[{ embellishments: 'stronglyFavored' }]])
  })

  // @test-link [[rule_jam_tempo_range]]
  it('steps the tempo by 10 inside 60 to 180 BPM', async () => {
    const top = mountControls({ settings: { ...SETTINGS, tempo: 180 } })
    const [lower, higher] = top.findAll('.input-stepper button')
    expect(higher!.attributes('disabled')).toBeDefined()
    await lower!.trigger('click')
    expect(top.emitted('change')).toEqual([[{ tempo: 170 }]])
    const bottom = mountControls({ settings: { ...SETTINGS, tempo: 60 } })
    expect(bottom.findAll('.input-stepper button')[0]!.attributes('disabled')).toBeDefined()
  })

  // @test-link [[rule_jam_settings_saved_on_change]]
  it("reports each change as a change of Jam's settings", async () => {
    const wrapper = mountControls()
    await press(wrapper, 'Written key', 'G')
    await press(wrapper, 'Collection', 'Mixolydian')
    await press(wrapper, 'Harmonic motion', 'Active diatonic')
    await press(wrapper, 'Tension', 'Settled')
    await press(wrapper, 'Rhythm lock', 'On')
    expect(wrapper.emitted('change')).toEqual([
      [{ tonalCenter: 'G' }],
      [{ collection: 'Mixolydian' }],
      [{ harmonicMotion: 'Active diatonic' }],
      [{ tension: 'Settled' }],
      [{ rhythmLockOn: true }],
    ])
  })

  // @test-link [[rule_jam_drift_positions]]
  it('offers the drift Close, Near and Free, with its note', async () => {
    const wrapper = mountControls()
    expect(segments(wrapper, 'Drift').labels).toEqual(['Close', 'Near', 'Free'])
    const noteId = group(wrapper, 'Drift').attributes('aria-describedby')
    expect(wrapper.get(`#${noteId}`).text()).toBe(
      'How far the phrases wander from your doodle: Close follows its rhythm and its moves, Near its ups and downs, Free only starts where it ended.',
    )
    await press(wrapper, 'Drift', 'Free')
    expect(wrapper.emitted('change')).toEqual([[{ drift: 'Free' }]])
  })

  // @test-link [[req_jam_settings]]
  it("shows Jam's lock note, and its allowed rhythm changes under it while it is on", async () => {
    const wrapper = mountControls({ settings: { ...SETTINGS, rhythmLockOn: true } })
    const noteId = group(wrapper, 'Rhythm lock').attributes('aria-describedby')
    expect(wrapper.get(`#${noteId}`).text()).toBe(
      'Every phrase keeps one rhythm, the one nearest your doodle, so your eyes can stay on the notes.',
    )
    expect(wrapper.get('.control-summary').text()).toBe('C Dorian · Drift: Near · Rhythm lock: On')
    const toggles = wrapper.findAll('.field-dependent .toggle-button')
    expect(toggles).toHaveLength(5)
    await toggles[2]!.trigger('click')
    expect(wrapper.emitted('change')).toEqual([[{ allowedRhythmChanges: ['split_note'] }]])
  })

  // @test-link [[rule_shared_setting_changed_in_jam_mode]]
  it('reports the shared instrument as a selection, and asks for the My instrument sheet', async () => {
    const wrapper = mountControls()
    expect(wrapper.get('.profile-range-summary').text()).toMatch(/^Active range /)
    await press(wrapper, 'Instrument profile', 'E-flat alto saxophone')
    expect(wrapper.emitted('select-instrument-profile')).toEqual([['eb-alto']])
    expect(wrapper.emitted('change')).toBeUndefined()
    await wrapper.get('.instrument-actions button').trigger('click')
    expect(wrapper.emitted('open-my-instrument')).toHaveLength(1)
  })

  // @test-link [[req_jam_settings]]
  it('makes every field read-only when told, the readings never ringed', async () => {
    const wrapper = mountControls({ readonly: true, instrumentActionsDisabled: true })
    const fields = wrapper.findAll('.control-section > .control-group-row .field-group')
    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) expect(field.classes()).toContain('is-readonly')
    for (const radiogroup of wrapper.findAll('[role="radiogroup"]'))
      expect(radiogroup.attributes('aria-readonly')).toBe('true')
    expect(wrapper.get('.instrument-actions button').attributes('disabled')).toBeDefined()
    await press(wrapper, 'Drift', 'Free')
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(wrapper.find('.doodle-readings').exists()).toBe(false)
    expect(wrapper.get('.control-group-intro').text()).toBe(
      'The app reads these from your doodle, so the phrases move like it.',
    )
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it('shows tap-tempo in the Tempo field after the stepper, its note under both', () => {
    const wrapper = mountControls({
      tapTempo: { listening: true, note: { kind: 'set', tempo: 110 }, controllerConnected: true },
    })
    const tempoField = wrapper.findAll('.field-group')[0]!
    expect(tempoField.get('.field-label').text()).toBe('Tempo')
    const children = Array.from(tempoField.element.children).map((child) => child.className)
    expect(children).toEqual([
      'field-label',
      'input-stepper',
      'btn tap-tempo is-listening',
      'field-note',
    ])
    expect(tempoField.get('.field-note').text()).toBe('Set to 110 BPM. Keep tapping to correct it.')
    expect(tempoField.get('.tap-tempo').attributes('disabled')).toBeUndefined()
  })

  // @test-link [[rule_jam_tap_in_listening]]
  it("passes on tap-tempo's press and end, and disables it when read-only", async () => {
    const wrapper = mountControls({
      tapTempo: { listening: true, note: { kind: 'counting' }, controllerConnected: false },
    })
    wrapper
      .get('.tap-tempo')
      .element.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }),
      )
    expect(wrapper.emitted('tap-tempo-press')).toHaveLength(1)
    wrapper
      .get('.instrument-actions button')
      .element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(wrapper.emitted('tap-tempo-end')).toHaveLength(1)
    expect(wrapper.emitted('change')).toBeUndefined()

    await wrapper.setProps({ readonly: true })
    expect(wrapper.get('.tap-tempo').attributes('disabled')).toBeDefined()
  })
})
