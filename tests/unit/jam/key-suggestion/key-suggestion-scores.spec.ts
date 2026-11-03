// @vitest-environment node
/**
 * The key and mode suggestion's scores (master spec C6.2): each of the 84 pairs' penalty, the
 * role penalties in thousandths, the weights (lengths clamped to half a beat and a beat and a
 * half, beat 1 or 3 one and a half times), the home-note cues of the first and last notes, the
 * research note's worked figures, the kept candidates (within 693 thousandths, at most three, in
 * their fixed order), the material thresholds and the 80 % rule at their edges, the transposition
 * property, and the time 64 notes take.
 */
import { describe, expect, it } from 'vitest'

import { makeQuantizedDoodle, type QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import {
  fitsWell,
  hasEnoughMaterial,
  keptCandidates,
  KEY_MODES,
  noteWeight,
  scorePairs,
  WEIGHT_UNITS_PER_BEAT,
  type KeyMode,
  type ScoredPair,
} from '@/jam/key-suggestion/key-suggestion-scores'

import {
  beatsDoodle,
  BLUESY,
  ENDING_ON_E,
  HARMONIC_MINOR,
  pairName,
  tickDoodle,
  WORKED_EXAMPLE,
} from './key-suggestion-doodles'

/** Intent: the penalty of one pair among a doodle's 84 scores. */
function penaltyOf(scores: readonly ScoredPair[], homeNote: number, mode: KeyMode): number {
  const pair = scores.find((each) => each.homeNote === homeNote && each.mode === mode)
  if (pair === undefined) throw new Error(`No score for ${homeNote} ${mode}.`)
  return pair.penalty
}

/** Intent: a penalty in the research note's unit (a beat's weight is one), as a plain number. */
function inBeats(penalty: number): number {
  return penalty / (WEIGHT_UNITS_PER_BEAT * 1000)
}

/** Intent: the candidates whose penalty is within 693 thousandths of the best, uncapped. */
function qualifying(scores: readonly ScoredPair[]): readonly ScoredPair[] {
  const best = Math.min(...scores.map((each) => each.penalty))
  return scores.filter((each) => each.penalty - best <= 693 * WEIGHT_UNITS_PER_BEAT)
}

/** Intent: 84 scored pairs, every one at `base` but those given, in the canonical order. */
function syntheticScores(
  base: number,
  overrides: readonly (readonly [homeNote: number, mode: KeyMode, penalty: number])[],
): readonly ScoredPair[] {
  return Array.from({ length: 12 }, (_, homeNote) =>
    KEY_MODES.map((mode) => {
      const override = overrides.find(([home, each]) => home === homeNote && each === mode)
      return { homeNote: homeNote as PitchClassNumber, mode, penalty: override?.[2] ?? base }
    }),
  ).flat()
}

/** Intent: a small deterministic stream of whole numbers for the property's doodles. */
function lcg(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state
  }
}

/** Intent: a random one-line doodle of 6 to 20 notes over up to four measures, pitches 50 to 74. */
function randomDoodle(next: () => number): QuantizedDoodle {
  const count = 6 + (next() % 15)
  const notes: { startTick: number; lengthTicks: number; pitch: number }[] = []
  let tick = next() % 4
  for (let index = 0; index < count && tick < 63; index += 1) {
    const lengthTicks = Math.min(1 + (next() % 8), 64 - tick)
    notes.push({ startTick: tick, lengthTicks, pitch: 50 + (next() % 25) })
    tick += lengthTicks + (next() % 3)
  }
  return makeQuantizedDoodle({ measureCount: 4, notes })
}

/** Intent: the doodle with every pitch raised by `semitones`. */
function transposed(doodle: QuantizedDoodle, semitones: number): QuantizedDoodle {
  return makeQuantizedDoodle({
    measureCount: doodle.measureCount,
    notes: doodle.notes.map((note) => ({ ...note, pitch: note.pitch + semitones })),
  })
}

// @test-link [[rule_suggestion_candidates]]
describe("a note's weight", () => {
  // @test-link [[rule_suggestion_candidates]]
  it('is its length clamped to 2–6 ticks on a doubled scale, one and a half times on beat 1 or 3', () => {
    /** Intent: the weight of a note starting at `startTick` and lasting `lengthTicks`. */
    const at = (startTick: number, lengthTicks: number) =>
      noteWeight({ startTick, lengthTicks, pitch: 60 as never })
    expect(WEIGHT_UNITS_PER_BEAT).toBe(8)
    expect(at(1, 1)).toBe(4)
    expect(at(4, 4)).toBe(8)
    expect(at(3, 3)).toBe(6)
    expect(at(5, 12)).toBe(12)
    expect(at(0, 4)).toBe(12)
    expect(at(8, 9)).toBe(18)
    expect(at(24, 2)).toBe(6)
    expect(at(20, 4)).toBe(8)
  })
})

