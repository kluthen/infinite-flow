/**
 * The replay report's readable carry-in names, by origin: a carry-in from a phrase is named as
 * v3.1 named it (its phrase number, last pitch, window and chord), one from no phrase by its
 * origin, with no phrase number and no chord.
 */

import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeCarryIn, parseCarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type { CollectionDegree } from '@/domain/harmony/harmony-types'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { carryInNames, keyFor } from '@/generation-worker/phrase-replay-names'
import { seventhOf } from '../domain/harmony/seventh-chord-fixtures'

/** The carry-in a real phrase 1 (C keyboard, Middle, seed 11) hands forward, as v3.1 wrote it. */
const V31_PHRASE_CARRY_IN =
  '{"lastPitch":{"midi":59,"arrivingInterval":0,"recovery":{"kind":"settled"}},' +
  '"registerWindow":{"kind":"RegisterWindow","minMidi":54,"maxMidi":66},' +
  '"finalHarmony":{"triad":{"degree":5,"pitchClasses":[7,11,2],"quality":"major"},' +
  '"role":"open_arrival","endpoint":{"kind":"tonal_degree_five_chord_tone","degree":5}},' +
  '"phraseNumber":1}'

const C_MAJOR = keyFor('C', 'Major')

/** The names v3.1 gave that carry-in, in C major. */
const V31_PHRASE_NAMES = {
  phraseNumber: 1,
  lastPitch: { midi: 59, name: 'B3' },
  registerWindow: { minMidi: 54, maxMidi: 66, minName: 'F♯3', maxName: 'F♯4' },
  finalChord: {
    symbol: 'G',
    degree: 5,
    quality: 'major',
    pitchClasses: [7, 11, 2],
    pitchClassNames: ['G', 'B', 'D'],
    role: 'open_arrival',
    endpointClass: 'tonal_degree_five_chord_tone',
  },
}

// @test-link [[service_headless_phrase_replay]]
// @test-link [[entity_phrase_carry_in]]
describe('carry-in names', () => {
  it('names a carry-in from a phrase exactly as v3.1 did', () => {
    const names = carryInNames(parseCarryIn(JSON.parse(V31_PHRASE_CARRY_IN)), C_MAJOR)

    expect(names).toStrictEqual(V31_PHRASE_NAMES)
    expect(Object.keys(names)).toEqual([
      'phraseNumber',
      'lastPitch',
      'registerWindow',
      'finalChord',
    ])
  })

  // @test-link [[rule_jam_phrase_one_joins_doodle]]
  it('names a carry-in from no phrase by its origin, with no phrase number and no chord', () => {
    const carryIn = makeCarryIn({
      origin: 'none',
      lastPitch: {
        midi: makeConcertPitch(60),
        arrivingInterval: null,
        recovery: { kind: 'settled' },
      },
      registerWindow: makeRegisterWindow(54, 66),
      finalHarmony: null,
    })
    const names = carryInNames(carryIn, C_MAJOR)

    expect(names).toStrictEqual({
      origin: 'none',
      lastPitch: { midi: 60, name: 'C4' },
      registerWindow: { minMidi: 54, maxMidi: 66, minName: 'F♯3', maxName: 'F♯4' },
      finalChord: null,
    })
    expect(Object.keys(names)).toEqual(['origin', 'lastPitch', 'registerWindow', 'finalChord'])
  })
})

/** The v3.1 phrase carry-in, its carried chord moved to `degree` of C Major in seventh form. */
function carryInWithSeventhOn(degree: CollectionDegree): unknown {
  const wire = JSON.parse(V31_PHRASE_CARRY_IN)
  wire.finalHarmony.triad = makeHarmonyCollection('C', 'Major').triads[degree - 1]
  wire.finalHarmony.seventh = seventhOf(degree)
  return wire
}

// @test-link [[rule_seventh_chord_symbols]]
describe('carried chord symbol', () => {
  // @test-link [[rule_seventh_chord_symbols]]
  it.each([
    [5, 'G7'],
    [7, 'Bm7♭5'],
  ] as const)(
    'names a carried seventh chord on degree %i with its seventh suffix: %s',
    (degree, symbol) => {
      const carryIn = parseCarryIn(carryInWithSeventhOn(degree), 'triad-or-seventh')
      const names = carryInNames(carryIn, C_MAJOR)

      expect(names.finalChord?.symbol).toBe(symbol)
    },
  )

  // @test-link [[service_headless_phrase_replay]]
  it.each([
    [1, 'Cmaj7', 'major-seventh', [0, 4, 7, 11], ['C', 'E', 'G', 'B']],
    [2, 'Dm7', 'minor-seventh', [2, 5, 9, 0], ['D', 'F', 'A', 'C']],
    [5, 'G7', 'dominant-seventh', [7, 11, 2, 5], ['G', 'B', 'D', 'F']],
    [7, 'Bm7♭5', 'half-diminished-seventh', [11, 2, 5, 9], ['B', 'D', 'F', 'A']],
  ] as const)(
    'gives a carried seventh chord on degree %i (%s) its seventh quality and four notes',
    (degree, symbol, quality, pitchClasses, pitchClassNames) => {
      const wire = carryInWithSeventhOn(degree) as { lastPitch: { midi: number } }
      wire.lastPitch.midi = 54 + ((pitchClasses[0] - 6 + 12) % 12)
      const chord = carryInNames(parseCarryIn(wire, 'triad-or-seventh'), C_MAJOR).finalChord

      expect(chord).toStrictEqual({
        symbol,
        degree,
        quality,
        pitchClasses,
        pitchClassNames,
        role: 'open_arrival',
        endpointClass: 'tonal_degree_five_chord_tone',
      })
    },
  )

  // @test-link [[rule_seventh_chord_symbols]]
  it('keeps the triad symbol and the triad-only names for a carried triad', () => {
    const names = carryInNames(parseCarryIn(JSON.parse(V31_PHRASE_CARRY_IN)), C_MAJOR)

    expect(names.finalChord).toStrictEqual(V31_PHRASE_NAMES.finalChord)
  })
})
