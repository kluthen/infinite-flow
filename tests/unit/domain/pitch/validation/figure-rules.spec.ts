import { describe, expect, it } from 'vitest'
import {
  FIGURE_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import { validatePitchMidis } from '@/domain/pitch/validation/pitch-phrase-validator'
import { BASELINE, QUARTERS, bar, chord, context, figure, withMidis } from './validation-fixtures'

type Overrides = Parameters<typeof context>[0]

function failures(midis: readonly number[], overrides: Overrides = {}) {
  const result = validatePitchMidis(context(overrides), midis)
  return result.kind === 'valid_pitch_phrase' ? [] : result.failures
}

const JAZZ = { figureLevels: JAZZ_FIGURE_LEVELS } as const
const REQUIRED = { requirement: { requiredFigureCount: 1, allowedBars: [1, 2] } } as const

// @test-link [[module_pitch_domain_validation]]
describe('pitch validation: diatonic vocabulary', () => {
  it('keeps Neutral pitches inside the collection', () => {
    expect(failures(withMidis({ 1: 63 }))).toEqual([{ code: 'out_of_collection', attackIndex: 1 }])
  })

  // @test-link [[rule_figures_resolve_onto_chord_tones]]
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

// @test-link [[module_musical_profile_capabilities]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('pitch validation: chromatic approach gated by the figure levels, not profile name', () => {
  it("accepts a chromatic approach under Neutral's levels with the chromatic approach as today", () => {
    const overrides = {
      figureLevels: { ...NEUTRAL_FIGURE_LEVELS, chromaticApproach: 'asToday' },
    } as const
    expect(failures(withMidis({ 1: 63 }), overrides)).toEqual([])
  })

  it("rejects a chromatic approach under Jazz's levels with both chromatic figures off", () => {
    const overrides = {
      figureLevels: { ...JAZZ_FIGURE_LEVELS, chromaticApproach: 'off', chromaticEnclosure: 'off' },
    } as const
    expect(failures(withMidis({ 1: 63 }), overrides)).toEqual([
      { code: 'out_of_collection', attackIndex: 1 },
    ])
  })
})

/** Every figure at one level, with the given figures overridden. */
function levels(
  level: FigureLevel,
  overrides: Partial<Record<FigureId, FigureLevel>> = {},
): FigureLevels {
  const base = Object.fromEntries(FIGURE_IDS.map((id) => [id, level])) as Record<
    FigureId,
    FigureLevel
  >
  return { ...base, ...overrides }
}

/** The baseline with every non-chord tone replaced by a chord tone: no figure at all. */
const CHORD_TONES = withMidis({ 1: 64, 3: 64, 5: 64, 7: 64, 9: 64, 11: 64, 13: 64 })

// @test-link [[rule_figure_level_orders_search]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('pitch validation: free figures gated by the figure levels', () => {
  const cases: readonly {
    readonly figure: FigureId
    readonly midis: readonly number[]
    readonly refused: { readonly code: string; readonly attackIndex: number }[]
  }[] = [
    {
      figure: 'passingTone',
      midis: withMidis({ 1: 62 }, CHORD_TONES),
      refused: [{ code: 'unexplained_non_chord_tone', attackIndex: 1 }],
    },
    {
      figure: 'accentedPassingTone',
      midis: withMidis({ 2: 65, 3: 67 }, CHORD_TONES),
      refused: [{ code: 'unexplained_non_chord_tone', attackIndex: 2 }],
    },
    {
      figure: 'neighborTone',
      midis: withMidis({ 9: 62, 10: 60 }, CHORD_TONES),
      refused: [{ code: 'unexplained_non_chord_tone', attackIndex: 9 }],
    },
    {
      figure: 'chromaticApproach',
      midis: withMidis({ 1: 63 }, CHORD_TONES),
      refused: [{ code: 'invalid_chromatic_ornament', attackIndex: 1 }],
    },
    {
      figure: 'chromaticEnclosure',
      midis: withMidis({ 1: 65, 2: 63 }, CHORD_TONES),
      refused: [
        { code: 'unexplained_non_chord_tone', attackIndex: 1 },
        { code: 'invalid_chromatic_ornament', attackIndex: 2 },
      ],
    },
  ]

  it.each(cases)('accepts a free $figure as today and refuses it when off', (testCase) => {
    const asToday = { figureLevels: levels('asToday') }
    const off = { figureLevels: levels('asToday', { [testCase.figure]: 'off' }) }
    expect(failures(testCase.midis, asToday)).toEqual([])
    expect(failures(testCase.midis, off)).toEqual(testCase.refused)
  })

  it('refuses a chromatic note as out of the collection when both chromatic figures are off', () => {
    const off = levels('asToday', { chromaticApproach: 'off', chromaticEnclosure: 'off' })
    expect(failures(withMidis({ 1: 63 }, CHORD_TONES), { figureLevels: off })).toEqual([
      { code: 'out_of_collection', attackIndex: 1 },
    ])
    expect(failures(withMidis({ 1: 65, 2: 63 }, CHORD_TONES), { figureLevels: off })).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
      { code: 'out_of_collection', attackIndex: 2 },
    ])
  })

  it('refuses a chromatic note as an invalid ornament when only the other chromatic figure is on', () => {
    const approachOnly = levels('off', { chromaticApproach: 'asToday' })
    const enclosureOnly = levels('off', { chromaticEnclosure: 'asToday' })
    expect(failures(withMidis({ 1: 63 }, CHORD_TONES), { figureLevels: enclosureOnly })).toEqual([
      { code: 'invalid_chromatic_ornament', attackIndex: 1 },
    ])
    expect(
      failures(withMidis({ 1: 65, 2: 63 }, CHORD_TONES), { figureLevels: approachOnly }),
    ).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
      { code: 'invalid_chromatic_ornament', attackIndex: 2 },
    ])
  })

  // @test-link [[rule_embellishment_figures_defined]]
  it('accepts a free appoggiatura and a free diatonic enclosure when they are favored, and refuses them when off', () => {
    const favored = {
      figureLevels: levels('asToday', { appoggiatura: 'favored', diatonicEnclosure: 'favored' }),
    }
    const off = {
      figureLevels: levels('asToday', { appoggiatura: 'off', diatonicEnclosure: 'off' }),
    }
    // E then a leap up to A on bar 1's beat 1, resolving down to G.
    const appoggiatura = withMidis({ 4: 69, 5: 67 }, CHORD_TONES)
    // F and D around E. The D on beat 3, entered by a leap from F, is also an appoggiatura.
    const enclosure = withMidis({ 1: 65, 2: 62 }, CHORD_TONES)
    expect(failures(appoggiatura, favored)).toEqual([])
    expect(failures(enclosure, favored)).toEqual([])
    expect(failures(appoggiatura, off)).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 4 },
    ])
    expect(failures(enclosure, off)).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
      { code: 'unexplained_non_chord_tone', attackIndex: 2 },
    ])
  })
})

