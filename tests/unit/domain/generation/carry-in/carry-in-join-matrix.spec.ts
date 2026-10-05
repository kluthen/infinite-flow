/**
 * Property test over the seed matrix: every instrument profile x register choice x four
 * representative control sets x two seeds generates a session's phrase 1 without carry-in, then
 * phrases 2 to 6 each with the carry-in of the phrase before. Every join made with carry-in is
 * checked against the same independent validators that judge two consecutive notes inside one
 * phrase (interval cap, leap budget, wide chains, leap recovery, register window, active range),
 * and against the join's own facts: a fresh attack on beat 1, the register window of phrase 1
 * kept, and a harmony that opens on the tonic after the carried chord. Each phrase is reproduced
 * from its own request and seed.
 *
 * Endings: phrase 1, generated without carry-in, never ends owing anything. A phrase generated
 * with carry-in may end owing a large leap's recovery or a tense note's resolution; such a phrase
 * is valid only as a carry-in phrase (judged as a standalone phrase it fails), and the next phrase
 * settles the debt with its very first note. The matrix must contain both kinds of debt.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls, type Leapiness } from '@/domain/controls/generation-controls'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeGenerationRequest, makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { attackMidis, carryInAfter, type SuccessOutcome } from './carry-in-fixture'
import { buildMatrix, type MatrixCell } from './carry-in-matrix'

/**
 * Intent: true when the carried pitch is not a tone of the carried chord: a tense note. A carry-in
 * whose harmony was dropped carries no chord, so its pitch is never tense.
 */
function carriesTenseNote(carryIn: CarryIn): boolean {
  return (
    carryIn.finalHarmony !== null &&
    !(carryIn.finalHarmony.triad.pitchClasses as readonly number[]).includes(
      carryIn.lastPitch.midi % 12,
    )
  )
}

/** Intent: true when the carry-in owes something the next phrase must settle. */
function owesDebt(carryIn: CarryIn): boolean {
  return carryIn.lastPitch.recovery.kind === 'owed' || carriesTenseNote(carryIn)
}

/** The adjacent-interval ceiling of each leapiness level, restated from the melodic policy. */
const MAX_INTERVAL: Readonly<Record<Leapiness, number>> = {
  Smooth: 4,
  Shaped: 7,
  Leaping: 10,
  Angular: 12,
}

const MATRIX = buildMatrix()

