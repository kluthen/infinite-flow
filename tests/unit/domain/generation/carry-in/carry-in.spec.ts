/**
 * The carry-in value: exactly four items, immutable, validated on its own, validated against the
 * intent that receives it, and derived from a real generated phrase.
 */

import { describe, expect, it } from 'vitest'

import {
  CarryInError,
  makeCarryIn,
  parseCarryIn,
  type CarryIn,
} from '@/domain/generation/carry-in/carry-in'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import {
  attackMidis,
  buildIntent,
  carryInAfter,
  generateSuccess,
  type SuccessOutcome,
} from './carry-in-fixture'

/** Intent: a real carry-in handed forward by a real phrase 1 (C keyboard, Middle, seed 11). */
function realCarryIn(): { carryIn: CarryIn; outcome: SuccessOutcome } {
  const intent = buildIntent({ seed: 11 })
  const outcome = generateSuccess(intent)
  return { carryIn: carryInAfter(intent, outcome, 1), outcome }
}

/**
 * Intent: a pitch one or two semitones from the carried pitch, inside the carried window, that is
 * a scale tone of C major but not a tone of the carried chord: a tense note.
 */
function tenseNeighbour(carryIn: CarryIn): number {
  const chord = carryIn.finalHarmony!.triad.pitchClasses as readonly number[]
  const cMajor = [0, 2, 4, 5, 7, 9, 11]
  const midi = carryIn.lastPitch.midi
  const tense = [midi + 1, midi - 1, midi + 2, midi - 2].find(
    (candidate) =>
      cMajor.includes(candidate % 12) &&
      !chord.includes(candidate % 12) &&
      candidate >= carryIn.registerWindow.minMidi &&
      candidate <= carryIn.registerWindow.maxMidi,
  )
  if (tense === undefined) throw new Error('No tense neighbour of the carried pitch.')
  return tense
}

/** Intent: a copy of a carry-in with its last pitch replaced. */
function withLastPitch(carryIn: CarryIn, lastPitch: Record<string, unknown>): CarryIn {
  return { ...carryIn, lastPitch: { ...carryIn.lastPitch, ...lastPitch } } as CarryIn
}

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_join_carry_in_limited]]
describe('carry-in value', () => {
  it('holds exactly the four items of a join and is deeply immutable', () => {
    const { carryIn } = realCarryIn()
    expect(Object.keys(carryIn).sort()).toEqual([
      'finalHarmony',
      'lastPitch',
      'phraseNumber',
      'registerWindow',
    ])
    expect(Object.keys(carryIn.lastPitch).sort()).toEqual(['arrivingInterval', 'midi', 'recovery'])
    expect(Object.keys(carryIn.finalHarmony!).sort()).toEqual(['endpoint', 'role', 'triad'])
    expect(Object.isFrozen(carryIn)).toBe(true)
    expect(Object.isFrozen(carryIn.lastPitch)).toBe(true)
    expect(Object.isFrozen(carryIn.finalHarmony!.triad)).toBe(true)
  })

  it('refuses a pitch outside the carried register window', () => {
    const { carryIn } = realCarryIn()
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { midi: carryIn.registerWindow.maxMidi + 1 })),
    ).toThrow(CarryInError)
  })

  it('refuses a non-integer or implausible arriving interval', () => {
    const { carryIn } = realCarryIn()
    expect(() => makeCarryIn(withLastPitch(carryIn, { arrivingInterval: 1.5 }))).toThrow(
      CarryInError,
    )
    expect(() => makeCarryIn(withLastPitch(carryIn, { arrivingInterval: 13 }))).toThrow(
      CarryInError,
    )
  })

  it('refuses an owed recovery that no arriving leap in that direction explains', () => {
    const { carryIn } = realCarryIn()
    const owedUp = { kind: 'owed', leapDirection: 1 }
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: null, recovery: owedUp })),
    ).toThrow(CarryInError)
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: -7, recovery: owedUp })),
    ).toThrow(CarryInError)
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: 2, recovery: owedUp })),
    ).toThrow(CarryInError)
    expect(
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: 7, recovery: owedUp })).lastPitch
        .recovery,
    ).toEqual(owedUp)
  })

  it('refuses a phrase number that is not a positive whole number', () => {
    const { carryIn } = realCarryIn()
    for (const phraseNumber of [0, -1, 1.5, Number.NaN])
      expect(() => makeCarryIn({ ...carryIn, phraseNumber })).toThrow(CarryInError)
  })

  it('refuses a carried chord whose pitch classes do not form a diatonic triad shape', () => {
    const { carryIn } = realCarryIn()
    const triad = { ...carryIn.finalHarmony!.triad, pitchClasses: [0, 4, 13] }
    expect(() =>
      makeCarryIn({
        ...carryIn,
        finalHarmony: { ...carryIn.finalHarmony, triad },
      } as unknown as CarryIn),
    ).toThrow(CarryInError)
  })

  it('accepts a tense carried pitch reached by step, and refuses one reached by a skip', () => {
    const { carryIn } = realCarryIn()
    const tense = tenseNeighbour(carryIn)
    const step = tense - carryIn.lastPitch.midi
    expect(
      makeCarryIn(withLastPitch(carryIn, { midi: tense, arrivingInterval: step })).lastPitch.midi,
    ).toBe(tense)
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { midi: tense, arrivingInterval: 3 * Math.sign(step) })),
    ).toThrow(CarryInError)
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { midi: tense, arrivingInterval: null })),
    ).toThrow(CarryInError)
  })

  it('parses its own structured clone back to an equal value, and refuses extra fields', () => {
    const { carryIn } = realCarryIn()
    expect(parseCarryIn(structuredClone(carryIn))).toStrictEqual(carryIn)
    expect(() => parseCarryIn({ ...structuredClone(carryIn), tempo: 120 })).toThrow(CarryInError)
    expect(() => parseCarryIn({ ...structuredClone(carryIn), seed: 3 })).toThrow(CarryInError)
    const missing: Record<string, unknown> = { ...structuredClone(carryIn) }
    delete missing.phraseNumber
    expect(() => parseCarryIn(missing)).toThrow(CarryInError)
    expect(() => parseCarryIn('carry-in')).toThrow(CarryInError)
    expect(() =>
      parseCarryIn({
        ...structuredClone(carryIn),
        lastPitch: { ...structuredClone(carryIn.lastPitch), recovery: { kind: 'maybe' } },
      }),
    ).toThrow(CarryInError)
  })
})