/** One tonic over the whole phrase, so a figure may cross a bar line under one chord. */
const ONE_TONIC = [chord(1, 0, 16)]

/** E then a leap up to A on bar 1's beat 1, resolving down to G: a free appoggiatura. */
const APPOGGIATURA = withMidis({ 4: 69, 5: 67 }, CHORD_TONES)

/**
 * F and D, then D and F, around the E on bar 1's beat 1: a diatonic enclosure in each order. Their
 * first note is entered by step and their second falls off beats 1 and 3, so neither can pass for
 * an appoggiatura.
 */
const UPPER_FIRST = withMidis({ 2: 65, 3: 62, 4: 64 }, CHORD_TONES)
const LOWER_FIRST = withMidis({ 2: 62, 3: 65, 4: 64 }, CHORD_TONES)

/** The free figure under test as today and every other figure off, so nothing else explains it. */
const APPOGGIATURA_ONLY = { figureLevels: levels('off', { appoggiatura: 'asToday' }) }
const ENCLOSURE_ONLY = { figureLevels: levels('off', { diatonicEnclosure: 'asToday' }) }

/** The phrase's chords with bar 1 on the dominant (G B D) or on the submediant (A C E). */
const DOMINANT_BAR_ONE = [chord(1, 0, 4), chord(5, 4, 4), chord(1, 8, 8)]
const SUBMEDIANT_BAR_ONE = [chord(1, 0, 4), chord(6, 4, 4), chord(1, 8, 8)]

/** Unexplained-note failures at the given attacks. */
function unexplained(...attackIndices: number[]) {
  return attackIndices.map((attackIndex) => ({
    code: 'unexplained_non_chord_tone',
    attackIndex,
  }))
}

