/**
 * The body of a kept session, stored in the sessionBodies store: for each phrase that sounded, in
 * sounding order, its number, its start in seconds from phrase 1's scheduled start, the request and
 * the generated concert timeline as shown, the harmony its chord symbols come from, its generation
 * intent with the instrument profile as data, its tempo, its repeat mark, its favorite mark and the
 * clef the history recorded it in, with the record envelope's two versions; and, for a Jam session
 * only, its quantized doodle with the tempo it was captured at. Every field is copied by name, so
 * the acknowledgements, the rhythm and tension provenance (the rhythm lock's outcome included) and
 * the diagnostics the history holds never reach it. Read back through the domain's own parsers,
 * never rebuilding a profile from its id, each phrase's request agreeing with its intent. The data
 * version 1 and 2 readers and the data version 2 writer serve only the upgrade steps that carry
 * those bodies over. Pure: no storage access.
 */

import { parseQuantizedDoodle, type QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { parseConcertEventTimeline } from '@/domain/events/timeline-parser'
import { isPhraseCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  parseGenerationRequest,
  type GenerationRequest,
} from '@/domain/generation/generation-request'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { isInstrumentClef, type InstrumentClef } from '@/domain/profile/instrument-clef'
import type { SessionHistoryRecord } from '@/session/session-history'

import type { RecordVersions } from '../record-envelope'
import { parseKeptIntent, parseKeptIntentV1, parseKeptIntentV2 } from './kept-intent-parsers'
import { parseKeptHarmony } from './kept-phrase-parsers'
import { assertKeptAppVersion, KEPT_SESSION_BODY_DATA_VERSION } from './kept-reading'
import {
  booleanValue,
  exactRecord,
  finiteAtLeast,
  integerIn,
  KeptRecordError,
  nonEmptyArray,
  positiveFinite,
} from './kept-record-shape'

/**
 * One kept phrase: its number, its start in seconds from phrase 1's scheduled start, its request,
 * its concert timeline as shown, its harmony, its intent, its tempo, its repeat mark (with the
 * number of the phrase it repeats, present only on a repeat), its favorite mark and its clef.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptPhraseRecord {
  readonly phraseNumber: number
  readonly startsAt: number
  readonly request: GenerationRequest
  readonly timeline: ConcertEventTimeline
  readonly harmony: HarmonyCandidate
  readonly intent: GenerationIntent
  readonly tempo: number
  readonly isRepeat: boolean
  readonly repeatOf?: number
  readonly favorite: boolean
  readonly clef: InstrumentClef
}

/**
 * A Jam session's quantized doodle as its body keeps it: the doodle, which holds no tempo, and the
 * tempo it was captured at.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptDoodle {
  readonly quantized: QuantizedDoodle
  readonly captureTempo: number
}

/**
 * The stored body: the envelope's two versions, the phrases in sounding order and, for a Jam
 * session only, its quantized doodle with its capture tempo.
 */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionBodyRecord extends RecordVersions {
  readonly phrases: readonly KeptPhraseRecord[]
  readonly doodle?: KeptDoodle
}

/** Every key the body always holds (`doodle` too, for a Jam session only), and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_SESSION_BODY_KEYS = Object.freeze([
  'dataVersion',
  'appVersion',
  'phrases',
] as const)

/** Every key a kept doodle holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_DOODLE_KEYS = Object.freeze(['quantized', 'captureTempo'] as const)

/** The data version of v3.1's body shape, which only the upgrade steps read or write. */
const BODY_V2_DATA_VERSION = 2

/**
 * Every key a kept phrase always holds (`repeatOf` too, on a repeat only), and no other: no
 * acknowledgements, provenance beyond the harmony, or diagnostics.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
// @spec-link [[rule_kept_session_holds_no_acknowledgements]]
export const KEPT_PHRASE_KEYS = Object.freeze([
  'phraseNumber',
  'startsAt',
  'request',
  'timeline',
  'harmony',
  'intent',
  'tempo',
  'isRepeat',
  'favorite',
  'clef',
] as const)

/** A kept phrase read back, before the played notes are placed in it. */
export interface ParsedKeptPhrase {
  readonly phraseNumber: number
  readonly startedAt: number
  readonly request: GenerationRequest
  readonly timeline: ConcertEventTimeline
  readonly harmony: HarmonyCandidate
  readonly intent: GenerationIntent
  readonly tempo: number
  readonly isRepeat: boolean
  readonly repeatOf?: number
  readonly favorite: boolean
  readonly clef: InstrumentClef
}

/** A current body read back: its phrases in sounding order, and its doodle, null for no Jam. */
// @spec-link [[module_kept_session_codec]]
export interface ParsedKeptBody {
  readonly phrases: readonly ParsedKeptPhrase[]
  readonly doodle: KeptDoodle | null
}

/**
 * Intent: one recorded phrase as kept, every field copied by name from the history record (the
 * clef too, as the history recorded it, never looked up from the instrument as it is now), its
 * start rebased to seconds from `origin` (phrase 1's scheduled start on the audio clock).
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_holds_no_acknowledgements]]
function keptPhraseRecord(
  record: SessionHistoryRecord,
  origin: number,
  favorite: boolean,
): KeptPhraseRecord {
  return {
    phraseNumber: record.phraseNumber,
    startsAt: record.startedAt - origin,
    request: record.outcome.request,
    timeline: record.outcome.result.timeline,
    harmony: record.outcome.provenance.harmony,
    intent: record.intent,
    tempo: record.tempo,
    isRepeat: record.isRepeat,
    ...(record.repeatOf === undefined ? {} : { repeatOf: record.repeatOf }),
    favorite,
    clef: record.clef,
  }
}

/** Intent: the doodle entry of a body: none for a session that is not a Jam. */
function doodleEntry(doodle: KeptDoodle | null): Pick<KeptSessionBodyRecord, 'doodle'> {
  return doodle === null ? {} : { doodle }
}

/**
 * Intent: the body of a session's recorded phrases, written at the body's data version (4), each
 * marked a favorite when its number is in `favorites`, with every start rebased to seconds from
 * phrase 1's scheduled start, and the session's doodle with its capture tempo when it is a Jam
 * (null otherwise). Throws for an empty app version.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function keptSessionBodyRecord(
  records: readonly SessionHistoryRecord[],
  favorites: ReadonlySet<number>,
  doodle: KeptDoodle | null,
  appVersion: string,
): KeptSessionBodyRecord {
  assertKeptAppVersion(appVersion)
  const origin = records[0]!.startedAt
  return {
    dataVersion: KEPT_SESSION_BODY_DATA_VERSION,
    appVersion,
    phrases: records.map((record) =>
      keptPhraseRecord(record, origin, favorites.has(record.phraseNumber)),
    ),
    ...doodleEntry(doodle),
  }
}

/** Intent: phrases read back, each copied by name (its start as `startsAt`) with its new mark. */
function rewrittenPhrases(
  phrases: readonly ParsedKeptPhrase[],
  favorite: (phraseNumber: number) => boolean,
): readonly KeptPhraseRecord[] {
  return phrases.map((phrase) => ({
    phraseNumber: phrase.phraseNumber,
    startsAt: phrase.startedAt,
    request: phrase.request,
    timeline: phrase.timeline,
    harmony: phrase.harmony,
    intent: phrase.intent,
    tempo: phrase.tempo,
    isRepeat: phrase.isRepeat,
    ...(phrase.repeatOf === undefined ? {} : { repeatOf: phrase.repeatOf }),
    favorite: favorite(phrase.phraseNumber),
    clef: phrase.clef,
  }))
}

/**
 * Intent: a body read back, encoded again at the body's data version (4) by `appVersion`: its
 * phrases each copied by name as read (its start as `startsAt`), with the favorite mark `favorite`
 * gives it by its number, and its doodle as read, none when it has none: a stored body encoded
 * again after the session's save, or a data version 2 body the upgrade step to data version 4
 * read. Throws for an empty app version.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_changes]]
export function rewrittenKeptBodyRecord(
  body: ParsedKeptBody,
  favorite: (phraseNumber: number) => boolean,
  appVersion: string,
): KeptSessionBodyRecord {
  assertKeptAppVersion(appVersion)
  return {
    dataVersion: KEPT_SESSION_BODY_DATA_VERSION,
    appVersion,
    phrases: rewrittenPhrases(body.phrases, favorite),
    ...doodleEntry(body.doodle),
  }
}

/**
 * Intent: phrases read back, encoded as v3.1's body at data version 2 by `appVersion`, each copied
 * by name with the favorite mark `favorite` gives it, and no doodle: the body the upgrade step to
 * data version 2 writes for a data version 1 body it read, which the step to data version 4 then
 * carries on. Throws for an empty app version.
 */
// @spec-link [[module_kept_session_upgrade_step]]
export function rewrittenKeptBodyRecordV2(
  phrases: readonly ParsedKeptPhrase[],
  favorite: (phraseNumber: number) => boolean,
  appVersion: string,
): KeptSessionBodyRecord {
  assertKeptAppVersion(appVersion)
  return {
    dataVersion: BODY_V2_DATA_VERSION,
    appVersion,
    phrases: rewrittenPhrases(phrases, favorite),
  }
}

/** Intent: a stored repeat mark: `repeatOf` present exactly on a repeat, naming an earlier phrase. */
function parseRepeatMark(
  record: Record<string, unknown>,
  phraseNumber: number,
  context: string,
): Pick<ParsedKeptPhrase, 'isRepeat' | 'repeatOf'> {
  const isRepeat = booleanValue(record.isRepeat, `${context}.isRepeat`)
  if (Object.hasOwn(record, 'repeatOf') !== isRepeat)
    throw new KeptRecordError(`${context}.repeatOf must be present exactly on a repeat.`)
  if (!isRepeat) return { isRepeat }
  return {
    isRepeat,
    repeatOf: integerIn(record.repeatOf, 1, phraseNumber - 1, `${context}.repeatOf`),
  }
}

/**
 * The origin of a carry-in, for the request-intent agreement: none at all, from the phrase before,
 * or from no phrase (the doodle's join into a Jam's phrase 1).
 */
type CarryInOrigin = 'absent' | 'phrase' | 'none'

/** Intent: the origin of a carry-in a request or an intent holds, or `absent`. */
function carryInOrigin(carryIn: CarryIn | undefined): CarryInOrigin {
  if (carryIn === undefined) return 'absent'
  return isPhraseCarryIn(carryIn) ? 'phrase' : 'none'
}

/**
 * Intent: refuse a stored request and intent that disagree on the request id or the seed, on
 * whether they hold a rhythm lock group, on whether they hold a steering block, or on the origin of
 * their carry-in. Presence only, never the groups' values: the request is the intent resolved,
 * kept for display, and the phrase replays from its intent.
 */
// @spec-link [[module_kept_session_codec]]
function assertRequestMatchesIntent(
  request: GenerationRequest,
  intent: GenerationIntent,
  context: string,
): void {
  if (request.requestId !== intent.requestId || request.seed !== intent.seed)
    throw new KeptRecordError(`${context} request and intent disagree on the request id or seed.`)
  if ((request.rhythmLock === undefined) !== (intent.rhythmLock === undefined))
    throw new KeptRecordError(`${context} request and intent disagree on the rhythm lock group.`)
  if ((request.steering === undefined) !== (intent.steering === undefined))
    throw new KeptRecordError(`${context} request and intent disagree on the steering block.`)
  if (carryInOrigin(request.carryIn) !== carryInOrigin(intent.carryIn))
    throw new KeptRecordError(`${context} request and intent disagree on the carry-in's origin.`)
}

/**
 * Intent: a stored request as v3.1's reader read it: through the generation request's parser, a
 * rhythm lock group or a steering block refused.
 */
function parseRequestV2(value: unknown, context: string): GenerationRequest {
  const request = parseGenerationRequest(value)
  if (request.rhythmLock !== undefined || request.steering !== undefined)
    throw new KeptRecordError(`${context}.request holds a group v3.1's request never held.`)
  return request
}

/** How one data version's phrases read their stored request and intent. */
interface PhraseReaders {
  readonly request: (value: unknown, context: string) => GenerationRequest
  readonly intent: (input: unknown) => GenerationIntent
}

/** Data version 4's phrases: the request and the intent as the codec reads them now. */
const PHRASE_V4: PhraseReaders = { request: parseGenerationRequest, intent: parseKeptIntent }

/** Data version 2's phrases, v3.1's: neither group in the request nor in the intent. */
const PHRASE_V2: PhraseReaders = { request: parseRequestV2, intent: parseKeptIntentV2 }

/** Data version 1's phrases: the request as v3.1's reader read it, the intent in any v1 shape. */
const PHRASE_V1: PhraseReaders = { request: parseRequestV2, intent: parseKeptIntentV1 }

/**
 * Intent: one stored phrase read back through the domain's parsers, its request and intent
 * through `readers`, agreeing, a carry-in from no phrase only on phrase 1; or a refusal.
 */
function parsePhrase(value: unknown, context: string, readers: PhraseReaders): ParsedKeptPhrase {
  const record = exactRecord(value, KEPT_PHRASE_KEYS, context, ['repeatOf'])
  const phraseNumber = integerIn(
    record.phraseNumber,
    1,
    Number.MAX_SAFE_INTEGER,
    `${context}.phraseNumber`,
  )
  const request = readers.request(record.request, context)
  const intent = readers.intent(record.intent)
  assertRequestMatchesIntent(request, intent, context)
  if (carryInOrigin(intent.carryIn) === 'none' && phraseNumber !== 1)
    throw new KeptRecordError(
      `${context} holds a carry-in from no phrase on a phrase other than 1.`,
    )
  const { clef } = record
  if (!isInstrumentClef(clef)) throw new KeptRecordError(`${context}.clef is unknown.`)
  return {
    phraseNumber,
    startedAt: finiteAtLeast(record.startsAt, 0, `${context}.startsAt`),
    request,
    timeline: parseConcertEventTimeline(record.timeline),
    harmony: parseKeptHarmony(record.harmony),
    intent,
    tempo: positiveFinite(record.tempo, `${context}.tempo`),
    ...parseRepeatMark(record, phraseNumber, context),
    favorite: booleanValue(record.favorite, `${context}.favorite`),
    clef,
  }
}

/** Intent: refuse phrases whose numbers or starts do not strictly increase from phrase 1 at 0. */
function assertSoundingOrder(phrases: readonly ParsedKeptPhrase[]): void {
  if (phrases[0]!.startedAt !== 0)
    throw new KeptRecordError('Kept session body: the first phrase must start at 0.')
  phrases.forEach((phrase, index) => {
    const previous = phrases[index - 1]
    if (previous === undefined) return
    if (phrase.phraseNumber <= previous.phraseNumber || phrase.startedAt <= previous.startedAt)
      throw new KeptRecordError(`Kept session body: phrase ${index + 1} is out of sounding order.`)
  })
}

/** Intent: a stored body's phrases, read through `readers`, in sounding order, or a refusal. */
function parsePhrases(
  record: Record<string, unknown>,
  readers: PhraseReaders,
): readonly ParsedKeptPhrase[] {
  const phrases = nonEmptyArray(record.phrases, 'Kept session body.phrases').map((phrase, index) =>
    parsePhrase(phrase, `Kept session body.phrases[${index}]`, readers),
  )
  assertSoundingOrder(phrases)
  return phrases
}

/**
 * Intent: a stored doodle entry: exactly the quantized doodle, read through the doodle's own
 * parser, and its capture tempo, a finite number above 0.
 */
function parseKeptDoodle(value: unknown): KeptDoodle {
  const context = 'Kept session body.doodle'
  const record = exactRecord(value, KEPT_DOODLE_KEYS, context)
  return {
    quantized: parseQuantizedDoodle(record.quantized),
    captureTempo: positiveFinite(record.captureTempo, `${context}.captureTempo`),
  }
}

/**
 * Intent: read a current (data version 4) body back into its phrases, in sounding order, and its
 * doodle: exactly its keys (the doodle only for a Jam session), at least one phrase, each through
 * the domain's parsers (request, timeline, harmony, intent with its figure levels, its profile
 * from its data and its rhythm lock group, steering block and carry-in when it holds them) with
 * its request and intent agreeing, a carry-in from no phrase only on phrase 1, numbers and starts
 * strictly increasing from the first phrase at 0, and the doodle through the doodle's own parser.
 * Returns a fresh deep-frozen body, its doodle null when it holds none; throws a refusal for
 * anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function parseKeptSessionBody(value: unknown): ParsedKeptBody {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body', ['doodle'])
  const phrases = parsePhrases(record, PHRASE_V4)
  const doodle = Object.hasOwn(record, 'doodle') ? parseKeptDoodle(record.doodle) : null
  return deepFreeze({ phrases, doodle })
}

/**
 * Intent: read a data version 2 body, v3.1's, back into its phrases, as the upgrade step to data
 * version 4 reads it: exactly v3.1's keys (no doodle), each phrase read as `parseKeptSessionBody`
 * reads it but with v3.1's intent, its carry-in only from a phrase, and a stored request holding a
 * rhythm lock group or a steering block refused, as v3.1's reader refused it. Returns a fresh
 * deep-frozen list; throws a refusal for anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_jam_upgrade_step]]
// @spec-link [[rule_earlier_sessions_open_without_doodle]]
// @spec-link [[module_kept_session_codec]]
export function parseKeptSessionBodyV2(value: unknown): readonly ParsedKeptPhrase[] {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body')
  return deepFreeze(parsePhrases(record, PHRASE_V2))
}

/**
 * Intent: read a data version 1 body back into its phrases, as the upgrade step to data version 2
 * reads it: the same reading as `parseKeptSessionBodyV2`, each phrase's intent in any of data
 * version 1's three shapes. Returns a fresh deep-frozen list; throws a refusal for anything
 * invalid, never repairing it.
 */
// @spec-link [[module_kept_session_upgrade_step]]
export function parseKeptSessionBodyV1(value: unknown): readonly ParsedKeptPhrase[] {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body')
  return deepFreeze(parsePhrases(record, PHRASE_V1))
}
