/**
 * The quantized doodle: a Jam's doodle once quantized, the one immutable value every later step
 * reads (the controls taken from it, the steering block, the key and mode suggestion, the kept
 * session, the review and the exports). It is its own type, not a ConcertEventTimeline, which
 * always spans four measures: a doodle spans one to four measures and holds one melodic line, each
 * note a start and a length in whole ticks (sixteenth notes) counted from the start of the doodle's
 * first measure, and a concert pitch. Notes are sorted by start, never overlap, last at least one
 * tick and lie inside the doodle's measures, so a doodle holds at most 64 notes. The tempo the
 * doodle was captured at is kept beside it by its callers, never inside it, so it can never reach a
 * generation request. Pure: the validating constructor and the parser for untrusted input (reused
 * by the kept-session codec and Jam's code) are the only ways to obtain one.
 */

import { ConcertPitchError, makeConcertPitch, type ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import { TICKS_PER_BAR } from '../time/ticks'

/** Intent: the most measures a doodle spans. */
// @spec-link [[entity_quantized_doodle]]
export const DOODLE_MAX_MEASURES = 4

/** Intent: the most notes a doodle holds: one line of sixteenth notes over four measures. */
// @spec-link [[entity_quantized_doodle]]
export const DOODLE_MAX_NOTES = DOODLE_MAX_MEASURES * TICKS_PER_BAR

/** The number of measures a doodle spans. */
// @spec-link [[entity_quantized_doodle]]
export type DoodleMeasureCount = 1 | 2 | 3 | 4

/**
 * One note of the doodle: its start, in ticks (sixteenth notes) from the start of the doodle's
 * first measure, its length in ticks (at least one) and its concert pitch.
 */
// @spec-link [[entity_quantized_doodle]]
export interface DoodleNote {
  readonly startTick: number
  readonly lengthTicks: number
  readonly pitch: ConcertPitch
}

/**
 * A quantized doodle: one to four measures and one line of notes, sorted by start, never
 * overlapping. It holds no tempo, ever.
 */
// @spec-link [[entity_quantized_doodle]]
// @spec-link [[rule_quantized_doodle_is_generation_input]]
export interface QuantizedDoodle {
  readonly measureCount: DoodleMeasureCount
  readonly notes: readonly DoodleNote[]
}

/** The raw shape the constructor validates: plain numbers, not yet checked. */
// @spec-link [[entity_quantized_doodle]]
export interface QuantizedDoodleInput {
  readonly measureCount: number
  readonly notes: readonly {
    readonly startTick: number
    readonly lengthTicks: number
    readonly pitch: number
  }[]
}

/** Typed failure for a doodle that breaks the quantized doodle's rules. */
// @spec-link [[entity_quantized_doodle]]
export class QuantizedDoodleViolation extends Error {
  readonly kind = 'QuantizedDoodleViolation' as const

  constructor(message: string) {
    super(message)
    this.name = 'QuantizedDoodleViolation'
  }
}

/** Typed failure for untrusted doodle input that cannot be parsed. */
// @spec-link [[entity_quantized_doodle]]
export class QuantizedDoodleParseError extends Error {
  readonly kind = 'QuantizedDoodleParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'QuantizedDoodleParseError'
  }
}

/** Intent: whether a number is a doodle's measure count, 1 to 4. */
function isDoodleMeasureCount(value: number): value is DoodleMeasureCount {
  return value === 1 || value === 2 || value === 3 || value === 4
}

/**
 * Intent: one note checked and copied into a fresh object: a whole, non-negative start, a whole
 * length of at least one tick, an end at or before the doodle's last barline and a concert pitch.
 */
function checkedNote(
  note: QuantizedDoodleInput['notes'][number],
  position: number,
  endTick: number,
): DoodleNote {
  const { startTick, lengthTicks } = note
  if (!Number.isSafeInteger(startTick) || startTick < 0) {
    throw new QuantizedDoodleViolation(
      `Doodle note ${position} must start on a whole, non-negative tick, got ${startTick}.`,
    )
  }
  if (!Number.isSafeInteger(lengthTicks) || lengthTicks < 1) {
    throw new QuantizedDoodleViolation(
      `Doodle note ${position} must last a whole number of ticks, at least 1, got ${lengthTicks}.`,
    )
  }
  if (startTick + lengthTicks > endTick) {
    throw new QuantizedDoodleViolation(
      `Doodle note ${position} lies outside its measures: it ends at tick ` +
        `${startTick + lengthTicks}, past the last barline at tick ${endTick}.`,
    )
  }
  return { startTick, lengthTicks, pitch: checkedPitch(note.pitch, position) }
}

/** Intent: a note's pitch as a concert pitch, a refusal naming the note's position. */
function checkedPitch(pitch: number, position: number): ConcertPitch {
  try {
    return makeConcertPitch(pitch)
  } catch (error) {
    if (error instanceof ConcertPitchError) {
      throw new QuantizedDoodleViolation(`Doodle note ${position}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Intent: check that the notes form one line starting in the doodle's first measure: the first
 * note starts before tick 16, each later note starts at or after the end of the one before it.
 */
function checkOneLine(notes: readonly DoodleNote[]): void {
  notes.forEach((note, position) => {
    const previous = notes[position - 1]
    if (previous === undefined) {
      if (note.startTick >= TICKS_PER_BAR) {
        throw new QuantizedDoodleViolation(
          `A doodle's first measure holds its first note, but the first note starts at tick ` +
            `${note.startTick}.`,
        )
      }
      return
    }
    if (note.startTick <= previous.startTick) {
      throw new QuantizedDoodleViolation(
        `Doodle notes must be sorted by start, one per tick: note ${position} starts at tick ` +
          `${note.startTick}, note ${position - 1} at tick ${previous.startTick}.`,
      )
    }
    if (previous.startTick + previous.lengthTicks > note.startTick) {
      throw new QuantizedDoodleViolation(
        `Doodle notes must not overlap: note ${position - 1} ends at tick ` +
          `${previous.startTick + previous.lengthTicks}, after note ${position} starts at tick ` +
          `${note.startTick}.`,
      )
    }
  })
}

