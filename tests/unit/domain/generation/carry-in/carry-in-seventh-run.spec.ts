/**
 * The carry-in derivation replays a phrase's motion as the pitch search reads it: inside the
 * phrase a note's chord-tone fact reads the chord tones of its event, the seventh included in
 * seventh form, and the final note's reads its chord's triad. So a run through the seventh with a
 * deferred recovery derives the recovery the search left owing, and a run through the final
 * chord's seventh is never one. Every plan here is hand-built (chunk 2's fixture builder).
 */

import { describe, expect, it } from 'vitest'

import { CarryInError } from '@/domain/generation/carry-in/carry-in'
import { assemblePhraseResult } from '@/domain/generation/orchestration/timeline-assembly'
import { initialPitchSearchState, noteFacts } from '@/domain/pitch/pitch-advance'
import { compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { advanceMotion, type MotionState } from '@/domain/pitch/pitch-motion'
import type { BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { boundSeventhInput, TONAL_GENTLE } from '../../pitch/seventh-chord-inputs'
import { buildIntent, carryInAfter, generateSuccess, type SuccessOutcome } from './carry-in-fixture'

/** The C-major gentle plan whose last three attacks sound its final G7 (G B D F). */
function gentleInput(sevenths = true): BoundPitchPlannerInput {
  return boundSeventhInput({ kind: TONAL_GENTLE, ...(sevenths ? {} : { sevenths: () => false }) })
}

/**
 * Intent: a melody for every attack of the input: A3 and G3 alternate by step, ending on G3, then
 * the three given notes on the last three attacks.
 */
function melodyEndingWith(input: BoundPitchPlannerInput, ending: readonly number[]): number[] {
  const count = compilePitchSearchContext(input).attacks.length
  const steps = Array.from({ length: count - ending.length }, (_, index) =>
    (count - ending.length - 1 - index) % 2 === 0 ? 55 : 57,
  )
  return [...steps, ...ending]
}

/**
 * Intent: a successful outcome whose request, harmony, rhythm and timeline are the hand-built
 * input's and the melody's, generated at Angular (the input's level) so its shape is a real one.
 */
function outcomeOf(input: BoundPitchPlannerInput, midis: readonly number[]) {
  const intent = buildIntent({ seed: 11, controls: { leapiness: 'Angular' }, label: 'seventh-run' })
  const generated = generateSuccess(intent)
  const outcome: SuccessOutcome = {
    ...generated,
    request: input.request,
    result: assemblePhraseResult(input.request, input.rhythm, midis),
    provenance: { ...generated.provenance, harmony: input.harmony, rhythm: input.rhythm },
  }
  return { intent, outcome }
}

/** Intent: the motion state the pitch search writes after the melody, through its note facts. */
function searchMotion(input: BoundPitchPlannerInput, midis: readonly number[]): MotionState {
  const context = compilePitchSearchContext(input)
  return context.attacks.reduce((state, attack, index) => {
    const midi = midis[index]!
    const result = advanceMotion(context.limits, state, {
      midi,
      chordTone: noteFacts(context, attack, midi).chordTone,
      harmonyIndex: attack.harmonyIndex,
      barIndex: attack.barIndex,
    })
    if (result.kind === 'rejected') throw new Error(`search rejects attack ${index}`)
    return result.state
  }, initialPitchSearchState(context).motion)
}

// @test-link [[rule_seventh_is_chord_tone]]
// @test-link [[rule_join_inherits_leap_recovery]]
describe('deriveCarryIn over a run through the seventh', () => {
  /** F3 D4 G4 over the final G7: the seventh starts the run, a large leap up defers its recovery. */
  const DEFERRED_THROUGH_F = [53, 62, 67]

  it('derives the recovery a run through the seventh left owing, as the search wrote it', () => {
    const input = gentleInput()
    const events = input.harmony.events
    expect(events.at(-1)!.triad.degree).toBe(5)
    expect(events.at(-1)!.seventh?.pitchClass).toBe(5)
    const midis = melodyEndingWith(input, DEFERRED_THROUGH_F)
    const { intent, outcome } = outcomeOf(input, midis)
    const searched = searchMotion(input, midis)
    expect(searched.runs).toBe(1)
    expect(searched.debt).toEqual({ direction: 1, mode: 'due_next' })
    const carryIn = carryInAfter(intent, outcome, 1)
    expect(carryIn.lastPitch).toEqual({
      midi: 67,
      arrivingInterval: 5,
      recovery: { kind: 'owed', leapDirection: searched.debt!.direction },
    })
  })

  it('never reads a run through the final chord seventh, as the search never does', () => {
    const input = gentleInput()
    const midis = melodyEndingWith(input, [59, 62, 65])
    const { intent, outcome } = outcomeOf(input, midis)
    expect(() => searchMotion(input, midis)).toThrow(/attack/)
    expect(() => carryInAfter(intent, outcome, 1)).toThrow(CarryInError)
  })

  it('still refuses the same notes over the triad, where F is no chord tone', () => {
    const input = gentleInput(false)
    const midis = melodyEndingWith(input, DEFERRED_THROUGH_F)
    const { intent, outcome } = outcomeOf(input, midis)
    expect(() => carryInAfter(intent, outcome, 1)).toThrow(CarryInError)
  })
})
