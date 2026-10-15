/**
 * The phrase replay key: one self-contained, versioned text key holding exactly the owning inputs
 * that reproduce an accepted phrase (request id, seed, the 14 written controls, the musical
 * profile, the phrase number and the carry-in), and its encoder. A built-in instrument's key is
 * `ifk1.` followed by the unpadded base64url of the UTF-8 JSON of a fixed 7-tuple; my instrument's
 * is `ifk2.` over an 8-tuple, the same seven entries then my instrument's owning profile fields.
 * The decoder lives apart, in phrase-replay-key-decode.ts, so the app bundle never pulls in the
 * protocol's intent validation.
 */

import type { GenerationControls } from '../domain/controls/generation-controls'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import { MY_INSTRUMENT_ID } from '../domain/profile/instrument-profiles'
import { encodeSeed, type Seed } from '../domain/random/seed'

/** The prefix every version-1 phrase replay key starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_PREFIX = 'ifk1.'

/** The prefix every version-2 phrase replay key, the one carrying my instrument, starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_V2_PREFIX = 'ifk2.'

/**
 * My instrument's owning profile fields as an `ifk2.` key's eighth entry stores them: display
 * name, lowest and highest concert MIDI note, chromatic and diatonic transposition counts.
 */
// @spec-link [[module_phrase_replay_key]]
export type PhraseReplayKeyMyInstrumentEntry = readonly [string, number, number, number, number]

/** Typed failure for a malformed, unsupported or inconsistent phrase replay key. */
// @spec-link [[module_phrase_replay_key]]
export class PhraseReplayKeyError extends Error {
  readonly kind = 'PhraseReplayKeyError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PhraseReplayKeyError'
  }
}

/**
 * The fixed order the codec stores the 14 generation controls in. The tonal-center slot holds the
 * written tonal center, the form the generation intent's input takes.
 */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_CONTROL_ORDER = [
  'tempo',
  'tonalCenter',
  'collection',
  'harmonicMotion',
  'tension',
  'noteDensity',
  'rhythmicVariety',
  'syncopation',
  'silenceDensity',
  'contour',
  'register',
  'leapiness',
  'arpeggioChaos',
  'instrumentProfileId',
] as const satisfies readonly (keyof GenerationControls)[]

// Compile-time proof the order lists every GenerationControls key: a key missing from the order
// leaves this type non-never and fails the assignment below.
type MissingControlKey = Exclude<
  keyof GenerationControls,
  (typeof PHRASE_REPLAY_KEY_CONTROL_ORDER)[number]
>
const CONTROL_ORDER_IS_COMPLETE: [MissingControlKey] extends [never] ? true : false = true
void CONTROL_ORDER_IS_COMPLETE

/** Which accepted phrase a replay key line names. */
// @spec-link [[module_phrase_replay_key]]
export type PhraseReplayContext =
  | { readonly source: 'workspace' }
  | {
      readonly source: 'session'
      readonly phraseNumber: number
      readonly origin: 'carry-in' | 'standalone'
    }

const KEY_PATTERN = /^ifk[12]\.[A-Za-z0-9_-]+$/u

/** Intent: reject a phrase number that is not a positive integer, never coercing or defaulting it. */
function requirePositivePhraseNumber(phraseNumber: number): void {
  if (!Number.isSafeInteger(phraseNumber) || phraseNumber < 1) {
    throw new PhraseReplayKeyError(
      `Phrase replay key phrase number must be a positive integer, got ${String(phraseNumber)}.`,
    )
  }
}

/**
 * Intent: enforce the phrase-number rules: a positive integer, and, when a carry-in is present,
 * exactly one more than the number of the phrase that produced that carry-in.
 */
// @spec-link [[module_phrase_replay_key]]
export function requireConsistentPhraseNumber(
  intent: GenerationIntent,
  phraseNumber: number,
): void {
  requirePositivePhraseNumber(phraseNumber)
  if (intent.carryIn !== undefined && phraseNumber !== intent.carryIn.phraseNumber + 1) {
    throw new PhraseReplayKeyError(
      `Phrase replay key phrase number ${phraseNumber} must be its carry-in's phrase number plus one (${intent.carryIn.phraseNumber + 1}).`,
    )
  }
}