// @test-link [[rule_suggestion_candidates]]
describe("the 84 pairs' penalties", () => {
  // @test-link [[rule_suggestion_candidates]]
  it('scores every home note C to B with every mode Ionian to Locrian, in that order', () => {
    const scores = scorePairs(beatsDoodle(WORKED_EXAMPLE))
    expect(scores).toHaveLength(84)
    expect(scores.slice(0, 8).map(pairName)).toEqual([
      'C Ionian',
      'C Dorian',
      'C Phrygian',
      'C Lydian',
      'C Mixolydian',
      'C Aeolian',
      'C Locrian',
      'C# Ionian',
    ])
    expect(pairName(scores[83]!)).toBe('B Locrian')
  })

  // @test-link [[rule_suggestion_candidates]]
  it('sums each note’s role penalty in thousandths times its weight', () => {
    // D C G E F F# D, each four ticks off the beats (weight 8): no home note first or last in C.
    const doodle = tickDoodle([
      [1, 4, 62],
      [5, 4, 60],
      [9, 4, 67],
      [13, 4, 64],
      [17, 4, 65],
      [21, 4, 66],
      [25, 4, 62],
    ])
    expect(penaltyOf(scorePairs(doodle), 0, 'Ionian')).toBe(
      8 * (2141 + 1609 + 1802 + 1931 + 2141 + 5521 + 2141),
    )
  })

  // @test-link [[rule_suggestion_candidates]]
  it('takes the fifth and third by degree, as Locrian’s diminished fifth', () => {
    // B D F: home, third and fifth of B Locrian.
    const doodle = tickDoodle([
      [1, 4, 59],
      [5, 4, 62],
      [9, 4, 65],
      [13, 4, 64],
    ])
    expect(penaltyOf(scorePairs(doodle), 11, 'Locrian')).toBe(
      8 * (1609 + 1931 + 1802 + 2141) - 8 * 405,
    )
  })

  // @test-link [[rule_suggestion_candidates]]
  it('counts the last note twice and the first one and a half times when home (−693, −405)', () => {
    /** Intent: three notes off the beats: `first`, E, then `last`. */
    const three = (first: number, last: number) =>
      tickDoodle([
        [1, 4, first],
        [5, 4, 64],
        [9, 4, last],
      ])
    expect(penaltyOf(scorePairs(three(62, 60)), 0, 'Ionian')).toBe(
      8 * (2141 + 1931 + 1609) - 8 * 693,
    )
    expect(penaltyOf(scorePairs(three(60, 62)), 0, 'Ionian')).toBe(
      8 * (1609 + 1931 + 2141) - 8 * 405,
    )
    expect(penaltyOf(scorePairs(three(60, 60)), 0, 'Ionian')).toBe(
      8 * (1609 + 1931 + 1609) - 8 * (693 + 405),
    )
  })

  // @test-link [[rule_suggestion_candidates]]
  it('gives the research note’s figures for its worked example, off the strong beats', () => {
    const scores = scorePairs(beatsDoodle(WORKED_EXAMPLE, 1))
    const figures: readonly (readonly [number, KeyMode, number])[] = [
      [2, 'Dorian', 10.88],
      [2, 'Aeolian', 10.88],
      [7, 'Dorian', 12.54],
      [7, 'Mixolydian', 12.54],
      [2, 'Phrygian', 12.57],
      [2, 'Mixolydian', 12.67],
      [9, 'Aeolian', 12.85],
      [5, 'Ionian', 13.17],
      [0, 'Ionian', 13.21],
    ]
    for (const [homeNote, mode, figure] of figures) {
      // The note sums two-decimal terms, so its figures may differ by one in the last place.
      expect(Math.abs(inBeats(penaltyOf(scores, homeNote, mode)) - figure)).toBeLessThanOrEqual(
        0.011,
      )
    }
  })

  // @test-link [[rule_suggestion_candidates]]
  it('gives the research note’s gaps for its variations, off the strong beats', () => {
    /** Intent: a pair's gap to the best of the scores, in the research note's unit. */
    const gapOf = (scores: readonly ScoredPair[], homeNote: number, mode: KeyMode) =>
      inBeats(penaltyOf(scores, homeNote, mode) - Math.min(...scores.map((each) => each.penalty)))
    const endingOnE = scorePairs(beatsDoodle(ENDING_ON_E, 1))
    expect(gapOf(endingOnE, 4, 'Phrygian')).toBe(0)
    expect(gapOf(endingOnE, 4, 'Locrian')).toBe(0)
    expect(gapOf(endingOnE, 9, 'Phrygian')).toBeCloseTo(0.39, 2)
    expect(gapOf(endingOnE, 9, 'Aeolian')).toBeCloseTo(0.39, 2)
    expect(gapOf(endingOnE, 2, 'Dorian')).toBeCloseTo(0.42, 2)
    const harmonic = scorePairs(beatsDoodle(HARMONIC_MINOR, 1))
    expect(keptCandidates(harmonic).map(pairName)).toEqual(['A Aeolian'])
    expect(qualifying(harmonic).length).toBe(1)
    const bluesy = scorePairs(beatsDoodle(BLUESY, 1))
    expect(keptCandidates(bluesy).map(pairName)).toEqual(['C Mixolydian'])
  })
})

