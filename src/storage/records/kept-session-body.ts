/**
 * The body of a kept session, stored in the sessionBodies store: for each phrase that sounded, in
 * sounding order, its number, its start in seconds from phrase 1's scheduled start, the request and
 * the generated concert timeline as shown, the harmony its chord symbols come from, its generation
 * intent with the instrument profile as data, its tempo, its repeat mark, its favorite mark and the
 * clef the history recorded it in, with the record envelope's two versions. Every field is copied
 * by name, so the acknowledgements, the rhythm and tension provenance and the diagnostics the
 * history holds never reach it. Read back through the domain's own parsers, never rebuilding a
 * profile from its id. Pure: no storage access.
 */

import { deepFreeze } from '@/domain/events/deep-freeze'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { parseConcertEventTimeline } from '@/domain/events/timeline-parser'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import {
  parseGenerationRequest,
  type GenerationRequest,
} from '@/domain/generation/generation-request'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { isInstrumentClef, type InstrumentClef } from '@/domain/profile/instrument-clef'
import type { SessionHistoryRecord } from '@/session/session-history'

import type { RecordVersions } from '../record-envelope'
import { parseKeptHarmony, parseKeptIntent } from './kept-phrase-parsers'
import { assertKeptAppVersion, KEPT_SESSION_DATA_VERSION } from './kept-reading'
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

/** The stored body: the envelope's two versions and the phrases in sounding order. */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionBodyRecord extends RecordVersions {
  readonly phrases: readonly KeptPhraseRecord[]
}

/** Every key the body holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_SESSION_BODY_KEYS = Object.freeze([
  'dataVersion',
  'appVersion',
  'phrases',
] as const)

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

/**
 * Intent: the body of a session's recorded phrases, each marked a favorite when its number is in
 * `favorites`, with every start rebased to seconds from phrase 1's scheduled start. Throws for an
 * empty app version.
 */
// @spec-link [[module_kept_session_codec]]
export function keptSessionBodyRecord(
  records: readonly SessionHistoryRecord[],
  favorites: ReadonlySet<number>,
  appVersion: string,
): KeptSessionBodyRecord {
  assertKeptAppVersion(appVersion)
  const origin = records[0]!.startedAt
  return {
    dataVersion: KEPT_SESSION_DATA_VERSION,
    appVersion,
    phrases: records.map((record) =>
      keptPhraseRecord(record, origin, favorites.has(record.phraseNumber)),
    ),
  }
}

/**
 * Intent: the body of phrases read back from a stored body, each copied by name as it was read
 * (its start as `startsAt`), with the favorite mark `favorite` gives it by its number, written by
 * `appVersion` at data version 1: a stored body encoded again after the session's save. Throws for
 * an empty app version.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_changes]]
export function rewrittenKeptBodyRecord(
  phrases: readonly ParsedKeptPhrase[],
  favorite: (phraseNumber: number) => boolean,
  appVersion: string,
): KeptSessionBodyRecord {
  assertKeptAppVersion(appVersion)
  return {
    dataVersion: KEPT_SESSION_DATA_VERSION,
    appVersion,
    phrases: phrases.map((phrase) => ({
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
    })),
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

/** Intent: refuse a stored request and intent that disagree on the request id or the seed. */
function assertRequestMatchesIntent(
  request: GenerationRequest,
  intent: GenerationIntent,
  context: string,
): void {
  if (request.requestId !== intent.requestId || request.seed !== intent.seed)
    throw new KeptRecordError(`${context} request and intent disagree on the request id or seed.`)
}

/** Intent: one stored phrase read back through the domain's parsers, or a refusal. */
function parsePhrase(value: unknown, context: string): ParsedKeptPhrase {
  const record = exactRecord(value, KEPT_PHRASE_KEYS, context, ['repeatOf'])
  const phraseNumber = integerIn(
    record.phraseNumber,
    1,
    Number.MAX_SAFE_INTEGER,
    `${context}.phraseNumber`,
  )
  const request = parseGenerationRequest(record.request)
  const intent = parseKeptIntent(record.intent)
  assertRequestMatchesIntent(request, intent, context)
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

/**
 * Intent: read a current body back into its phrases, in sounding order: exactly its keys, at least
 * one phrase, each through the domain's parsers (request, timeline, harmony, intent with its
 * profile from its data) with its request and intent agreeing, and numbers and starts strictly
 * increasing from the first phrase at 0. Returns a fresh deep-frozen list; throws a refusal for
 * anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptSessionBody(value: unknown): readonly ParsedKeptPhrase[] {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body')
  const phrases = nonEmptyArray(record.phrases, 'Kept session body.phrases').map((phrase, index) =>
    parsePhrase(phrase, `Kept session body.phrases[${index}]`),
  )
  assertSoundingOrder(phrases)
  return deepFreeze(phrases)
}
