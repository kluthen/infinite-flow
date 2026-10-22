/**
 * The phrase replay key decoder: turns an `ifk1.`, `ifk2.` or `ifk3.` phrase replay key back into
 * the exact GenerationIntent through the generation worker protocol's own intent validation, a
 * my-instrument profile rebuilt through the protocol's own my-instrument derivation. An `ifk3.`
 * key's 7-tuple (the order phrase-replay-key.ts states) holds the figure levels by figure id in
 * slot 3, read through the figure-levels parser, and my instrument's owning profile fields in slot
 * 6, `null` marking a built-in. An `ifk1.` (7-tuple, built-in) or `ifk2.` (8-tuple, my instrument)
 * key holds a musical profile name and its customized flag in slots 3 and 4 instead; the name
 * becomes that profile's levels through `levelsForProfile`, whatever the flag. A decoded intent
 * never holds a profile. Kept apart from the encoder in phrase-replay-key.ts so the app bundle,
 * which only encodes, never pulls in the protocol.
 */

import { MUSICAL_PROFILES, type MusicalProfile } from '../domain/controls/generation-controls'
import {
  FigureLevelsError,
  levelsForProfile,
  parseFigureLevels,
  type FigureLevels,
} from '../domain/figures/figure-levels'
import { parsePhraseCarryIn } from '../domain/generation/carry-in/carry-in'
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
  PHRASE_REPLAY_KEY_V3_PREFIX,
  PhraseReplayKeyError,
  requireConsistentPhraseNumber,
  type PhraseReplayKeyMyInstrumentEntry,
} from './phrase-replay-key'

/** The key versions the decoder reads. */
// @spec-link [[module_phrase_replay_key]]
export type PhraseReplayKeyVersion = 'ifk1' | 'ifk2' | 'ifk3'

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
  ifk3: PHRASE_REPLAY_KEY_V3_PREFIX,
}
const MY_INSTRUMENT_ENTRY_LENGTH = 5

/** One tuple slot: its name, as a refusal names it, and the type its value must have. */
interface TupleSlot {
  readonly name: string
  readonly hasExpectedType: (value: unknown) => boolean
}

/** The owning fields every version's tuple gives, once its slots are checked and read. */
interface ReplayKeyFields {
  readonly requestId: string
  readonly seed: number
  readonly controlValues: readonly unknown[]
  readonly figureLevels: FigureLevels
  readonly phraseNumber: number
  readonly carryIn: Record<string, unknown> | null
  readonly myInstrument: PhraseReplayKeyMyInstrumentEntry | null
}

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

/** Intent: whether a value is a JSON string. */
function isString(value: unknown): boolean {
  return typeof value === 'string'
}

/** Intent: whether a value is a JSON number. */
function isNumber(value: unknown): boolean {
  return typeof value === 'number'
}

/** Intent: whether a value is a JSON boolean. */
function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean'
}

/** Intent: whether a value is the controls array, one value per control in the codec's order. */
function isControlValues(value: unknown): boolean {
  return Array.isArray(value) && value.length === PHRASE_REPLAY_KEY_CONTROL_ORDER.length
}

/** Intent: whether a value is a carry-in slot's: a plain object, or null for none. */
function isCarryInOrNull(value: unknown): boolean {
  return value === null || isPlainObject(value)
}

/** Intent: whether a value is an `ifk3.` my-instrument slot's: my instrument's entry, or null. */
function isMyInstrumentEntryOrNull(value: unknown): boolean {
  return value === null || isMyInstrumentEntry(value)
}

const REQUEST_ID_SLOT: TupleSlot = { name: 'requestId', hasExpectedType: isString }
const SEED_SLOT: TupleSlot = { name: 'seed', hasExpectedType: isNumber }
const CONTROLS_SLOT: TupleSlot = { name: 'controls', hasExpectedType: isControlValues }
const PHRASE_NUMBER_SLOT: TupleSlot = { name: 'phraseNumber', hasExpectedType: isNumber }
const CARRY_IN_SLOT: TupleSlot = { name: 'carryIn', hasExpectedType: isCarryInOrNull }
const PROFILE_TUPLE_SLOTS: readonly TupleSlot[] = [
  REQUEST_ID_SLOT,
  SEED_SLOT,
  CONTROLS_SLOT,
  { name: 'musicalProfile', hasExpectedType: isString },
  { name: 'isCustom', hasExpectedType: isBoolean },
  PHRASE_NUMBER_SLOT,
  CARRY_IN_SLOT,
]

/**
 * Every version's tuple, slot by slot: `ifk1` the seven profile-era entries, `ifk2` those seven
 * then my instrument's entry, `ifk3` the levels-era 7-tuple of phrase-replay-key.ts.
 */
