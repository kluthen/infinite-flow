/**
 * The worker-bound half of the generation worker protocol: parsing what the session posts to the
 * worker (a generate request or a prewarm message) and the intent rebuild they share with the
 * phrase replay key decoder. Kept apart from generation-worker-protocol.ts, whose response side the
 * main thread parses at start-up, because rebuilding an intent with a carry-in loads the carry-in
 * checks (the harmony planner among them), which only the worker and phrase replay ever need.
 */

import {
  makeGenerationControls,
  PITCH_CLASSES,
  type GenerationControls,
  type PitchClass,
} from '../domain/controls/generation-controls'
import { deepEqual } from '../domain/events/deep-equal'
import {
  FigureLevelsError,
  parseFigureLevels,
  type FigureLevels,
} from '../domain/figures/figure-levels'
import { parseCarryIn, type CarryIn } from '../domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '../domain/generation/carry-in/carry-in-intent'
import { makeGenerationIntent, type GenerationIntent } from '../domain/generation/generation-intent'
import { makeRequestId } from '../domain/generation/generation-request'
import {
  parseRequestRhythmLock,
  RequestRhythmLockError,
  type RequestRhythmLock,
} from '../domain/generation/request-rhythm-lock'
import {
  parseSteeringBlock,
  SteeringBlockError,
  type SteeringBlock,
} from '../domain/generation/steering-block'
import {
  parseInstrumentProfile,
  type InstrumentProfile,
  type InstrumentTransposition,
} from '../domain/profile/instrument-profile'
import { C_KEYBOARD_PROFILE, MY_INSTRUMENT_ID } from '../domain/profile/instrument-profiles'
import { makeMyInstrumentProfile } from '../domain/profile/my-instrument'
import { transpositionFromInstrumentTransposition } from '../domain/profile/transposition-interval'
import { makeSeed } from '../domain/random/seed'
import {
  asPlainRecord,
  GenerationWorkerProtocolError,
  parseCorrelationId,
  requireAllowedKeys,
  type GenerationWorkerInboundMessage,
  type GenerationWorkerPrewarm,
  type GenerationWorkerRequest,
} from './generation-worker-protocol'

const MY_INSTRUMENT_PROFILE_CONTEXT = 'GenerationWorkerRequest.intent.instrumentProfile'
const MY_INSTRUMENT_PROFILE_ALLOWED_KEYS = new Set([
  'kind',
  'id',
  'displayName',
  'concertRange',
  'registerWindows',
  'transposition',
])
const CONCERT_RANGE_ALLOWED_KEYS = new Set(['kind', 'minMidi', 'maxMidi'])

/** My instrument's owning profile fields, from which its whole generator-facing profile derives. */
// @spec-link [[entity_my_instrument]]
export interface MyInstrumentProfileFields {
  readonly displayName: string
  readonly concertRange: { readonly minMidi: number; readonly maxMidi: number }
  readonly transposition: InstrumentTransposition
}

/**
 * Intent: the profile my instrument derives from its display name, its written range (the concert
 * range moved by the chromatic count) and its transposition, built by `makeMyInstrumentProfile`,
 * so every rule of the profile applies: a span of two octaves, both ends sounding inside MIDI,
 * letter steps from the interval table, the built-in window policy. It takes no clef and no
 * template: neither feeds any part of the profile; the C keyboard stands in for the template. The
 * clef's bound on the written range, which needs the clef, is not checked here: a bass-clef my
 * instrument written below C2 crosses the worker. Refusals are
 * the domain's own typed errors. Shared by the inbound profile check and the phrase replay key
 * decoder, which rebuilds an `ifk2.` key's profile through it.
 */
// @spec-link [[entity_my_instrument]]
// @spec-link [[module_phrase_replay_key]]
export function deriveMyInstrumentProfile(fields: MyInstrumentProfileFields): InstrumentProfile {
  const { chromatic } = fields.transposition
  return makeMyInstrumentProfile({
    template: C_KEYBOARD_PROFILE.id,
    name: fields.displayName,
    writtenRange: {
      minMidi: fields.concertRange.minMidi + chromatic,
      maxMidi: fields.concertRange.maxMidi + chromatic,
    },
    transposition: transpositionFromInstrumentTransposition(fields.transposition),
  })
}

