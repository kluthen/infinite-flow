/**
 * An instrument's inclusive active concert-pitch playable range — the outer bound within which
 * every register window for that instrument must be contained. Structurally similar to a
 * RegisterWindow (see ./register-window.ts) but kept as a distinct, differently-branded shape
 * (`kind: 'ActiveConcertRange'`) so an unresolved active range can never be passed where an
 * already-resolved register window is expected.
 */

import { deepFreeze } from '../events/deep-freeze'

const MINIMUM_ACTIVE_RANGE_SPAN = 24

/** An instrument's immutable inclusive active concert-pitch playable range [minMidi, maxMidi]. */
// @spec-link [[entity_instrument_profile]]
export interface ActiveConcertRange {
  readonly kind: 'ActiveConcertRange'
  readonly minMidi: number
  readonly maxMidi: number
}

/** Typed failure for an invalid attempt to construct an ActiveConcertRange. */
// @spec-link [[entity_instrument_profile]]
export class ActiveConcertRangeError extends Error {
  readonly kind = 'ActiveConcertRangeError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ActiveConcertRangeError'
  }
}

/**
 * Intent: construct an immutable, deep-frozen ActiveConcertRange from validated integer
 * endpoints. Rejects non-integer endpoints, a non-positive span (minMidi >= maxMidi), and a span
 * narrower than the 24-semitone minimum the whole-phrase register-window policy requires, each as
 * a typed failure; never clamps, defaults, or coerces.
 */
// @spec-link [[entity_instrument_profile]]
export function makeActiveConcertRange(minMidi: number, maxMidi: number): ActiveConcertRange {
  if (!Number.isInteger(minMidi) || !Number.isInteger(maxMidi)) {
    throw new ActiveConcertRangeError(
      `Active concert range bounds must be integers, got minMidi=${minMidi}, maxMidi=${maxMidi}.`,
    )
  }
  if (minMidi >= maxMidi) {
    throw new ActiveConcertRangeError(
      `Active concert range minMidi (${minMidi}) must be strictly less than maxMidi (${maxMidi}).`,
    )
  }
  const span = maxMidi - minMidi
  if (span < MINIMUM_ACTIVE_RANGE_SPAN) {
    throw new ActiveConcertRangeError(
      `Active concert range span (${span}) must be at least ${MINIMUM_ACTIVE_RANGE_SPAN} semitones.`,
    )
  }
  return deepFreeze({ kind: 'ActiveConcertRange', minMidi, maxMidi })
}
