/**
 * The readers of the generation intent a kept phrase stores beside its timeline, the inputs that
 * reproduce it. Each reads a stored intent back into exactly the intent the generator was given,
 * or refuses it: a missing, extra, ill-typed or out-of-range field anywhere throws, and nothing is
 * ever repaired, defaulted or partly read.
 *
 * Every field is checked by the domain's own parser or validator where one exists; what no domain
 * parser covers (an intent's outer shape, its register intent) is checked here against the domain
 * types. An intent's instrument profile is read from the data it holds, never looked up or rebuilt
 * from its id, so a kept My instrument phrase reads back as it was played. A current (data version
 * 4) intent holds its figure levels only, never a musical profile, and, when the phrase had them,
 * the rhythm lock group, the steering block and a carry-in from the phrase before or, beside a
 * steering block only, from no phrase. The data version 2 reader, which the upgrade step to data
 * version 4 reads v3.1's bodies with, takes v3.1's shape: neither group, and a carry-in only from a
 * phrase. The data version 1 reader, which the upgrade step to data version 2 reads earlier bodies
 * with, takes any of that version's three shapes (levels only, a v3.0 musical profile only, or
 * both), a stored profile mapped through `profile-to-levels.ts`; a read intent never holds a
 * musical profile.
 *
 * Pure: no storage access. The kept-session codec calls these and reports any refusal as an
 * unreadable record.
 */