/** Intent: the untrusted profile record parsed by the domain's profile parser, its tags checked. */
function parseTaggedProfile(input: unknown): InstrumentProfile {
  const record = asPlainRecord(input, MY_INSTRUMENT_PROFILE_CONTEXT)
  requireAllowedKeys(record, MY_INSTRUMENT_PROFILE_ALLOWED_KEYS, MY_INSTRUMENT_PROFILE_CONTEXT)
  if (record.kind !== 'InstrumentProfile')
    throw new GenerationWorkerProtocolError(
      `${MY_INSTRUMENT_PROFILE_CONTEXT}.kind must be "InstrumentProfile".`,
    )
  const range = asPlainRecord(record.concertRange, `${MY_INSTRUMENT_PROFILE_CONTEXT}.concertRange`)
  requireAllowedKeys(
    range,
    CONCERT_RANGE_ALLOWED_KEYS,
    `${MY_INSTRUMENT_PROFILE_CONTEXT}.concertRange`,
  )
  if (range.kind !== 'ActiveConcertRange')
    throw new GenerationWorkerProtocolError(
      `${MY_INSTRUMENT_PROFILE_CONTEXT}.concertRange.kind must be "ActiveConcertRange".`,
    )
  return parseInstrumentProfile({
    id: record.id,
    displayName: record.displayName,
    concertRange: { minMidi: range.minMidi, maxMidi: range.maxMidi },
    registerWindows: record.registerWindows,
    transposition: record.transposition,
  })
}

/**
 * Intent: parse my instrument's profile, carried as data in an untrusted wire intent: the domain's
 * profile parser checks its shape and the profile's own invariants, then the profile my instrument
 * derives from the same written range, transposition and name must equal it field for field, so a
 * profile no my instrument can have (windows set by hand, letter steps off the interval table, a
 * span under two octaves, a range sounding outside MIDI, another id) is refused. Every refusal is
 * a GenerationWorkerProtocolError naming its cause.
 */
// @spec-link [[module_generation_worker_protocol]]
// @spec-link [[entity_my_instrument]]
function parseMyInstrumentProfile(input: unknown): InstrumentProfile {
  let parsed: InstrumentProfile
  let derived: InstrumentProfile
  try {
    parsed = parseTaggedProfile(input)
    derived = deriveMyInstrumentProfile(parsed)
  } catch (error) {
    throw new GenerationWorkerProtocolError(
      `${MY_INSTRUMENT_PROFILE_CONTEXT} is not a valid my-instrument profile: ${(error as Error).message}`,
    )
  }
  if (parsed.id !== MY_INSTRUMENT_ID || !deepEqual(parsed, derived))
    throw new GenerationWorkerProtocolError(
      `${MY_INSTRUMENT_PROFILE_CONTEXT} is not the profile my instrument derives from its range and transposition.`,
    )
  return derived
}

const GENERATION_INTENT_ALLOWED_KEYS = new Set([
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'figureLevels',
  'instrumentProfile',
  'registerIntent',
  'carryIn',
  'rhythmLock',
  'steering',
])

const FIGURE_LEVELS_CONTEXT = 'GenerationWorkerRequest.intent.figureLevels'

/**
 * Intent: parse an untrusted wire intent's figure levels through the domain's parser: a missing
 * field or any FigureLevelsError (a missing or unknown figure, an unknown level, a non-object) is
 * a GenerationWorkerProtocolError naming the field and the cause.
 */
// @spec-link [[module_generation_worker_protocol]]
// @spec-link [[module_figure_levels]]
function parseWireFigureLevels(record: Record<string, unknown>): FigureLevels {
  if (!Object.hasOwn(record, 'figureLevels')) {
    throw new GenerationWorkerProtocolError(`${FIGURE_LEVELS_CONTEXT} is missing.`)
  }
  try {
    return parseFigureLevels(record.figureLevels)
  } catch (error) {
    if (error instanceof FigureLevelsError) {
      throw new GenerationWorkerProtocolError(
        `${FIGURE_LEVELS_CONTEXT} is invalid: ${error.message}`,
      )
    }
    throw error
  }
}

/**
 * Intent: parse an untrusted wire intent's optional rhythm lock group and steering block, each
 * only when its key is present (a key holding nothing is refused, never read as absent), through
 * the domain's own parsers. Any RequestRhythmLockError or SteeringBlockError is a
 * GenerationWorkerProtocolError naming the field and the cause.
 */
