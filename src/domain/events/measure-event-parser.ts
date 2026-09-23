/**
 * Hand-written boundary parser for one untrusted measure event. No schema library: every field
 * is checked by hand and any malformed shape, unknown discriminant, non-tiling-grid duration, or
 * unexpected extra field is rejected loudly as a typed MeasureEventParseError rather than
 * defaulted, coerced, or silently dropped.
 */

import { type Rational, makeRational } from '../time/rational'
import { validateSixteenthGridAlignment } from '../time/grid'
import {
  type EventAnnotations,
  type MeasureEvent,
  makeNoteEvent,
  makeRestEvent,
} from './measure-event'
import { type ConcertPitch, parseConcertPitch } from './concert-pitch'

/** Typed failure for untrusted measure-event boundary input that cannot be parsed. */
// @spec-link [[entity_concert_event_timeline]]
export class MeasureEventParseError extends Error {
  readonly kind = 'MeasureEventParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MeasureEventParseError'
  }
}

/** Intent: narrow an unknown value to a plain, non-null, non-array object record. */
function asRecord(input: unknown, context: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new MeasureEventParseError(`${context} must be a plain object, got ${typeof input}.`)
  }
  return input as Record<string, unknown>
}

/** Intent: parse and grid-validate an untrusted duration field, wrapping every rejection loudly. */
function parseDuration(input: unknown, context: string): Rational {
  const record = asRecord(input, `${context}.duration`)
  const { numerator, denominator } = record
  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    throw new MeasureEventParseError(
      `${context}.duration must have numeric numerator and denominator.`,
    )
  }
  let duration: Rational
  try {
    duration = makeRational(numerator, denominator)
  } catch (error) {
    throw new MeasureEventParseError(
      `${context}.duration is not a valid rational: ${(error as Error).message}`,
    )
  }
  try {
    validateSixteenthGridAlignment(duration)
  } catch (error) {
    throw new MeasureEventParseError(
      `${context}.duration violates first-release grid policy: ${(error as Error).message}`,
    )
  }
  return duration
}

/** Intent: parse and validate an untrusted pitch field, wrapping every rejection loudly. */
function parsePitch(input: unknown): ConcertPitch {
  try {
    return parseConcertPitch(input)
  } catch (error) {
    throw new MeasureEventParseError(`Note event.pitch is invalid: ${(error as Error).message}`)
  }
}

/** Intent: parse an untrusted optional annotations field, rejecting any non-string sub-field. */
function parseAnnotations(input: unknown, context: string): EventAnnotations | undefined {
  if (input === undefined) return undefined
  const record = asRecord(input, `${context}.annotations`)
  const allowedKeys = new Set(['musical', 'validation'])
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new MeasureEventParseError(`${context}.annotations has unknown field "${key}".`)
    }
  }
  const { musical, validation } = record
  if (musical !== undefined && typeof musical !== 'string') {
    throw new MeasureEventParseError(`${context}.annotations.musical must be a string.`)
  }
  if (validation !== undefined && typeof validation !== 'string') {
    throw new MeasureEventParseError(`${context}.annotations.validation must be a string.`)
  }
  if (musical !== undefined && validation !== undefined) return { musical, validation }
  if (musical !== undefined) return { musical }
  if (validation !== undefined) return { validation }
  return {}
}

const NOTE_ALLOWED_KEYS = new Set(['kind', 'duration', 'pitch', 'tieContinuation', 'annotations'])
const REST_ALLOWED_KEYS = new Set(['kind', 'duration', 'annotations'])

/** Intent: reject any key on the untrusted record that is not part of the given event shape. */
function assertNoUnknownKeys(
  record: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  context: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new MeasureEventParseError(`${context} has unknown field "${key}".`)
    }
  }
}

/**
 * Intent: parse one untrusted measure event, dispatching on its `kind` discriminant. Rejects a
 * non-object input, an unrecognized `kind`, missing/malformed required fields, and unexpected
 * extra fields, always as a typed MeasureEventParseError and never as a partial event.
 */
// @spec-link [[entity_concert_event_timeline]]
export function parseMeasureEvent(input: unknown): MeasureEvent {
  const record = asRecord(input, 'Measure event')
  const { kind } = record

  if (kind === 'note') {
    assertNoUnknownKeys(record, NOTE_ALLOWED_KEYS, 'Note event')
    const duration = parseDuration(record.duration, 'Note event')
    const pitch = parsePitch(record.pitch)
    if (typeof record.tieContinuation !== 'boolean') {
      throw new MeasureEventParseError('Note event.tieContinuation must be a boolean.')
    }
    const annotations = parseAnnotations(record.annotations, 'Note event')
    return annotations === undefined
      ? makeNoteEvent({ duration, pitch, tieContinuation: record.tieContinuation })
      : makeNoteEvent({ duration, pitch, tieContinuation: record.tieContinuation, annotations })
  }

  if (kind === 'rest') {
    assertNoUnknownKeys(record, REST_ALLOWED_KEYS, 'Rest event')
    const duration = parseDuration(record.duration, 'Rest event')
    const annotations = parseAnnotations(record.annotations, 'Rest event')
    return annotations === undefined
      ? makeRestEvent({ duration })
      : makeRestEvent({ duration, annotations })
  }

  throw new MeasureEventParseError(`Measure event has unrecognized kind "${String(kind)}".`)
}
