/**
 * A concert MIDI pitch for a note event, branded so a raw `number` cannot be passed where a
 * validated pitch is expected. This schema validates only a plausible MIDI integer (0-127); it
 * deliberately does not narrow to any single first-release instrument profile's active range
 * (C keyboard 48-72, B-flat tenor 46-70, E-flat alto 51-75) so the type stays wide enough to hold
 * all three without a later schema change. Per-profile range validation is Step 3's job.
 */

const MIDI_PITCH_MIN = 0
const MIDI_PITCH_MAX = 127

declare const concertPitchBrand: unique symbol

/** A validated plausible-MIDI concert pitch. Construct only via makeConcertPitch or parseConcertPitch. */
// @spec-link [[entity_concert_event_timeline]]
export type ConcertPitch = number & { readonly [concertPitchBrand]: 'ConcertPitch' }

/** Typed failure for an out-of-range, non-integer, or malformed attempt to construct a ConcertPitch. */
// @spec-link [[entity_concert_event_timeline]]
export class ConcertPitchError extends Error {
  readonly kind = 'ConcertPitchError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ConcertPitchError'
  }
}

/**
 * Intent: validate a raw number as a plausible integer MIDI pitch in [0, 127] and brand it as a
 * ConcertPitch. This is the only way to obtain a ConcertPitch from a plain number; out-of-range
 * or non-integer input is rejected loudly rather than clamped, wrapped, or coerced.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeConcertPitch(value: number): ConcertPitch {
  if (!Number.isInteger(value)) {
    throw new ConcertPitchError(`Concert pitch must be an integer, got ${value}.`)
  }
  if (value < MIDI_PITCH_MIN || value > MIDI_PITCH_MAX) {
    throw new ConcertPitchError(
      `Concert pitch must be a plausible MIDI value in [${MIDI_PITCH_MIN}, ${MIDI_PITCH_MAX}], got ${value}.`,
    )
  }
  return value as ConcertPitch
}

/**
 * Intent: parse an untrusted boundary value into a ConcertPitch. Rejects any non-number input
 * (including null/undefined/strings) as a typed failure before delegating range validation to
 * makeConcertPitch, never coercing a string or nullish value into a number.
 */
// @spec-link [[entity_concert_event_timeline]]
export function parseConcertPitch(input: unknown): ConcertPitch {
  if (typeof input !== 'number') {
    throw new ConcertPitchError(`Concert pitch must be a number, got ${typeof input}.`)
  }
  return makeConcertPitch(input)
}
