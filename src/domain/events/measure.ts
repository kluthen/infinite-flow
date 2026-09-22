/**
 * One measure of a concert-pitch timeline: an ordered closed discriminated union of note/rest
 * events (see ./measure-event.ts) that must tile the measure exactly — durations summing to
 * exactly one whole note (one 4/4 bar), with no gap and no overlap — using exact Rational
 * arithmetic (see ../time/rational.ts). Tiling is checked by summation over the ordered event
 * list rather than by tracking a redundant per-event start position, so there is exactly one
 * source of truth for where each event falls.
 */

import { WHOLE_NOTE, compareRational, sumRational } from '../time/rational'
import { deepFreeze } from './deep-freeze'
import { type MeasureEvent } from './measure-event'

/** The zero-based index of a measure within the fixed four-measure first-release phrase. */
export type MeasureIndex = 0 | 1 | 2 | 3

/** Typed failure for a measure whose events do not tile it exactly, or an out-of-range index. */
// @spec-link [[entity_concert_event_timeline]]
export class MeasureTilingViolation extends Error {
  readonly kind = 'MeasureTilingViolation' as const

  constructor(message: string) {
    super(message)
    this.name = 'MeasureTilingViolation'
  }
}

/** One measure: an ordered, exactly-tiling sequence of note/rest events. */
// @spec-link [[entity_concert_event_timeline]]
export interface Measure {
  readonly measureIndex: MeasureIndex
  readonly events: readonly MeasureEvent[]
}

/** Intent: validate a raw measure index is one of the four legal first-release positions. */
function assertMeasureIndex(measureIndex: number): asserts measureIndex is MeasureIndex {
  if (
    measureIndex !== 0 &&
    measureIndex !== 1 &&
    measureIndex !== 2 &&
    measureIndex !== 3
  ) {
    throw new MeasureTilingViolation(
      `Measure index must be one of 0, 1, 2, 3, got ${measureIndex}.`,
    )
  }
}

/**
 * Intent: construct an immutable, deep-frozen Measure from an already-validated measure index
 * and an ordered list of already-constructed events. Rejects a measure index outside 0-3 and any
 * event list whose exact rational duration sum is not precisely one whole note (a gap when less,
 * an overlap when more) as a typed MeasureTilingViolation; never defaults or truncates.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeMeasure(measureIndex: number, events: readonly MeasureEvent[]): Measure {
  assertMeasureIndex(measureIndex)

  const total = sumRational(events.map((event) => event.duration))
  if (compareRational(total, WHOLE_NOTE) !== 0) {
    throw new MeasureTilingViolation(
      `Measure ${measureIndex} events sum to ${total.numerator}/${total.denominator} whole ` +
        `notes; they must tile the measure exactly (${WHOLE_NOTE.numerator}/${WHOLE_NOTE.denominator}).`,
    )
  }

  return deepFreeze({ measureIndex, events: [...events] })
}
