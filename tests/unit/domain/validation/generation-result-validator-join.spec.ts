/**
 * The independent whole-result validator judges a join made with carry-in with the same rules it
 * applies between two consecutive notes inside a phrase. Each case takes a real, valid phrase and
 * pairs it with a carry-in whose carried pitch or leap state the phrase's first note would break,
 * then expects the matching pitch-rule failure anchored at attack 0.
 */

import { describe, expect, it } from 'vitest'

import type { Leapiness } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import {
  owedRecoveryCanSettle,
  recoveryLandsOn,
} from '@/domain/generation/carry-in/phrase-ending-debt'
import type { GenerationRequest } from '@/domain/generation/generation-request'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import {
  attackMidis,
  buildIntent,
  carryInAfter,
  generateSuccess,
} from '../generation/carry-in/carry-in-fixture'

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11]
const C_MAJOR_TONIC_TRIAD = [0, 4, 7]

/**
 * Intent: a valid phrase generated without carry-in at the given leapiness, the carry-in of
 * another phrase in the same settings, and a validator for the phrase as if it had been generated
 * with a given carry-in.
 */
function scenario(leapiness: Leapiness) {
  const controls = { leapiness }
  const outcome = generateSuccess(buildIntent({ seed: 21, controls }))
  const donorIntent = buildIntent({ seed: 11, controls })
  const donor = carryInAfter(donorIntent, generateSuccess(donorIntent), 1)
  const first = attackMidis(outcome.result.timeline.measures)[0]!
  const validateWith = (carryIn: CarryIn, requestOverride?: Partial<GenerationRequest>) =>
    validateGenerationResult({
      intent: buildIntent({ seed: 21, controls, carryIn }),
      request: { ...outcome.request, carryIn, ...requestOverride } as GenerationRequest,
      result: outcome.result,
      provenance: outcome.provenance,
    })
  return { donor, first, validateWith }
}

/** Intent: the MIDI values inside the carried window whose pitch class passes `keep`. */
function windowMidis(carryIn: CarryIn, keep: (pitchClass: number) => boolean): readonly number[] {
  const midis: number[] = []
  for (let midi = carryIn.registerWindow.minMidi; midi <= carryIn.registerWindow.maxMidi; midi++)
    if (keep(midi % 12)) midis.push(midi)
  return midis
}

/** Intent: the carried-chord tones inside the carried window, lowest first. */
function chordTones(carryIn: CarryIn): readonly number[] {
  const chord = carryIn.finalHarmony!.triad.pitchClasses as readonly number[]
  return windowMidis(carryIn, (pc) => chord.includes(pc))
}

/** Intent: the donor carry-in with its last pitch and leap state replaced. */
function reshaped(donor: CarryIn, midi: number, leap: Partial<CarryIn['lastPitch']>): CarryIn {
  return makeCarryIn({
    ...donor,
    lastPitch: { ...donor.lastPitch, ...leap, midi: makeConcertPitch(midi) },
  })
}

/** Intent: the failure list of a verdict that must be invalid. */
function failuresOf(verdict: ReturnType<ReturnType<typeof scenario>['validateWith']>) {
  expect(verdict.kind).toBe('invalid_generation_result')
  return verdict.kind === 'invalid_generation_result' ? verdict.failures : []
}

// @test-link [[service_generation_result_validation]]
// @test-link [[rule_join_interval_obeys_phrase_rules]]
describe('whole-result validation of a join made with carry-in', () => {
  it('accepts a join that steps from the carried pitch onto the first note', () => {
    const { donor, first, validateWith } = scenario('Shaped')
    const near = chordTones(donor).find((tone) => Math.abs(tone - first) <= 2)
    expect(near).toBeDefined()
    expect(validateWith(reshaped(donor, near!, { arrivingInterval: null }))).toEqual({
      kind: 'valid_generation_result',
    })
  })

  it('reports an interval cap broken across the join at attack 0', () => {
    const { donor, first, validateWith } = scenario('Smooth')
    const far = chordTones(donor).find((tone) => Math.abs(tone - first) > 4)
    expect(far).toBeDefined()
    expect(
      failuresOf(validateWith(reshaped(donor, far!, { arrivingInterval: null }))),
    ).toContainEqual({ code: 'pitch_rule_violation', detail: 'interval_cap_exceeded@0' })
  })

  it('reports a wide chain arriving at the carried pitch and continued by the join', () => {
    const { donor, first, validateWith } = scenario('Leaping')
    const cases = [1, -1].flatMap((direction) =>
      chordTones(donor)
        .filter((tone) => {
          const join = first - tone
          return Math.sign(join) === direction && Math.abs(join) >= 3 && Math.abs(join) <= 10
        })
        .map((tone) => ({ tone, direction })),
    )
    expect(cases.length).toBeGreaterThan(0)
    const { tone, direction } = cases[0]!
    expect(
      failuresOf(validateWith(reshaped(donor, tone, { arrivingInterval: 3 * direction }))),
    ).toContainEqual({ code: 'pitch_rule_violation', detail: 'unrecognized_wide_chain@0' })
  })
})

