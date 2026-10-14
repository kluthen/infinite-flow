/**
 * The generation request's envelope basics: its identity (`RequestId`), its typed failure, and its
 * fixed first-release shape (the 4/4 meter, four measures). Apart from the full request
 * (./generation-request.ts), whose parsing reaches the carry-in's: the workspace needs these from
 * its first draw (request identities, the meter and the phrase length its audio and session timing
 * count in), while parsing a request is only needed once a generation answers.
 */
import { deepFreeze } from '../events/deep-freeze'

declare const requestIdBrand: unique symbol

/** A validated, non-empty request identity. Construct only via makeRequestId or parseRequestId. */
// @spec-link [[module_generation_request_envelope]]
export type RequestId = string & { readonly [requestIdBrand]: 'RequestId' }

const REQUEST_ID_MAX_LENGTH = 128

/** Typed failure for the generation request/result envelope boundary. */
// @spec-link [[module_generation_request_envelope]]
export class GenerationRequestError extends Error {
  readonly kind = 'GenerationRequestError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationRequestError'
  }
}

/**
 * Intent: validate a raw string as a non-empty, bounded-length request identity and brand it as
 * a RequestId. Rejects an empty/whitespace-only string or one exceeding the documented maximum
 * length as a typed failure rather than truncating or padding.
 */
// @spec-link [[module_generation_request_envelope]]
export function makeRequestId(value: string): RequestId {
  if (value.trim().length === 0) {
    throw new GenerationRequestError('Request identity must not be empty.')
  }
  if (value.length > REQUEST_ID_MAX_LENGTH) {
    throw new GenerationRequestError(
      `Request identity must be at most ${REQUEST_ID_MAX_LENGTH} characters, got ${value.length}.`,
    )
  }
  return value as RequestId
}

/** Intent: parse an untrusted boundary value into a RequestId, rejecting any non-string input. */
// @spec-link [[module_generation_request_envelope]]
export function parseRequestId(input: unknown): RequestId {
  if (typeof input !== 'string') {
    throw new GenerationRequestError(`Request identity must be a string, got ${typeof input}.`)
  }
  return makeRequestId(input)
}

/**
 * The meter of a generated phrase. Only 4/4 is supported for the first release; this shape
 * leaves room for a later release to widen the supported set without changing the field name.
 */
// @spec-link [[module_generation_request_envelope]]
export interface Meter {
  readonly beatsPerMeasure: 4
  readonly beatUnit: 4
}

/** Intent: the single first-release meter value, frozen once at module load. */
// @spec-link [[module_generation_request_envelope]]
export const FOUR_FOUR_METER: Meter = deepFreeze({ beatsPerMeasure: 4, beatUnit: 4 })

/**
 * Intent: parse an untrusted boundary value into the first-release Meter. Rejects anything other
 * than the exact documented 4/4 shape (wrong field values, missing fields, extra fields) as a
 * typed failure rather than defaulting to 4/4.
 */
// @spec-link [[module_generation_request_envelope]]
export function parseMeter(input: unknown): Meter {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new GenerationRequestError(`Meter must be a plain object, got ${typeof input}.`)
  }
  const record = input as Record<string, unknown>
  const allowedKeys = new Set(['beatsPerMeasure', 'beatUnit'])
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new GenerationRequestError(`Meter has unknown field "${key}".`)
    }
  }
  if (record.beatsPerMeasure !== 4 || record.beatUnit !== 4) {
    throw new GenerationRequestError(
      'Meter must be 4/4 (beatsPerMeasure: 4, beatUnit: 4) for the first release.',
    )
  }
  return FOUR_FOUR_METER
}

/** Intent: the single first-release requested measure count. */
export const PHRASE_MEASURE_COUNT = 4
