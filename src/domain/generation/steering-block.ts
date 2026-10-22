/**
 * The steering block: what a doodle steers, carried into the generator as plain, validated data.
 * It holds a target rhythm (the note starts and rest starts of each of the phrase's four measures,
 * in measure-relative sixteenth ticks, with a band saying how far a candidate may be and still
 * count as near) and the doodle's melodic moves in order (a direction and, unless the note stays
 * the same, a size) with one strength for the list. It holds no pitch, no doodle, no drift and no
 * tempo, so the generator never hears of a doodle, a drift or Jam. A block is always constructed
 * valid and deep-frozen, and an untrusted value is parsed through the same constructor, refusing
 * any missing or extra field at every level.
 */

import { deepFreeze } from '../events/deep-freeze'
import { PHRASE_TICKS, TICKS_PER_BAR } from '../time/ticks'
import { PHRASE_MEASURE_COUNT } from './generation-request-envelope'

/**
 * How far a rhythm candidate may be from the target and still count as near: `unbounded` makes
 * every candidate count as near, so the seeded order stands.
 */
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_steering_block]]
export type SteeringBand = 'close' | 'near' | 'unbounded'

/** The size of a melodic move: a step, a skip or a leap. */
// @spec-link [[entity_steering_block]]
export type MelodicMoveSize = 'step' | 'skip' | 'leap'

/** One melodic move of the doodle: up or down by a size, or the same note, which has no size. */
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_steering_block]]
export type MelodicMove =
  | { readonly direction: 'same' }
  | { readonly direction: 'up' | 'down'; readonly size: MelodicMoveSize }

/** How strongly the moves steer the pitch order: by size and direction, by direction, or not. */
// @spec-link [[entity_steering_block]]
export type SteeringStrength = 'size-and-direction' | 'direction' | 'none'

/** One start of the target rhythm: a note start or a rest start, at a measure-relative tick. */
// @spec-link [[entity_steering_block]]
export interface SteeringStart {
  readonly tick: number
  readonly kind: 'note' | 'rest'
}

/**
 * The target rhythm: the doodle's measures already laid over the phrase, exactly four, each the
 * list of its note starts and rest starts in increasing measure-relative tick (a measure of tie
 * continuations alone has no start, so a measure may be empty), and the band. Rest starts are
 * kept beside note starts because the rhythm distance compares both.
 */
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_steering_block]]
export interface SteeringTargetRhythm {
  readonly measures: readonly (readonly SteeringStart[])[]
  readonly band: SteeringBand
}

/** The steering block: a target rhythm, the doodle's moves in order, and their strength. */
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_steering_block]]
export interface SteeringBlock {
  readonly targetRhythm: SteeringTargetRhythm
  readonly moves: readonly MelodicMove[]
  readonly strength: SteeringStrength
}

/**
 * The most moves a block may hold: a four-measure doodle holds at most one start per sixteenth,
 * 64 starts, so at most 63 moves between them.
 */
// @spec-link [[entity_steering_block]]
export const MAX_STEERING_MOVES = PHRASE_TICKS - 1

/** Typed failure for a malformed steering block, naming the field and the value. */
// @spec-link [[entity_steering_block]]
export class SteeringBlockError extends Error {
  readonly kind = 'SteeringBlockError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SteeringBlockError'
  }
}

const BANDS: readonly string[] = ['close', 'near', 'unbounded']
const STRENGTHS: readonly string[] = ['size-and-direction', 'direction', 'none']
const SIZES: readonly string[] = ['step', 'skip', 'leap']
const START_KINDS: readonly string[] = ['note', 'rest']
const DIRECTIONS: readonly string[] = ['up', 'down', 'same']
const CONTEXT = 'SteeringBlock'

/** Intent: refuse a value that is not one of the allowed values of the named field. */
function requireOneOf(value: unknown, allowed: readonly string[], field: string): void {
  if (typeof value !== 'string' || !allowed.includes(value))
    throw new SteeringBlockError(
      `${field} must be one of ${JSON.stringify(allowed)}, got ${JSON.stringify(value)}.`,
    )
}

/** Intent: refuse a value of the named field that is not an array. */
function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value))
    throw new SteeringBlockError(`${field} must be an array, got ${JSON.stringify(value)}.`)
  return value
}

/** Intent: refuse a value of the named field that is not a non-null object. */
function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null)
    throw new SteeringBlockError(`${field} must be an object, got ${JSON.stringify(value)}.`)
  return value as Record<string, unknown>
}

/** Intent: a validated copy of one measure's starts: whole ticks in the measure, increasing. */
function copyMeasure(measure: unknown, field: string): SteeringStart[] {
  let previousTick = -1
  return requireArray(measure, field).map((entry, index) => {
    const startField = `${field}[${index}]`
    const { tick, kind } = requireObject(entry, startField)
    if (typeof tick !== 'number' || !Number.isInteger(tick) || tick < 0 || tick >= TICKS_PER_BAR)
      throw new SteeringBlockError(
        `${startField}.tick must be a whole number 0-${TICKS_PER_BAR - 1}, got ${JSON.stringify(tick)}.`,
      )
    if (tick <= previousTick)
      throw new SteeringBlockError(
        `${startField}.tick must increase within its measure, got ${tick} after ${previousTick}.`,
      )
    requireOneOf(kind, START_KINDS, `${startField}.kind`)
    previousTick = tick
    return { tick, kind: kind as SteeringStart['kind'] }
  })
}

