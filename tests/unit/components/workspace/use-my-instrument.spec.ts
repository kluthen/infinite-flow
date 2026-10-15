/**
 * The My instrument sheet's model: the form starts from the selected built-in (creating) or the
 * saved my instrument (editing); a template refills the range and the transposition only; the
 * range is refused live, never clamped, and checked again when the clef changes; the steppers stop
 * only at the MIDI note range of what they sound; the transposition keeps the written range.
 */
import { describe, expect, it } from 'vitest'

import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { useMyInstrumentForm } from '@/components/workspace/use-my-instrument'

// @test-link [[req_my_instrument]]
describe('the My instrument form', () => {
  // @test-link [[req_my_instrument]]
  it('creates from the selected built-in: its range and transposition, no name, treble clef', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'bb-tenor' })
    expect([form.lowest.value, form.highest.value, form.count.value]).toEqual([60, 84, -14])
    expect(form.name.value).toBe('')
    expect(form.clef.value).toBe('treble')
    expect(form.refusals.value).toEqual([])
    expect(form.rangeSummary.value).toMatch(/^Active range 46-70\./)
    expect(form.instrument()).toMatchObject({ name: 'My instrument', template: 'bb-tenor' })
  })

  // @test-link [[req_my_instrument]]
  it('refills the range and the transposition from another template, never the name or clef', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'bb-tenor' })
    form.name.value = 'Tenor'
    form.clef.value = 'bass'
    form.chooseTemplate('c-keyboard')
    expect([form.lowest.value, form.highest.value, form.count.value]).toEqual([48, 72, 0])
    expect([form.name.value, form.clef.value]).toEqual(['Tenor', 'bass'])
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('refuses a range under two octaves live, with no summary, and never stops a stepper there', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'c-keyboard' })
    form.highest.value = 71
    expect(form.refusals.value).toHaveLength(1)
    expect(form.rangeSummary.value).toBeNull()
    expect(form.highestBounds.value).toEqual({ min: 0, max: 127 })
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('checks the range again when the clef changes', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'c-keyboard' })
    form.lowest.value = 36
    form.highest.value = 60
    expect(form.refusals.value).toEqual([])
    form.clef.value = 'bass'
    expect(form.refusals.value).toEqual([])
    form.lowest.value = 16
    form.highest.value = 40
    expect(form.refusals.value).toEqual([])
    form.clef.value = 'treble'
    expect(form.refusals.value).toEqual([
      'In treble clef, the range must stay between C2 and C7. E0 is too low. It fits in bass clef.',
    ])
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('keeps the written range when the transposition changes, and bounds each stepper by what it sounds', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'bb-tenor' })
    form.count.value = -9
    expect([form.lowest.value, form.highest.value]).toEqual([60, 84])
    expect(form.transpositionNote.value).toBe('A major sixth lower: a written C4 sounds as E♭3.')
    expect(form.lowestBounds.value).toEqual({ min: 9, max: 136 })
    expect(form.countBounds.value).toEqual({ min: -60, max: 43 })
  })

  // @test-link [[module_notation_layout_preflight]]
  it('notes when a valid range makes the staff taller in its clef', () => {
    const form = useMyInstrumentForm({ mode: 'creating', template: 'c-keyboard' })
    form.lowest.value = 36
    form.highest.value = 60
    expect(form.staffReach.value).toMatch(/^In treble clef, this range makes the staff taller/)
    form.clef.value = 'bass'
    expect(form.staffReach.value).toBeNull()
  })

  // @test-link [[req_my_instrument]]
  it('edits the saved my instrument from its own values, its name trimmed on save', () => {
    const saved = makeMyInstrument({
      template: 'eb-alto',
      name: 'Alto',
      clef: 'bass',
      writtenRange: { minMidi: 40, maxMidi: 70 },
      transposition: { octaves: 0, semitones: 9, direction: 'lower' },
    })
    const form = useMyInstrumentForm({ mode: 'editing', saved })
    expect([form.name.value, form.clef.value, form.lowest.value, form.count.value]).toEqual([
      'Alto',
      'bass',
      40,
      -9,
    ])
    form.name.value = '  My alto  '
    expect(form.instrument()).toEqual(makeMyInstrument({ ...saved, name: 'My alto' }))
  })
})