/**
 * Intent: construct an immutable, deep-frozen quantized doodle of fresh objects from a raw doodle.
 * Refuses, as a QuantizedDoodleViolation: a measure count other than 1 to 4, more than 64 notes
 * (the count checked before any note) or none, a start that is not a whole non-negative tick, a
 * length that is not a whole number of ticks of at least one, a note ending past the last barline,
 * a first note outside the first measure, unsorted notes, two notes on one tick, an overlap and a
 * pitch that is not a concert pitch. Never sorts, trims or drops a note: that is the quantizer's
 * job. Only the measure count and the notes are copied, so a doodle never holds a tempo.
 */
// @spec-link [[entity_quantized_doodle]]
// @spec-link [[rule_doodle_is_one_line]]
export function makeQuantizedDoodle(input: QuantizedDoodleInput): QuantizedDoodle {
  const { measureCount } = input
  if (!isDoodleMeasureCount(measureCount)) {
    throw new QuantizedDoodleViolation(
      `A doodle spans 1 to ${DOODLE_MAX_MEASURES} measures, got ${measureCount}.`,
    )
  }
  if (input.notes.length > DOODLE_MAX_NOTES) {
    throw new QuantizedDoodleViolation(
      `A doodle holds at most ${DOODLE_MAX_NOTES} notes, got ${input.notes.length} notes.`,
    )
  }
  if (input.notes.length === 0) {
    throw new QuantizedDoodleViolation('A doodle holds at least one note, got none.')
  }
  const endTick = measureCount * TICKS_PER_BAR
  const notes = input.notes.map((note, position) => checkedNote(note, position, endTick))
  checkOneLine(notes)
  return deepFreeze({ measureCount, notes })
}

/** The exact fields of an untrusted doodle and of each of its notes. */
const DOODLE_KEYS: readonly string[] = ['measureCount', 'notes']
const NOTE_KEYS: readonly string[] = ['startTick', 'lengthTicks', 'pitch']

/**
 * Intent: an untrusted value as a plain object holding exactly the given keys; anything else
 * (null, an array, a non-plain object, an extra or a missing key) is refused as a parse error.
 */
function exactRecord(
  value: unknown,
  keys: readonly string[],
  what: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new QuantizedDoodleParseError(`${what} must be a plain object, got ${typeof value}.`)
  }
  const prototype: unknown = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new QuantizedDoodleParseError(`${what} must be a plain object.`)
  }
  const record = value as Record<string, unknown>
  const presentKeys = Object.keys(record)
  const unknownKey = presentKeys.find((key) => !keys.includes(key))
  if (unknownKey !== undefined) {
    throw new QuantizedDoodleParseError(`${what} has unknown field "${unknownKey}".`)
  }
  const missingKey = keys.find((key) => !presentKeys.includes(key))
  if (missingKey !== undefined) {
    throw new QuantizedDoodleParseError(`${what} is missing its field "${missingKey}".`)
  }
  return record
}

/** Intent: an untrusted field as a number, never coercing a string, null or anything else. */
function numberField(record: Record<string, unknown>, key: string, what: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new QuantizedDoodleParseError(`${what}.${key} must be a number, got ${typeof value}.`)
  }
  return value
}

/**
 * Intent: parse an untrusted value into a quantized doodle: a plain object with exactly the fields
 * measureCount and notes (a tempo or any other field refused), notes an array of plain objects
 * with exactly the number fields startTick, lengthTicks and pitch, then every rule of
 * makeQuantizedDoodle. Every refusal surfaces as a QuantizedDoodleParseError, never a partial
 * doodle.
 */
// @spec-link [[entity_quantized_doodle]]
export function parseQuantizedDoodle(input: unknown): QuantizedDoodle {
  const record = exactRecord(input, DOODLE_KEYS, 'Doodle')
  const measureCount = numberField(record, 'measureCount', 'Doodle')
  const rawNotes = record.notes
  if (!Array.isArray(rawNotes)) {
    throw new QuantizedDoodleParseError('Doodle.notes must be an array.')
  }
  const notes = rawNotes.map((rawNote: unknown, position) => {
    const what = `Doodle.notes[${position}]`
    const note = exactRecord(rawNote, NOTE_KEYS, what)
    return {
      startTick: numberField(note, 'startTick', what),
      lengthTicks: numberField(note, 'lengthTicks', what),
      pitch: numberField(note, 'pitch', what),
    }
  })
  try {
    return makeQuantizedDoodle({ measureCount, notes })
  } catch (error) {
    if (error instanceof QuantizedDoodleViolation) {
      throw new QuantizedDoodleParseError(error.message)
    }
    throw error
  }
}