// @test-link [[entity_phrase_carry_in]]
describe('deriveCarryIn', () => {
  it('reads the four items from a generated phrase and the ordinal it was given', () => {
    const { carryIn, outcome } = realCarryIn()
    const midis = attackMidis(outcome.result.timeline.measures)
    const finalEvent = outcome.provenance.harmony.events.at(-1)!
    expect(carryIn.lastPitch.midi).toBe(midis.at(-1))
    expect(carryIn.lastPitch.arrivingInterval).toBe(midis.at(-1)! - midis.at(-2)!)
    expect(carryIn.lastPitch.recovery).toEqual({ kind: 'settled' })
    expect(carryIn.registerWindow).toEqual(outcome.request.registerWindow)
    expect(carryIn.finalHarmony).toEqual({
      triad: finalEvent.triad,
      role: finalEvent.role,
      endpoint: outcome.provenance.harmony.endpoint,
    })
    expect(carryIn.phraseNumber).toBe(1)
  })
})

// @test-link [[entity_phrase_carry_in]]
// @test-link [[rule_varying_register_once_per_session]]
describe('a carry-in checked against the intent that receives it', () => {
  it('is kept on the intent unchanged', () => {
    const { carryIn } = realCarryIn()
    expect(buildIntent({ seed: 12, carryIn }).carryIn).toStrictEqual(carryIn)
  })

  it('refuses a window the register choice does not offer', () => {
    const { carryIn } = realCarryIn()
    const window = makeRegisterWindow(55, 67)
    const shifted = { ...carryIn, registerWindow: window }
    expect(() => buildIntent({ seed: 12, carryIn: shifted })).toThrow(CarryInError)
  })

  it('refuses a fixed register whose window differs from the carried one', () => {
    const { carryIn } = realCarryIn()
    expect(() => buildIntent({ seed: 12, carryIn, controls: { register: 'High' } })).toThrow(
      CarryInError,
    )
  })

  it('accepts under Varying the window resolved for phrase 1', () => {
    const { carryIn } = realCarryIn()
    expect(buildIntent({ seed: 12, carryIn, controls: { register: 'Varying' } }).carryIn).toEqual(
      carryIn,
    )
  })

  it('refuses a carried chord the receiving collection does not build', () => {
    const { carryIn } = realCarryIn()
    expect(() =>
      buildIntent({ seed: 12, carryIn, controls: { tonalCenter: 'D', collection: 'Major' } }),
    ).toThrow(CarryInError)
  })

  it('refuses an endpoint class the receiving harmony settings never produce', () => {
    const { carryIn } = realCarryIn()
    expect(() =>
      buildIntent({ seed: 12, carryIn, controls: { harmonicMotion: 'Static' } }),
    ).toThrow(CarryInError)
  })

  it('refuses a tense carried pitch outside the receiving collection', () => {
    const { carryIn } = realCarryIn()
    const chord = carryIn.finalHarmony!.triad.pitchClasses as readonly number[]
    const midi = carryIn.lastPitch.midi
    const chromatic = [midi + 1, midi - 1].find(
      (candidate) =>
        ![0, 2, 4, 5, 7, 9, 11].includes(candidate % 12) && !chord.includes(candidate % 12),
    )
    expect(chromatic).toBeDefined()
    const shaped = makeCarryIn(
      withLastPitch(carryIn, { midi: chromatic, arrivingInterval: chromatic! - midi }),
    )
    expect(() => buildIntent({ seed: 12, carryIn: shaped })).toThrow(CarryInError)
  })

  it('refuses an owed recovery that no tonic-triad tone of the next phrase could repay', () => {
    const { carryIn } = realCarryIn()
    // G (MIDI 55, a tone of the carried G-B-D chord) after a downward large leap would need
    // G-sharp, A, B-flat or B: none is in the next phrase's C-E-G.
    const unsettleable = makeCarryIn(
      withLastPitch(carryIn, {
        midi: 55,
        arrivingInterval: -7,
        recovery: { kind: 'owed', leapDirection: -1 },
      }),
    )
    expect(() => buildIntent({ seed: 12, carryIn: unsettleable })).toThrow(CarryInError)
  })

  it('refuses a window carried from another instrument profile', () => {
    const { carryIn } = realCarryIn()
    expect(() =>
      buildIntent({ seed: 12, carryIn, controls: { instrumentProfileId: 'eb-alto' } }),
    ).toThrow(CarryInError)
  })
})
