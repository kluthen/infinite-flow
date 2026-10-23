/**
 * The phrase replay key: one self-contained, versioned text key holding exactly the owning inputs
 * that reproduce an accepted phrase, and its encoder. A key is a version prefix followed by the
 * unpadded base64url of the UTF-8 JSON of a fixed tuple. Only `ifk4.` is written, for every
 * phrase, over this 9-tuple, always nine entries, in this order (permanent once emitted):
 *
 *   0. the request id (a string);
 *   1. the seed (an unsigned 32-bit integer);
 *   2. the 14 controls in PHRASE_REPLAY_KEY_CONTROL_ORDER, the tonal-center slot holding the
 *      written tonal center;
 *   3. the figure levels: a JSON object holding exactly the seven figure ids as keys, written in
 *      FIGURE_IDS order, each mapped to its level id;
 *   4. the phrase number;
 *   5. the carry-in, from a phrase or from no phrase (a Jam's phrase 1, its `origin` kept), or
 *      null;
 *   6. my instrument's owning profile fields `[displayName, minMidi, maxMidi, chromatic,
 *      diatonic]`, or JSON `null` for a built-in instrument: the built-in marker, the controls
 *      naming the built-in by its id;
 *   7. the rhythm lock group as the generation request holds it, or null;
 *   8. the steering block as the generation request holds it, or null.
 *
 * The first seven entries keep the `ifk3.` order and meaning. No musical profile's or preset's
 * name is stored, nor the doodle, its raw notes, the drift or the capture tempo: the steering
 * block and the join are what the generator read. The older versions are decoded only: `ifk1.`, a
 * 7-tuple (request id, seed, controls, musical profile name, customized flag, phrase number,
 * carry-in) for a built-in instrument; `ifk2.`, an 8-tuple of those seven entries then my
 * instrument's owning profile fields; and `ifk3.`, the first seven entries above, its carry-in
 * only from a phrase. The decoder lives apart, in phrase-replay-key-decode.ts, so the app bundle
 * never pulls in the protocol's intent validation.
 */

import type { GenerationControls } from '../domain/controls/generation-controls'
import { FIGURE_IDS, type FigureLevels } from '../domain/figures/figure-levels'
import { isPhraseCarryIn } from '../domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '../domain/generation/generation-intent'
import { MY_INSTRUMENT_ID } from '../domain/profile/instrument-profiles'
import { encodeSeed, type Seed } from '../domain/random/seed'

/** The prefix every version-1 phrase replay key, a built-in phrase's before v3.1, starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_PREFIX = 'ifk1.'

/** The prefix every version-2 key, a my-instrument phrase's before v3.1, starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_V2_PREFIX = 'ifk2.'

/** The prefix every version-3 key, every phrase's under v3.1, starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_V3_PREFIX = 'ifk3.'

/** The prefix every version-4 phrase replay key, the only one written, starts with. */
// @spec-link [[module_phrase_replay_key]]
export const PHRASE_REPLAY_KEY_V4_PREFIX = 'ifk4.'

/**
 * My instrument's owning profile fields as an `ifk2.` key's eighth entry and an `ifk3.` or `ifk4.`
 * key's seventh store them: display name, lowest and highest concert MIDI note, chromatic and diatonic
 * transposition counts.
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

const KEY_PATTERN = /^ifk[1-4]\.[A-Za-z0-9_-]+$/u

/** Intent: reject a phrase number that is not a positive integer, never coercing or defaulting it. */
function requirePositivePhraseNumber(phraseNumber: number): void {
  if (!Number.isSafeInteger(phraseNumber) || phraseNumber < 1) {
    throw new PhraseReplayKeyError(
      `Phrase replay key phrase number must be a positive integer, got ${String(phraseNumber)}.`,
    )
  }
}

