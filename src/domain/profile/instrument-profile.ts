/**
 * A validated declarative instrument profile: one stable identity, one validated active concert
 * range, and one register-window policy — plus the boundary parser for untrusted profile input.
 * Validation proves the declared policy actually produces windows that stay inside the active
 * range and that overlap pairwise, so an invalid profile can never reach profile consumers.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type ActiveConcertRange, makeActiveConcertRange } from './active-concert-range'
import {
  type RegisterWindowCandidate,
  type RegisterWindowPolicy,
  REGISTER_WINDOW_ALGORITHM_V1,
  deriveRegisterWindowCandidates,
} from './register-window-derivation'
import { registerWindowIsContainedIn, registerWindowsIntersect } from './register-window'

/** The closed set of first-release adopted instrument profile identities. */
// @spec-link [[entity_instrument_profile]]
export type InstrumentProfileId = 'c-keyboard' | 'bb-tenor' | 'eb-alto'

/** A validated, immutable declarative instrument profile. */
// @spec-link [[entity_instrument_profile]]
export interface InstrumentProfile {
  readonly kind: 'InstrumentProfile'
  readonly id: InstrumentProfileId
  readonly concertRange: ActiveConcertRange
  readonly registerWindows: RegisterWindowPolicy
}

/** Typed failure for an invalid attempt to construct an InstrumentProfile. */
// @spec-link [[entity_instrument_profile]]
export class InstrumentProfileError extends Error {
  readonly kind = 'InstrumentProfileError' as const

  constructor(message: string) {
    super(message)
    this.name = 'InstrumentProfileError'
  }
}

/** Typed failure for untrusted instrument-profile boundary input that cannot be parsed. */
// @spec-link [[entity_instrument_profile]]
export class InstrumentProfileParseError extends Error {
  readonly kind = 'InstrumentProfileParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'InstrumentProfileParseError'
  }
}

interface InstrumentProfileInput {
  readonly id: string
  readonly concertRange: { readonly minMidi: number; readonly maxMidi: number }
  readonly registerWindows: {
    readonly algorithm: string
    readonly minimumSpan: number
    readonly widthNumerator: number
    readonly widthDenominator: number
  }
}

/** Intent: reject a derived candidate whose window is not fully contained in the active range. */
function assertCandidatesContained(
  candidates: readonly RegisterWindowCandidate[],
  range: ActiveConcertRange,
): void {
  for (const candidate of candidates) {
    if (!registerWindowIsContainedIn(candidate.window, range)) {
      throw new InstrumentProfileError(
        `${candidate.id} window ${candidate.window.minMidi}-${candidate.window.maxMidi} is not contained in active range ${range.minMidi}-${range.maxMidi}.`,
      )
    }
  }
}

/** Intent: reject any adjacent pair of canonically-ordered candidates that do not intersect. */
function assertAdjacentCandidatesIntersect(candidates: readonly RegisterWindowCandidate[]): void {
  for (let index = 1; index < candidates.length; index += 1) {
    const previous = candidates[index - 1]
    const current = candidates[index]
    if (previous === undefined || current === undefined) continue
    if (!registerWindowsIntersect(previous.window, current.window)) {
      throw new InstrumentProfileError(`${previous.id} and ${current.id} windows do not intersect.`)
    }
  }
}

/**
 * Intent: construct an immutable, deep-frozen InstrumentProfile from already-typed input,
 * proving the declared policy is valid: a non-empty identity, an unsupported algorithm rejected,
 * a valid active concert range (delegated to makeActiveConcertRange), and every derived candidate
 * window contained in that range with each adjacent pair intersecting. Rejects any violation
 * loudly as a typed failure; never defaults, coerces, or silently drops an invalid profile.
 */