// @test-link [[rule_suggestion_candidates]]
describe('the kept candidates', () => {
  // @test-link [[rule_suggestion_candidates]]
  it('keeps the research note’s answers on the beat grid as the spec weighs it', () => {
    expect(keptCandidates(scorePairs(beatsDoodle(WORKED_EXAMPLE))).map(pairName)).toEqual([
      'D Dorian',
      'D Aeolian',
    ])
    const endingOnE = scorePairs(beatsDoodle(ENDING_ON_E))
    expect(qualifying(endingOnE)).toHaveLength(6)
    expect(keptCandidates(endingOnE).map(pairName)).toEqual(['E Phrygian', 'E Locrian', 'D Dorian'])
    expect(keptCandidates(scorePairs(beatsDoodle(HARMONIC_MINOR))).map(pairName)).toEqual([
      'A Aeolian',
    ])
    expect(keptCandidates(scorePairs(beatsDoodle(BLUESY))).map(pairName)).toEqual(['C Mixolydian'])
  })

  // @test-link [[rule_suggestion_candidates]]
  it('keeps a gap of exactly 693 thousandths and drops one a unit wider', () => {
    const edge = 693 * WEIGHT_UNITS_PER_BEAT
    const scores = syntheticScores(500_000, [
      [3, 'Dorian', 100_000],
      [5, 'Lydian', 100_000 + edge],
      [7, 'Ionian', 100_000 + edge + 1],
    ])
    expect(keptCandidates(scores).map(pairName)).toEqual(['D# Dorian', 'F Lydian'])
  })

  // @test-link [[rule_suggestion_candidates]]
  it('keeps at most three, by penalty, then home note C to B, then mode Ionian to Locrian', () => {
    const scores = syntheticScores(500_000, [
      [9, 'Ionian', 100_010],
      [2, 'Locrian', 100_000],
      [2, 'Dorian', 100_000],
      [0, 'Aeolian', 100_010],
      [1, 'Mixolydian', 100_020],
    ])
    expect(keptCandidates(scores).map(pairName)).toEqual(['D Dorian', 'D Locrian', 'C Aeolian'])
  })
})

// @test-link [[rule_suggestion_withheld]]
describe('the material thresholds', () => {
  /** Six notes, five pitch classes, eight ticks: just enough of everything. */
  const justEnough: readonly (readonly [number, number, number])[] = [
    [1, 1, 62],
    [2, 1, 64],
    [3, 1, 65],
    [4, 1, 67],
    [5, 1, 69],
    [6, 3, 62],
  ]

  // @test-link [[rule_suggestion_withheld]]
  it('holds at 5 pitch classes, 6 notes and 2 beats, and fails one below each', () => {
    expect(hasEnoughMaterial(tickDoodle(justEnough))).toBe(true)
    const fourPitchClasses = justEnough.map(([start, length, pitch], index) =>
      index === 4 ? ([start, length, 62] as const) : ([start, length, pitch] as const),
    )
    expect(hasEnoughMaterial(tickDoodle(fourPitchClasses))).toBe(false)
    const fiveNotes = [...justEnough.slice(0, 4), [5, 4, 69] as const]
    expect(hasEnoughMaterial(tickDoodle(fiveNotes))).toBe(false)
    const sevenTicks = [...justEnough.slice(0, 5), [6, 2, 62] as const]
    expect(hasEnoughMaterial(tickDoodle(sevenTicks))).toBe(false)
  })
})

