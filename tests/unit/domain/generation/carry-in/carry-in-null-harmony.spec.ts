/**
 * A carry-in without its harmonic part. After a mid-session key or collection change the old
 * carried chord means nothing in the new key, so the session hands forward `finalHarmony: null`:
 * an explicit value, never a missing field. The carried pitch keeps its leap state (interval and
 * leap-recovery rules still judge the join), but it is never a tense note owed a resolution, its
 * chord is never checked against the new harmony, and the new phrase's harmony starts as if no
 * chord had been carried.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  CarryInError,
  makeCarryIn,
  parseCarryIn,
  type CarryIn,
} from '@/domain/generation/carry-in/carry-in'
import { assertCarryInFitsIntent } from '@/domain/generation/carry-in/carry-in-fit'
import { owedRecoveryCanSettle } from '@/domain/generation/carry-in/phrase-ending-debt'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { attackMidis, buildIntent, carryInAfter, generateSuccess } from './carry-in-fixture'

/** The session's settings before the change: C Ionian. */
const C_IONIAN: Partial<GenerationControls> = { tonalCenter: 'C', collection: 'Ionian' }
/** The settings after a mid-session key and collection change: F# Dorian. */
const F_SHARP_DORIAN: Partial<GenerationControls> = { tonalCenter: 'F#', collection: 'Dorian' }
/** The pitch classes of F# Dorian, the collection the new phrase is generated in. */
const F_SHARP_DORIAN_PCS = makeHarmonyCollection('F#', 'Dorian').pitchClasses as readonly number[]
/** The Leaping interval cap of the fixture's base controls. */
const LEAPING_MAX_INTERVAL = 10
/** Seeds of the phrase generated after the change. */
const SEEDS = [21, 22, 23, 24] as const

/** Intent: the real carry-in a C Ionian phrase 1 (C keyboard, Middle, seed 11) hands forward. */
function ionianCarryIn(): CarryIn {
  const intent = buildIntent({ seed: 11, controls: C_IONIAN })
  return carryInAfter(intent, generateSuccess(intent), 1)
}

/** Intent: a carry-in with its harmonic part dropped, as a key or collection change leaves it. */
function withoutHarmony(carryIn: CarryIn): CarryIn {
  return makeCarryIn({ ...carryIn, finalHarmony: null })
}

/** Intent: a copy of a carry-in with its last pitch and leap state replaced, built unchecked. */
function withLastPitch(carryIn: CarryIn, lastPitch: Partial<CarryIn['lastPitch']>): CarryIn {
  return { ...carryIn, lastPitch: { ...carryIn.lastPitch, ...lastPitch } }
}

/** Intent: every MIDI value inside the carried window whose pitch class passes `keep`. */
function windowMidis(carryIn: CarryIn, keep: (pitchClass: number) => boolean): readonly number[] {
  const midis: number[] = []
  for (let midi = carryIn.registerWindow.minMidi; midi <= carryIn.registerWindow.maxMidi; midi++)
    if (keep(midi % 12)) midis.push(midi)
  return midis
}

/** Intent: a pitch of the carried window off the old carried chord, at least a skip below the top. */
function offOldChord(carryIn: CarryIn): number {
  const chord = carryIn.finalHarmony!.triad.pitchClasses as readonly number[]
  const off = windowMidis(carryIn, (pc) => !chord.includes(pc)).find(
    (midi) => midi - 3 >= carryIn.registerWindow.minMidi,
  )
  if (off === undefined) throw new Error('No pitch off the carried chord inside the window.')
  return off
}

/** Intent: the F# Dorian intent of the phrase after the change, receiving the given carry-in. */
function afterChange(seed: number, carryIn?: CarryIn): GenerationIntent {
  return buildIntent({
    seed,
    controls: F_SHARP_DORIAN,
    label: 'key-change',
    ...(carryIn === undefined ? {} : { carryIn }),
  })
}

/**
 * Intent: generate the F# Dorian phrase after the change for every seed, asserting each join: the
 * independent validator accepts it, the first interval keeps the interval cap, the carried window
 * is kept, beat 1 is a fresh attack and the same intent reproduces the same phrase. Returns the
 * first attack of every phrase.
 */
