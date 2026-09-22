/**
 * The immutable concert-pitch timeline for a completed phrase generation: exactly four ordered
 * measures (see ./measure.ts) for the first release. Written notation, transposition, audio
 * scheduling, and browser/session state are structurally excluded from this model — those are
 * downstream consumers, not part of the timeline itself.
 */

import { deepFreeze } from './deep-freeze'
import { type Measure } from './measure'

/** Intent: the fixed number of measures in a first-release generated phrase. */
export const PHRASE_MEASURE_COUNT = 4

/** Typed failure for a timeline that does not carry exactly four ordered measures 0-3. */
// @spec-link [[entity_concert_event_timeline]]
export class TimelineStructureViolation extends Error {
  readonly kind = 'TimelineStructureViolation' as const

  constructor(message: string) {
    super(message)
    this.name = 'TimelineStructureViolation'
  }
}

/** An immutable concert-pitch timeline of exactly four ordered measures. */
// @spec-link [[entity_concert_event_timeline]]
export interface ConcertEventTimeline {
  readonly measures: readonly [Measure, Measure, Measure, Measure]
}

/**
 * Intent: construct an immutable, deep-frozen ConcertEventTimeline from an already-constructed
 * list of measures. Rejects any count other than four and any measure whose index does not match
 * its position (0, 1, 2, 3 in order) as a typed TimelineStructureViolation; never truncates,
 * pads, or reorders.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeConcertEventTimeline(measures: readonly Measure[]): ConcertEventTimeline {
  if (measures.length !== PHRASE_MEASURE_COUNT) {
    throw new TimelineStructureViolation(
      `Timeline must contain exactly ${PHRASE_MEASURE_COUNT} measures, got ${measures.length}.`,
    )
  }

  measures.forEach((measure, position) => {
    if (measure.measureIndex !== position) {
      throw new TimelineStructureViolation(
        `Measure at position ${position} has measureIndex ${measure.measureIndex}; measures ` +
          'must be ordered 0, 1, 2, 3.',
      )
    }
  })

  const [first, second, third, fourth] = measures as readonly [Measure, Measure, Measure, Measure]
  return deepFreeze({ measures: [first, second, third, fourth] })
}