/** Intent: a validated copy of one move: a same-note move has no size, up and down have one. */
function copyMove(entry: unknown, field: string): MelodicMove {
  const move = requireObject(entry, field)
  requireOneOf(move.direction, DIRECTIONS, `${field}.direction`)
  if (move.direction === 'same') {
    if (Object.hasOwn(move, 'size'))
      throw new SteeringBlockError(
        `${field} is the same note and must have no size, got ${JSON.stringify(move.size)}.`,
      )
    return { direction: 'same' }
  }
  requireOneOf(move.size, SIZES, `${field}.size`)
  return {
    direction: move.direction as 'up' | 'down',
    size: move.size as MelodicMoveSize,
  }
}

/**
 * Intent: build one immutable steering block, a fresh deep-frozen copy of the input in field
 * order, refusing as a SteeringBlockError naming the field and value: a measure count other than
 * four, a start tick that is not a whole number in the measure or does not increase within it, an
 * unknown start kind, band, strength, move direction or size, a size on a same-note move, an up or
 * down move without one, and more than MAX_STEERING_MOVES moves. Empty measures and an empty move
 * list are allowed. Nothing is defaulted.
 */
// @spec-link [[entity_steering_block]]
// @spec-link [[rule_jam_steering_block]]
export function makeSteeringBlock(input: SteeringBlock): SteeringBlock {
  const targetRhythm = requireObject(input.targetRhythm, `${CONTEXT}.targetRhythm`)
  const measures = requireArray(targetRhythm.measures, `${CONTEXT}.targetRhythm.measures`)
  if (measures.length !== PHRASE_MEASURE_COUNT)
    throw new SteeringBlockError(
      `${CONTEXT}.targetRhythm.measures must hold ${PHRASE_MEASURE_COUNT} measures, got ${measures.length}.`,
    )
  requireOneOf(targetRhythm.band, BANDS, `${CONTEXT}.targetRhythm.band`)
  const moves = requireArray(input.moves, `${CONTEXT}.moves`)
  if (moves.length > MAX_STEERING_MOVES)
    throw new SteeringBlockError(
      `${CONTEXT}.moves must hold at most ${MAX_STEERING_MOVES} moves (a four-measure doodle ` +
        `holds at most ${PHRASE_TICKS} starts), got ${moves.length}.`,
    )
  requireOneOf(input.strength, STRENGTHS, `${CONTEXT}.strength`)
  return deepFreeze({
    targetRhythm: {
      measures: measures.map((measure, index) =>
        copyMeasure(measure, `${CONTEXT}.targetRhythm.measures[${index}]`),
      ),
      band: targetRhythm.band as SteeringBand,
    },
    moves: moves.map((move, index) => copyMove(move, `${CONTEXT}.moves[${index}]`)),
    strength: input.strength,
  })
}

/** Intent: narrow an untrusted value to a plain record holding exactly the expected keys. */
function exactRecord(
  input: unknown,
  keys: readonly string[],
  field: string,
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input))
    throw new SteeringBlockError(`${field} must be a plain object, got ${JSON.stringify(input)}.`)
  const record = input as Record<string, unknown>
  for (const key of Object.keys(record))
    if (!keys.includes(key)) throw new SteeringBlockError(`${field} has unknown field "${key}".`)
  for (const key of keys)
    if (!Object.hasOwn(record, key))
      throw new SteeringBlockError(`${field} is missing field "${key}".`)
  return record
}

/** Intent: parse one untrusted measure of starts, each holding exactly a tick and a kind. */
function parseMeasure(input: unknown, field: string): readonly SteeringStart[] {
  return requireArray(input, field).map((start, index) => {
    const record = exactRecord(start, ['tick', 'kind'], `${field}[${index}]`)
    return { tick: record.tick, kind: record.kind } as SteeringStart
  })
}

/** Intent: parse one untrusted move: exactly a direction, plus a size unless it is the same note. */
function parseMove(input: unknown, field: string): MelodicMove {
  const direction = requireObject(input, field).direction
  const record = exactRecord(
    input,
    direction === 'same' ? ['direction'] : ['direction', 'size'],
    field,
  )
  return (direction === 'same' ? { direction } : { direction, size: record.size }) as MelodicMove
}

/**
 * Intent: parse an untrusted value (a structured clone, which drops freezing) into a steering
 * block, refusing any missing or extra field at every level and any non-array list, then
 * re-validating it through `makeSteeringBlock`. Every refusal is a SteeringBlockError.
 */
// @spec-link [[entity_steering_block]]
export function parseSteeringBlock(input: unknown): SteeringBlock {
  const record = exactRecord(input, ['targetRhythm', 'moves', 'strength'], CONTEXT)
  const target = exactRecord(record.targetRhythm, ['measures', 'band'], `${CONTEXT}.targetRhythm`)
  const measuresField = `${CONTEXT}.targetRhythm.measures`
  return makeSteeringBlock({
    targetRhythm: {
      measures: requireArray(target.measures, measuresField).map((measure, index) =>
        parseMeasure(measure, `${measuresField}[${index}]`),
      ),
      band: target.band as SteeringBand,
    },
    moves: requireArray(record.moves, `${CONTEXT}.moves`).map((move, index) =>
      parseMove(move, `${CONTEXT}.moves[${index}]`),
    ),
    strength: record.strength as SteeringStrength,
  })
}
