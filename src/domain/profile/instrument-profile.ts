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

/**
 * Open transposition data for one instrument profile: an integer chromatic semitone count and an
 * integer diatonic letter-step count carrying the instrument's written pitch relative to concert
 * pitch (written = concert + transposition). Adding a new instrument preset is one data entry of
 * this shape; nothing else in the codebase branches on a specific transposition value.
 */
// @spec-link [[entity_instrument_profile]]
export interface InstrumentTransposition {
  readonly chromatic: number
  readonly diatonic: number
}

/**
 * A validated, immutable declarative instrument profile. `id` is intentionally an open string here
 * (not a closed union): the adopted, first-release-supported set of identities is declared once, as
 * data, in `./instrument-profiles.ts` (see `InstrumentProfileId` there); this atomic constructor
 * accepts any non-empty identity so a test-only profile can be constructed and exercised through the
 * whole pipeline without widening any production type. `displayName` is the player-facing instrument
 * name carried as profile data, so a control catalog can build its option labels from the profile
 * itself rather than hand-maintaining a parallel id-to-label map.
 */
// @spec-link [[entity_instrument_profile]]
export interface InstrumentProfile {
  readonly kind: 'InstrumentProfile'
  readonly id: string
  readonly displayName: string
  readonly concertRange: ActiveConcertRange
  readonly registerWindows: RegisterWindowPolicy
  readonly transposition: InstrumentTransposition
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
  readonly displayName: string
  readonly concertRange: { readonly minMidi: number; readonly maxMidi: number }
  readonly registerWindows: {
    readonly algorithm: string
    readonly minimumSpan: number
    readonly widthNumerator: number
    readonly widthDenominator: number
  }
  readonly transposition: { readonly chromatic: number; readonly diatonic: number }
}

/** The seven written letters in scale order and their natural (no-accidental) pitch classes. */
const TRANSPOSITION_LETTER_COUNT = 7
const NATURAL_PC_BY_LETTER_INDEX: readonly number[] = [0, 2, 4, 5, 7, 9, 11]

/**
 * Intent: reject a chromatic/diatonic transposition pair that is not mutually consistent — one
 * that would require more than a double accidental to reconcile a diatonic letter-step move from
 * C with the declared chromatic semitone count.
 */
// @spec-link [[entity_instrument_profile]]
function assertConsistentTransposition(transposition: {
  readonly chromatic: number
  readonly diatonic: number
}): void {
  if (!Number.isInteger(transposition.chromatic) || !Number.isInteger(transposition.diatonic)) {
    throw new InstrumentProfileError(
      'Instrument transposition chromatic and diatonic counts must be integers.',
    )
  }
  const letterIndex =
    ((transposition.diatonic % TRANSPOSITION_LETTER_COUNT) + TRANSPOSITION_LETTER_COUNT) %
    TRANSPOSITION_LETTER_COUNT
  const octaveShift = Math.floor(transposition.diatonic / TRANSPOSITION_LETTER_COUNT)
  const naturalPc = NATURAL_PC_BY_LETTER_INDEX[letterIndex]! + octaveShift * 12
  const alter = transposition.chromatic - naturalPc
  if (Math.abs(alter) > 2) {
    throw new InstrumentProfileError(
      `Instrument transposition chromatic ${transposition.chromatic} and diatonic ${transposition.diatonic} are not a consistent pair (would require a ${alter}-semitone accidental).`,
    )
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
  if (input.displayName.trim().length === 0) {
    throw new InstrumentProfileError('Instrument profile displayName must be a non-empty string.')
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

  assertConsistentTransposition(input.transposition)
  const transposition: InstrumentTransposition = {
    chromatic: input.transposition.chromatic,
    diatonic: input.transposition.diatonic,
  }

  return deepFreeze({
    kind: 'InstrumentProfile',
    id: input.id,
    displayName: input.displayName,
    concertRange,
    registerWindows,
    transposition,
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

const PROFILE_ALLOWED_KEYS = new Set([
  'id',
  'displayName',
  'concertRange',
  'registerWindows',
  'transposition',
])
const CONCERT_RANGE_ALLOWED_KEYS = new Set(['minMidi', 'maxMidi'])
const REGISTER_WINDOWS_ALLOWED_KEYS = new Set([
  'algorithm',
  'minimumSpan',
  'widthNumerator',
  'widthDenominator',
])
const TRANSPOSITION_ALLOWED_KEYS = new Set(['chromatic', 'diatonic'])

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

  const { id, displayName, concertRange, registerWindows } = record
  if (typeof id !== 'string') {
    throw new InstrumentProfileParseError(
      `Instrument profile.id must be a string, got ${typeof id}.`,
    )
  }
  if (typeof displayName !== 'string') {
    throw new InstrumentProfileParseError(
      `Instrument profile.displayName must be a string, got ${typeof displayName}.`,
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

  const transpositionRecord = asRecord(record.transposition, 'Instrument profile.transposition')
  assertNoUnknownKeys(
    transpositionRecord,
    TRANSPOSITION_ALLOWED_KEYS,
    'Instrument profile.transposition',
  )
  const { chromatic, diatonic } = transpositionRecord
  if (typeof chromatic !== 'number' || typeof diatonic !== 'number') {
    throw new InstrumentProfileParseError(
      'Instrument profile.transposition must have numeric chromatic and diatonic counts.',
    )
  }

  try {
    return makeInstrumentProfile({
      id,
      displayName,
      concertRange: { minMidi, maxMidi },
      registerWindows: { algorithm, minimumSpan, widthNumerator, widthDenominator },
      transposition: { chromatic, diatonic },
    })
  } catch (error) {
    throw new InstrumentProfileParseError(
      `Instrument profile is invalid: ${(error as Error).message}`,
    )
  }
}
