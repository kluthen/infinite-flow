import { describe, expect, it } from 'vitest'

import { BB_TENOR_PROFILE, EB_ALTO_PROFILE } from '@/domain/profile/instrument-profiles'
import {
  TranspositionIntervalError,
  deriveTranspositionInterval,
  findTranspositionProblem,
  instrumentTranspositionFor,
  transpositionFromInstrumentTransposition,
  type MyInstrumentTransposition,
} from '@/domain/profile/transposition-interval'

/**
 * Literal expected names and letter-name steps, transcribed from master spec §7.1's table (each
 * octave adds 7 steps), at 0, 1 and 2 octaves; never computed with the derivation under test.
 */
const INTERVAL_TABLE = [
  [0, 'unison', 0, 'octave', 7, '2 octaves', 14],
  [1, 'minor second', 1, 'minor ninth', 8, '2 octaves and a minor second', 15],
  [2, 'major second', 1, 'major ninth', 8, '2 octaves and a major second', 15],
  [3, 'minor third', 2, 'minor tenth', 9, '2 octaves and a minor third', 16],
  [4, 'major third', 2, 'major tenth', 9, '2 octaves and a major third', 16],
  [5, 'perfect fourth', 3, 'perfect eleventh', 10, '2 octaves and a perfect fourth', 17],
  [6, 'augmented fourth', 3, 'augmented eleventh', 10, '2 octaves and an augmented fourth', 17],
  [7, 'perfect fifth', 4, 'perfect twelfth', 11, '2 octaves and a perfect fifth', 18],
  [8, 'minor sixth', 5, 'minor thirteenth', 12, '2 octaves and a minor sixth', 19],
  [9, 'major sixth', 5, 'major thirteenth', 12, '2 octaves and a major sixth', 19],
  [10, 'minor seventh', 6, 'minor fourteenth', 13, '2 octaves and a minor seventh', 20],
  [11, 'major seventh', 6, 'major fourteenth', 13, '2 octaves and a major seventh', 20],
] as const

/** One expected derivation: a transposition and the name, steps and size it must give. */
interface IntervalCase {
  readonly label: string
  readonly transposition: MyInstrumentTransposition
  readonly simpleName: string
  readonly name: string
  readonly letterSteps: number
  readonly size: number
}

/** Every 0–11 semitone count at 0, 1 and 2 octaves, lower and higher (a zero size has no direction). */
const INTERVAL_CASES: readonly IntervalCase[] = INTERVAL_TABLE.flatMap(
  ([semitones, simpleName, steps0, name1, steps1, name2, steps2]) =>
    (['lower', 'higher'] as const).flatMap((direction) =>
      [
        { octaves: 0, name: simpleName, letterSteps: steps0 },
        { octaves: 1, name: name1, letterSteps: steps1 },
        { octaves: 2, name: name2, letterSteps: steps2 },
      ]
        .filter(({ octaves }) => octaves > 0 || semitones > 0)
        .map(({ octaves, name, letterSteps }) => ({
          label: `${octaves} oct ${semitones} semi ${direction}`,
          transposition: { octaves, semitones, direction },
          simpleName,
          name,
          letterSteps,
          size: 12 * octaves + semitones,
        })),
    ),
)

