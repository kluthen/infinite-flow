import { describe, expect, it } from 'vitest'
import { validatePitchMidis } from '@/domain/pitch/validation/pitch-phrase-validator'
import { chordPlan } from '../../harmony/seventh-chord-fixtures'
import { context, figure, withMidis } from './validation-fixtures'

type Overrides = Parameters<typeof context>[0]

/** The validator's failures for a phrase's MIDI values, none when it is valid. */
function failures(midis: readonly number[], overrides: Overrides = {}) {
  const result = validatePitchMidis(context(overrides), midis)
  return result.kind === 'valid_pitch_phrase' ? [] : result.failures
}

const REQUIRED = { requirement: { requiredFigureCount: 1, allowedBars: [1, 2] } } as const

/** C major, the tonic each bar, bar 1's in its seventh form: Cmaj7, C E G B. */
const CMAJ7_BAR_ONE = chordPlan([
  { degree: 1, beat: 0, beats: 4 },
  { degree: 1, beat: 4, beats: 4, seventh: true },
  { degree: 1, beat: 8, beats: 4 },
  { degree: 1, beat: 12, beats: 4 },
])

/** Bar 1 climbs G A B onto the seventh, then falls back through A to the G of bar 2. */
const ONTO_THE_SEVENTH = [60, 62, 64, 65, 67, 69, 71, 69, 67, 65, 64, 62, 64, 65, 67, 67]

// @test-link [[rule_seventh_is_chord_tone]]
// @test-link [[rule_figures_resolve_onto_chord_tones]]
describe('pitch validation: the seventh of a seventh-form event is a chord tone', () => {
  it('accepts the seventh as a chord tone, landed on and resolved onto by passing tones', () => {
    expect(failures(ONTO_THE_SEVENTH, { events: CMAJ7_BAR_ONE })).toEqual([])
    expect(failures(ONTO_THE_SEVENTH)).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 5 },
      { code: 'unexplained_non_chord_tone', attackIndex: 6 },
    ])
  })

  it("accepts Tension's bound passing tone resolving onto the seventh", () => {
    const binding = figure('diatonic_passing_or_neighbor', [5])
    expect(failures(ONTO_THE_SEVENTH, { ...REQUIRED, binding, events: CMAJ7_BAR_ONE })).toEqual([])
    expect(failures(ONTO_THE_SEVENTH, { ...REQUIRED, binding })).toEqual([
      { code: 'tension_figure_invalid', attackIndex: 5 },
      { code: 'unexplained_non_chord_tone', attackIndex: 6 },
    ])
  })

  it('refuses a bound figure whose last member is the seventh, one scale step from the root', () => {
    // A B, then C: over the C triad B is the approach's last decorating note; over Cmaj7 it is a
    // chord tone, so the approach has no room between the seventh and the root.
    const approach = [60, 62, 64, 65, 67, 69, 71, 72, 67, 65, 64, 62, 64, 65, 67, 67]
    const binding = figure('two_note_diatonic_approach', [5, 6])
    expect(failures(approach, { ...REQUIRED, binding })).toEqual([])
    expect(failures(approach, { ...REQUIRED, binding, events: CMAJ7_BAR_ONE })).toEqual([
      { code: 'tension_figure_invalid', attackIndex: 5 },
    ])
  })
})

// @test-link [[rule_extensions_never_chord_tones]]
describe('pitch validation: a ninth is never a chord tone', () => {
  it('refuses the ninth of Cmaj7, leapt into and left by step, as an unexplained note', () => {
    const ninth = withMidis({ 5: 62 })
    expect(failures(ninth, { events: CMAJ7_BAR_ONE })).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 5 },
    ])
    expect(failures(ninth)).toEqual([{ code: 'unexplained_non_chord_tone', attackIndex: 5 }])
  })
})
