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
import {
  GenerationRequestError,
  parseMeter,
  parseRequestId,
  PHRASE_MEASURE_COUNT,
  type Meter,
  type RequestId,
} from './generation-request-envelope'
import { type ActiveConcertRange, makeActiveConcertRange } from '../profile/active-concert-range'
import { type RegisterId } from '../profile/register-id'
import { parseCarryIn, type CarryIn } from './carry-in/carry-in'
import {
  type RegisterWindow,
  makeRegisterWindow,
  registerWindowIsContainedIn,
} from '../profile/register-window'

export {
  FOUR_FOUR_METER,
  GenerationRequestError,
  makeRequestId,
  parseMeter,
  parseRequestId,
  PHRASE_MEASURE_COUNT,
  type Meter,
  type RequestId,
} from './generation-request-envelope'

/**
 * The resolved core generation request. Immutable and serializable: contains only request
 * identity, seed, requested measure count, meter, resolved active concert range, resolved
 * register identity, resolved register window, and, for a session phrase generated after another,
 * the carry-in that phrase handed forward (whose window is then the resolved window). The register field's type admits only Low,
 * Middle, or High — the outer RegisterChoice's Varying is not a representable value here, so an
 * unresolved register intent cannot be constructed as a core request. Theme, notation display
 * convention, browser state, audio nodes, UI widget values, and mutable session state cannot
 * enter this type — see rule_seeded_phrase_reproduction / rule_presentation_preference_preserves_phrase.
 */
// @spec-link [[rule_tempo_never_affects_generation]]
// @spec-link [[module_register_intent_boundary]]
// @spec-link [[entity_phrase_carry_in]]
export interface GenerationRequest {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
  readonly activeConcertRange: ActiveConcertRange
  readonly register: RegisterId
  readonly registerWindow: RegisterWindow
  readonly carryIn?: CarryIn
}

interface GenerationRequestInput {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: number
  readonly meter: Meter
  readonly activeConcertRange: ActiveConcertRange
  readonly register: RegisterId
  readonly registerWindow: RegisterWindow
  readonly carryIn?: CarryIn
}

/**
 * Intent: construct an immutable, deep-frozen GenerationRequest from already-validated inputs.
 * Rejects a measure count other than four, a resolved register window that is not fully contained
 * in the resolved active concert range, and a carry-in whose window is not the resolved window,
 * each as a typed failure; never defaults, coerces, or transposes to force a fit. A request without
 * a carry-in has no `carryIn` field at all, so it serializes exactly as a first-release request.
 */
// @spec-link [[rule_no_carry_in_output_matches_v1]]
// @spec-link [[service_generation_request_resolution]]
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

  const carried = input.carryIn?.registerWindow
  if (
    carried !== undefined &&
    (carried.minMidi !== input.registerWindow.minMidi ||
      carried.maxMidi !== input.registerWindow.maxMidi)
  ) {
    throw new GenerationRequestError(
      `Resolved register window ${input.registerWindow.minMidi}-${input.registerWindow.maxMidi} is not ` +
        `the carried window ${carried.minMidi}-${carried.maxMidi}.`,
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
    ...(input.carryIn === undefined ? {} : { carryIn: input.carryIn }),
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
  'carryIn',
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
// @spec-link [[module_generation_request_envelope]]
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
  const carryIn = 'carryIn' in record ? parseRequestCarryIn(record.carryIn) : undefined

  return makeGenerationRequest({
    requestId,
    seed,
    measureCount: record.measureCount,
    meter,
    activeConcertRange,
    register,
    registerWindow,
    ...(carryIn === undefined ? {} : { carryIn }),
  })
}

/** Intent: parse an untrusted request carry-in, reporting any fault as a GenerationRequestError. */
function parseRequestCarryIn(input: unknown): CarryIn {
  try {
    return parseCarryIn(input)
  } catch (error) {
    throw new GenerationRequestError(
      `GenerationRequest.carryIn is invalid: ${(error as Error).message}`,
    )
  }
}