// @test-link [[rule_doodle_outside_modes_told]]
describe('the 80 % rule', () => {
  /** C D E G C off the beats (weight 8 each), then a C# of the given length. */
  const withOutside = (lengthTicks: number) =>
    tickDoodle([
      [1, 4, 60],
      [5, 4, 62],
      [9, 4, 64],
      [13, 4, 67],
      [17, 4, 72],
      [21, lengthTicks, 61],
    ])

  // @test-link [[rule_doodle_outside_modes_told]]
  it('fits at exactly 80 % of the weighted length and not one weight unit under', () => {
    const cIonian = { homeNote: 0 as PitchClassNumber, mode: 'Ionian' as const }
    expect(fitsWell(withOutside(5), cIonian)).toBe(true)
    expect(fitsWell(withOutside(6), cIonian)).toBe(false)
  })

  // @test-link [[rule_doodle_outside_modes_told]]
  it('fits the research note’s harmonic-minor and bluesy doodles (about 90 %)', () => {
    /** Intent: whether the doodle fits its best pair well enough. */
    const fits = (doodle: QuantizedDoodle) =>
      fitsWell(doodle, keptCandidates(scorePairs(doodle))[0]!)
    expect(fits(beatsDoodle(HARMONIC_MINOR))).toBe(true)
    expect(fits(beatsDoodle(BLUESY))).toBe(true)
  })
})

// @test-link [[rule_suggestion_candidates]]
describe('a doodle transposed by a fifth', () => {
  // @test-link [[rule_suggestion_candidates]]
  it('gives every penalty and the kept candidates transposed by a fifth (property)', () => {
    const next = lcg(0x5eed)
    let cutsWithoutTie = 0
    for (let run = 0; run < 200; run += 1) {
      const doodle = randomDoodle(next)
      const scores = scorePairs(doodle)
      const fifthUp = scorePairs(transposed(doodle, 7))
      for (const pair of scores) {
        expect(penaltyOf(fifthUp, (pair.homeNote + 7) % 12, pair.mode)).toBe(pair.penalty)
      }
      /** Intent: the pairs transposed up a fifth, as sortable text with their penalties. */
      const moved = (pairs: readonly ScoredPair[]) =>
        pairs.map((pair) => `${(pair.homeNote + 7) % 12} ${pair.mode} ${pair.penalty}`).sort()
      /** Intent: the pairs as sortable text with their penalties. */
      const named = (pairs: readonly ScoredPair[]) =>
        pairs.map((pair) => `${pair.homeNote} ${pair.mode} ${pair.penalty}`).sort()
      expect(named(qualifying(fifthUp))).toEqual(moved(qualifying(scores)))
      // The cap of three cuts by home note C to B inside a tie, which a transposition reorders;
      // without a tie across the cut, the kept candidates are the transposed ones.
      const all = qualifying(scores)
      const sorted = [...all].sort((a, b) => a.penalty - b.penalty)
      if (sorted.length <= 3 || sorted[2]!.penalty !== sorted[3]!.penalty) {
        cutsWithoutTie += 1
        expect(named(keptCandidates(fifthUp))).toEqual(moved(keptCandidates(scores)))
      }
    }
    expect(cutsWithoutTie).toBeGreaterThan(150)
  })
})

// @test-link [[rule_suggestion_candidates]]
describe('the cost of scoring', () => {
  // @test-link [[rule_suggestion_candidates]]
  it('scores 64 notes in under a millisecond (median of 201 runs)', () => {
    const doodle = makeQuantizedDoodle({
      measureCount: 4,
      notes: Array.from({ length: 64 }, (_, tick) => ({
        startTick: tick,
        lengthTicks: 1,
        pitch: 55 + ((tick * 5) % 19),
      })),
    })
    const times: number[] = []
    for (let run = 0; run < 201; run += 1) {
      const start = performance.now()
      keptCandidates(scorePairs(doodle))
      times.push(performance.now() - start)
    }
    times.sort((a, b) => a - b)
    const median = times[100]!
    console.info(`key suggestion: 64 notes scored in ${(median * 1000).toFixed(1)} µs (median)`)
    expect(median).toBeLessThan(1)
  })
})
