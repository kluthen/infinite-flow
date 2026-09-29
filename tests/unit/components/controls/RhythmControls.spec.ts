import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RhythmControls from '@/components/controls/RhythmControls.vue'
import type { NoteDensityContext } from '@/domain/controls/generated-note-density'
import type { GenerationControls } from '@/domain/controls/generation-controls'
import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'

const WIDE: NoteDensityContext = { belowTabletLandscape: false, sessionSteppedDown: false }
const NARROW: NoteDensityContext = { belowTabletLandscape: true, sessionSteppedDown: false }
const FIELD_NOTE = "Sixteenth isn't available on small screens."

/** A Sixteenth combination blocked from `bp-tablet-landscape` up and allowed below it. */
const SIXTEENTH_ONLY_BLOCKED: GenerationControls = {
  ...DEFAULT_GENERATION_CONTROLS,
  noteDensity: 'Sixteenth',
  rhythmicVariety: 'Strict',
  silenceDensity: 'Sparse',
  syncopation: 'Active displacement',
}

function mountRhythm(
  controls: GenerationControls,
  noteDensityContext: NoteDensityContext,
  readonly = false,
) {
  return mount(RhythmControls, {
    props: { controls, readonly, noteDensityContext },
    attachTo: document.body,
  })
}

/** Intent: the Note density radiogroup's three segments, in catalog order. */
function densitySegments(wrapper: ReturnType<typeof mountRhythm>) {
  return wrapper.get('[role="radiogroup"][aria-label="Note density"]').findAll('[role="radio"]')
}

// @test-link [[rule_sixteenth_unavailable_below_tablet_width]]
describe('RhythmControls: Sixteenth below bp-tablet-landscape', () => {
  it('disables Sixteenth below the width, naming the field-note that says why', () => {
    const wrapper = mountRhythm(DEFAULT_GENERATION_CONTROLS, NARROW)
    const sixteenth = densitySegments(wrapper)[2]!
    const note = wrapper.get('.field-note')

    expect(sixteenth.attributes('disabled')).toBeDefined()
    expect(note.text()).toBe(FIELD_NOTE)
    expect(note.attributes('id')).toBeTruthy()
    expect(sixteenth.attributes('aria-describedby')).toBe(note.attributes('id'))
    expect(densitySegments(wrapper)[0]!.attributes('disabled')).toBeUndefined()
    expect(densitySegments(wrapper)[1]!.attributes('disabled')).toBeUndefined()
  })

  it('offers all three segments, with no field-note, from the width up', () => {
    const wrapper = mountRhythm(DEFAULT_GENERATION_CONTROLS, WIDE)
    expect(densitySegments(wrapper).every((s) => s.attributes('disabled') === undefined)).toBe(true)
    expect(wrapper.find('.field-note').exists()).toBe(false)
  })

  it('shows a stored Sixteenth as Eighth below the width and as Sixteenth again from it up', async () => {
    const controls = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' as const }
    const wrapper = mountRhythm(controls, NARROW)
    expect(densitySegments(wrapper).map((s) => s.attributes('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ])

    await wrapper.setProps({ noteDensityContext: WIDE })
    expect(densitySegments(wrapper).map((s) => s.attributes('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(wrapper.emitted('set-control')).toBeUndefined()
  })

  it('keeps a stored Sixteenth when the already checked Eighth is clicked below the width', async () => {
    const controls = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' as const }
    const wrapper = mountRhythm(controls, NARROW)
    await densitySegments(wrapper)[1]!.trigger('click')
    expect(wrapper.emitted('set-control')).toBeUndefined()
  })

  it('stores Quarter when Quarter is chosen below the width', async () => {
    const controls = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Sixteenth' as const }
    const wrapper = mountRhythm(controls, NARROW)
    await densitySegments(wrapper)[0]!.trigger('click')
    expect(wrapper.emitted('set-control')).toEqual([[{ key: 'noteDensity', value: 'Quarter' }]])
  })

  it('never lets arrow keys land on Sixteenth below the width', async () => {
    const controls = { ...DEFAULT_GENERATION_CONTROLS, noteDensity: 'Eighth' as const }
    const wrapper = mountRhythm(controls, NARROW)
    await densitySegments(wrapper)[1]!.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('set-control')).toEqual([[{ key: 'noteDensity', value: 'Quarter' }]])
  })
})

// @test-link [[rule_unsupported_rhythm_settings_block_generation]]
describe('RhythmControls: the unsupported-rhythm alert judges the density generated with', () => {
  it('shows the alert for a Sixteenth-only combination from the width up', () => {
    const wrapper = mountRhythm(SIXTEENTH_ONLY_BLOCKED, WIDE)
    expect(wrapper.find('.inline-alert.alert-notice').exists()).toBe(true)
  })

  it('shows no alert for the same combination below the width', () => {
    const wrapper = mountRhythm(SIXTEENTH_ONLY_BLOCKED, NARROW)
    const status = wrapper.get('[role="status"]')
    expect(status.classes()).not.toContain('inline-alert')
    expect(status.text()).toBe('')
  })

  it('still shows the alert below the width for a Quarter combination', () => {
    const wrapper = mountRhythm({ ...SIXTEENTH_ONLY_BLOCKED, noteDensity: 'Quarter' }, NARROW)
    expect(wrapper.get('[role="status"]').text()).toContain('Suggested change:')
  })
})
