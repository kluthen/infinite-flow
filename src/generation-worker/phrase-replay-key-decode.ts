/**
 * The phrase replay key decoder: turns a version-1 phrase replay key back into the exact
 * GenerationIntent through the generation worker protocol's own intent validation. Kept apart from
 * the encoder in phrase-replay-key.ts so the app bundle, which only encodes, never pulls in the
 * protocol.
 */

import type { GenerationIntent } from '../domain/generation/generation-intent'
import { rebuildGenerationWorkerIntent } from './generation-worker-inbound'
import {
  bytesToBase64Url,
  PHRASE_REPLAY_KEY_CONTROL_ORDER,
  PHRASE_REPLAY_KEY_PREFIX,
  PhraseReplayKeyError,
  requireConsistentPhraseNumber,
} from './phrase-replay-key'

/** A phrase replay key decoded into its validated generation intent and phrase number. */
// @spec-link [[module_phrase_replay_key]]
export interface DecodedPhraseReplayKey {
  readonly keyVersion: 'ifk1'
  readonly intent: GenerationIntent
  readonly phraseNumber: number
}

const KEY_VERSION_PATTERN = /^ifk(\d+)\./u
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u
const TUPLE_LENGTH = 7
const TUPLE_SLOT_NAMES = [
  'requestId',
  'seed',
  'controls',
  'musicalProfile',
  'isCustom',
  'phraseNumber',
  'carryIn',
] as const

/** The decoded 7-tuple once its slot types are checked, before domain validation. */
type ReplayKeyTuple = readonly [
  string,
  number,
  readonly unknown[],
  string,
  boolean,
  number,
  Record<string, unknown> | null,
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
    default:
      return value === null || isPlainObject(value)
  }
}

/** Intent: check the decoded JSON is the 7-tuple with the right slot types, naming any faulty slot. */
function requireTuple(value: unknown): ReplayKeyTuple {
  if (!Array.isArray(value) || value.length !== TUPLE_LENGTH) {
    throw new PhraseReplayKeyError(
      `Phrase replay key payload must be an array of exactly ${TUPLE_LENGTH} entries.`,
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

/** Intent: split a trimmed key into its payload, rejecting a missing prefix or another version. */
function keyPayload(key: string): string {
  const match = KEY_VERSION_PATTERN.exec(key)
  if (match === null) {
    throw new PhraseReplayKeyError(
      `Phrase replay key must start with "${PHRASE_REPLAY_KEY_PREFIX}".`,
    )
  }
  if (match[0] !== PHRASE_REPLAY_KEY_PREFIX) {
    throw new PhraseReplayKeyError(
      `Phrase replay key has unsupported key version "ifk${match[1]}"; only "ifk1" is supported.`,
    )
  }
  return key.slice(PHRASE_REPLAY_KEY_PREFIX.length)
}

/**
 * Intent: decode a phrase replay key back into the exact generation intent and phrase number. The
 * prefix and version are checked first, then the base64url, UTF-8, JSON and tuple shape (each a
 * PhraseReplayKeyError); the owning fields are then validated and the intent rebuilt by the
 * generation worker protocol's own intent validation, whose domain errors propagate unchanged.
 * Nothing missing or invalid is ever defaulted or repaired.
 */
// @spec-link [[module_phrase_replay_key]]
export function decodePhraseReplayKey(key: string): DecodedPhraseReplayKey {
  const payload = keyPayload(key.trim())
  const tuple = requireTuple(parsePayloadJson(base64UrlToBytes(payload)))
  const [requestId, seed, controlValues, musicalProfile, isCustom, phraseNumber, carryIn] = tuple
  const controls = Object.fromEntries(
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((controlKey, index) => [controlKey, controlValues[index]]),
  )
  const intent = rebuildGenerationWorkerIntent({
    requestId,
    seed,
    writtenTonalCenter: controls.tonalCenter,
    controls,
    musicalProfile: { musicalProfile, isCustom },
    ...(carryIn === null ? {} : { carryIn }),
  })
  requireConsistentPhraseNumber(intent, phraseNumber)
  return { keyVersion: 'ifk1', intent, phraseNumber }
}