// @spec-link [[entity_request_rhythm_lock]]
// @spec-link [[entity_steering_block]]
function parseWireRequestGroups(record: Record<string, unknown>): {
  readonly rhythmLock?: RequestRhythmLock
  readonly steering?: SteeringBlock
} {
  try {
    return {
      ...(Object.hasOwn(record, 'rhythmLock')
        ? { rhythmLock: parseRequestRhythmLock(record.rhythmLock) }
        : {}),
      ...(Object.hasOwn(record, 'steering')
        ? { steering: parseSteeringBlock(record.steering) }
        : {}),
    }
  } catch (error) {
    if (error instanceof RequestRhythmLockError || error instanceof SteeringBlockError) {
      const field = error instanceof RequestRhythmLockError ? 'rhythmLock' : 'steering'
      throw new GenerationWorkerProtocolError(
        `GenerationWorkerRequest.intent.${field} is invalid: ${error.message}`,
      )
    }
    throw error
  }
}

/**
 * Intent: validate the owning fields of an untrusted GenerationIntent record (requestId, seed,
 * writtenTonalCenter, controls, figureLevels and an optional carryIn) through the existing domain
 * constructors and rebuild the full intent via `makeGenerationIntent`, or `makeCarryInGenerationIntent`
 * when the record holds a carry-in, with no default for a missing or invalid field. Both builders
 * take the player's written-pitch tonal center (never the record's already-converted concert
 * `controls.tonalCenter`) and re-derive the concert value themselves, so the rebuild substitutes the
 * record's `writtenTonalCenter` back into the controls. A `carryIn`, when present, is parsed field
 * by field (any fault is a CarryInError) and then checked against the rebuilt intent by
 * `makeCarryInGenerationIntent` itself; its `finalHarmony` is a carried chord or an explicit null
 * (dropped by a key or collection change), never missing. Shared by the worker request parser and
 * the phrase replay key decoder so neither keeps a parallel schema; each names the carry-in parser
 * it reads with (the worker and an `ifk4.` replay key read both origins through `parseCarryIn`, an
 * older replay key only v3.1's form through `parsePhraseCarryIn`). A built-in's profile is
 * resolved from its id; my instrument's, which its id alone cannot give, is read from the record's
 * `instrumentProfile` through `parseMyInstrumentProfile`. The `figureLevels` are required and read
 * through the domain's figure-levels parser, then handed to the factory as the intent's levels; a
 * record holds no musical profile, so none is read. The rhythm lock group and the steering block,
 * each when its key is present, are parsed by `parseWireRequestGroups` and handed to the builders.
 */
// @spec-link [[module_generation_worker_protocol]]
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[entity_my_instrument]]
// @spec-link [[entity_request_rhythm_lock]]
// @spec-link [[entity_steering_block]]
export function rebuildGenerationWorkerIntent(
  record: Record<string, unknown>,
  readCarryIn: (input: unknown) => CarryIn,
): GenerationIntent {
  if (typeof record.requestId !== 'string') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.intent.requestId must be a string, got ${typeof record.requestId}.`,
    )
  }
  const requestId = makeRequestId(record.requestId)
  if (typeof record.seed !== 'number') {
    throw new GenerationWorkerProtocolError('GenerationWorkerRequest.intent.seed must be a number.')
  }
  const seed = makeSeed(record.seed)
  if (
    typeof record.writtenTonalCenter !== 'string' ||
    !PITCH_CLASSES.includes(record.writtenTonalCenter as PitchClass)
  ) {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.intent.writtenTonalCenter must be one of ${JSON.stringify(PITCH_CLASSES)}, got ${JSON.stringify(record.writtenTonalCenter)}.`,
    )
  }
  const writtenTonalCenter = record.writtenTonalCenter as PitchClass
  const wireControls = asPlainRecord(record.controls, 'GenerationWorkerRequest.intent.controls')
  const controls = makeGenerationControls({
    ...(wireControls as unknown as GenerationControls),
    tonalCenter: writtenTonalCenter,
  })
  const figureLevels = parseWireFigureLevels(record)
  const carryIn = 'carryIn' in record ? readCarryIn(record.carryIn) : undefined
  const suppliedProfile =
    controls.instrumentProfileId === MY_INSTRUMENT_ID
      ? { instrumentProfile: parseMyInstrumentProfile(record.instrumentProfile) }
      : {}
  const groups = parseWireRequestGroups(record)
  const input = { requestId, seed, controls, figureLevels, ...suppliedProfile, ...groups }

  return carryIn === undefined
    ? makeGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn })
}

