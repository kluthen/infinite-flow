/**
 * The resolved core GenerationRequest: an immutable, serializable request carrying only the
 * fields this step owns — request identity, the Seed from step 2a's random module, requested
 * measure count (always 4 for the first release), and meter (always 4/4 for the first release).
 * This is the resolved core request distinct from the outer, player-facing GenerationIntent
 * (module_generation_request_construction / service_generation_orchestration): instrument
 * profile and resolved register window (Step 3), tempo/tonal center/scale/control policy
 * (Step 4), and theme, notation display convention, browser state, audio nodes, UI widget
 * values, and mutable session state are all structurally excluded here, never merely optional.
 */

import { type Seed, makeSeed } from '../random/seed'
import { deepFreeze } from '../events/deep-freeze'

declare const requestIdBrand: unique symbol

/** A validated, non-empty request identity. Construct only via makeRequestId or parseRequestId. */
// @spec-link [[service_generation_orchestration]]
export type RequestId = string & { readonly [requestIdBrand]: 'RequestId' }

const REQUEST_ID_MAX_LENGTH = 128

/** Typed failure for the generation request/result envelope boundary. */
// @spec-link [[service_generation_orchestration]]
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
// @spec-link [[service_generation_orchestration]]
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
// @spec-link [[service_generation_orchestration]]
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
// @spec-link [[service_generation_orchestration]]
export interface Meter {
  readonly beatsPerMeasure: 4
  readonly beatUnit: 4
}

/** Intent: the single first-release meter value, frozen once at module load. */
// @spec-link [[service_generation_orchestration]]
export const FOUR_FOUR_METER: Meter = deepFreeze({ beatsPerMeasure: 4, beatUnit: 4 })

/**
 * Intent: parse an untrusted boundary value into the first-release Meter. Rejects anything other
 * than the exact documented 4/4 shape (wrong field values, missing fields, extra fields) as a
 * typed failure rather than defaulting to 4/4.
 */
// @spec-link [[service_generation_orchestration]]
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

/**
 * The resolved core generation request. Immutable and serializable: contains only request
 * identity, seed, requested measure count, and meter. Theme, notation display convention,
 * browser state, audio nodes, UI widget values, and mutable session state cannot enter this type
 * — see rule_seeded_phrase_reproduction / rule_presentation_preference_preserves_phrase.
 */
// @spec-link [[service_generation_orchestration]]
export interface GenerationRequest {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
}

interface GenerationRequestInput {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: number
  readonly meter: Meter
}

/**
 * Intent: construct an immutable, deep-frozen GenerationRequest from already-validated inputs.
 * Rejects a measure count other than four as a typed failure; never defaults or coerces.
 */
// @spec-link [[service_generation_orchestration]]
export function makeGenerationRequest(input: GenerationRequestInput): GenerationRequest {
  if (input.measureCount !== PHRASE_MEASURE_COUNT) {
    throw new GenerationRequestError(
      `Requested measure count must be ${PHRASE_MEASURE_COUNT}, got ${input.measureCount}.`,
    )
  }

  return deepFreeze({
    requestId: input.requestId,
    seed: input.seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter: input.meter,
  })
}

const GENERATION_REQUEST_ALLOWED_KEYS = new Set(['requestId', 'seed', 'measureCount', 'meter'])

/**
 * Intent: parse one untrusted GenerationRequest record. Rejects a non-object input and — most
 * importantly for rule_seeded_phrase_reproduction / rule_presentation_preference_preserves_phrase
 * — any unknown field (theme, notationDisplay, sessionId, or any other presentation/browser-state
 * field) rather than silently ignoring it, so such state structurally cannot enter a request.
 */
// @spec-link [[service_generation_orchestration]]
export function parseGenerationRequest(input: unknown): GenerationRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new GenerationRequestError(`GenerationRequest must be a plain object, got ${typeof input}.`)
  }
  const record = input as Record<string, unknown>

  for (const key of Object.keys(record)) {
    if (!GENERATION_REQUEST_ALLOWED_KEYS.has(key)) {
      throw new GenerationRequestError(`GenerationRequest has unknown field "${key}".`)
    }
  }

  const requestId = parseRequestId(record.requestId)

  if (typeof record.seed !== 'number') {
    throw new GenerationRequestError(`GenerationRequest.seed must be a number, got ${typeof record.seed}.`)
  }
  const seed = makeSeed(record.seed)

  if (typeof record.measureCount !== 'number') {
    throw new GenerationRequestError('GenerationRequest.measureCount must be a number.')
  }

  const meter = parseMeter(record.meter)

  return makeGenerationRequest({ requestId, seed, measureCount: record.measureCount, meter })
}
