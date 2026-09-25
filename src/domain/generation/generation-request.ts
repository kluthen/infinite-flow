/**
 * The resolved core GenerationRequest: an immutable, serializable request carrying only the
 * fields this step owns — request identity, the Seed from step 2a's random module, requested
 * measure count (always 4 for the first release), meter (always 4/4 for the first release), the
 * resolved active concert range, the resolved register identity, and the resolved register
 * window (Step 3, module_register_intent_boundary). This is the resolved core request distinct
 * from the outer, player-facing GenerationIntent (module_generation_request_construction /
 * service_generation_orchestration): the register field here is typed to the narrower three-
 * value vocabulary (Low, Middle, High) — the outer RegisterChoice's Varying value is impossible
 * to express here at the type level, not merely rejected at runtime. Tempo/tonal center/scale/
 * control policy (Step 4), and theme, notation display convention, browser state, audio nodes,
 * UI widget values, and mutable session state are all structurally excluded here, never merely
 * optional.
 */

import { type Seed, makeSeed } from '../random/seed'
import { deepFreeze } from '../events/deep-freeze'
import { type ActiveConcertRange, makeActiveConcertRange } from '../profile/active-concert-range'
import { type RegisterId } from '../profile/register-id'
import {
  type RegisterWindow,
  makeRegisterWindow,
  registerWindowIsContainedIn,
} from '../profile/register-window'

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
 * identity, seed, requested measure count, meter, resolved active concert range, resolved
 * register identity, and resolved register window. The register field's type admits only Low,
 * Middle, or High — the outer RegisterChoice's Varying is not a representable value here, so an
 * unresolved register intent cannot be constructed as a core request. Theme, notation display
 * convention, browser state, audio nodes, UI widget values, and mutable session state cannot
 * enter this type — see rule_seeded_phrase_reproduction / rule_presentation_preference_preserves_phrase.
 */
// @spec-link [[module_register_intent_boundary]]
export interface GenerationRequest {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
  readonly activeConcertRange: ActiveConcertRange
  readonly register: RegisterId
  readonly registerWindow: RegisterWindow
}

interface GenerationRequestInput {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: number
  readonly meter: Meter
  readonly activeConcertRange: ActiveConcertRange
  readonly register: RegisterId
  readonly registerWindow: RegisterWindow
}

/**
 * Intent: construct an immutable, deep-frozen GenerationRequest from already-validated inputs.
 * Rejects a measure count other than four, and a resolved register window that is not fully
 * contained in the resolved active concert range, each as a typed failure; never defaults,
 * coerces, or transposes to force a fit.
 */
// @spec-link [[service_generation_orchestration]]
export function makeGenerationRequest(input: GenerationRequestInput): GenerationRequest {
  if (input.measureCount !== PHRASE_MEASURE_COUNT) {
    throw new GenerationRequestError(
      `Requested measure count must be ${PHRASE_MEASURE_COUNT}, got ${input.measureCount}.`,
    )
  }
  if (!registerWindowIsContainedIn(input.registerWindow, input.activeConcertRange)) {
    throw new GenerationRequestError(
      `Resolved register window ${input.registerWindow.minMidi}-${input.registerWindow.maxMidi} is not ` +
        `contained in active concert range ${input.activeConcertRange.minMidi}-${input.activeConcertRange.maxMidi}.`,
    )
  }

  return deepFreeze({
    requestId: input.requestId,
    seed: input.seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter: input.meter,
    activeConcertRange: input.activeConcertRange,
    register: input.register,
    registerWindow: input.registerWindow,
  })
}

const GENERATION_REQUEST_ALLOWED_KEYS = new Set([
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'activeConcertRange',
  'register',
  'registerWindow',
])

const CONCERT_RANGE_ALLOWED_KEYS = new Set(['kind', 'minMidi', 'maxMidi'])
const REGISTER_WINDOW_ALLOWED_KEYS = new Set(['kind', 'minMidi', 'maxMidi'])
const VALID_REGISTER_IDS = new Set<string>(['Low', 'Middle', 'High'])

/** Intent: narrow an unknown value to a plain, non-null, non-array object record. */
function asPlainRecord(input: unknown, context: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new GenerationRequestError(`${context} must be a plain object, got ${typeof input}.`)
  }
  return input as Record<string, unknown>
}

/**
 * Intent: reject a nested value object's `kind` discriminant unless it is absent or exactly the
 * tag the domain constructor itself stamps, so a constructed request round-trips while a
 * mislabelled value (for example a RegisterWindow sent as the active range) is refused.
 */
function assertKindTag(record: Record<string, unknown>, expected: string, context: string): void {
  if ('kind' in record && record.kind !== expected) {
    throw new GenerationRequestError(
      `${context}.kind must be "${expected}" when present, got ${JSON.stringify(record.kind)}.`,
    )
  }
}

