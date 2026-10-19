/**
 * Property test over the seed matrix with the passing tone, the accented passing tone and the
 * neighbor tone all Off: every cell generates a session's phrase 1 without carry-in, then phrases
 * 2 to 6 each with the carry-in of the phrase before, as `carry-in-join-matrix.spec.ts` does under
 * the profiles' own levels. With no free scale note allowed anywhere, no phrase generated with
 * carry-in may end on a tense note (D368): its final note is a tone of its final chord. Every
 * successful phrase passes the independent result validator and is reproduced from its own
 * request and seed. A generation failure is allowed (an Off level can leave a request with no
 * phrase); failures are counted and printed, and most joins must still be made.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
import { levelsForProfile, type FigureLevels } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeSeed } from '@/domain/random/seed'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { attackMidis, carryInAfter, type SuccessOutcome } from './carry-in-fixture'
import { buildMatrix, type MatrixCell } from './carry-in-matrix'

const MATRIX = buildMatrix()

/** A cell's profile levels with the passing, accented passing and neighbor tones Off. */
function freeTonesOff(cell: MatrixCell): FigureLevels {
  return {
    ...levelsForProfile(cell.set.musicalProfile),
    passingTone: 'off',
    accentedPassingTone: 'off',
    neighborTone: 'off',
  }
}

/** Intent: the real intent of one cell's phrase `phraseNumber` under the three-Off levels. */
function phraseIntent(cell: MatrixCell, phraseNumber: number, carryIn?: CarryIn): GenerationIntent {
  const input = {
    requestId: makeRequestId(`tense-levels-${cell.label}-phrase-${phraseNumber}`),
    seed: makeSeed(cell.seed + 1000 * (phraseNumber - 1)),
    controls: makeGenerationControls({
      ...cell.set.controls,
      register: cell.register,
      instrumentProfileId: cell.instrumentProfileId,
    }),
    figureLevels: freeTonesOff(cell),
  }
  return carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/** Intent: true when the phrase's final attack is a tone of its final harmony event. */
function endsOnChordTone(outcome: SuccessOutcome): boolean {
  const final = attackMidis(outcome.result.timeline.measures).at(-1)!
  const chord = outcome.provenance.harmony.events.at(-1)!.triad.pitchClasses as readonly number[]
  return chord.includes(final % 12)
}

/** Intent: assert one successful phrase passes the result validator and reproduces itself. */
function assertValidAndReproduced(intent: GenerationIntent, outcome: SuccessOutcome): void {
  expect(
    validateGenerationResult({
      intent,
      request: outcome.request,
      result: outcome.result,
      provenance: outcome.provenance,
    }),
  ).toEqual({ kind: 'valid_generation_result' })
  expect(generatePhrase(intent)).toEqual(outcome)
}

/** Joins made with carry-in, phrases whose generation failed, and tense endings found. */
const joinsMade: string[] = []
const failures: string[] = []
const failureCodes = new Map<string, number>()
const tenseEndings: string[] = []

/** Intent: record one failed generation and its code. */
function recordFailure(cell: MatrixCell, phraseNumber: number, code: string): void {
  failures.push(`${cell.label} phrase ${phraseNumber}: ${code}`)
  failureCodes.set(code, (failureCodes.get(code) ?? 0) + 1)
}

/**
 * Intent: run one cell's six-phrase chain under the three-Off levels, asserting every successful
 * phrase. A failed generation is recorded and ends the chain.
 */
function runChain(cell: MatrixCell): void {
  let previousIntent = phraseIntent(cell, 1)
  const first = generatePhrase(previousIntent)
  if (first.kind !== 'generation_success') {
    recordFailure(cell, 1, first.code)
    return
  }
  assertValidAndReproduced(previousIntent, first)
  let previous: SuccessOutcome = first
  for (const phraseNumber of [2, 3, 4, 5, 6]) {
    const carryIn = carryInAfter(previousIntent, previous, phraseNumber - 1)
    const intent = phraseIntent(cell, phraseNumber, carryIn)
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success') {
      recordFailure(cell, phraseNumber, outcome.code)
      return
    }
    assertValidAndReproduced(intent, outcome)
    joinsMade.push(`${cell.label} phrase ${phraseNumber}`)
    if (!endsOnChordTone(outcome)) tenseEndings.push(`${cell.label} phrase ${phraseNumber}`)
    previousIntent = intent
    previous = outcome
  }
}

// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_levels_govern_free_figures_only]]
describe('carry-in matrix with the passing, accented passing and neighbor tones Off', () => {
  it.each(MATRIX.map((cell) => ({ cell, label: cell.label })))(
    '$label: every phrase is valid and reproduced',
    ({ cell }) => {
      runChain(cell)
    },
  )

  it('ends no phrase generated with carry-in on a tense note', () => {
    expect(tenseEndings).toEqual([])
  })

  it('still makes most joins with carry-in', () => {
    console.log(
      `three-Off carry-in matrix: ${MATRIX.length} cells, ${joinsMade.length} joins made, ` +
        `${failures.length} generation failures`,
      Object.fromEntries(failureCodes),
    )
    expect(joinsMade.length).toBeGreaterThan(MATRIX.length * 5 * 0.5)
  })
})