// @test-link [[rule_embellishment_figures_defined]]
// @test-link [[rule_figures_resolve_onto_chord_tones]]
// @test-link [[req_embellishment_figure_levels]]
// @test-link [[rule_levels_govern_free_figures_only]]
describe('pitch validation: the free appoggiatura and the diatonic enclosure', () => {
  const cases = [
    { name: 'a free appoggiatura', figure: 'appoggiatura', midis: APPOGGIATURA, members: [4] },
    {
      name: 'a diatonic enclosure, upper note first',
      figure: 'diatonicEnclosure',
      midis: UPPER_FIRST,
      members: [2, 3],
    },
    {
      name: 'a diatonic enclosure, lower note first',
      figure: 'diatonicEnclosure',
      midis: LOWER_FIRST,
      members: [2, 3],
    },
  ] as const

  for (const { name, figure, midis, members } of cases) {
    it(`accepts ${name} at every level but Off`, () => {
      for (const level of ['asToday', 'favored', 'stronglyFavored'] as const)
        expect(
          failures(midis, {
            events: ONE_TONIC,
            figureLevels: levels('asToday', { [figure]: level }),
          }),
        ).toEqual([])
    })

    it(`refuses ${name} at each member when its level is Off`, () => {
      const off = { events: ONE_TONIC, figureLevels: levels('asToday', { [figure]: 'off' }) }
      expect(failures(midis, off)).toEqual(unexplained(...members))
    })
  }

  it('refuses an appoggiatura entered by step', () => {
    const stepped = withMidis({ 4: 65, 5: 64 }, CHORD_TONES)
    expect(failures(APPOGGIATURA, APPOGGIATURA_ONLY)).toEqual([])
    expect(failures(stepped, APPOGGIATURA_ONLY)).toEqual(unexplained(4))
  })

  it('refuses an appoggiatura off beats 1 and 3', () => {
    const weak = withMidis({ 4: 64, 5: 69, 6: 67, 7: 67 }, CHORD_TONES)
    expect(failures(weak, APPOGGIATURA_ONLY)).toEqual(unexplained(5))
  })

  it('refuses an appoggiatura whose chord changes before its resolution', () => {
    // Bar 0: E E, then A on beat 3 as a half note; it resolves onto the G of bar 1's beat 1.
    const bars = [bar(0, 'q q h'), ...QUARTERS.slice(1)]
    const midis = [64, 64, 69, 67, 67, 67, 67, 60, 64, 64, 64, 64, 64, 67, 67]
    expect(failures(midis, { ...APPOGGIATURA_ONLY, bars, events: ONE_TONIC })).toEqual([])
    expect(failures(midis, { ...APPOGGIATURA_ONLY, bars, events: DOMINANT_BAR_ONE })).toEqual(
      unexplained(2),
    )
  })

  it('refuses a diatonic enclosure split from its target by a rest', () => {
    const bars = [bar(0, 'q q q e r:e'), ...QUARTERS.slice(1)]
    for (const midis of [UPPER_FIRST, LOWER_FIRST]) {
      expect(failures(midis, { ...ENCLOSURE_ONLY, events: ONE_TONIC })).toEqual([])
      expect(failures(midis, { ...ENCLOSURE_ONLY, bars, events: ONE_TONIC })).toEqual(
        unexplained(2, 3),
      )
    }
  })

  it('refuses a diatonic enclosure whose chord changes before its target', () => {
    // Bar 1's E stays a chord tone of A C E, so only the chord change breaks the enclosure.
    for (const midis of [UPPER_FIRST, LOWER_FIRST]) {
      expect(failures(midis, { ...ENCLOSURE_ONLY, events: ONE_TONIC })).toEqual([])
      expect(failures(midis, { ...ENCLOSURE_ONLY, events: SUBMEDIANT_BAR_ONE })).toEqual(
        unexplained(2, 3),
      )
    }
  })
})

