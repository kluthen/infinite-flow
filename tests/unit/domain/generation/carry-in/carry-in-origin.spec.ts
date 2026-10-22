/**
 * The carry-in's origin: a carry-in from a phrase is exactly v3.1's (fields, refusals and bytes),
 * and a carry-in from no phrase (the doodle's join into a Jam's phrase 1) holds only the pitch and
 * the window, is checked only for the pitch inside the window, and is received only by an intent
 * that also holds a steering block.
 */

import { describe, expect, it } from 'vitest'

import {
  CarryInError,
  isPhraseCarryIn,
  makeCarryIn,
  parseCarryIn,
  parsePhraseCarryIn,
  type CarryIn,
  type NoPhraseCarryIn,
} from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeConcertPitch, type ConcertPitch } from '@/domain/events/concert-pitch'
import { levelsForProfile } from '@/domain/figures/figure-levels'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { SAMPLE_STEERING } from '../request-inputs-fixture'
import { BASE_CONTROLS, buildIntent, carryInAfter, generateSuccess } from './carry-in-fixture'

/** The c-keyboard's Middle window, which a Middle intent offers. */
const MIDDLE_MIN = 54
const MIDDLE_MAX = 66

/** Intent: the input of a carry-in from no phrase at the given pitch inside the Middle window. */
function noPhraseInput(midi = 60): NoPhraseCarryIn {
  return {
    origin: 'none',
    lastPitch: {
      midi: midi as ConcertPitch,
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(MIDDLE_MIN, MIDDLE_MAX),
    finalHarmony: null,
  }
}

/** Intent: the same input with a part replaced by a value the form does not allow. */
function withPart(part: Record<string, unknown>): CarryIn {
  return { ...noPhraseInput(), ...part } as unknown as CarryIn
}

/** The carry-in a real phrase 1 (C keyboard, Middle, seed 11) hands forward, as v3.1 wrote it. */
const V31_PHRASE_CARRY_IN_JSON =
  '{"lastPitch":{"midi":59,"arrivingInterval":0,"recovery":{"kind":"settled"}},' +
  '"registerWindow":{"kind":"RegisterWindow","minMidi":54,"maxMidi":66},' +
  '"finalHarmony":{"triad":{"degree":5,"pitchClasses":[7,11,2],"quality":"major"},' +
  '"role":"open_arrival","endpoint":{"kind":"tonal_degree_five_chord_tone","degree":5}},' +
  '"phraseNumber":1}'

/** Intent: the carry-in a real phrase 1 (C keyboard, Middle, seed 11) hands forward. */
function realPhraseCarryIn(): CarryIn {
  const intent = buildIntent({ seed: 11 })
  return carryInAfter(intent, generateSuccess(intent), 1)
}

/** Intent: the plain intent input of a Middle phrase receiving a carry-in. */
function intentInput(carryIn: CarryIn) {
  return {
    requestId: makeRequestId('carry-in-origin-12'),
    seed: makeSeed(12),
    controls: BASE_CONTROLS,
    figureLevels: levelsForProfile('Neutral'),
    carryIn,
  }
}

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('a carry-in from no phrase', () => {
  it('is accepted with its pitch inside the window, frozen, in its own key order', () => {
    const carryIn = makeCarryIn(noPhraseInput())

    expect(carryIn).toStrictEqual(noPhraseInput())
    expect(Object.keys(carryIn)).toEqual(['origin', 'lastPitch', 'registerWindow', 'finalHarmony'])
    expect(Object.keys(carryIn.lastPitch)).toEqual(['midi', 'arrivingInterval', 'recovery'])
    expect(Object.isFrozen(carryIn)).toBe(true)
    expect(Object.isFrozen(carryIn.lastPitch)).toBe(true)
    expect(Object.isFrozen(carryIn.lastPitch.recovery)).toBe(true)
    expect(Object.isFrozen(carryIn.registerWindow)).toBe(true)
    expect(isPhraseCarryIn(carryIn)).toBe(false)
    expect(carryIn).not.toHaveProperty('phraseNumber')
  })

  it('is accepted at each bound of the window and refused one semitone outside it', () => {
    expect(makeCarryIn(noPhraseInput(MIDDLE_MIN)).lastPitch.midi).toBe(MIDDLE_MIN)
    expect(makeCarryIn(noPhraseInput(MIDDLE_MAX)).lastPitch.midi).toBe(MIDDLE_MAX)
    expect(() => makeCarryIn(noPhraseInput(MIDDLE_MIN - 1))).toThrow(/outside the carried window/u)
    expect(() => makeCarryIn(noPhraseInput(MIDDLE_MAX + 1))).toThrow(/outside the carried window/u)
    expect(() => makeCarryIn(noPhraseInput(MIDDLE_MAX + 1))).toThrow(CarryInError)
  })

  it('refuses a pitch that is not a concert pitch', () => {
    expect(() => makeCarryIn(noPhraseInput(60.5))).toThrow(CarryInError)
  })

  it('refuses an arriving interval, an owed recovery, a chord or a phrase number', () => {
    const lastPitch = noPhraseInput().lastPitch
    expect(() =>
      makeCarryIn(withPart({ lastPitch: { ...lastPitch, arrivingInterval: 2 } })),
    ).toThrow(/no arriving interval/u)
    expect(() =>
      makeCarryIn(
        withPart({
          lastPitch: {
            ...lastPitch,
            arrivingInterval: 5,
            recovery: { kind: 'owed', leapDirection: 1 },
          },
        }),
      ),
    ).toThrow(CarryInError)
    expect(() =>
      makeCarryIn(
        withPart({ lastPitch: { ...lastPitch, recovery: { kind: 'owed', leapDirection: 1 } } }),
      ),
    ).toThrow(/owes no leap recovery/u)
    expect(() => makeCarryIn(withPart({ finalHarmony: realPhraseCarryIn().finalHarmony }))).toThrow(
      /no chord/u,
    )
    expect(() => makeCarryIn(withPart({ phraseNumber: 1 }))).toThrow(/no phrase number/u)
  })

  it('refuses an origin other than none', () => {
    expect(() => makeCarryIn(withPart({ origin: 'doodle' }))).toThrow(CarryInError)
    expect(() => makeCarryIn(withPart({ origin: 'phrase' }))).toThrow(/origin/u)
    expect(() => makeCarryIn(withPart({ ...realPhraseCarryIn(), origin: 'phrase' }))).toThrow(
      CarryInError,
    )
  })

  it('parses its own structured clone back to an equal value', () => {
    const carryIn = makeCarryIn(noPhraseInput())
    const parsed = parseCarryIn(structuredClone(carryIn))

    expect(parsed).toStrictEqual(carryIn)
    expect(Object.keys(parsed)).toEqual(Object.keys(carryIn))
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('refuses, when parsed, any extra or missing key at every level', () => {
    const clone = (): Record<string, unknown> => ({
      ...structuredClone(makeCarryIn(noPhraseInput())),
    })
    expect(() => parseCarryIn({ ...clone(), phraseNumber: 1 })).toThrow(
      /unknown field "phraseNumber"/u,
    )
    const missing = clone()
    delete missing.finalHarmony
    expect(() => parseCarryIn(missing)).toThrow(/missing field "finalHarmony"/u)
    const lastPitch = clone().lastPitch as Record<string, unknown>
    expect(() => parseCarryIn({ ...clone(), lastPitch: { ...lastPitch, tie: false } })).toThrow(
      CarryInError,
    )
    const noInterval: Record<string, unknown> = { ...lastPitch }
    delete noInterval.arrivingInterval
    expect(() => parseCarryIn({ ...clone(), lastPitch: noInterval })).toThrow(CarryInError)
    expect(() =>
      parseCarryIn({
        ...clone(),
        lastPitch: { ...lastPitch, recovery: { kind: 'settled', x: 1 } },
      }),
    ).toThrow(CarryInError)
    expect(() =>
      parseCarryIn({ ...clone(), lastPitch: { ...lastPitch, arrivingInterval: 1 } }),
    ).toThrow(CarryInError)
    expect(() =>
      parseCarryIn({ ...clone(), registerWindow: { minMidi: MIDDLE_MIN, maxMidi: MIDDLE_MAX } }),
    ).toThrow(CarryInError)
    expect(() =>
      parseCarryIn({ ...clone(), finalHarmony: structuredClone(realPhraseCarryIn().finalHarmony) }),
    ).toThrow(CarryInError)
    expect(() => parseCarryIn({ ...clone(), origin: 'phrase' })).toThrow(CarryInError)
  })

  it('is refused by the phrase parser as v3.1 refuses an unknown field', () => {
    expect(() => parsePhraseCarryIn(structuredClone(makeCarryIn(noPhraseInput())))).toThrow(
      'CarryIn has unknown field "origin".',
    )
  })
})

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_join_carry_in_limited]]
describe('a carry-in from a phrase, as v3.1 had it', () => {
  it('keeps its four keys and serializes byte for byte as v3.1 did', () => {
    const carryIn = realPhraseCarryIn()

    expect(isPhraseCarryIn(carryIn)).toBe(true)
    expect(JSON.stringify(carryIn)).toBe(V31_PHRASE_CARRY_IN_JSON)
    expect(JSON.stringify(parseCarryIn(JSON.parse(V31_PHRASE_CARRY_IN_JSON)))).toBe(
      V31_PHRASE_CARRY_IN_JSON,
    )
    expect(JSON.stringify(parsePhraseCarryIn(JSON.parse(V31_PHRASE_CARRY_IN_JSON)))).toBe(
      V31_PHRASE_CARRY_IN_JSON,
    )
  })

  it('still refuses phrase number 0 and a carry-in holding an origin key', () => {
    const carryIn = realPhraseCarryIn()
    expect(() => makeCarryIn({ ...carryIn, phraseNumber: 0 } as CarryIn)).toThrow(CarryInError)
    expect(() => parseCarryIn({ ...structuredClone(carryIn), origin: 'none' })).toThrow(
      CarryInError,
    )
  })
})

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('an intent receiving a carry-in from no phrase', () => {
  it('accepts it with a steering block, in the one field order', () => {
    const carryIn = makeCarryIn(noPhraseInput())
    const intent = makeCarryInGenerationIntent({
      ...intentInput(carryIn),
      steering: SAMPLE_STEERING,
    })

    expect(intent.carryIn).toBe(carryIn)
    expect(intent.steering).toStrictEqual(SAMPLE_STEERING)
    expect(Object.keys(intent).slice(-3)).toEqual(['registerIntent', 'carryIn', 'steering'])
    expect(Object.isFrozen(intent)).toBe(true)
  })

  it('refuses it without a steering block', () => {
    const carryIn = makeCarryIn(noPhraseInput())
    expect(() => makeCarryInGenerationIntent(intentInput(carryIn))).toThrow(CarryInError)
    expect(() => makeCarryInGenerationIntent(intentInput(carryIn))).toThrow(/steering block/u)
  })

  it('still checks its window against the register choice', () => {
    const carryIn = makeCarryIn({
      ...noPhraseInput(),
      registerWindow: makeRegisterWindow(60, 72),
      lastPitch: { ...noPhraseInput().lastPitch, midi: makeConcertPitch(64) },
    })
    expect(() =>
      makeCarryInGenerationIntent({ ...intentInput(carryIn), steering: SAMPLE_STEERING }),
    ).toThrow(/the High window, but the register choice is Middle/u)
  })
})
