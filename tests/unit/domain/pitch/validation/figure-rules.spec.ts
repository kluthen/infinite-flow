import { describe, expect, it } from 'vitest'
import { validatePitchMidis } from '@/domain/pitch/validation/pitch-phrase-validator'
import { BASELINE, QUARTERS, bar, chord, context, figure, withMidis } from './validation-fixtures'

type Overrides = Parameters<typeof context>[0]

function failures(midis: readonly number[], overrides: Overrides = {}) {
  const result = validatePitchMidis(context(overrides), midis)
  return result.kind === 'valid_pitch_phrase' ? [] : result.failures
}

const JAZZ = { profile: 'Jazz' } as const
const REQUIRED = { requirement: { requiredFigureCount: 1, allowedBars: [1, 2] } } as const

// @test-link [[module_pitch_domain_validation]]
describe('pitch validation: diatonic vocabulary', () => {
  it('keeps Neutral pitches inside the collection', () => {
    expect(failures(withMidis({ 1: 63 }))).toEqual([{ code: 'out_of_collection', attackIndex: 1 }])
  })

  it('requires every free non-chord tone to be a passing tone or neighbor', () => {
    expect(failures(withMidis({ 3: 64, 4: 69, 5: 67 }))).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 4 },
    ])
  })

  it('does not accept a pitch-class-correct but octave-displaced resolution', () => {
    const displaced = [60, 62, 52, 55, 67, 65, 64, 62, 60, 62, 64, 62, 64, 65, 67, 67]
    const overrides = { leapiness: 'Angular', window: [48, 79], events: [chord(1, 0, 16)] } as const
    expect(failures(displaced, overrides)).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
    ])
  })
})

// @test-link [[module_pitch_domain_validation]]
describe('pitch validation: Jazz chromatic ornaments', () => {
  const ENCLOSURE = [60, 65, 63, 64, 67, 65, 64, 62, 60, 62, 64, 62, 64, 65, 67, 67]

  it('accepts a semitone approach into the next chord tone', () => {
    expect(failures(withMidis({ 1: 63 }), JAZZ)).toEqual([])
  })

  it('accepts an enclosure and covers its diatonic member', () => {
    expect(failures(ENCLOSURE, JAZZ)).toEqual([])
    expect(failures(ENCLOSURE)).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
      { code: 'out_of_collection', attackIndex: 2 },
    ])
  })

  it('rejects a chromatic pitch without an immediate chord-tone target', () => {
    expect(failures(withMidis({ 1: 61 }), JAZZ)).toEqual([
      { code: 'invalid_chromatic_ornament', attackIndex: 1 },
    ])
  })

  it('rejects an approach separated from its target by a rest', () => {
    const bars = [bar(0, 'q e r:e q q'), ...QUARTERS.slice(1)]
    expect(failures(withMidis({ 1: 63 }), { ...JAZZ, bars })).toEqual([
      { code: 'invalid_chromatic_ornament', attackIndex: 1 },
    ])
  })

  it('rejects an approach longer than its target', () => {
    const bars = [bar(0, 'e h e q'), ...QUARTERS.slice(1)]
    expect(failures(withMidis({ 1: 63 }), { ...JAZZ, bars })).toEqual([
      { code: 'invalid_chromatic_ornament', attackIndex: 1 },
    ])
  })
})

// @test-link [[module_pitch_domain_validation]]
describe('pitch validation: bound tension figures', () => {
  const APPOGGIATURA = [60, 62, 64, 64, 69, 67, 65, 64, 60, 62, 64, 62, 64, 65, 67, 67]
  const TWO_NOTE = [60, 62, 64, 65, 67, 69, 71, 72, 67, 65, 64, 62, 64, 65, 67, 67]

  it('accepts an appoggiatura entered by skip or leap on a strong onset', () => {
    expect(failures(APPOGGIATURA, { ...REQUIRED, binding: figure('appoggiatura', [4]) })).toEqual(
      [],
    )
  })

  it('never accepts an appoggiatura without a binding', () => {
    expect(failures(APPOGGIATURA)).toEqual([{ code: 'unexplained_non_chord_tone', attackIndex: 4 }])
  })

  it('rejects an appoggiatura entered by step', () => {
    const stepped = [60, 62, 64, 64, 65, 64, 62, 64, 60, 62, 64, 62, 64, 65, 67, 67]
    expect(failures(stepped, { ...REQUIRED, binding: figure('appoggiatura', [4]) })).toEqual([
      { code: 'tension_figure_invalid', attackIndex: 4 },
    ])
  })

  it('accepts a two-note diatonic approach and a bound passing tone', () => {
    const binding = figure('two_note_diatonic_approach', [5, 6])
    expect(failures(TWO_NOTE, { ...REQUIRED, binding })).toEqual([])
    const passing = figure('diatonic_passing_or_neighbor', [5])
    expect(failures(BASELINE, { ...REQUIRED, binding: passing })).toEqual([])
  })

  it('rejects a bound figure whose MIDI path does not realize it', () => {
    const approach = figure('two_note_diatonic_approach', [5, 6])
    expect(failures(BASELINE, { ...REQUIRED, binding: approach })).toEqual([
      { code: 'tension_figure_invalid', attackIndex: 5 },
    ])
    const passing = figure('diatonic_passing_or_neighbor', [6])
    expect(failures(BASELINE, { ...REQUIRED, binding: passing })).toEqual([
      { code: 'tension_figure_invalid', attackIndex: 6 },
    ])
  })

  it('re-derives the binding structure instead of trusting it', () => {
    const weak = figure('appoggiatura', [5])
    expect(failures(APPOGGIATURA, { ...REQUIRED, binding: weak })).toContainEqual({
      code: 'tension_binding_invalid',
      attackIndex: 5,
    })
    const outside = { requirement: { requiredFigureCount: 1, allowedBars: [2] } } as const
    expect(
      failures(APPOGGIATURA, { ...outside, binding: figure('appoggiatura', [4]) }),
    ).toContainEqual({
      code: 'tension_binding_invalid',
      attackIndex: 4,
    })
    expect(failures(BASELINE, REQUIRED)).toEqual([{ code: 'tension_binding_invalid' }])
  })

  it('requires the bound target to precede the final sounding attack', () => {
    const late = figure('two_note_diatonic_approach', [13, 14])
    const requirement = { requiredFigureCount: 1, allowedBars: [0, 1, 2, 3] } as never
    expect(failures(BASELINE, { requirement, binding: late })).toContainEqual({
      code: 'tension_binding_invalid',
      attackIndex: 13,
    })
  })
})