const TUPLE_SLOTS_BY_VERSION: Readonly<Record<PhraseReplayKeyVersion, readonly TupleSlot[]>> = {
  ifk1: PROFILE_TUPLE_SLOTS,
  ifk2: [...PROFILE_TUPLE_SLOTS, { name: 'myInstrument', hasExpectedType: isMyInstrumentEntry }],
  ifk3: [
    REQUEST_ID_SLOT,
    SEED_SLOT,
    CONTROLS_SLOT,
    { name: 'figureLevels', hasExpectedType: isPlainObject },
    PHRASE_NUMBER_SLOT,
    CARRY_IN_SLOT,
    { name: 'myInstrument', hasExpectedType: isMyInstrumentEntryOrNull },
  ],
}

/**
 * Intent: check the decoded JSON is its version's tuple (seven entries for `ifk1` and `ifk3`,
 * eight for `ifk2`) with the right slot types, naming any faulty slot.
 */
function requireTuple(value: unknown, version: PhraseReplayKeyVersion): readonly unknown[] {
  const slots = TUPLE_SLOTS_BY_VERSION[version]
  if (!Array.isArray(value) || value.length !== slots.length) {
    throw new PhraseReplayKeyError(
      `Phrase replay key "${version}" payload must be an array of exactly ${slots.length} entries.`,
    )
  }
  value.forEach((entry: unknown, index) => {
    const slot = slots[index]!
    if (!slot.hasExpectedType(entry)) {
      throw new PhraseReplayKeyError(
        `Phrase replay key slot ${index} (${slot.name}) has the wrong type.`,
      )
    }
  })
  return value as readonly unknown[]
}

/**
 * Intent: the levels an `ifk1` or `ifk2` key's musical profile name gives through
 * `levelsForProfile`, whatever its customized flag; a name that is no musical profile is refused
 * naming slot 3.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[rule_neutral_and_jazz_figure_levels]]
function profileSlotLevels(name: string): FigureLevels {
  const profile = MUSICAL_PROFILES.find((candidate: MusicalProfile) => candidate === name)
  if (profile === undefined) {
    throw new PhraseReplayKeyError(
      `Phrase replay key slot 3 (musicalProfile) must be one of ${JSON.stringify(MUSICAL_PROFILES)}, got ${JSON.stringify(name)}.`,
    )
  }
  return levelsForProfile(profile)
}

/**
 * Intent: the levels an `ifk3` key stores in slot 3, read through the figure-levels parser; a
 * missing or unknown figure, or an unknown level, is refused naming slot 3 and the reason.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[module_figure_levels]]
function levelsSlotLevels(value: unknown): FigureLevels {
  try {
    return parseFigureLevels(value)
  } catch (error) {
    if (error instanceof FigureLevelsError) {
      throw new PhraseReplayKeyError(
        `Phrase replay key slot 3 (figureLevels) is invalid: ${error.message}`,
      )
    }
    throw error
  }
}

/**
 * Intent: read a checked tuple's owning fields by its version's slot order: an `ifk3` key's levels
 * from slot 3 and its my-instrument entry or null from slot 6; an `ifk1` or `ifk2` key's levels
 * from its profile name, its my-instrument entry from an `ifk2` key's slot 7 (null for `ifk1`).
 */
function fieldsOf(tuple: readonly unknown[], version: PhraseReplayKeyVersion): ReplayKeyFields {
  const common = {
    requestId: tuple[0] as string,
    seed: tuple[1] as number,
    controlValues: tuple[2] as readonly unknown[],
  }
  if (version === 'ifk3') {
    return {
      ...common,
      figureLevels: levelsSlotLevels(tuple[3]),
      phraseNumber: tuple[4] as number,
      carryIn: tuple[5] as Record<string, unknown> | null,
      myInstrument: tuple[6] as PhraseReplayKeyMyInstrumentEntry | null,
    }
  }
  return {
    ...common,
    figureLevels: profileSlotLevels(tuple[3] as string),
    phraseNumber: tuple[5] as number,
    carryIn: tuple[6] as Record<string, unknown> | null,
    myInstrument: version === 'ifk2' ? (tuple[7] as PhraseReplayKeyMyInstrumentEntry) : null,
  }
}

/**
 * Intent: split a trimmed key into its version and payload, rejecting a missing prefix or a
 * version other than `ifk1`, `ifk2` and `ifk3`.
 */
