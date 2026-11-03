// @vitest-environment node
/**
 * The key and mode suggestion's draw (master spec C6.2): the seed, a 32-bit FNV-1a hash of the
 * versioned domain string and the quantized doodle's notes, the doodle alone; the integer weight
 * table written once from e^(−gap/1000); the draw, the seed modulo the kept candidates' weights
 * walked in their order; and no floating-point operation anywhere on the suggestion's path.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { fnv1a32 } from '@/domain/random/hash32'
import {
  drawCandidate,
  GAP_WEIGHTS,
  gapWeight,
  KEY_SUGGESTION_SEED_PREFIX,
  keySuggestionSeed,
} from '@/jam/key-suggestion/key-suggestion-draw'
import { WEIGHT_UNITS_PER_BEAT, type ScoredPair } from '@/jam/key-suggestion/key-suggestion-scores'

import { nonIntegerOperations } from '../doodle-builders'
import { beatsDoodle, WORKED_EXAMPLE } from './key-suggestion-doodles'

/** Intent: a kept candidate at a given gap from the best (in thousandths), on home note C. */
function candidateAt(gapThousandths: number, mode: ScoredPair['mode']): ScoredPair {
  return {
    homeNote: 0 as PitchClassNumber,
    mode,
    penalty: 50_000 + gapThousandths * WEIGHT_UNITS_PER_BEAT,
  }
}

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe("the draw's seed", () => {
  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('hashes the domain string and each note’s start, length and concert pitch', () => {
    expect(KEY_SUGGESTION_SEED_PREFIX).toBe('infinite-flow/key-suggestion/v1')
    const doodle = makeQuantizedDoodle({
      measureCount: 1,
      notes: [
        { startTick: 0, lengthTicks: 4, pitch: 62 },
        { startTick: 6, lengthTicks: 2, pitch: 64 },
      ],
    })
    expect(keySuggestionSeed(doodle)).toBe(fnv1a32('infinite-flow/key-suggestion/v1|0,4,62|6,2,64'))
  })

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('is the same for the same notes and differs when one note moves, lasts or sounds otherwise', () => {
    const seed = keySuggestionSeed(beatsDoodle(WORKED_EXAMPLE))
    expect(keySuggestionSeed(beatsDoodle(WORKED_EXAMPLE))).toBe(seed)
    expect(keySuggestionSeed(beatsDoodle(WORKED_EXAMPLE, 1))).not.toBe(seed)
    const raised = WORKED_EXAMPLE.map(([pitch, beats]) => [pitch + 12, beats] as const)
    expect(keySuggestionSeed(beatsDoodle(raised))).not.toBe(seed)
  })
})

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe('the weight table', () => {
  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('holds 10,000 × e^(−gap/1000), rounded, for every gap of 0 to 693 thousandths', () => {
    expect(GAP_WEIGHTS).toHaveLength(694)
    GAP_WEIGHTS.forEach((weight, gap) => {
      expect(weight).toBe(Math.round(10_000 * Math.exp(-gap / 1000)))
    })
    expect(GAP_WEIGHTS[0]).toBe(10_000)
    expect(GAP_WEIGHTS[693]).toBe(5001)
  })

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('reads a gap in the scores’ units at its whole thousandths', () => {
    expect(gapWeight(0)).toBe(10_000)
    expect(gapWeight(7)).toBe(10_000)
    expect(gapWeight(8)).toBe(GAP_WEIGHTS[1])
    expect(gapWeight(693 * WEIGHT_UNITS_PER_BEAT)).toBe(5001)
    expect(() => gapWeight(693 * WEIGHT_UNITS_PER_BEAT + 8)).toThrow(/gap/)
  })
})

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe('the draw', () => {
  const kept = [candidateAt(0, 'Dorian'), candidateAt(0, 'Aeolian'), candidateAt(693, 'Phrygian')]

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('walks the candidates in order to where the seed modulo the weights’ total falls', () => {
    const total = 10_000 + 10_000 + 5001
    expect(drawCandidate(kept, 0).mode).toBe('Dorian')
    expect(drawCandidate(kept, 9999).mode).toBe('Dorian')
    expect(drawCandidate(kept, 10_000).mode).toBe('Aeolian')
    expect(drawCandidate(kept, 19_999).mode).toBe('Aeolian')
    expect(drawCandidate(kept, 20_000).mode).toBe('Phrygian')
    expect(drawCandidate(kept, total - 1).mode).toBe('Phrygian')
    expect(drawCandidate(kept, total).mode).toBe('Dorian')
    expect(drawCandidate(kept, 0xffff_ffff).mode).toBe(
      drawCandidate(kept, 0xffff_ffff % total).mode,
    )
  })

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('gives the only candidate when one is kept, and refuses none', () => {
    expect(drawCandidate([kept[2]!], 123_456).mode).toBe('Phrygian')
    expect(() => drawCandidate([], 0)).toThrow(/candidate/)
  })
})

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe("the suggestion's source", () => {
  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it.each([
    'key-suggestion.ts',
    'key-suggestion-scores.ts',
    'key-suggestion-draw.ts',
    'key-suggestion-names.ts',
  ])('of %s is whole numbers only', (file) => {
    expect(
      nonIntegerOperations(new URL(`../../../../src/jam/key-suggestion/${file}`, import.meta.url)),
    ).toEqual({ divisions: [], decimalLiterals: [], mathCalls: [] })
  })
})
