/**
 * The pitch planner treats a carried pitch as the note before beat 1: the first interval of the
 * new phrase is held to the leapiness interval cap, an owed large-leap recovery is repaid by the
 * first interval, a tense carried note resolves onto the first note, a wide same-direction chain
 * arriving at the carried pitch is never continued across the join, and the first note is ranked
 * by its distance from the carried pitch. Each case sweeps seeds, asserts on every phrase that
 * generates, and requires at least half of them to generate.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationControls } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  makeCarryIn,
  type CarryIn,
  type PhraseCarryIn,
} from '@/domain/generation/carry-in/carry-in'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { BEFORE_JOIN_POSITION, carriedMotionState } from '@/domain/pitch/pitch-carry-in'
import { INITIAL_MOTION_STATE } from '@/domain/pitch/pitch-motion'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import {
  attackMidis,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../generation/carry-in/carry-in-fixture'

const SEEDS = Array.from({ length: 16 }, (_, index) => 101 + index)
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11]
const C_MAJOR_TONIC_TRIAD = [0, 4, 7]

/** Intent: a real carry-in handed forward by phrase 1 of the given controls (C major). */
function donorCarryIn(controls: Partial<GenerationControls>): PhraseCarryIn {
  const intent = buildIntent({ seed: 11, controls })
  return carryInAfter(intent, generateSuccess(intent), 1)
}

/** Intent: every MIDI value inside the carry-in's window whose pitch class passes `keep`. */
function windowMidis(carryIn: CarryIn, keep: (pitchClass: number) => boolean): readonly number[] {
  const midis: number[] = []
  for (let midi = carryIn.registerWindow.minMidi; midi <= carryIn.registerWindow.maxMidi; midi++)
    if (keep(midi % 12)) midis.push(midi)
  return midis
}

/** Intent: the donor carry-in with its last pitch and leap state replaced. */
function reshaped(
  donor: PhraseCarryIn,
  midi: number,
  leap: Partial<CarryIn['lastPitch']>,
): CarryIn {
  return makeCarryIn({
    ...donor,
    lastPitch: { ...donor.lastPitch, ...leap, midi: makeConcertPitch(midi) },
  })
}

/**
 * Intent: a carried-chord tone owing the recovery of a large leap in `leapDirection` that a C-E-G
 * tone of the window can repay, preferring the middle of the window.
 */
function owedCarryIn(controls: Partial<GenerationControls>, leapDirection: -1 | 1): CarryIn {
  const donor = donorCarryIn(controls)
  const chord = donor.finalHarmony!.triad.pitchClasses as readonly number[]
  const tonic = windowMidis(donor, (pc) => C_MAJOR_TONIC_TRIAD.includes(pc))
  const settleable = windowMidis(donor, (pc) => chord.includes(pc)).filter((midi) =>
    tonic.some((to) => Math.sign(to - midi) === -leapDirection && Math.abs(to - midi) <= 4),
  )
  const middle = settleable[Math.floor(settleable.length / 2)]!
  return reshaped(donor, middle, {
    arrivingInterval: 7 * leapDirection,
    recovery: { kind: 'owed', leapDirection },
  })
}

/** Intent: a tense carried note (a C-major scale tone off the carried chord) reached by a step. */
function tenseCarryIn(controls: Partial<GenerationControls>): CarryIn {
  const donor = donorCarryIn(controls)
  const chord = donor.finalHarmony!.triad.pitchClasses as readonly number[]
  const tonic = windowMidis(donor, (pc) => C_MAJOR_TONIC_TRIAD.includes(pc))
  const tense = windowMidis(donor, (pc) => C_MAJOR.includes(pc) && !chord.includes(pc)).filter(
    (midi) =>
      tonic.some((to) => Math.abs(to - midi) >= 1 && Math.abs(to - midi) <= 2) &&
      midi - 2 >= donor.registerWindow.minMidi,
  )
  const middle = tense[Math.floor(tense.length / 2)]!
  return reshaped(donor, middle, { arrivingInterval: 2 })
}

/** Intent: the first attack MIDI of each phrase that generates with the carry-in, per seed. */
function firstNotes(controls: Partial<GenerationControls>, carryIn: CarryIn): readonly number[] {
  return SEEDS.flatMap((seed) => {
    const outcome = generatePhrase(buildIntent({ seed, controls, carryIn }))
    return outcome.kind === 'generation_success'
      ? [attackMidis(outcome.result.timeline.measures)[0]!]
      : []
  })
}