// @test-link [[rule_levels_govern_free_figures_only]]
describe("pitch validation: Tension's bound figure reads no level", () => {
  const ALL_OFF = { figureLevels: levels('off') } as const

  it('accepts a bound passing or neighbor tone with every level off', () => {
    const midis = withMidis({ 5: 65 }, CHORD_TONES)
    const binding = figure('diatonic_passing_or_neighbor', [5])
    expect(failures(midis, { ...ALL_OFF, ...REQUIRED, binding })).toEqual([])
  })

  it('accepts a bound appoggiatura with every level off', () => {
    const midis = withMidis({ 4: 69, 5: 67 }, CHORD_TONES)
    const binding = figure('appoggiatura', [4])
    expect(failures(midis, { ...ALL_OFF, ...REQUIRED, binding })).toEqual([])
  })

  it('accepts a bound two-note diatonic approach with every level off', () => {
    const midis = withMidis({ 5: 69, 6: 71, 7: 72, 8: 67, 9: 67 }, CHORD_TONES)
    const binding = figure('two_note_diatonic_approach', [5, 6])
    expect(failures(midis, { ...ALL_OFF, ...REQUIRED, binding })).toEqual([])
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

  it('rejects an appoggiatura bound on the first attack as a binding, not a figure, failure', () => {
    // Attack 0 is a strong onset in allowed bar 0, so only the "not the first attack" rule forbids it.
    const first = figure('appoggiatura', [0])
    const requirement = { requiredFigureCount: 1, allowedBars: [0, 1, 2] } as const
    const reported = failures(withMidis({ 0: 62 }), { requirement, binding: first })
    expect(reported).toContainEqual({ code: 'tension_binding_invalid', attackIndex: 0 })
    expect(reported.map((failure) => failure.code)).not.toContain('tension_figure_invalid')
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

/** True when the structure check itself rejects the binding, ignoring every other rule's codes. */
function bindingInvalid(
  midis: readonly number[],
  overrides: Overrides,
  binding: ReturnType<typeof figure>,
) {
  return failures(midis, { ...overrides, binding }).some(
    (failure) => failure.code === 'tension_binding_invalid',
  )
}

// @test-link [[module_pitch_domain_validation]]
// @test-link [[rule_tension_resolution_delay_permits_rests]]
describe('pitch validation: rests around the resolution delay', () => {
  const NEXT_BEAT = { maximumResolutionDelay: 'next_beat_or_bar' } as const

  it('accepts a target rest landing exactly on the resolution deadline', () => {
    // Bar 0: q(0-4) q(4-8) r:q(8-12) q(12-16). Member (attack 1) ends at tick 8; the next-beat-or-bar
    // deadline is tick 12, and the target (attack 2) starts right on it.
    const bars = [bar(0, 'q q r:q q'), ...QUARTERS.slice(1)]
    const midis = withMidis({}, BASELINE.slice(0, 15))
    const binding = figure('diatonic_passing_or_neighbor', [1])
    expect(bindingInvalid(midis, { bars, requirement: NEXT_BEAT }, binding)).toBe(false)
  })

  it('rejects a target rest pushing it past the next-beat-or-bar deadline', () => {
    // Bar 0: q(0-4) q(4-8) r:q(8-12) r:e(12-14) e(14-16). Member ends at tick 8; deadline is tick
    // 12, but the target only starts at tick 14.
    const bars = [bar(0, 'q q r:q r:e e'), ...QUARTERS.slice(1)]
    const midis = withMidis({}, BASELINE.slice(0, 15))
    const binding = figure('diatonic_passing_or_neighbor', [1])
    expect(bindingInvalid(midis, { bars, requirement: NEXT_BEAT }, binding)).toBe(true)
  })

  it('accepts that same late target under the wider Settled next-strong-sounding-onset grid', () => {
    // Same rhythm as above: member ends at tick 8. The next strong onset after tick 8 is tick 16,
    // so the target at tick 14 is in time even though it misses the beat-or-bar grid.
    const bars = [bar(0, 'q q r:q r:e e'), ...QUARTERS.slice(1)]
    const midis = withMidis({}, BASELINE.slice(0, 15))
    const binding = figure('diatonic_passing_or_neighbor', [1])
    const invalid = bindingInvalid(
      midis,
      { bars, requirement: { maximumResolutionDelay: 'next_strong_sounding_onset' } },
      binding,
    )
    expect(invalid).toBe(false)
  })

  it('accepts a passing/neighbor binding whose preparation is separated by a rest', () => {
    // Bar 0: q(0-4, preparation) r:h(4-12) e(12-14, member) e(14-16, target). The preparation link
    // has no delay bound, so the half-bar rest before the member does not block the binding.
    const bars = [bar(0, 'q r:h e e'), ...QUARTERS.slice(1)]
    const midis = withMidis({}, BASELINE.slice(0, 15))
    const binding = figure('diatonic_passing_or_neighbor', [1])
    expect(bindingInvalid(midis, { bars }, binding)).toBe(false)
  })

  it('accepts a Build two-note diatonic approach with rests before, inside, and before its target', () => {
    // Bar 0: r:q(0-4) q(4-8, approach 0) r:e(8-10) e(10-12, approach 1) r:q(12-16). Bar 1: q(16-20,
    // target). The harmony spans both bars so the figure is not split across chords.
    const bars = [bar(0, 'r:q q r:e e r:q'), ...QUARTERS.slice(1)]
    const midis = withMidis({}, BASELINE.slice(0, 14))
    const binding = figure('two_note_diatonic_approach', [0, 1])
    const overrides = {
      bars,
      events: [chord(1, 0, 16)],
      requirement: { ...NEXT_BEAT, permittedFigureKinds: ['two_note_diatonic_approach'] as const },
    }
    expect(bindingInvalid(midis, overrides, binding)).toBe(false)
  })
})
