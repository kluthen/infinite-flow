/**
 * The reader of a current (data version 4) kept-session body: its phrases, as data version 4
 * reads them, and its Jam parts, the quantized doodle with its capture tempo and a fresh Jam's
 * played-notes clock. Only the kept-session codec reads a current body, so this reader sits apart
 * from the body's shape, writers and earlier-version readers (`kept-session-body.ts`), which the
 * upgrade steps run when the database opens and which never read a doodle. Pure: no storage
 * access.
 */

import { parseQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { parseGenerationRequest } from '@/domain/generation/generation-request'

import { parseKeptIntent } from './kept-intent-parsers'
import { exactRecord, finiteAtLeast, KeptRecordError, positiveFinite } from './kept-record-shape'
import {
  KEPT_SESSION_BODY_KEYS,
  parseKeptPhrases,
  type KeptBodyJamParts,
  type KeptDoodle,
  type KeptPlayedNotesClock,
  type ParsedKeptBody,
  type PhraseReaders,
} from './kept-session-body'

/** Every key a kept doodle holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_DOODLE_KEYS = Object.freeze(['quantized', 'captureTempo'] as const)

/** Every key a fresh Jam's played-notes clock holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_PLAYED_NOTES_CLOCK_KEYS = Object.freeze([
  'doodleFirstBarline',
  'phraseOneStart',
] as const)

/** Data version 4's phrases: the request and the intent as the codec reads them now. */
const PHRASE_V4: PhraseReaders = { request: parseGenerationRequest, intent: parseKeptIntent }

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
 * Intent: a stored played-notes clock: exactly its keys, each a finite number of at least 0,
 * phrase 1's start after the doodle's first barline.
 */
function parsePlayedNotesClock(value: unknown): KeptPlayedNotesClock {
  const context = 'Kept session body.playedNotesClock'
  const record = exactRecord(value, KEPT_PLAYED_NOTES_CLOCK_KEYS, context)
  const doodleFirstBarline = finiteAtLeast(
    record.doodleFirstBarline,
    0,
    `${context}.doodleFirstBarline`,
  )
  const phraseOneStart = finiteAtLeast(record.phraseOneStart, 0, `${context}.phraseOneStart`)
  if (phraseOneStart <= doodleFirstBarline)
    throw new KeptRecordError(`${context}: phrase 1 must start after the first barline.`)
  return { doodleFirstBarline, phraseOneStart }
}

/**
 * Intent: a stored body's Jam parts: its doodle when it holds one, and its played-notes clock when
 * it holds one, only beside a doodle; or a refusal.
 */
function parseJamParts(record: Record<string, unknown>): KeptBodyJamParts {
  const doodle = Object.hasOwn(record, 'doodle') ? parseKeptDoodle(record.doodle) : null
  if (!Object.hasOwn(record, 'playedNotesClock')) return { doodle, playedNotesClock: null }
  if (doodle === null)
    throw new KeptRecordError('Kept session body holds a played-notes clock without a doodle.')
  return { doodle, playedNotesClock: parsePlayedNotesClock(record.playedNotesClock) }
}

/**
 * Intent: read a current (data version 4) body back into its phrases, in sounding order, its
 * doodle and its played-notes clock: exactly its keys (the doodle only for a Jam session, the
 * clock only beside it), at least one phrase, each through
 * the domain's parsers (request, timeline, harmony, intent with its figure levels, its profile
 * from its data and its rhythm lock group, steering block and carry-in when it holds them) with
 * its request and intent agreeing, a carry-in from no phrase only on phrase 1, numbers and starts
 * strictly increasing from the first phrase at 0, the doodle through the doodle's own parser, and
 * the clock's two moments finite, at least 0, phrase 1's start after the first barline. Returns a
 * fresh deep-frozen body, its doodle and clock null when it holds none; throws a refusal for
 * anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function parseKeptSessionBody(value: unknown): ParsedKeptBody {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body', [
    'doodle',
    'playedNotesClock',
  ])
  const phrases = parseKeptPhrases(record, PHRASE_V4)
  return deepFreeze({ phrases, ...parseJamParts(record) })
}