/**
 * Intent: enforce the phrase-number rules: a positive integer, and, when a carry-in from a phrase
 * is present, exactly one more than the number of the phrase that produced that carry-in. A
 * carry-in from no phrase (the doodle has no number) joins into phrase 1, so the number is 1.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[rule_jam_phrase_one_joins_doodle]]
export function requireConsistentPhraseNumber(
  intent: GenerationIntent,
  phraseNumber: number,
): void {
  requirePositivePhraseNumber(phraseNumber)
  const { carryIn } = intent
  if (carryIn === undefined) return
  if (!isPhraseCarryIn(carryIn)) {
    if (phraseNumber !== 1)
      throw new PhraseReplayKeyError(
        `Phrase replay key phrase number ${phraseNumber} must be 1: a carry-in from no phrase joins the doodle into phrase 1.`,
      )
    return
  }
  if (phraseNumber !== carryIn.phraseNumber + 1) {
    throw new PhraseReplayKeyError(
      `Phrase replay key phrase number ${phraseNumber} must be its carry-in's phrase number plus one (${carryIn.phraseNumber + 1}).`,
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

/** Intent: the figure levels as an `ifk4.` key stores them, the seven ids in FIGURE_IDS order. */
function figureLevelsEntry(levels: FigureLevels): Record<string, string> {
  return Object.fromEntries(FIGURE_IDS.map((figure) => [figure, levels[figure]]))
}

/**
 * Intent: encode one generation intent and its phrase number into an `ifk4.` phrase replay key,
 * whatever its instrument, over the 9-tuple the file header states: request id, seed, the controls
 * in the codec's fixed order with the written tonal center in the tonal-center slot, the figure
 * levels by figure id, the phrase number, the carry-in of either origin or null, my instrument's
 * owning profile fields or null for a built-in, the rhythm lock group or null and the steering
 * block or null. No musical profile and no derived field is ever stored. A phrase number that is
 * not a positive integer, not its phrase carry-in's number plus one, or not 1 beside a carry-in
 * from no phrase, is rejected rather than stored.
 */
// @spec-link [[module_phrase_replay_key]]
// @spec-link [[req_my_instrument]]
// @spec-link [[rule_seeded_phrase_reproduction]]
export function encodePhraseReplayKey(intent: GenerationIntent, phraseNumber: number): string {
  requireConsistentPhraseNumber(intent, phraseNumber)
  const controls = PHRASE_REPLAY_KEY_CONTROL_ORDER.map((key) =>
    key === 'tonalCenter' ? intent.writtenTonalCenter : intent.controls[key],
  )
  const isMyInstrument = intent.controls.instrumentProfileId === MY_INSTRUMENT_ID
  const tuple: readonly unknown[] = [
    intent.requestId,
    intent.seed,
    controls,
    figureLevelsEntry(intent.figureLevels),
    phraseNumber,
    intent.carryIn ?? null,
    isMyInstrument ? myInstrumentEntry(intent) : null,
    intent.rhythmLock ?? null,
    intent.steering ?? null,
  ]
  const bytes = new TextEncoder().encode(JSON.stringify(tuple))
  return `${PHRASE_REPLAY_KEY_V4_PREFIX}${bytesToBase64Url(bytes)}`
}

/** Intent: the plain words naming which accepted phrase a key line belongs to. */
function contextText(context: PhraseReplayContext): string {
  if (context.source === 'workspace') return 'workspace phrase'
  requirePositivePhraseNumber(context.phraseNumber)
  return `session phrase ${context.phraseNumber} (${context.origin})`
}

/**
 * Intent: render the single console line that announces one accepted phrase's replay key, naming
 * the phrase, its seed in `seed1-` form and the key. A key that is not a well-formed key of one of
 * the four versions (`ifk1.` to `ifk4.`) is rejected, so the line can never span more than one
 * line.
 */
// @spec-link [[module_phrase_replay_key]]
export function phraseReplayKeyLine(key: string, context: PhraseReplayContext, seed: Seed): string {
  if (!KEY_PATTERN.test(key)) {
    throw new PhraseReplayKeyError(
      'Phrase replay key line needs a well-formed "ifk1.", "ifk2.", "ifk3." or "ifk4." key.',
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
