/**
 * My instrument's transposition as the player enters it (a number of octaves, a number of
 * semitones within the octave and one direction for the whole transposition), the interval name
 * and letter-name steps derived from it by a fixed table, and the chromatic/diatonic pair every
 * instrument profile carries (written = concert + chromatic).
 */

import { deepFreeze } from '../events/deep-freeze'
import type { InstrumentTransposition } from './instrument-profile'

/** Which way a written note sounds: lower than written, at the same pitch, or higher. */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export type MyInstrumentDirection = 'lower' | 'same' | 'higher'

/**
 * A transposition as entered: whole octaves from 0 up, semitones from 0 to 11, and the direction
 * of the whole transposition, octaves included; "same" exactly when both counts are 0.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export interface MyInstrumentTransposition {
  readonly octaves: number
  readonly semitones: number
  readonly direction: MyInstrumentDirection
}

/**
 * The derived interval: its total size in semitones, its total letter-name steps (unsigned), the
 * octaves, the name of the semitones within the octave, the full name and the direction.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export interface TranspositionInterval {
  readonly semitones: number
  readonly letterSteps: number
  readonly octaves: number
  readonly simpleName: string
  readonly name: string
  readonly direction: MyInstrumentDirection
}

/** Typed failure for a malformed transposition or a pair the fixed table cannot spell. */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export class TranspositionIntervalError extends Error {
  readonly kind = 'TranspositionIntervalError' as const

  constructor(message: string) {
    super(message)
    this.name = 'TranspositionIntervalError'
  }
}

/** One row of the fixed table: the name of a semitone count within the octave and its steps. */
interface SimpleInterval {
  readonly name: string
  readonly compoundName: string
  readonly letterSteps: number
}

/**
 * The fixed table, indexed by semitones 0 to 11: the simple name, its name one octave up and its
 * letter-name steps. The tritone is always an augmented fourth.
 */
const SIMPLE_INTERVALS: readonly SimpleInterval[] = deepFreeze([
  { name: 'unison', compoundName: 'octave', letterSteps: 0 },
  { name: 'minor second', compoundName: 'minor ninth', letterSteps: 1 },
  { name: 'major second', compoundName: 'major ninth', letterSteps: 1 },
  { name: 'minor third', compoundName: 'minor tenth', letterSteps: 2 },
  { name: 'major third', compoundName: 'major tenth', letterSteps: 2 },
  { name: 'perfect fourth', compoundName: 'perfect eleventh', letterSteps: 3 },
  { name: 'augmented fourth', compoundName: 'augmented eleventh', letterSteps: 3 },
  { name: 'perfect fifth', compoundName: 'perfect twelfth', letterSteps: 4 },
  { name: 'minor sixth', compoundName: 'minor thirteenth', letterSteps: 5 },
  { name: 'major sixth', compoundName: 'major thirteenth', letterSteps: 5 },
  { name: 'minor seventh', compoundName: 'minor fourteenth', letterSteps: 6 },
  { name: 'major seventh', compoundName: 'major fourteenth', letterSteps: 6 },
])

const SEMITONES_PER_OCTAVE = 12
const LETTER_STEPS_PER_OCTAVE = 7
const DIRECTIONS: readonly MyInstrumentDirection[] = ['lower', 'same', 'higher']

/**
 * Intent: say what is wrong with a transposition, or nothing when it is well formed: octaves a
 * whole number from 0 up, semitones a whole number from 0 to 11, a known direction, "same" with a
 * zero size and "lower" or "higher" with a non-zero one. Never corrects the value.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function findTranspositionProblem(
  transposition: MyInstrumentTransposition,
): string | undefined {
  const { octaves, semitones, direction } = transposition
  if (!Number.isInteger(octaves) || octaves < 0)
    return `The octaves must be a whole number from 0 up, got ${octaves}.`
  if (!Number.isInteger(semitones) || semitones < 0 || semitones >= SEMITONES_PER_OCTAVE)
    return `The semitones must be a whole number from 0 to 11, got ${semitones}.`
  if (!DIRECTIONS.includes(direction))
    return `The direction must be lower, same or higher, got ${JSON.stringify(direction)}.`
  const size = SEMITONES_PER_OCTAVE * octaves + semitones
  if (direction === 'same' && size !== 0)
    return `A transposition of ${size} semitones must sound lower or higher, not the same.`
  if (direction !== 'same' && size === 0)
    return `A transposition of 0 semitones sounds the same, not ${direction}.`
  return undefined
}

/** Intent: refuse a malformed transposition as a typed failure. */
function assertWellFormed(transposition: MyInstrumentTransposition): void {
  const problem = findTranspositionProblem(transposition)
  if (problem !== undefined) throw new TranspositionIntervalError(problem)
}