function generateAfterChange(carryIn: CarryIn): readonly number[] {
  return SEEDS.map((seed) => {
    const intent = afterChange(seed, carryIn)
    const outcome = generateSuccess(intent)
    expect(
      validateGenerationResult({
        intent,
        request: outcome.request,
        result: outcome.result,
        provenance: outcome.provenance,
      }),
    ).toEqual({ kind: 'valid_generation_result' })
    const first = attackMidis(outcome.result.timeline.measures)[0]!
    expect(Math.abs(first - carryIn.lastPitch.midi)).toBeLessThanOrEqual(LEAPING_MAX_INTERVAL)
    expect(outcome.request.registerWindow).toEqual(carryIn.registerWindow)
    expect(outcome.request.carryIn).toEqual(carryIn)
    const firstEvent = outcome.result.timeline.measures[0]!.events[0]!
    expect(firstEvent.kind === 'note' && !firstEvent.tieContinuation).toBe(true)
    expect(generatePhrase(intent)).toEqual(outcome)
    return first
  })
}

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[entity_phrase_carry_in]]
describe('a carry-in without its harmonic part', () => {
  it('is built with an explicit null harmony, still four items and deeply immutable', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    expect(carryIn.finalHarmony).toBeNull()
    expect(Object.keys(carryIn).sort()).toEqual([
      'finalHarmony',
      'lastPitch',
      'phraseNumber',
      'registerWindow',
    ])
    expect(Object.isFrozen(carryIn)).toBe(true)
    expect(Object.isFrozen(carryIn.lastPitch)).toBe(true)
  })

  it('parses its own structured clone back to an equal value', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    expect(parseCarryIn(structuredClone(carryIn))).toStrictEqual(carryIn)
  })

  it('refuses a missing or undefined harmony: only an explicit null drops it', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    const missing: Record<string, unknown> = { ...structuredClone(carryIn) }
    delete missing.finalHarmony
    expect(() => parseCarryIn(missing)).toThrow(CarryInError)
    expect(() => parseCarryIn({ ...structuredClone(carryIn), finalHarmony: undefined })).toThrow(
      CarryInError,
    )
    expect(() =>
      makeCarryIn({ ...carryIn, finalHarmony: undefined } as unknown as CarryIn),
    ).toThrow(CarryInError)
  })

  it('no longer counts a pitch off the old chord as a tense note owed a step', () => {
    const carryIn = ionianCarryIn()
    const midi = offOldChord(carryIn)
    const skipped = withLastPitch(carryIn, { midi: makeConcertPitch(midi), arrivingInterval: 3 })
    expect(() => makeCarryIn(skipped)).toThrow(CarryInError)
    expect(makeCarryIn({ ...skipped, finalHarmony: null }).lastPitch.midi).toBe(midi)
  })

  it('keeps its leap-recovery state checks', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    const owedUp = { kind: 'owed' as const, leapDirection: 1 as const }
    expect(() =>
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: -7, recovery: owedUp })),
    ).toThrow(CarryInError)
    expect(
      makeCarryIn(withLastPitch(carryIn, { arrivingInterval: 7, recovery: owedUp })).lastPitch
        .recovery,
    ).toEqual(owedUp)
  })
})

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
// @test-link [[entity_phrase_carry_in]]
describe('a carry-in received by an intent in another key and collection', () => {
  it('is refused with the old harmony, and accepted once the harmony is dropped', () => {
    const carryIn = ionianCarryIn()
    const receiver = afterChange(12)
    expect(() => assertCarryInFitsIntent(carryIn, receiver)).toThrow(CarryInError)
    expect(() => afterChange(12, carryIn)).toThrow(CarryInError)
    const dropped = withoutHarmony(carryIn)
    expect(() => assertCarryInFitsIntent(dropped, receiver)).not.toThrow()
    expect(afterChange(12, dropped).carryIn).toStrictEqual(dropped)
  })

  it('accepts a carried pitch outside the new collection, which is no tense note', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    const outside = windowMidis(carryIn, (pc) => !F_SHARP_DORIAN_PCS.includes(pc))[0]!
    const moved = makeCarryIn(
      withLastPitch(carryIn, { midi: makeConcertPitch(outside), arrivingInterval: 2 }),
    )
    expect(afterChange(12, moved).carryIn).toStrictEqual(moved)
  })

  it('still refuses a window the register choice does not resolve to', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    expect(() =>
      buildIntent({ seed: 12, carryIn, controls: { ...F_SHARP_DORIAN, register: 'High' } }),
    ).toThrow(CarryInError)
  })

  it('still refuses an owed recovery no tonic-triad tone of the new key could repay', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    const unsettleable = windowMidis(carryIn, () => true).find(
      (midi) => !owedRecoveryCanSettle(midi, -1, F_SHARP_DORIAN_PCS, carryIn.registerWindow),
    )
    expect(unsettleable).toBeDefined()
    const owing = makeCarryIn(
      withLastPitch(carryIn, {
        midi: makeConcertPitch(unsettleable!),
        arrivingInterval: -7,
        recovery: { kind: 'owed', leapDirection: -1 },
      }),
    )
    expect(() => afterChange(12, owing)).toThrow(CarryInError)
  })
})

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
describe('generating the phrase after a key and collection change', () => {
  it('generates from a real C Ionian carry-in with its harmony dropped', () => {
    generateAfterChange(withoutHarmony(ionianCarryIn()))
  })

  it('generates from a carried pitch outside the new collection without resolving it', () => {
    const carryIn = withoutHarmony(ionianCarryIn())
    const outside = windowMidis(carryIn, (pc) => !F_SHARP_DORIAN_PCS.includes(pc))
    const middle = outside[Math.floor(outside.length / 2)]!
    generateAfterChange(
      makeCarryIn(withLastPitch(carryIn, { midi: makeConcertPitch(middle), arrivingInterval: 3 })),
    )
  })

  for (const leapDirection of [1, -1] as const)
    it(`repays a recovery owed after a large leap ${leapDirection > 0 ? 'up' : 'down'}`, () => {
      const carryIn = withoutHarmony(ionianCarryIn())
      const settleable = windowMidis(carryIn, () => true).filter((midi) =>
        owedRecoveryCanSettle(midi, leapDirection, F_SHARP_DORIAN_PCS, carryIn.registerWindow),
      )
      const middle = settleable[Math.floor(settleable.length / 2)]!
      const owing = makeCarryIn(
        withLastPitch(carryIn, {
          midi: makeConcertPitch(middle),
          arrivingInterval: 7 * leapDirection,
          recovery: { kind: 'owed', leapDirection },
        }),
      )
      for (const first of generateAfterChange(owing)) {
        const interval = first - middle
        expect(Math.sign(interval)).toBe(-leapDirection)
        expect(Math.abs(interval)).toBeGreaterThanOrEqual(1)
        expect(Math.abs(interval)).toBeLessThanOrEqual(4)
      }
    })
})