/** Intent: encode bytes as unpadded base64url (A-Z a-z 0-9 - _) without any Node-only API. */
// @spec-link [[module_phrase_replay_key]]
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

/**
 * Intent: my instrument's owning profile fields as the intent's profile holds them: its display
 * name, concert range and transposition. Never its id, register windows, clef, template, written
 * range as entered or input kind: the id is in the controls, the windows derive from the range,
 * and the rest is not part of the generator-facing profile.
 */
function myInstrumentEntry(intent: GenerationIntent): PhraseReplayKeyMyInstrumentEntry {
  const { displayName, concertRange, transposition } = intent.instrumentProfile
  return [
    displayName,
    concertRange.minMidi,
    concertRange.maxMidi,
    transposition.chromatic,
    transposition.diatonic,
  ]
}

/**
 * Intent: encode one generation intent and its phrase number into a phrase replay key: `ifk1.`
 * over the 7-tuple for a built-in instrument, byte for byte the key written before version 2
 * existed, or `ifk2.` over the same seven entries plus my instrument's owning profile fields when
 * the intent names my instrument. The controls are stored in the codec's fixed order with the
 * written tonal center in the tonal-center slot; derived fields are never stored. A phrase number
 * that is not a positive integer, or not its carry-in's number plus one, is rejected rather than
 * stored.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[req_my_instrument]]
export function encodePhraseReplayKey(intent: GenerationIntent, phraseNumber: number): string {
  requireConsistentPhraseNumber(intent, phraseNumber)
  const controls = PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
    key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
  )
  const tuple: unknown[] = [
    intent.requestId,
    intent.seed,
    controls,
    intent.musicalProfile.musicalProfile,
    intent.musicalProfile.isCustom,
    phraseNumber,
    intent.carryIn ?? null,
  ]
  const isMyInstrument = intent.controls.instrumentProfileId === MY_INSTRUMENT_ID
  if (isMyInstrument) tuple.push(myInstrumentEntry(intent))
  const prefix = isMyInstrument ? PHRASE_REPLAY_KEY_V2_PREFIX : PHRASE_REPLAY_KEY_PREFIX
  const bytes = new TextEncoder().encode(JSON.stringify(tuple))
  return `${prefix}${bytesToBase64Url(bytes)}`
}

/** Intent: the plain words naming which accepted phrase a key line belongs to. */
function contextText(context: PhraseReplayContext): string {
  if (context.source === 'workspace') return 'workspace phrase'
  requirePositivePhraseNumber(context.phraseNumber)
  return `session phrase ${context.phraseNumber} (${context.origin})`
}

/**
 * Intent: render the single console line that announces one accepted phrase's replay key, naming
 * the phrase, its seed in `seed1-` form and the key. A key that is not a well-formed version-1 or
 * version-2 key is rejected, so the line can never span more than one line.
 */
// @spec-link [[module_phrase_replay_key]]
export function phraseReplayKeyLine(key: string, context: PhraseReplayContext, seed: Seed): string {
  if (!KEY_PATTERN.test(key)) {
    throw new PhraseReplayKeyError(
      'Phrase replay key line needs a well-formed "ifk1." or "ifk2." key.',
    )
  }
  return `[Infinite Flow] phrase replay key · ${contextText(context)} · ${encodeSeed(seed)} · ${key}`
}

/**
 * Intent: encode one accepted phrase's replay key and hand its single line to the injected log
 * sink exactly once. A workspace phrase is phrase 1; a session phrase uses its own number, and its
 * origin must agree with whether the intent carries a carry-in.
 */
// @spec-link [[module_phrase_replay_key]]
export function announcePhraseReplayKey(
  intent: GenerationIntent,
  context: PhraseReplayContext,
  log: (line: string) => void,
): void {
  if (
    context.source === 'session' &&
    (context.origin === 'carry-in') !== (intent.carryIn !== undefined)
  ) {
    throw new PhraseReplayKeyError(
      `Session phrase origin "${context.origin}" does not match whether the intent has a carry-in.`,
    )
  }
  const phraseNumber = context.source === 'workspace' ? 1 : context.phraseNumber
  const key = encodePhraseReplayKey(intent, phraseNumber)
  log(phraseReplayKeyLine(key, context, intent.seed))
}