/**
 * Intent: parse one untrusted wire GenerationIntent by rejecting any unknown field (a
 * `musicalProfile` among them: the intent holds none), rebuilding the intent from its owning
 * fields via `rebuildGenerationWorkerIntent` (which requires the `figureLevels` and parses them
 * through the domain's figure-levels parser), then asserting the rebuilt intent deep-equals the
 * received record field-for-field. A built-in's `instrumentProfile` and every `registerIntent` are
 * derived deterministically from those owning fields (my instrument's profile and the figure levels
 * are themselves owning fields, validated as data), so this both validates them and proves the
 * wire value was not tampered with or corrupted in transit. An intent without a carry-in must have
 * no such field, and likewise for the rhythm lock group and the steering block; a group sent with
 * a field its parser does not rebuild, or in a non-canonical form, fails the deep-equal check.
 */
// @spec-link [[service_workspace_session_runner_factory]]
// @spec-link [[entity_phrase_carry_in]]
export function parseGenerationWorkerIntent(input: unknown): GenerationIntent {
  const record = asPlainRecord(input, 'GenerationWorkerRequest.intent')
  requireAllowedKeys(record, GENERATION_INTENT_ALLOWED_KEYS, 'GenerationWorkerRequest.intent')

  const rebuilt = rebuildGenerationWorkerIntent(record, parseCarryIn)

  if (!deepEqual(rebuilt, record)) {
    throw new GenerationWorkerProtocolError(
      'GenerationWorkerRequest.intent does not match its rebuilt GenerationIntent.',
    )
  }
  return rebuilt
}

/**
 * Intent: parse one untrusted request envelope posted to the worker. Rejects a wrong `type`, an
 * unparsable `id` (never inventing one), or an invalid `intent` as a typed
 * GenerationWorkerProtocolError so a malformed request crashes the worker loudly.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerRequest(input: unknown): GenerationWorkerRequest {
  const record = asPlainRecord(input, 'GenerationWorkerRequest')
  requireAllowedKeys(record, new Set(['type', 'id', 'intent']), 'GenerationWorkerRequest')
  if (record.type !== 'generate') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerRequest.type must be "generate", got ${JSON.stringify(record.type)}.`,
    )
  }
  const id = parseCorrelationId(record.id, 'GenerationWorkerRequest')
  const intent = parseGenerationWorkerIntent(record.intent)
  return { type: 'generate', id, intent }
}

/**
 * Intent: parse one untrusted prewarm message posted to the worker: exactly `type` and `intent`,
 * the intent parsed exactly like a generate request's. Any other shape throws a typed
 * GenerationWorkerProtocolError so a malformed prewarm crashes the worker as loudly as a
 * malformed generate request.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerPrewarm(input: unknown): GenerationWorkerPrewarm {
  const record = asPlainRecord(input, 'GenerationWorkerPrewarm')
  requireAllowedKeys(record, new Set(['type', 'intent']), 'GenerationWorkerPrewarm')
  if (record.type !== 'prewarm') {
    throw new GenerationWorkerProtocolError(
      `GenerationWorkerPrewarm.type must be "prewarm", got ${JSON.stringify(record.type)}.`,
    )
  }
  const intent = parseGenerationWorkerIntent(record.intent)
  return { type: 'prewarm', intent }
}

/**
 * Intent: parse any untrusted worker-bound message, dispatching on its `type` to the generate
 * request or the prewarm parser. A non-object or an unknown `type` throws a typed
 * GenerationWorkerProtocolError, never guessing which message was meant.
 */
// @spec-link [[module_generation_worker_protocol]]
export function parseGenerationWorkerInboundMessage(
  input: unknown,
): GenerationWorkerInboundMessage {
  const record = asPlainRecord(input, 'GenerationWorkerInboundMessage')
  if (record.type === 'generate') return parseGenerationWorkerRequest(record)
  if (record.type === 'prewarm') return parseGenerationWorkerPrewarm(record)
  throw new GenerationWorkerProtocolError(
    `GenerationWorkerInboundMessage.type must be "generate" or "prewarm", got ${JSON.stringify(record.type)}.`,
  )
}
