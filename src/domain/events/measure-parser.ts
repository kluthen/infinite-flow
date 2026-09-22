/**
 * Hand-written boundary parser for one untrusted measure. Parses each event through
 * ./measure-event-parser.ts and then validates exact tiling through ./measure.ts; any rejection
 * anywhere in that chain surfaces as one typed MeasureParseError and never a partial measure.
 */

import { MeasureTilingViolation, makeMeasure } from './measure'
import type { Measure } from './measure'
import { parseMeasureEvent } from './measure-event-parser'

/** Typed failure for untrusted measure boundary input that cannot be parsed. */
// @spec-link [[entity_concert_event_timeline]]
export class MeasureParseError extends Error {
  readonly kind = 'MeasureParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MeasureParseError'
  }
}

const MEASURE_ALLOWED_KEYS = new Set(['measureIndex', 'events'])

/**
 * Intent: parse one untrusted measure record: a numeric measureIndex and an array of untrusted
 * events. Rejects a non-object input, unexpected extra fields (e.g. later-step harmonic-role
 * vocabulary), a non-numeric index, a non-array events field, any individual event that fails
 * ./measure-event-parser.ts, and a well-formed event list that still fails to tile the measure
 * exactly — always as a typed MeasureParseError, never a partial measure.
 */
// @spec-link [[entity_concert_event_timeline]]
export function parseMeasure(input: unknown): Measure {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new MeasureParseError(`Measure must be a plain object, got ${typeof input}.`)
  }
  const record = input as Record<string, unknown>

  for (const key of Object.keys(record)) {
    if (!MEASURE_ALLOWED_KEYS.has(key)) {
      throw new MeasureParseError(`Measure has unknown field "${key}".`)
    }
  }

  const { measureIndex, events } = record
  if (typeof measureIndex !== 'number') {
    throw new MeasureParseError('Measure.measureIndex must be a number.')
  }
  if (!Array.isArray(events)) {
    throw new MeasureParseError('Measure.events must be an array.')
  }

  const parsedEvents = events.map((rawEvent, position) => {
    try {
      return parseMeasureEvent(rawEvent)
    } catch (error) {
      throw new MeasureParseError(
        `Measure.events[${position}] is invalid: ${(error as Error).message}`,
      )
    }
  })

  try {
    return makeMeasure(measureIndex, parsedEvents)
  } catch (error) {
    if (error instanceof MeasureTilingViolation) {
      throw new MeasureParseError(error.message)
    }
    throw error
  }
}
