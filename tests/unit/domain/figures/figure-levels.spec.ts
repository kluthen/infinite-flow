import { describe, expect, it } from 'vitest'

import {
  allowsChromaticNotes,
  allowsFreeFigure,
  FIGURE_IDS,
  FIGURE_LEVEL_IDS,
  FigureLevelsError,
  generatorCapabilities,
  JAZZ_FIGURE_LEVELS,
  levelsForProfile,
  NEUTRAL_FIGURE_LEVELS,
  parseFigureLevels,
  type FigureLevels,
} from '@/domain/figures/figure-levels'

/** Intent: Neutral's levels with one figure's level replaced. */
function neutralWith(changes: Partial<FigureLevels>): FigureLevels {
  return { ...NEUTRAL_FIGURE_LEVELS, ...changes }
}

// @test-link [[module_figure_levels]]
// @test-link [[rule_embellishment_figures_defined]]
// @test-link [[req_embellishment_figure_levels]]
describe('figure and level ids', () => {
  it('lists the seven figures and the four levels in their fixed order, frozen', () => {
    expect(FIGURE_IDS).toEqual([
      'passingTone',
      'accentedPassingTone',
      'neighborTone',
      'appoggiatura',
      'diatonicEnclosure',
      'chromaticApproach',
      'chromaticEnclosure',
    ])
    expect(FIGURE_LEVEL_IDS).toEqual(['off', 'asToday', 'favored', 'stronglyFavored'])
    expect(Object.isFrozen(FIGURE_IDS)).toBe(true)
    expect(Object.isFrozen(FIGURE_LEVEL_IDS)).toBe(true)
  })
})

// @test-link [[module_figure_levels]]
// @test-link [[rule_neutral_and_jazz_figure_levels]]
describe('Neutral and Jazz levels', () => {
  it("holds exactly Neutral's levels, keys in figure order, frozen", () => {
    expect(NEUTRAL_FIGURE_LEVELS).toStrictEqual({
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'off',
      chromaticEnclosure: 'off',
    })
    expect(Object.keys(NEUTRAL_FIGURE_LEVELS)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(NEUTRAL_FIGURE_LEVELS)).toBe(true)
  })

  it("holds exactly Jazz's levels, keys in figure order, frozen", () => {
    expect(JAZZ_FIGURE_LEVELS).toStrictEqual({
      passingTone: 'asToday',
      accentedPassingTone: 'asToday',
      neighborTone: 'asToday',
      appoggiatura: 'off',
      diatonicEnclosure: 'off',
      chromaticApproach: 'asToday',
      chromaticEnclosure: 'asToday',
    })
    expect(Object.keys(JAZZ_FIGURE_LEVELS)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(JAZZ_FIGURE_LEVELS)).toBe(true)
  })

  it('maps each profile to its levels as a fresh frozen copy', () => {
    const neutral = levelsForProfile('Neutral')
    const jazz = levelsForProfile('Jazz')
    expect(neutral).toStrictEqual(NEUTRAL_FIGURE_LEVELS)
    expect(jazz).toStrictEqual(JAZZ_FIGURE_LEVELS)
    expect(neutral).not.toBe(NEUTRAL_FIGURE_LEVELS)
    expect(jazz).not.toBe(JAZZ_FIGURE_LEVELS)
    expect(Object.keys(jazz)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(neutral)).toBe(true)
  })
})

// @test-link [[module_figure_levels]]
// @test-link [[rule_chromatic_notes_need_a_chromatic_figure]]
describe('what the levels allow', () => {
  it('allows no chromatic note with Neutral levels and allows it with Jazz levels', () => {
    expect(allowsChromaticNotes(NEUTRAL_FIGURE_LEVELS)).toBe(false)
    expect(allowsChromaticNotes(JAZZ_FIGURE_LEVELS)).toBe(true)
    expect(generatorCapabilities(NEUTRAL_FIGURE_LEVELS)).toEqual({
      allowsChromaticApproach: false,
    })
    expect(generatorCapabilities(JAZZ_FIGURE_LEVELS)).toEqual({ allowsChromaticApproach: true })
  })

  it('allows chromatic notes when only one chromatic figure is not off', () => {
    expect(allowsChromaticNotes(neutralWith({ chromaticApproach: 'favored' }))).toBe(true)
    expect(allowsChromaticNotes(neutralWith({ chromaticEnclosure: 'stronglyFavored' }))).toBe(true)
  })

  it('does not allow chromatic notes for a diatonic figure that is not off', () => {
    expect(
      allowsChromaticNotes(
        neutralWith({ appoggiatura: 'stronglyFavored', diatonicEnclosure: 'favored' }),
      ),
    ).toBe(false)
  })

  it('allows a free figure exactly when its level is not off', () => {
    expect(allowsFreeFigure(NEUTRAL_FIGURE_LEVELS, 'passingTone')).toBe(true)
    expect(allowsFreeFigure(NEUTRAL_FIGURE_LEVELS, 'appoggiatura')).toBe(false)
    expect(allowsFreeFigure(NEUTRAL_FIGURE_LEVELS, 'chromaticApproach')).toBe(false)
    expect(allowsFreeFigure(JAZZ_FIGURE_LEVELS, 'chromaticApproach')).toBe(true)
    expect(allowsFreeFigure(neutralWith({ appoggiatura: 'favored' }), 'appoggiatura')).toBe(true)
  })
})

// @test-link [[module_figure_levels]]
describe('parseFigureLevels', () => {
  it('reads levels back into a fresh frozen value, keys in figure order', () => {
    const shuffled = Object.fromEntries(Object.entries(JAZZ_FIGURE_LEVELS).reverse())
    const parsed = parseFigureLevels(shuffled)
    expect(parsed).toStrictEqual(JAZZ_FIGURE_LEVELS)
    expect(Object.keys(parsed)).toEqual([...FIGURE_IDS])
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(parseFigureLevels(structuredClone(NEUTRAL_FIGURE_LEVELS))).toStrictEqual(
      NEUTRAL_FIGURE_LEVELS,
    )
  })

  it('refuses levels missing a figure', () => {
    const { appoggiatura, ...missing } = NEUTRAL_FIGURE_LEVELS
    void appoggiatura
    expect(() => parseFigureLevels(missing)).toThrow(FigureLevelsError)
    expect(() => parseFigureLevels(missing)).toThrow(/missing the figure "appoggiatura"/u)
  })

  it('refuses levels naming an unknown figure', () => {
    const extra = { ...NEUTRAL_FIGURE_LEVELS, blueNote: 'off' }
    expect(() => parseFigureLevels(extra)).toThrow(FigureLevelsError)
    expect(() => parseFigureLevels(extra)).toThrow(/unknown figure "blueNote"/u)
  })

  it('refuses an unknown level', () => {
    const unknown = { ...NEUTRAL_FIGURE_LEVELS, passingTone: 'sometimes' }
    expect(() => parseFigureLevels(unknown)).toThrow(FigureLevelsError)
    expect(() => parseFigureLevels(unknown)).toThrow(/"passingTone" the unknown level "sometimes"/u)
  })

  it('refuses a value that is not a plain object', () => {
    for (const value of [null, undefined, 'asToday', 3, [...FIGURE_IDS]]) {
      expect(() => parseFigureLevels(value)).toThrow(FigureLevelsError)
    }
  })
})