// @spec-link [[entity_instrument_profile]]
export function makeInstrumentProfile(input: InstrumentProfileInput): InstrumentProfile {
  if (input.id.trim().length === 0) {
    throw new InstrumentProfileError('Instrument profile id must be a non-empty string.')
  }
  if (input.registerWindows.algorithm !== REGISTER_WINDOW_ALGORITHM_V1) {
    throw new InstrumentProfileError(
      `Unrecognized register-window algorithm "${input.registerWindows.algorithm}"; expected "${REGISTER_WINDOW_ALGORITHM_V1}".`,
    )
  }

  const concertRange = makeActiveConcertRange(
    input.concertRange.minMidi,
    input.concertRange.maxMidi,
  )
  const registerWindows: RegisterWindowPolicy = {
    algorithm: REGISTER_WINDOW_ALGORITHM_V1,
    minimumSpan: input.registerWindows.minimumSpan,
    widthNumerator: input.registerWindows.widthNumerator,
    widthDenominator: input.registerWindows.widthDenominator,
  }

  const candidates = deriveRegisterWindowCandidates(concertRange, registerWindows)
  assertCandidatesContained(candidates, concertRange)
  assertAdjacentCandidatesIntersect(candidates)

  return deepFreeze({
    kind: 'InstrumentProfile',
    id: input.id as InstrumentProfileId,
    concertRange,
    registerWindows,
  })
}

/** Intent: narrow an unknown value to a plain, non-null, non-array object record. */
function asRecord(input: unknown, context: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new InstrumentProfileParseError(`${context} must be a plain object, got ${typeof input}.`)
  }
  return input as Record<string, unknown>
}

/** Intent: reject any key on the untrusted record that is not part of the given allowlist. */
function assertNoUnknownKeys(
  record: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  context: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new InstrumentProfileParseError(`${context} has unknown field "${key}".`)
    }
  }
}

const PROFILE_ALLOWED_KEYS = new Set(['id', 'concertRange', 'registerWindows'])
const CONCERT_RANGE_ALLOWED_KEYS = new Set(['minMidi', 'maxMidi'])
const REGISTER_WINDOWS_ALLOWED_KEYS = new Set([
  'algorithm',
  'minimumSpan',
  'widthNumerator',
  'widthDenominator',
])

/**
 * Intent: parse one untrusted instrument-profile boundary object, rejecting a non-object input,
 * any unexpected extra field at any level, any missing/malformed required field, and any
 * downstream validation failure from makeInstrumentProfile — always as a typed
 * InstrumentProfileParseError, never as a partial or coerced profile.
 */
// @spec-link [[entity_instrument_profile]]
export function parseInstrumentProfile(input: unknown): InstrumentProfile {
  const record = asRecord(input, 'Instrument profile')
  assertNoUnknownKeys(record, PROFILE_ALLOWED_KEYS, 'Instrument profile')

  const { id, concertRange, registerWindows } = record
  if (typeof id !== 'string') {
    throw new InstrumentProfileParseError(
      `Instrument profile.id must be a string, got ${typeof id}.`,
    )
  }

  const concertRangeRecord = asRecord(concertRange, 'Instrument profile.concertRange')
  assertNoUnknownKeys(
    concertRangeRecord,
    CONCERT_RANGE_ALLOWED_KEYS,
    'Instrument profile.concertRange',
  )
  const { minMidi, maxMidi } = concertRangeRecord
  if (typeof minMidi !== 'number' || typeof maxMidi !== 'number') {
    throw new InstrumentProfileParseError(
      'Instrument profile.concertRange must have numeric minMidi and maxMidi.',
    )
  }

  const registerWindowsRecord = asRecord(registerWindows, 'Instrument profile.registerWindows')
  assertNoUnknownKeys(
    registerWindowsRecord,
    REGISTER_WINDOWS_ALLOWED_KEYS,
    'Instrument profile.registerWindows',
  )
  const { algorithm, minimumSpan, widthNumerator, widthDenominator } = registerWindowsRecord
  if (typeof algorithm !== 'string') {
    throw new InstrumentProfileParseError(
      'Instrument profile.registerWindows.algorithm must be a string.',
    )
  }
  if (
    typeof minimumSpan !== 'number' ||
    typeof widthNumerator !== 'number' ||
    typeof widthDenominator !== 'number'
  ) {
    throw new InstrumentProfileParseError(
      'Instrument profile.registerWindows must have numeric minimumSpan, widthNumerator, and widthDenominator.',
    )
  }

  try {
    return makeInstrumentProfile({
      id,
      concertRange: { minMidi, maxMidi },
      registerWindows: { algorithm, minimumSpan, widthNumerator, widthDenominator },
    })
  } catch (error) {
    throw new InstrumentProfileParseError(
      `Instrument profile is invalid: ${(error as Error).message}`,
    )
  }
}