// @test-link [[service_generation_result_validation]]
// @test-link [[rule_join_inherits_leap_recovery]]
// @test-link [[rule_join_tense_note_resolution]]
describe('whole-result validation of a debt carried across the join', () => {
  it('reports an owed recovery the first interval does not repay', () => {
    const { donor, first, validateWith } = scenario('Leaping')
    const cases = ([1, -1] as const).flatMap((direction) =>
      chordTones(donor)
        .filter(
          (tone) =>
            owedRecoveryCanSettle(tone, direction, C_MAJOR, donor.registerWindow) &&
            !recoveryLandsOn(tone, first, direction) &&
            Math.abs(first - tone) <= 10,
        )
        .map((tone) => ({ tone, direction })),
    )
    expect(cases.length).toBeGreaterThan(0)
    const { tone, direction } = cases[0]!
    const carryIn = reshaped(donor, tone, {
      arrivingInterval: 7 * direction,
      recovery: { kind: 'owed', leapDirection: direction },
    })
    expect(failuresOf(validateWith(carryIn))).toContainEqual({
      code: 'pitch_rule_violation',
      detail: 'unrecovered_large_leap@0',
    })
  })

  it('reports a tense carried note the first note does not resolve', () => {
    const { donor, first, validateWith } = scenario('Shaped')
    const chord = donor.finalHarmony!.triad.pitchClasses as readonly number[]
    const tonic = windowMidis(donor, (pc) => C_MAJOR_TONIC_TRIAD.includes(pc))
    const tense = windowMidis(donor, (pc) => C_MAJOR.includes(pc) && !chord.includes(pc)).filter(
      (midi) =>
        Math.abs(midi - first) >= 3 &&
        tonic.some((to) => Math.abs(to - midi) >= 1 && Math.abs(to - midi) <= 2),
    )
    expect(tense.length).toBeGreaterThan(0)
    expect(
      failuresOf(validateWith(reshaped(donor, tense[0]!, { arrivingInterval: 2 }))),
    ).toContainEqual({ code: 'pitch_rule_violation', detail: 'carried_tension_unresolved@0' })
  })

  it('reports a resolved window that is not the carried one', () => {
    const { donor, first, validateWith } = scenario('Shaped')
    const near = chordTones(donor).find((tone) => Math.abs(tone - first) <= 2)!
    const carryIn = reshaped(donor, near, { arrivingInterval: null })
    const failures = failuresOf(
      validateWith(carryIn, { registerWindow: makeRegisterWindow(48, 60) }),
    )
    expect(failures.map((failure) => failure.code)).toContain('carry_in_register_window_mismatch')
  })
})

// @test-link [[rule_key_change_drops_harmonic_carry_in]]
describe('whole-result validation of a join whose carry-in dropped its harmony', () => {
  it('owes no resolution for a pitch off the old chord once the harmony is dropped', () => {
    const { donor, first, validateWith } = scenario('Shaped')
    const chord = donor.finalHarmony!.triad.pitchClasses as readonly number[]
    const tonic = windowMidis(donor, (pc) => C_MAJOR_TONIC_TRIAD.includes(pc))
    const tense = windowMidis(donor, (pc) => C_MAJOR.includes(pc) && !chord.includes(pc)).filter(
      (midi) =>
        Math.abs(midi - first) >= 3 &&
        tonic.some((to) => Math.abs(to - midi) >= 1 && Math.abs(to - midi) <= 2),
    )
    expect(tense.length).toBeGreaterThan(0)
    const carried = reshaped(donor, tense[0]!, { arrivingInterval: 2 })
    expect(failuresOf(validateWith(carried))).toContainEqual({
      code: 'pitch_rule_violation',
      detail: 'carried_tension_unresolved@0',
    })
    const verdict = validateWith(makeCarryIn({ ...carried, finalHarmony: null }))
    const failures = verdict.kind === 'invalid_generation_result' ? verdict.failures : []
    expect(failures.map((failure) => failure.detail)).not.toContain('carried_tension_unresolved@0')
    expect(failures.map((failure) => failure.code)).not.toContain('harmony_join_invalid')
  })
})
