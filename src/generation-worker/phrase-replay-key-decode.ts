/**
 * The phrase replay key decoder: turns a version-1 or version-2 phrase replay key back into the
 * exact GenerationIntent through the generation worker protocol's own intent validation, a
 * version-2 key's my-instrument profile rebuilt through the protocol's own my-instrument
 * derivation. Kept apart from the encoder in phrase-replay-key.ts so the app bundle, which only
 * encodes, never pulls in the protocol.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import { MY_INSTRUMENT_ID } from '../domain/profile/instrument-profiles'
import {
  deriveMyInstrumentProfile,
  rebuildGenerationWorkerIntent,
} from './generation-worker-inbound'
import {
  bytesToBase64Url,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PHRASE_REPLAY_KEY_PREFIX,
  PHRASE_REPLAY_KEY_V2_PREFIX,
  PhraseReplayKeyError,
  requireConsistentPhraseNumber,
  type PhraseReplayKeyMyInstrumentEntry,
} from './phrase-replay-key'

/** The key versions the decoder reads. */
// @spec-link [[module_phrase_replay_key]]
export type PhraseReplayKeyVersion = 'ifk1' | 'ifk2'

/** A phrase replay key decoded into its version, validated generation intent and phrase number. */
// @spec-link [[module_phrase_replay_key]]
export interface DecodedPhraseReplayKey {
  readonly keyVersion: PhraseReplayKeyVersion
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

const KEY_VERSION_PATTERN = /^ifk(\d+)\./u
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u
const PREFIX_BY_VERSION: Readonly<Record<PhraseReplayKeyVersion, string>> = {
  ifk1: PHRASE_REPLAY_KEY_PREFIX,
  ifk2: PHRASE_REPLAY_KEY_V2_PREFIX,
}
const TUPLE_LENGTH_BY_VERSION: Readonly<Record<PhraseReplayKeyVersion, number>> = {
  ifk1: 7,
  ifk2: 8,
}
const TUPLE_SLOT_NAMES = [
  'requestId',
  'seed',
  'controls',
  'musicalProfile',
  'isCustom',
  'phraseNumber',
  'carryIn',
  'myInstrument',
] as const
const MY_INSTRUMENT_ENTRY_LENGTH = 5

/** The decoded tuple once its slot types are checked, before domain validation. */
type ReplayKeyTuple = readonly [
  string,
  number,
  readonly unknown[],
  string,
  boolean,
  number,
  Record<string, unknown> | null,
  PhraseReplayKeyMyInstrumentEntry?,
]

/**
 * Intent: decode a strict, canonical, unpadded base64url payload into bytes, rejecting any other
 * character, any padding, an impossible length or non-zero trailing bits.
 */
function base64UrlToBytes(payload: string): Uint8Array {
  if (!BASE64URL_PATTERN.test(payload) || payload.length % 4 === 1) {
    throw new PhraseReplayKeyError(
      'Phrase replay key payload is not unpadded base64url (A-Z a-z 0-9 - _).',
    )
  }
  const standard = payload.replace(/-/gu, '+').replace(/_/gu, '/')
  const binary = atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  if (bytesToBase64Url(bytes) !== payload) {
    throw new PhraseReplayKeyError('Phrase replay key payload is not canonical base64url.')
  }
  return bytes
}

/** Intent: decode strict UTF-8 bytes and parse them as JSON, as a typed failure when either fails. */
function parsePayloadJson(bytes: Uint8Array): unknown {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new PhraseReplayKeyError('Phrase replay key payload is not valid UTF-8.')
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new PhraseReplayKeyError('Phrase replay key payload is not valid JSON.')
  }
}

/** Intent: whether a decoded value is a plain, non-null, non-array JSON object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Intent: whether a value is my instrument's entry: a name then four numbers, nothing else. */
function isMyInstrumentEntry(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === MY_INSTRUMENT_ENTRY_LENGTH &&
    typeof value[0] === 'string' &&
    value.slice(1).every((entry: unknown) => typeof entry === 'number')
  )
}

/** Intent: whether one tuple slot holds the primitive type that slot requires. */
function slotHasExpectedType(index: number, value: unknown): boolean {
  switch (index) {
    case 0:
    case 3:
      return typeof value === 'string'
    case 1:
    case 5:
      return typeof value === 'number'
    case 2:
      return Array.isArray(value) && value.length === PHRASE_REPLAY_KEY_CONTROL_ORDER.length
    case 4:
      return typeof value === 'boolean'
    case 6:
      return value === null || isPlainObject(value)
    default:
      return isMyInstrumentEntry(value)
  }
}

/**
 * Intent: check the decoded JSON is its version's tuple (seven entries for `ifk1`, eight for
 * `ifk2`) with the right slot types, naming any faulty slot.
 */
