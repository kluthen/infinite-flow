// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  CHORD_FAMILY_IDS,
  CHORD_FAMILY_LEVEL_IDS,
  ChordFamiliesError,
  isOffChordFamilies,
  OFF_CHORD_FAMILIES,
  parseChordFamilies,
} from '@/domain/chords/chord-families'

// @test-link [[module_generation_request_construction]]
describe('chord family and level ids', () => {
  it('lists the one family and the four levels in increasing order, frozen', () => {
    expect(CHORD_FAMILY_IDS).toEqual(['seventh-chords'])
    expect(CHORD_FAMILY_LEVEL_IDS).toEqual(['off', 'sometimes', 'favored', 'stronglyFavored'])
    expect(Object.isFrozen(CHORD_FAMILY_IDS)).toBe(true)
    expect(Object.isFrozen(CHORD_FAMILY_LEVEL_IDS)).toBe(true)
  })

  it('holds every family at off in OFF_CHORD_FAMILIES, frozen', () => {
    expect(OFF_CHORD_FAMILIES).toStrictEqual({ 'seventh-chords': 'off' })
    expect(Object.isFrozen(OFF_CHORD_FAMILIES)).toBe(true)
    expect(isOffChordFamilies(OFF_CHORD_FAMILIES)).toBe(true)
  })

  it('tells families above off from families at off', () => {
    for (const level of ['sometimes', 'favored', 'stronglyFavored'] as const)
      expect(isOffChordFamilies({ 'seventh-chords': level }), level).toBe(false)
  })
})

// @test-link [[module_generation_request_construction]]
// @test-link [[rule_seventh_chord_draws_reproducible]]
describe('parseChordFamilies', () => {
  it.each(CHORD_FAMILY_LEVEL_IDS)('accepts the seventh chords at %s', (level) => {
    expect(parseChordFamilies({ 'seventh-chords': level })).toStrictEqual({
      'seventh-chords': level,
    })
  })

  it('returns a fresh frozen copy', () => {
    const input = { 'seventh-chords': 'favored' }
    const parsed = parseChordFamilies(input)

    expect(parsed).not.toBe(input)
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(parseChordFamilies(OFF_CHORD_FAMILIES)).not.toBe(OFF_CHORD_FAMILIES)
  })

  it('refuses families missing the seventh chords', () => {
    expect(() => parseChordFamilies({})).toThrow(ChordFamiliesError)
    expect(() => parseChordFamilies({})).toThrow(/missing the family "seventh-chords"/u)
  })

  it('refuses an unknown family', () => {
    const unknown = { 'ninth-chords': 'off' }
    expect(() => parseChordFamilies(unknown)).toThrow(ChordFamiliesError)
    expect(() => parseChordFamilies(unknown)).toThrow(/unknown family "ninth-chords"/u)
  })

  it('refuses an extra key beside the seventh chords', () => {
    const extra = { 'seventh-chords': 'off', level: 'off' }
    expect(() => parseChordFamilies(extra)).toThrow(ChordFamiliesError)
    expect(() => parseChordFamilies(extra)).toThrow(/unknown family "level"/u)
  })

  it('refuses an unknown level, the interface labels included', () => {
    for (const level of ['often', 'Often', 'mostly', 'asToday', 'Off', 1, null]) {
      const value = { 'seventh-chords': level }
      expect(() => parseChordFamilies(value), String(level)).toThrow(ChordFamiliesError)
      expect(() => parseChordFamilies(value), String(level)).toThrow(
        /"seventh-chords" the unknown level/u,
      )
    }
  })

  it('refuses a value that is not a plain object', () => {
    for (const value of [null, undefined, 'off', 3, ['seventh-chords']]) {
      expect(() => parseChordFamilies(value)).toThrow(ChordFamiliesError)
      expect(() => parseChordFamilies(value)).toThrow(/must be a plain object/u)
    }
  })
})