// @test-link [[rule_my_instrument_transposition_named_interval]]
describe('deriveTranspositionInterval: the fixed interval table', () => {
  it('covers every semitone count at 0, 1 and 2 octaves in both directions', () => {
    expect(INTERVAL_CASES).toHaveLength(70)
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it.each(INTERVAL_CASES)(
    '$label derives the table name and letter-name steps',
    ({ transposition, simpleName, name, letterSteps, size }) => {
      expect(deriveTranspositionInterval(transposition)).toEqual({
        semitones: size,
        letterSteps,
        octaves: transposition.octaves,
        simpleName,
        name,
        direction: transposition.direction,
      })
    },
  )

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it.each(INTERVAL_CASES)(
    '$label gives written = concert + chromatic: lower is positive, higher negative',
    ({ transposition, letterSteps, size }) => {
      const sign = transposition.direction === 'lower' ? 1 : -1
      expect(instrumentTranspositionFor(transposition)).toEqual({
        chromatic: sign * size,
        diatonic: sign * letterSteps,
      })
    },
  )

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('derives the same pitch as a unison of 0 steps and no transposition', () => {
    const same = { octaves: 0, semitones: 0, direction: 'same' } as const
    expect(deriveTranspositionInterval(same)).toEqual({
      semitones: 0,
      letterSteps: 0,
      octaves: 0,
      simpleName: 'unison',
      name: 'unison',
      direction: 'same',
    })
    expect(instrumentTranspositionFor(same)).toEqual({ chromatic: 0, diatonic: 0 })
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('spells 6 semitones as an augmented fourth, never a diminished fifth', () => {
    const tritone = deriveTranspositionInterval({ octaves: 0, semitones: 6, direction: 'higher' })
    expect(tritone.name).toBe('augmented fourth')
    expect(tritone.letterSteps).toBe(3)
  })

  // @test-link [[rule_my_instrument_transposition_named_interval]]
  it('names three whole octaves "3 octaves", 21 steps', () => {
    const interval = deriveTranspositionInterval({ octaves: 3, semitones: 0, direction: 'lower' })
    expect(interval.name).toBe('3 octaves')
    expect(interval.letterSteps).toBe(21)
    expect(interval.semitones).toBe(36)
  })
})

// @test-link [[rule_my_instrument_transposition_named_interval]]
describe('deriveTranspositionInterval: the built-in saxophones', () => {
  it("derives the tenor saxophone's 1 octave and 2 semitones lower as a major ninth, 8 steps, its own transposition", () => {
    const tenor = { octaves: 1, semitones: 2, direction: 'lower' } as const
    const interval = deriveTranspositionInterval(tenor)
    expect(interval.name).toBe('major ninth')
    expect(interval.letterSteps).toBe(8)
    expect(interval.semitones).toBe(14)
    expect(instrumentTranspositionFor(tenor)).toEqual({ chromatic: 14, diatonic: 8 })
    expect(instrumentTranspositionFor(tenor)).toEqual(BB_TENOR_PROFILE.transposition)
  })

  it("derives the alto saxophone's 9 semitones lower as a major sixth, its own transposition", () => {
    const alto = { octaves: 0, semitones: 9, direction: 'lower' } as const
    expect(deriveTranspositionInterval(alto).name).toBe('major sixth')
    expect(instrumentTranspositionFor(alto)).toEqual(EB_ALTO_PROFILE.transposition)
  })
})

/** Malformed transpositions, each refused rather than clamped. */
const MALFORMED: readonly (readonly [string, MyInstrumentTransposition])[] = [
  ['negative octaves', { octaves: -1, semitones: 2, direction: 'lower' }],
  ['fractional octaves', { octaves: 1.5, semitones: 0, direction: 'lower' }],
  ['12 semitones', { octaves: 0, semitones: 12, direction: 'higher' }],
  ['negative semitones', { octaves: 1, semitones: -1, direction: 'lower' }],
  ['fractional semitones', { octaves: 0, semitones: 2.5, direction: 'lower' }],
  ['same with a size', { octaves: 0, semitones: 2, direction: 'same' }],
  ['same with an octave', { octaves: 1, semitones: 0, direction: 'same' }],
  ['lower with no size', { octaves: 0, semitones: 0, direction: 'lower' }],
  ['higher with no size', { octaves: 0, semitones: 0, direction: 'higher' }],
  [
    'an unknown direction',
    { octaves: 0, semitones: 2, direction: 'sideways' } as unknown as MyInstrumentTransposition,
  ],
]

// @test-link [[rule_my_instrument_transposition_named_interval]]
describe('transposition validity', () => {
  it.each(MALFORMED)('refuses %s', (_label, transposition) => {
    expect(findTranspositionProblem(transposition)).toEqual(expect.any(String))
    expect(() => deriveTranspositionInterval(transposition)).toThrow(TranspositionIntervalError)
    expect(() => instrumentTranspositionFor(transposition)).toThrow(TranspositionIntervalError)
  })

  it('finds no problem in a well-formed transposition', () => {
    expect(findTranspositionProblem({ octaves: 4, semitones: 11, direction: 'higher' })).toBe(
      undefined,
    )
    expect(findTranspositionProblem({ octaves: 0, semitones: 0, direction: 'same' })).toBe(
      undefined,
    )
  })
})

// @test-link [[rule_my_instrument_transposition_named_interval]]
describe('transpositionFromInstrumentTransposition: a built-in turned into octaves and semitones', () => {
  it('splits a chromatic count into octaves, semitones and a direction', () => {
    expect(transpositionFromInstrumentTransposition(BB_TENOR_PROFILE.transposition)).toEqual({
      octaves: 1,
      semitones: 2,
      direction: 'lower',
    })
    expect(transpositionFromInstrumentTransposition({ chromatic: -15, diatonic: -9 })).toEqual({
      octaves: 1,
      semitones: 3,
      direction: 'higher',
    })
    expect(transpositionFromInstrumentTransposition({ chromatic: 0, diatonic: 0 })).toEqual({
      octaves: 0,
      semitones: 0,
      direction: 'same',
    })
  })

  it("refuses a diatonic count that disagrees with the table's steps for its chromatic count", () => {
    expect(() => transpositionFromInstrumentTransposition({ chromatic: 2, diatonic: 2 })).toThrow(
      TranspositionIntervalError,
    )
    expect(() => transpositionFromInstrumentTransposition({ chromatic: -6, diatonic: -4 })).toThrow(
      TranspositionIntervalError,
    )
  })
})
