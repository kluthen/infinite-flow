import { describe, expect, it } from 'vitest'

import {
  FIGURE_LEVEL_FIELDS,
  figureLevelOfSegment,
} from '@/components/controls/figure-level-options'
import { FIGURE_IDS, FIGURE_LEVEL_IDS } from '@/domain/figures/figure-levels'

describe('FIGURE_LEVEL_FIELDS', () => {
  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('lists the seven figures in the fixed figure order, with the handoff labels', () => {
    expect(FIGURE_LEVEL_FIELDS.map((field) => field.figure)).toEqual([...FIGURE_IDS])
    expect(FIGURE_LEVEL_FIELDS.map((field) => field.label)).toEqual([
      'Passing tone',
      'Accented passing tone',
      'Neighbor tone',
      'Appoggiatura',
      'Diatonic enclosure',
      'Chromatic approach',
      'Chromatic enclosure',
    ])
  })

  // @test-link [[module_figure_level_options]]
  it("gives each figure the handoff's note, saying what it is and what rhythm it needs", () => {
    const notes = Object.fromEntries(FIGURE_LEVEL_FIELDS.map((field) => [field.figure, field.note]))
    expect(notes).toEqual({
      passingTone:
        'A scale note filling the gap between two notes, like C–D–E. Needs three notes in a row.',
      accentedPassingTone:
        'The same, landing on beat 1 or 3, so it sounds tenser. Needs a note on beat 1 or 3.',
      neighborTone:
        'A step away from a note and straight back, like E–F–E. Needs three notes in a row.',
      appoggiatura:
        'A leap to a note outside the chord on beat 1 or 3, then a step down or up onto a chord note. Needs a note just before beat 1 or 3.',
      diatonicEnclosure:
        "The scale notes just above and below a chord note, then that note, like F–D–E. Needs three back-to-back notes under one chord, so it's rare with quarter notes.",
      chromaticApproach:
        'A note from outside the key, a half step from the next note, like D♯–E. Needs two back-to-back notes.',
      chromaticEnclosure:
        "Notes a half step above and below a chord note, then that note, like F–D♯–E. Needs three back-to-back notes under one chord, so it's rare with quarter notes.",
    })
  })

  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('offers every figure the four levels in order, labelled Off, Rarely, Often, Very often', () => {
    for (const field of FIGURE_LEVEL_FIELDS) {
      expect(field.options.map((option) => option.value)).toEqual([...FIGURE_LEVEL_IDS])
      expect(field.options.map((option) => option.label)).toEqual([
        'Off',
        'Rarely',
        'Often',
        'Very often',
      ])
    }
  })

  // @test-link [[module_figure_level_options]]
  // @test-link [[req_embellishment_figure_levels]]
  it('disables no option of any figure: no passing-and-neighbor rule (spec D378)', () => {
    for (const field of FIGURE_LEVEL_FIELDS) {
      for (const option of field.options) {
        expect(option.disabled, `${field.label} ${option.label}`).toBeUndefined()
        expect(option.describedBy, `${field.label} ${option.label}`).toBeUndefined()
      }
    }
  })

  // @test-link [[module_figure_level_options]]
  it('is frozen, so no caller can change an option or a field', () => {
    expect(Object.isFrozen(FIGURE_LEVEL_FIELDS)).toBe(true)
    expect(Object.isFrozen(FIGURE_LEVEL_FIELDS[0])).toBe(true)
    expect(Object.isFrozen(FIGURE_LEVEL_FIELDS[0]!.options[0])).toBe(true)
  })
})

describe('figureLevelOfSegment', () => {
  // @test-link [[module_figure_level_options]]
  it('reads every segment of every figure as its level, so any combination can be chosen', () => {
    for (const field of FIGURE_LEVEL_FIELDS) {
      for (const level of FIGURE_LEVEL_IDS) {
        expect(figureLevelOfSegment(field, level)).toBe(level)
      }
    }
  })

  // @test-link [[module_figure_level_options]]
  it('refuses a value that is no level, naming the figure', () => {
    expect(() => figureLevelOfSegment(FIGURE_LEVEL_FIELDS[2]!, 'sometimes')).toThrow(
      'Neighbor tone has no level "sometimes".',
    )
  })
})