function keyParts(key: string): {
  readonly version: PhraseReplayKeyVersion
  readonly payload: string
} {
  const match = KEY_VERSION_PATTERN.exec(key)
  if (match === null) {
    throw new PhraseReplayKeyError(
      `Phrase replay key must start with "${PHRASE_REPLAY_KEY_PREFIX}", "${PHRASE_REPLAY_KEY_V2_PREFIX}" or "${PHRASE_REPLAY_KEY_V3_PREFIX}".`,
    )
  }
  const version = (Object.keys(PREFIX_BY_VERSION) as PhraseReplayKeyVersion[]).find(
    (candidate) => PREFIX_BY_VERSION[candidate] === match[0],
  )
  if (version === undefined) {
    throw new PhraseReplayKeyError(
      `Phrase replay key has unsupported key version "ifk${match[1]}"; only "ifk1", "ifk2" and "ifk3" are supported.`,
    )
  }
  return { version, payload: key.slice(match[0].length) }
}

/**
 * Intent: why a key's my-instrument entry disagrees with the instrument its controls name: an
 * `ifk1` key cannot name my instrument, an `ifk2` key must, and an `ifk3` key holds my
 * instrument's entry exactly when its controls name it, `null` otherwise.
 */
function instrumentMismatchMessage(
  version: PhraseReplayKeyVersion,
  instrumentProfileId: unknown,
): string {
  switch (version) {
    case 'ifk1':
      return `An "ifk1" phrase replay key cannot name "${MY_INSTRUMENT_ID}": its profile travels only in an "ifk2" key.`
    case 'ifk2':
      return `An "ifk2" phrase replay key must name "${MY_INSTRUMENT_ID}", got ${JSON.stringify(instrumentProfileId)}.`
    case 'ifk3':
      return instrumentProfileId === MY_INSTRUMENT_ID
        ? `An "ifk3" phrase replay key naming "${MY_INSTRUMENT_ID}" must hold its profile in slot 6 (myInstrument), not null.`
        : `An "ifk3" phrase replay key naming the built-in ${JSON.stringify(instrumentProfileId)} must hold null in slot 6 (myInstrument).`
  }
}

/**
 * Intent: the instrument-profile field a key supplies to the intent rebuild. A key naming a
 * built-in, whose profile its id gives, must hold no my-instrument entry; a key naming my
 * instrument must hold one, from which its profile is rebuilt by the protocol's own my-instrument
 * derivation (no clef). A disagreement is refused as the version words it; the derivation's
 * refusals, for a profile no my instrument can have, propagate unchanged.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[entity_my_instrument]]
function suppliedInstrumentProfile(
  version: PhraseReplayKeyVersion,
  instrumentProfileId: unknown,
  entry: PhraseReplayKeyMyInstrumentEntry | null,
): Record<string, unknown> {
  if ((instrumentProfileId === MY_INSTRUMENT_ID) !== (entry !== null))
    throw new PhraseReplayKeyError(instrumentMismatchMessage(version, instrumentProfileId))
  if (entry === null) return {}
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
 * Intent: decode a phrase replay key of any of the three versions back into the exact generation
 * intent and phrase number. The prefix and version are checked first, then the base64url, UTF-8,
 * JSON and the version's tuple shape (each a PhraseReplayKeyError), then the levels (an `ifk3`
 * key's through the figure-levels parser, an older key's profile name through `levelsForProfile`),
 * then whether the my-instrument entry agrees with the instrument the controls name; my
 * instrument's profile is rebuilt from its stored fields; the owning fields are then validated and
 * the intent rebuilt, with the levels and no profile, by the generation worker protocol's own
 * intent validation, whose domain errors propagate unchanged. A key's carry-in is read through
 * `parsePhraseCarryIn`, v3.1's exact form, so a carry-in from no phrase (an `origin` key) is
 * refused as v3.1 refuses it. Nothing missing or invalid is ever defaulted or repaired.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[req_my_instrument]]
export function decodePhraseReplayKey(key: string): DecodedPhraseReplayKey {
  const { version, payload } = keyParts(key.trim())
  const tuple = requireTuple(parsePayloadJson(base64UrlToBytes(payload)), version)
  const fields = fieldsOf(tuple, version)
  const controls = Object.fromEntries(
    PHRASE_REPLAY_KEY_CONTROL_ORDER.map((controlKey, index) => [
      controlKey,
      fields.controlValues[index],
    ]),
  )
  const intent = rebuildGenerationWorkerIntent(
    {
      requestId: fields.requestId,
      seed: fields.seed,
      writtenTonalCenter: controls.tonalCenter,
      controls,
      figureLevels: fields.figureLevels,
      ...suppliedInstrumentProfile(version, controls.instrumentProfileId, fields.myInstrument),
      ...(fields.carryIn === null ? {} : { carryIn: fields.carryIn }),
    },
    parsePhraseCarryIn,
  )
  requireConsistentPhraseNumber(intent, fields.phraseNumber)
  return { keyVersion: version, intent, phraseNumber: fields.phraseNumber }
}