function requireTuple(value: unknown, version: PhraseReplayKeyVersion): ReplayKeyTuple {
  const length = TUPLE_LENGTH_BY_VERSION[version]
  if (!Array.isArray(value) || value.length !== length) {
    throw new PhraseReplayKeyError(
      `Phrase replay key "${version}" payload must be an array of exactly ${length} entries.`,
    )
  }
  value.forEach((entry: unknown, index) => {
    if (!slotHasExpectedType(index, entry)) {
      throw new PhraseReplayKeyError(
        `Phrase replay key slot ${index} (${TUPLE_SLOT_NAMES[index]}) has the wrong type.`,
      )
    }
  })
  return value as unknown as ReplayKeyTuple
}

/**
 * Intent: split a trimmed key into its version and payload, rejecting a missing prefix or a
 * version other than `ifk1` and `ifk2`.
 */
function keyParts(key: string): {
  readonly version: PhraseReplayKeyVersion
  readonly payload: string
} {
  const match = KEY_VERSION_PATTERN.exec(key)
  if (match === null) {
    throw new PhraseReplayKeyError(
      `Phrase replay key must start with "${PHRASE_REPLAY_KEY_PREFIX}" or "${PHRASE_REPLAY_KEY_V2_PREFIX}".`,
    )
  }
  const version = (Object.keys(PREFIX_BY_VERSION) as PhraseReplayKeyVersion[]).find(
    (candidate) => PREFIX_BY_VERSION[candidate] === match[0],
  )
  if (version === undefined) {
    throw new PhraseReplayKeyError(
      `Phrase replay key has unsupported key version "ifk${match[1]}"; only "ifk1" and "ifk2" are supported.`,
    )
  }
  return { version, payload: key.slice(match[0].length) }
}

/**
 * Intent: the instrument-profile field a key's version supplies to the intent rebuild. An `ifk1`
 * key names a built-in, whose profile its id gives, so naming my instrument is refused; an `ifk2`
 * key names my instrument, whose profile is rebuilt from the stored entry by the protocol's own
 * my-instrument derivation (no clef), so naming a built-in is refused. The derivation's refusals,
 * for a profile no my instrument can have, propagate unchanged.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[entity_my_instrument]]
function suppliedInstrumentProfile(
  version: PhraseReplayKeyVersion,
  instrumentProfileId: unknown,
  entry: PhraseReplayKeyMyInstrumentEntry | undefined,
): Record<string, unknown> {
  const namesMyInstrument = instrumentProfileId === MY_INSTRUMENT_ID
  if (version === 'ifk1') {
    if (namesMyInstrument)
      throw new PhraseReplayKeyError(
        `An "ifk1" phrase replay key cannot name "${MY_INSTRUMENT_ID}": its profile travels only in an "ifk2" key.`,
      )
    return {}
  }
  if (!namesMyInstrument || entry === undefined)
    throw new PhraseReplayKeyError(
      `An "ifk2" phrase replay key must name "${MY_INSTRUMENT_ID}", got ${JSON.stringify(instrumentProfileId)}.`,
    )
  const [displayName, minMidi, maxMidi, chromatic, diatonic] = entry
  return {
    instrumentProfile: deriveMyInstrumentProfile({
      displayName,
      concertRange: { minMidi, maxMidi },
      transposition: { chromatic, diatonic },
    }),
  }
}

/**
 * Intent: decode a phrase replay key of either version back into the exact generation intent and
 * phrase number. The prefix and version are checked first, then the base64url, UTF-8, JSON and
 * the version's tuple shape (each a PhraseReplayKeyError), then whether the version agrees with
 * the instrument the controls name; an `ifk2` key's my-instrument profile is rebuilt from its
 * stored fields; the owning fields are then validated and the intent rebuilt by the generation
 * worker protocol's own intent validation, whose domain errors propagate unchanged. Nothing
 * missing or invalid is ever defaulted or repaired.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[req_my_instrument]]
export function decodePhraseReplayKey(key: string): DecodedPhraseReplayKey {
  const { version, payload } = keyParts(key.trim())
  const tuple = requireTuple(parsePayloadJson(base64UrlToBytes(payload)), version)
  const [requestId, seed, controlValues, musicalProfile, isCustom, phraseNumber, carryIn, entry] =
    tuple
  const controls = Object.fromEntries(
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((controlKey, index) => [controlKey, controlValues[index]]),
  )
  const intent = rebuildGenerationWorkerIntent({
    requestId,
    seed,
    writtenTonalCenter: controls.tonalCenter,
    controls,
    musicalProfile: { musicalProfile, isCustom },
    ...suppliedInstrumentProfile(version, controls.instrumentProfileId, entry),
    ...(carryIn === null ? {} : { carryIn }),
  })
  requireConsistentPhraseNumber(intent, phraseNumber)
  return { keyVersion: version, intent, phraseNumber }
}