/**
 * Intent: parse an untrusted boundary value into an ActiveConcertRange, accepting the domain's own
 * `kind: 'ActiveConcertRange'` tag (or its absence) and rejecting any other field or tag value.
 */
function parseActiveConcertRange(input: unknown): ActiveConcertRange {
  const record = asPlainRecord(input, 'GenerationRequest.activeConcertRange')
  for (const key of Object.keys(record)) {
    if (!CONCERT_RANGE_ALLOWED_KEYS.has(key)) {
      throw new GenerationRequestError(
        `GenerationRequest.activeConcertRange has unknown field "${key}".`,
      )
    }
  }
  assertKindTag(record, 'ActiveConcertRange', 'GenerationRequest.activeConcertRange')
  const { minMidi, maxMidi } = record
  if (typeof minMidi !== 'number' || typeof maxMidi !== 'number') {
    throw new GenerationRequestError(
      'GenerationRequest.activeConcertRange must have numeric minMidi and maxMidi.',
    )
  }
  try {
    return makeActiveConcertRange(minMidi, maxMidi)
  } catch (error) {
    throw new GenerationRequestError(
      `GenerationRequest.activeConcertRange is invalid: ${(error as Error).message}`,
    )
  }
}

/**
 * Intent: parse an untrusted boundary value into a RegisterWindow, accepting the domain's own
 * `kind: 'RegisterWindow'` tag (or its absence) and rejecting any other field or tag value.
 */
function parseRegisterWindow(input: unknown): RegisterWindow {
  const record = asPlainRecord(input, 'GenerationRequest.registerWindow')
  for (const key of Object.keys(record)) {
    if (!REGISTER_WINDOW_ALLOWED_KEYS.has(key)) {
      throw new GenerationRequestError(
        `GenerationRequest.registerWindow has unknown field "${key}".`,
      )
    }
  }
  assertKindTag(record, 'RegisterWindow', 'GenerationRequest.registerWindow')
  const { minMidi, maxMidi } = record
  if (typeof minMidi !== 'number' || typeof maxMidi !== 'number') {
    throw new GenerationRequestError(
      'GenerationRequest.registerWindow must have numeric minMidi and maxMidi.',
    )
  }
  try {
    return makeRegisterWindow(minMidi, maxMidi)
  } catch (error) {
    throw new GenerationRequestError(
      `GenerationRequest.registerWindow is invalid: ${(error as Error).message}`,
    )
  }
}

/**
 * Intent: parse an untrusted boundary value into a resolved RegisterId. Rejects the outer
 * RegisterChoice value "Varying" and any other unrecognized string, so a core request can never
 * carry an unresolved register at this boundary either — the type-level exclusion is the primary
 * mechanism; this is the parser-level guard for untrusted input.
 */
function parseResolvedRegisterId(input: unknown): RegisterId {
  if (typeof input !== 'string' || !VALID_REGISTER_IDS.has(input)) {
    throw new GenerationRequestError(
      `GenerationRequest.register must be one of "Low", "Middle", or "High", got ${JSON.stringify(input)}.`,
    )
  }
  return input as RegisterId
}

/**
 * Intent: parse one untrusted GenerationRequest record. Rejects a non-object input and — most
 * importantly for rule_seeded_phrase_reproduction / rule_presentation_preference_preserves_phrase
 * — any unknown field (theme, notationDisplay, sessionId, or any other presentation/browser-state
 * field) rather than silently ignoring it, so such state structurally cannot enter a request.
 */
// @spec-link [[service_generation_orchestration]]
export function parseGenerationRequest(input: unknown): GenerationRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new GenerationRequestError(
      `GenerationRequest must be a plain object, got ${typeof input}.`,
    )
  }
  const record = input as Record<string, unknown>

  for (const key of Object.keys(record)) {
    if (!GENERATION_REQUEST_ALLOWED_KEYS.has(key)) {
      throw new GenerationRequestError(`GenerationRequest has unknown field "${key}".`)
    }
  }

  const requestId = parseRequestId(record.requestId)

  if (typeof record.seed !== 'number') {
    throw new GenerationRequestError(
      `GenerationRequest.seed must be a number, got ${typeof record.seed}.`,
    )
  }
  const seed = makeSeed(record.seed)

  if (typeof record.measureCount !== 'number') {
    throw new GenerationRequestError('GenerationRequest.measureCount must be a number.')
  }

  const meter = parseMeter(record.meter)
  const activeConcertRange = parseActiveConcertRange(record.activeConcertRange)
  const register = parseResolvedRegisterId(record.register)
  const registerWindow = parseRegisterWindow(record.registerWindow)

  return makeGenerationRequest({
    requestId,
    seed,
    measureCount: record.measureCount,
    meter,
    activeConcertRange,
    register,
    registerWindow,
  })
}
