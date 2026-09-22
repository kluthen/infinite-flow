/**
 * Hand-written boundary parser for one untrusted concert-pitch timeline. Parses each measure
 * through ./measure-parser.ts and then validates the fixed four-measure structure through
 * ./timeline.ts; any rejection anywhere in that chain surfaces as one typed TimelineParseError
 * and never a partial timeline.
 */

import { TimelineStructureViolation, makeConcertEventTimeline } from './timeline'
import type { ConcertEventTimeline } from './timeline'
import { parseMeasure } from './measure-parser'

/** Typed failure for untrusted timeline boundary input that cannot be parsed. */
// @spec-link [[entity_concert_event_timeline]]
export class TimelineParseError extends Error {
  readonly kind = 'TimelineParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'TimelineParseError'
  }
}

const TIMELINE_ALLOWED_KEYS = new Set(['measures'])

/**
 * Intent: parse one untrusted timeline record: an array of untrusted measures. Rejects a
 * non-object input, unexpected extra fields, a non-array measures field, any individual measure
 * that fails ./measure-parser.ts, and a well-formed measure list that still fails the fixed
 * four-measure ordered structure — always as a typed TimelineParseError, never a partial
 * timeline.
 */
// @spec-link [[entity_concert_event_timeline]]
export function parseConcertEventTimeline(input: unknown): ConcertEventTimeline {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TimelineParseError(`Timeline must be a plain object, got ${typeof input}.`)
  }
  const record = input as Record<string, unknown>

  for (const key of Object.keys(record)) {
    if (!TIMELINE_ALLOWED_KEYS.has(key)) {
      throw new TimelineParseError(`Timeline has unknown field "${key}".`)
    }
  }

  const { measures } = record
  if (!Array.isArray(measures)) {
    throw new TimelineParseError('Timeline.measures must be an array.')
  }

  const parsedMeasures = measures.map((rawMeasure, position) => {
    try {
      return parseMeasure(rawMeasure)
    } catch (error) {
      throw new TimelineParseError(
        `Timeline.measures[${position}] is invalid: ${(error as Error).message}`,
      )
    }
  })

  try {
    return makeConcertEventTimeline(parsedMeasures)
  } catch (error) {
    if (error instanceof TimelineStructureViolation) {
      throw new TimelineParseError(error.message)
    }
    throw error
  }
}