// @test-link [[rule_join_interval_obeys_phrase_rules]]
// @test-link [[module_pitch_planner]]
describe('pitch planner with a carry-in', () => {
  it('keeps the join interval inside the Smooth four-semitone cap', () => {
    const controls = { leapiness: 'Smooth' as const, arpeggioChaos: 'Chaotic' as const }
    const carryIn = donorCarryIn(controls)
    const firsts = firstNotes(controls, carryIn)
    expect(firsts.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
    for (const first of firsts)
      expect(Math.abs(first - carryIn.lastPitch.midi)).toBeLessThanOrEqual(4)
  })

  it('ranks the first note by its distance from the carried pitch under Predictable', () => {
    const controls = { leapiness: 'Angular' as const, arpeggioChaos: 'Predictable' as const }
    const carryIn = donorCarryIn(controls)
    const firsts = firstNotes(controls, carryIn)
    expect(firsts.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
    const nearest = Math.min(...firsts.map((first) => Math.abs(first - carryIn.lastPitch.midi)))
    expect(nearest).toBeLessThanOrEqual(2)
  })

  it('never continues a wide chain arriving at the carried pitch in the same direction', () => {
    const controls = { leapiness: 'Angular' as const, arpeggioChaos: 'Chaotic' as const }
    const donor = donorCarryIn(controls)
    for (const arrivingInterval of [4, -4]) {
      const carryIn = reshaped(donor, donor.lastPitch.midi, { arrivingInterval })
      const firsts = firstNotes(controls, carryIn)
      expect(firsts.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
      for (const first of firsts) {
        const interval = first - carryIn.lastPitch.midi
        const sameDirectionWide =
          Math.abs(interval) >= 3 && Math.sign(interval) === Math.sign(arrivingInterval)
        expect(sameDirectionWide).toBe(false)
      }
    }
  })
})

// @test-link [[rule_join_inherits_leap_recovery]]
// @test-link [[rule_leap_recovery]]
describe('pitch planner settling an owed leap recovery across the join', () => {
  for (const leapDirection of [1, -1] as const)
    it(`repays a recovery owed after a large leap ${leapDirection > 0 ? 'up' : 'down'}`, () => {
      const controls = { leapiness: 'Leaping' as const, arpeggioChaos: 'Chaotic' as const }
      const carryIn = owedCarryIn(controls, leapDirection)
      const firsts = firstNotes(controls, carryIn)
      expect(firsts.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
      for (const first of firsts) {
        const interval = first - carryIn.lastPitch.midi
        expect(Math.sign(interval)).toBe(-leapDirection)
        expect(Math.abs(interval)).toBeGreaterThanOrEqual(1)
        expect(Math.abs(interval)).toBeLessThanOrEqual(4)
      }
    })
})

// @test-link [[rule_join_tense_note_resolution]]
describe('pitch planner resolving a tense carried note', () => {
  it('resolves it by step onto a tone of the first chord with the very first note', () => {
    const controls = { leapiness: 'Angular' as const, arpeggioChaos: 'Chaotic' as const }
    const carryIn = tenseCarryIn(controls)
    const firsts = firstNotes(controls, carryIn)
    expect(firsts.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
    for (const first of firsts) {
      expect(Math.abs(first - carryIn.lastPitch.midi)).toBeGreaterThanOrEqual(1)
      expect(Math.abs(first - carryIn.lastPitch.midi)).toBeLessThanOrEqual(2)
      expect(C_MAJOR_TONIC_TRIAD).toContain(first % 12)
    }
  })
})

// @test-link [[rule_jam_phrase_one_joins_doodle]]
// @test-link [[entity_phrase_carry_in]]
describe('the motion state a carry-in from no phrase gives', () => {
  it('is the note before beat 1, reached by no interval: a tone of no chord, no chain, no debt', () => {
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
    const state = carriedMotionState(carryIn)

    expect(state).toStrictEqual({
      ...INITIAL_MOTION_STATE,
      prior: {
        midi: 60,
        chordTone: false,
        harmonyIndex: BEFORE_JOIN_POSITION,
        barIndex: BEFORE_JOIN_POSITION,
      },
      chainDirection: 0,
      chainNotes: [],
    })
    expect(state).not.toHaveProperty('debt')
    expect(Object.isFrozen(state)).toBe(true)
  })
})