/** Intent: the indefinite article an interval name takes. */
function articleFor(name: string): string {
  return /^[aeiou]/.test(name) ? 'an' : 'a'
}

/**
 * Intent: the full interval name: the simple name within one octave, "octave" or the compound
 * name at one octave, and "n octaves" or "n octaves and a(n) <simple name>" beyond.
 */
function intervalName(octaves: number, semitones: number, simple: SimpleInterval): string {
  if (octaves === 0) return simple.name
  if (octaves === 1) return simple.compoundName
  if (semitones === 0) return `${octaves} octaves`
  return `${octaves} octaves and ${articleFor(simple.name)} ${simple.name}`
}

/**
 * Intent: derive the interval of a well-formed transposition from the fixed table: each octave
 * adds 12 semitones and 7 letter-name steps. A malformed transposition is refused.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function deriveTranspositionInterval(
  transposition: MyInstrumentTransposition,
): TranspositionInterval {
  assertWellFormed(transposition)
  const { octaves, semitones, direction } = transposition
  const simple = SIMPLE_INTERVALS[semitones]!
  return deepFreeze({
    semitones: SEMITONES_PER_OCTAVE * octaves + semitones,
    letterSteps: LETTER_STEPS_PER_OCTAVE * octaves + simple.letterSteps,
    octaves,
    simpleName: simple.name,
    name: intervalName(octaves, semitones, simple),
    direction,
  })
}

/** Intent: the sign written = concert + chromatic gives a direction: lower is positive. */
function directionSign(direction: MyInstrumentDirection): number {
  if (direction === 'lower') return 1
  if (direction === 'higher') return -1
  return 0
}

/**
 * Intent: the chromatic/diatonic pair of a well-formed transposition, in the instrument-profile
 * convention written = concert + chromatic: a transposition sounding lower has positive counts,
 * one sounding higher negative counts. A malformed transposition is refused.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function instrumentTranspositionFor(
  transposition: MyInstrumentTransposition,
): InstrumentTransposition {
  const interval = deriveTranspositionInterval(transposition)
  const sign = directionSign(interval.direction)
  return deepFreeze({
    chromatic: sign * interval.semitones,
    diatonic: sign * interval.letterSteps,
  })
}

/**
 * Intent: turn a built-in's chromatic/diatonic pair back into octaves, semitones and a direction,
 * refusing a pair whose diatonic count is not the fixed table's steps for its chromatic count, so
 * a template is never respelled silently.
 */
// @spec-link [[rule_my_instrument_transposition_named_interval]]
export function transpositionFromInstrumentTransposition(
  pair: InstrumentTransposition,
): MyInstrumentTransposition {
  if (!Number.isInteger(pair.chromatic))
    throw new TranspositionIntervalError(
      `A chromatic count must be a whole number, got ${pair.chromatic}.`,
    )
  const size = Math.abs(pair.chromatic)
  const direction: MyInstrumentDirection =
    pair.chromatic > 0 ? 'lower' : pair.chromatic < 0 ? 'higher' : 'same'
  const transposition: MyInstrumentTransposition = deepFreeze({
    octaves: Math.floor(size / SEMITONES_PER_OCTAVE),
    semitones: size % SEMITONES_PER_OCTAVE,
    direction,
  })
  const expected = instrumentTranspositionFor(transposition)
  if (expected.diatonic !== pair.diatonic)
    throw new TranspositionIntervalError(
      `A chromatic count of ${pair.chromatic} takes a diatonic count of ${expected.diatonic} by the interval table, got ${pair.diatonic}.`,
    )
  return transposition
}