import {
  makeGenerationControls,
  PITCH_CLASSES,
  REGISTER_CHOICES,
  validateControlValue,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import { deepEqual } from '@/domain/events/deep-equal'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { parseFigureLevels, type FigureLevels } from '@/domain/figures/figure-levels'
import {
  isPhraseCarryIn,
  parseCarryIn,
  parsePhraseCarryIn,
  type CarryIn,
} from '@/domain/generation/carry-in/carry-in'
import {
  writtenToConcertTonalCenter,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import {
  parseMeter,
  parseRequestId,
  PHRASE_MEASURE_COUNT,
} from '@/domain/generation/generation-request'
import { parseRequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import { parseSteeringBlock } from '@/domain/generation/steering-block'
import { parseInstrumentProfile, type InstrumentProfile } from '@/domain/profile/instrument-profile'
import { CANONICAL_REGISTER_ORDER, type RegisterId } from '@/domain/profile/register-id'
import { buildRegisterIntent, type RegisterIntent } from '@/domain/profile/register-intent'
import {
  REGISTER_WINDOW_ALGORITHM_V1,
  type RegisterWindowCandidate,
} from '@/domain/profile/register-window-derivation'
import { makeSeed, type Seed } from '@/domain/random/seed'

import {
  exactRecord,
  integerIn,
  KeptRecordError,
  nonEmptyArray,
  type Catalog,
} from './kept-record-shape'
import { parseStoredProfileSelection, storedProfileLevels } from './profile-to-levels'

const CONTROL_FIELDS: Catalog<keyof GenerationControls> = {
  tempo: true,
  tonalCenter: true,
  collection: true,
  harmonicMotion: true,
  tension: true,
  noteDensity: true,
  rhythmicVariety: true,
  syncopation: true,
  silenceDensity: true,
  contour: true,
  register: true,
  leapiness: true,
  arpeggioChaos: true,
  instrumentProfileId: true,
}

/**
 * Intent: the stored controls, exactly the control fields, each through the strict control
 * builder, which refuses any value the controls do not offer.
 */
function parseControls(value: unknown): GenerationControls {
  const record = exactRecord(value, Object.keys(CONTROL_FIELDS), 'Kept intent.controls')
  return makeGenerationControls(record as unknown as GenerationControls)
}

/** Intent: the stored seed, a number the domain's seed maker accepts as a 32-bit unsigned seed. */
function parseStoredSeed(value: unknown): Seed {
  if (typeof value !== 'number') throw new KeptRecordError('Kept intent.seed must be a number.')
  return makeSeed(value)
}

/**
 * Intent: the instrument profile from the data the intent holds, never from its id: its own
 * `kind` tags checked here, every other field through the domain's profile parser, which
 * re-validates the range, the register-window policy and the transposition.
 */
function parseStoredProfile(value: unknown): InstrumentProfile {
  const context = 'Kept intent.instrumentProfile'
  const record = exactRecord(
    value,
    ['kind', 'id', 'displayName', 'concertRange', 'registerWindows', 'transposition'],
    context,
  )
  if (record.kind !== 'InstrumentProfile')
    throw new KeptRecordError(`${context}.kind must be "InstrumentProfile".`)
  const range = exactRecord(
    record.concertRange,
    ['kind', 'minMidi', 'maxMidi'],
    `${context}.concertRange`,
  )
  if (range.kind !== 'ActiveConcertRange')
    throw new KeptRecordError(`${context}.concertRange.kind must be "ActiveConcertRange".`)
  return parseInstrumentProfile({
    id: record.id,
    displayName: record.displayName,
    concertRange: { minMidi: range.minMidi, maxMidi: range.maxMidi },
    registerWindows: record.registerWindows,
    transposition: record.transposition,
  })
}

/** Intent: a stored MIDI span with its own `kind` tag: a concert range or a register window. */
function parseTaggedSpan<K extends 'ActiveConcertRange' | 'RegisterWindow'>(
  value: unknown,
  kind: K,
  context: string,
): { readonly kind: K; readonly minMidi: number; readonly maxMidi: number } {
  const record = exactRecord(value, ['kind', 'minMidi', 'maxMidi'], context)
  if (record.kind !== kind) throw new KeptRecordError(`${context}.kind must be "${kind}".`)
  return {
    kind,
    minMidi: integerIn(record.minMidi, 0, 127, `${context}.minMidi`),
    maxMidi: integerIn(record.maxMidi, 0, 127, `${context}.maxMidi`),
  }
}

/** Intent: one stored register-window candidate: a register, its index and its window. */
function parseCandidate(value: unknown, context: string): RegisterWindowCandidate {
  const record = exactRecord(value, ['id', 'canonicalIndex', 'window'], context)
  const id = CANONICAL_REGISTER_ORDER.find((register: RegisterId) => register === record.id)
  if (id === undefined) throw new KeptRecordError(`${context}.id is unknown.`)
  return {
    id,
    canonicalIndex: integerIn(record.canonicalIndex, 0, 2, `${context}.canonicalIndex`),
    window: parseTaggedSpan(record.window, 'RegisterWindow', `${context}.window`),
  }
}

/**
 * Intent: the stored register intent, checked field by field against the RegisterIntent shape,
 * then against what the stored profile's own data and the stored register choice give: a register
 * intent the generator could not have built from them is refused, never replaced.
 */
function parseRegisterIntent(
  value: unknown,
  profile: InstrumentProfile,
  controls: GenerationControls,
): RegisterIntent {
  const context = 'Kept intent.registerIntent'
  const record = exactRecord(
    value,
    ['kind', 'sourceRange', 'requestedRegister', 'candidates', 'policyVersion'],
    context,
  )
  if (record.kind !== 'RegisterIntent')
    throw new KeptRecordError(`${context}.kind must be "RegisterIntent".`)
  if (record.policyVersion !== REGISTER_WINDOW_ALGORITHM_V1)
    throw new KeptRecordError(`${context}.policyVersion must be "${REGISTER_WINDOW_ALGORITHM_V1}".`)
  const registerIntent: RegisterIntent = {
    kind: 'RegisterIntent',
    sourceRange: parseTaggedSpan(
      record.sourceRange,
      'ActiveConcertRange',
      `${context}.sourceRange`,
    ),
    requestedRegister: validateControlValue(
      REGISTER_CHOICES,
      record.requestedRegister,
      'Kept intent requested register',
    ),
    candidates: nonEmptyArray(record.candidates, `${context}.candidates`).map((candidate, index) =>
      parseCandidate(candidate, `${context}.candidates[${index}]`),
    ),
    policyVersion: REGISTER_WINDOW_ALGORITHM_V1,
  }
  if (registerIntent.requestedRegister !== controls.register)
    throw new KeptRecordError(`${context}.requestedRegister is not the controls' register.`)
  if (!deepEqual(registerIntent, buildRegisterIntent(profile, controls.register)))
    throw new KeptRecordError(`${context} is not what the stored instrument profile gives.`)
  return registerIntent
}

/**
 * Intent: refuse an intent whose parts disagree: controls naming another instrument than the
 * profile held, or a concert tonal center that is not the written one transposed for it.
 */
function assertIntentCoherent(
  controls: GenerationControls,
  writtenTonalCenter: GenerationIntent['writtenTonalCenter'],
  profile: InstrumentProfile,
): void {
  if (controls.instrumentProfileId !== profile.id)
    throw new KeptRecordError(
      `Kept intent controls name "${controls.instrumentProfileId}" but its profile is "${profile.id}".`,
    )
  if (controls.tonalCenter !== writtenToConcertTonalCenter(writtenTonalCenter, profile))
    throw new KeptRecordError(
      'Kept intent concert tonal center is not its written tonal center transposed.',
    )
}

/**
 * Intent: the figure levels of a stored data version 1 intent, in any of its three shapes: its
 * levels only (kept by this version), through the domain's parser; a musical profile only (kept
 * by v3.0), as the levels that profile stands for through storage's profile-to-levels module; or
 * both (kept by chunk 4's code), where the stored levels must equal the profile's levels, so the
 * levels read are the same either way. Levels that disagree with the profile beside them, or
 * neither field, are refused, never reconciled.
 */
function parseStoredFigureLevels(record: Record<string, unknown>): FigureLevels {
  const hasLevels = Object.hasOwn(record, 'figureLevels')
  if (!Object.hasOwn(record, 'musicalProfile')) {
    if (!hasLevels)
      throw new KeptRecordError('Kept intent holds neither figureLevels nor musicalProfile.')
    return parseFigureLevels(record.figureLevels)
  }
  const selection = parseStoredProfileSelection(record.musicalProfile, 'Kept intent.musicalProfile')
  const profileLevels = storedProfileLevels(selection)
  if (hasLevels && !deepEqual(parseFigureLevels(record.figureLevels), profileLevels))
    throw new KeptRecordError(
      `Kept intent.figureLevels are not the levels of its musical profile "${selection.musicalProfile}".`,
    )
  return profileLevels
}

/** The fields every kept intent holds, whatever its data version. */
const INTENT_FIELDS = [
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'instrumentProfile',
  'registerIntent',
] as const

/**
 * How one data version's intent is read: the keys it always holds, the ones it may hold, how its
 * figure levels are read from the stored record, and how its carry-in is.
 */
interface IntentShape {
  readonly keys: readonly string[]
  readonly optional: readonly string[]
  readonly figureLevels: (record: Record<string, unknown>) => FigureLevels
  readonly carryIn: (value: unknown) => CarryIn
}

/** Data version 1's intent: its levels, a v3.0 musical profile, or both, and `carryIn` maybe. */
const INTENT_V1: IntentShape = {
  keys: INTENT_FIELDS,
  optional: ['figureLevels', 'musicalProfile', 'carryIn'],
  figureLevels: parseStoredFigureLevels,
  carryIn: parsePhraseCarryIn,
}

/**
 * Data version 2's intent, v3.1's: its figure levels always, `carryIn` maybe, only from a phrase
 * and in v3.1's exact form; never a musical profile, a rhythm lock group or a steering block.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_earlier_sessions_open_without_doodle]]
const INTENT_V2: IntentShape = {
  keys: [...INTENT_FIELDS, 'figureLevels'],
  optional: ['carryIn'],
  figureLevels: (record) => parseFigureLevels(record.figureLevels),
  carryIn: parsePhraseCarryIn,
}

/**
 * Data version 4's intent, v3.2's: its figure levels always, never a musical profile; and, when
 * the phrase had them, its carry-in, from a phrase or from no phrase, its rhythm lock group and
 * its steering block.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
const INTENT_V4: IntentShape = {
  keys: [...INTENT_FIELDS, 'figureLevels'],
  optional: ['carryIn', 'rhythmLock', 'steering'],
  figureLevels: (record) => parseFigureLevels(record.figureLevels),
  carryIn: parseCarryIn,
}

/**
 * Intent: the carry-in, rhythm lock group and steering block a stored intent holds, each present
 * exactly when its key is, in that order: the carry-in through the shape's reader, the group and
 * the block through the generation request's own parsers. A carry-in from no phrase without a
 * steering block beside it is refused.
 */
function parseRequestInputs(
  record: Record<string, unknown>,
  shape: IntentShape,
): Pick<GenerationIntent, 'carryIn' | 'rhythmLock' | 'steering'> {
  const carryIn = Object.hasOwn(record, 'carryIn') ? shape.carryIn(record.carryIn) : undefined
  const hasSteering = Object.hasOwn(record, 'steering')
  if (carryIn !== undefined && !isPhraseCarryIn(carryIn) && !hasSteering)
    throw new KeptRecordError(
      'Kept intent holds a carry-in from no phrase without a steering block.',
    )
  return {
    ...(carryIn === undefined ? {} : { carryIn }),
    ...(Object.hasOwn(record, 'rhythmLock')
      ? { rhythmLock: parseRequestRhythmLock(record.rhythmLock) }
      : {}),
    ...(hasSteering ? { steering: parseSteeringBlock(record.steering) } : {}),
  }
}

/**
 * Intent: read a stored intent of the given shape back into the intent it was generated from,
 * without rebuilding it: each field through the domain's own parser (request id, seed, meter,
 * controls, written tonal center, figure levels, instrument profile from its stored data,
 * carry-in, rhythm lock group, steering block), the rest against the intent's shape, with exactly
 * the shape's keys, then its parts checked against each other.
 */
function parseIntentOfShape(input: unknown, shape: IntentShape): GenerationIntent {
  const record = exactRecord(input, shape.keys, 'Kept intent', shape.optional)
  const requestId = parseRequestId(record.requestId)
  const seed = parseStoredSeed(record.seed)
  if (record.measureCount !== PHRASE_MEASURE_COUNT)
    throw new KeptRecordError(`Kept intent.measureCount must be ${PHRASE_MEASURE_COUNT}.`)
  const meter = parseMeter(record.meter)
  const controls = parseControls(record.controls)
  const writtenTonalCenter = validateControlValue(
    PITCH_CLASSES,
    record.writtenTonalCenter,
    'Kept intent written tonal center',
  )
  const figureLevels = shape.figureLevels(record)
  const instrumentProfile = parseStoredProfile(record.instrumentProfile)
  assertIntentCoherent(controls, writtenTonalCenter, instrumentProfile)
  const registerIntent = parseRegisterIntent(record.registerIntent, instrumentProfile, controls)
  return deepFreeze({
    requestId,
    seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter,
    controls,
    writtenTonalCenter,
    figureLevels,
    instrumentProfile,
    registerIntent,
    ...parseRequestInputs(record, shape),
  })
}

/**
 * Intent: read a data version 1 kept phrase's stored generation intent, as the upgrade step to
 * data version 2 reads it: every field as `parseKeptIntentV2` reads it, `carryIn` only when one
 * was handed forward, its figure levels from any of data version 1's three shapes (levels only; a
 * v3.0 musical profile only, read as that profile's levels; or both, which must agree), and the
 * intent returned holds no musical profile. Returns a fresh deep-frozen intent; throws a
 * KeptRecordError or the domain parser's own error for anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_upgrade_step]]
export function parseKeptIntentV1(input: unknown): GenerationIntent {
  return parseIntentOfShape(input, INTENT_V1)
}

/**
 * Intent: read a data version 2 kept phrase's stored generation intent, v3.1's, as the upgrade
 * step to data version 4 reads it: each field through the domain's own parser, with exactly v3.1's
 * keys (its figure levels always, `carryIn` only when one was handed forward, read through
 * `parsePhraseCarryIn` in v3.1's exact form; a musical profile, a rhythm lock group or a steering
 * block refused as an unknown field), then its parts checked against each other. Returns a fresh
 * deep-frozen intent; throws a KeptRecordError or the domain parser's own error for anything
 * invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_jam_upgrade_step]]
// @spec-link [[rule_earlier_sessions_open_without_doodle]]
export function parseKeptIntentV2(input: unknown): GenerationIntent {
  return parseIntentOfShape(input, INTENT_V2)
}

/**
 * Intent: read a kept phrase's stored generation intent (data version 4) back into the intent it
 * was generated from, without rebuilding it: each field through the domain's own parser (request
 * id, seed, meter, controls, written tonal center, figure levels, instrument profile from its
 * stored data, and, each when its key is present, the carry-in through `parseCarryIn`, the rhythm
 * lock group and the steering block through the generation request's parsers), the rest against
 * the intent's shape, with exactly its keys (a musical profile refused as an unknown field), then
 * its parts checked against each other. A carry-in from no phrase is read only beside a steering
 * block. Returns a fresh deep-frozen intent; throws a KeptRecordError or the domain parser's own
 * error for anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function parseKeptIntent(input: unknown): GenerationIntent {
  return parseIntentOfShape(input, INTENT_V4)
}