/** Intent: the real intent of one cell's phrase `phraseNumber`, with its own seed. */
function phraseIntent(cell: MatrixCell, phraseNumber: number, carryIn?: CarryIn): GenerationIntent {
  const seed = cell.seed + 1000 * (phraseNumber - 1)
  const input = {
    requestId: makeRequestId(`join-${cell.label}-phrase-${phraseNumber}`),
    seed: makeSeed(seed),
    controls: makeGenerationControls({
      ...cell.set.controls,
      register: cell.register,
      instrumentProfileId: cell.instrumentProfileId,
    }),
    musicalProfile: { musicalProfile: cell.set.musicalProfile, isCustom: true },
  }
  return carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/**
 * Intent: assert every fact of one join made with carry-in: the whole-result validator (which
 * judges the join with the in-phrase interval, chain, budget and recovery rules), an independent
 * restatement of the interval cap and register window across the join, a fresh attack on beat 1,
 * the carried window kept, the tonic opening after the carried chord, and same-seed reproduction.
 */
function assertJoin(
  cell: MatrixCell,
  intent: GenerationIntent,
  outcome: SuccessOutcome,
  carryIn: CarryIn,
): void {
  expect(
    validateGenerationResult({
      intent,
      request: outcome.request,
      result: outcome.result,
      provenance: outcome.provenance,
    }),
  ).toEqual({ kind: 'valid_generation_result' })

  const midis = attackMidis(outcome.result.timeline.measures)
  const joinInterval = midis[0]! - carryIn.lastPitch.midi
  expect(Math.abs(joinInterval)).toBeLessThanOrEqual(MAX_INTERVAL[cell.set.controls.leapiness])
  expect(outcome.request.registerWindow).toEqual(carryIn.registerWindow)
  expect(outcome.request.carryIn).toEqual(carryIn)
  for (const midi of midis) {
    expect(midi).toBeGreaterThanOrEqual(carryIn.registerWindow.minMidi)
    expect(midi).toBeLessThanOrEqual(carryIn.registerWindow.maxMidi)
  }

  const firstEvent = outcome.result.timeline.measures[0]!.events[0]!
  expect(firstEvent.kind).toBe('note')
  expect(firstEvent.kind === 'note' && firstEvent.tieContinuation).toBe(false)

  expect(outcome.provenance.harmony.events[0]!.triad.degree).toBe(1)

  const recovery = carryIn.lastPitch.recovery
  if (recovery.kind === 'owed') {
    expect(Math.sign(joinInterval)).toBe(-recovery.leapDirection)
    expect(Math.abs(joinInterval)).toBeGreaterThanOrEqual(1)
    expect(Math.abs(joinInterval)).toBeLessThanOrEqual(4)
  }
  if (carriesTenseNote(carryIn)) {
    expect(Math.abs(joinInterval)).toBeGreaterThanOrEqual(1)
    expect(Math.abs(joinInterval)).toBeLessThanOrEqual(2)
    const firstChord = outcome.provenance.harmony.events[0]!.triad.pitchClasses as readonly number[]
    expect(firstChord).toContain(midis[0]! % 12)
  }

  expect(generatePhrase(intent)).toEqual(outcome)
}

/**
 * Intent: a phrase that ends owing is valid only because it was generated with carry-in: judged
 * with the same request and settings but no carry-in, the independent validator refuses it.
 */
function assertOwingOnlyWithCarryIn(
  cell: MatrixCell,
  phraseNumber: number,
  outcome: SuccessOutcome,
) {
  const standaloneIntent = phraseIntent(cell, phraseNumber)
  const { requestId, seed, measureCount, meter, activeConcertRange, register, registerWindow } =
    outcome.request
  const standaloneRequest = makeGenerationRequest({
    requestId,
    seed,
    measureCount,
    meter,
    activeConcertRange,
    register,
    registerWindow,
  })
  const verdict = validateGenerationResult({
    intent: standaloneIntent,
    request: standaloneRequest,
    result: outcome.result,
    provenance: outcome.provenance,
  })
  expect(verdict.kind).toBe('invalid_generation_result')
}

/** Joins made with carry-in, and phrases whose generation with carry-in failed, per cell. */
const joinsMade: string[] = []
/** Joins that settled a recovery or a tense note owed by the phrase before. */
const settledRecoveries: string[] = []
const settledTenseNotes: string[] = []
const failedWithCarryIn: string[] = []
/** Cells whose phrase-2 seed, generated standalone under Varying, would resolve another window. */
const varyingReuseWitnesses: string[] = []

/**
 * Intent: run one cell's three-phrase chain, asserting every join made with carry-in. A phrase
 * whose generation with carry-in fails is recorded (the session would fall back to a standalone
 * phrase) and ends the chain.
 */
function runChain(cell: MatrixCell): void {
  const firstIntent = phraseIntent(cell, 1)
  const first = generatePhrase(firstIntent)
  expect(first.kind).toBe('generation_success')
  if (first.kind !== 'generation_success') return
  let previousIntent = firstIntent
  let previous: SuccessOutcome = first
  for (const phraseNumber of [2, 3, 4, 5, 6]) {
    const carryIn = carryInAfter(previousIntent, previous, phraseNumber - 1)
    expect(carryIn.registerWindow).toEqual(first.request.registerWindow)
    if (phraseNumber === 2) expect(owesDebt(carryIn)).toBe(false)
    else if (owesDebt(carryIn)) assertOwingOnlyWithCarryIn(cell, phraseNumber - 1, previous)
    const intent = phraseIntent(cell, phraseNumber, carryIn)
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') {
      failedWithCarryIn.push(`${cell.label} phrase ${phraseNumber}: ${outcome.code}`)
      return
    }
    assertJoin(cell, intent, outcome, carryIn)
    joinsMade.push(`${cell.label} phrase ${phraseNumber}`)
    if (carryIn.lastPitch.recovery.kind === 'owed') settledRecoveries.push(cell.label)
    if (carriesTenseNote(carryIn)) settledTenseNotes.push(cell.label)
    if (cell.register === 'Varying' && phraseNumber === 2) {
      const standalone = generatePhrase(phraseIntent(cell, 2))
      if (
        standalone.kind === 'generation_success' &&
        standalone.request.register !== outcome.request.register
      )
        varyingReuseWitnesses.push(cell.label)
    }
    previousIntent = intent
    previous = outcome
  }
}

// @test-link [[rule_join_interval_obeys_phrase_rules]]
// @test-link [[rule_join_inherits_leap_recovery]]
// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_leap_recovery]]
// @test-link [[rule_open_phrase_ending]]
// @test-link [[req_rolling_practice_session]]
// @test-link [[rule_varying_register_once_per_session]]
// @test-link [[rule_phrase_starts_on_downbeat]]
// @test-link [[rule_seeded_phrase_reproduction]]
describe('carry-in join matrix', () => {
  it.each(MATRIX.map((cell) => ({ cell, label: cell.label })))(
    '$label: every join made with carry-in obeys the in-phrase rules',
    ({ cell }) => {
      runChain(cell)
    },
  )

  it('makes every join of the matrix with carry-in', () => {
    expect(failedWithCarryIn).toEqual([])
    expect(joinsMade).toHaveLength(MATRIX.length * 5)
  })

  it('settles both kinds of debt somewhere in the matrix', () => {
    expect(settledRecoveries.length).toBeGreaterThan(0)
    expect(settledTenseNotes.length).toBeGreaterThan(0)
  })

  it('keeps the Varying window of phrase 1 where the phrase-2 seed alone would pick another', () => {
    expect(varyingReuseWitnesses.length).toBeGreaterThan(0)
  })
})
