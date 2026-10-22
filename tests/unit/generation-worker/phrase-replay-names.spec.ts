/**
 * The replay report's readable carry-in names, by origin: a carry-in from a phrase is named as
 * v3.1 named it (its phrase number, last pitch, window and chord), one from no phrase by its
 * origin, with no phrase number and no chord.
 */

import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeCarryIn, parseCarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { carryInNames, keyFor } from '@/generation-worker/phrase-replay-names'

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
