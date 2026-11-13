/**
 * The readers of a kept-session body that holds Jam parts: the current (data version 5) body and
 * v3.2's (data version 4), each read into its phrases and its Jam parts, the quantized doodle with
 * its capture tempo and a fresh Jam's played-notes clock. Both share the body's outer shape and
 * Jam parts and differ only in how a phrase is read: data version 5 reads each intent's Seventh
 * chords level and the seventh chords a harmony, a request or a carry-in may hold; data version 4
 * reads every intent at Off and every chord as a triad, a seventh refused. The kept-session codec
 * reads the current body; the data version 4 reader serves only the upgrade step to data version
 * 5. Both sit apart from the body's shape, writers and the earlier-version readers
 * (`kept-session-body.ts`), which never read a doodle. Pure: no storage access.
 */

import { parseQuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  parseGenerationRequest,
  parseGenerationRequestTakingSeventh,
} from '@/domain/generation/generation-request'

import { parseKeptIntent, parseKeptIntentV4 } from './kept-intent-parsers'
import { parseKeptHarmony } from './kept-phrase-parsers'
import { exactRecord, finiteAtLeast, KeptRecordError, positiveFinite } from './kept-record-shape'
import {
  KEPT_SESSION_BODY_KEYS,
  parseKeptPhrases,
  parseKeptTriadHarmony,
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

/**
 * Data version 5's phrases: the request with a carried chord that may hold its seventh, the
 * intent with its Seventh chords level, and a harmony whose events may hold their seventh.
 */
// @spec-link [[entity_kept_session_record]]
const PHRASE_V5: PhraseReaders = {
  request: parseGenerationRequestTakingSeventh,
  intent: parseKeptIntent,
  harmony: (input) => parseKeptHarmony(input, 'triad-or-seventh'),
}

/**
 * Data version 4's phrases, v3.2's: the request and the intent's carry-in with a triad carried,
 * the intent at Off, the harmony triads only.
 */
// @spec-link [[module_presets_and_kept_sessions_upgrade_step]]
const PHRASE_V4: PhraseReaders = {
  request: parseGenerationRequest,
  intent: parseKeptIntentV4,
  harmony: parseKeptTriadHarmony,
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
 * Intent: a body holding Jam parts read back, its phrases through `readers`: exactly its keys
 * (the doodle only for a Jam session, the clock only beside it), its phrases, and its Jam parts.
 */
function parseBodyOfShape(value: unknown, readers: PhraseReaders): ParsedKeptBody {
  const record = exactRecord(value, KEPT_SESSION_BODY_KEYS, 'Kept session body', [
    'doodle',
    'playedNotesClock',
  ])
  const phrases = parseKeptPhrases(record, readers)
  return deepFreeze({ phrases, ...parseJamParts(record) })
}

/**
 * Intent: read a current (data version 5) body back into its phrases, in sounding order, its
 * doodle and its played-notes clock: exactly its keys (the doodle only for a Jam session, the
 * clock only beside it), at least one phrase, each through the domain's parsers (request,
 * timeline, harmony with the seventh each event holds, intent with its figure levels, its Seventh
 * chords level, an absent one read as Off, its profile from its data and its rhythm lock group,
 * steering block and carry-in when it holds them, the carried chord with its seventh or not) with
 * its request and intent agreeing, a carry-in from no phrase only on phrase 1, numbers and starts
 * strictly increasing from the first phrase at 0, the doodle through the doodle's own parser, and
 * the clock's two moments finite, at least 0, phrase 1's start after the first barline. Returns a
 * fresh deep-frozen body, its doodle and clock null when it holds none; throws a refusal for
 * anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function parseKeptSessionBody(value: unknown): ParsedKeptBody {
  return parseBodyOfShape(value, PHRASE_V5)
}

/**
 * Intent: read a data version 4 body, v3.2's, back into its phrases, doodle and played-notes
 * clock, as the upgrade step to data version 5 reads it: as `parseKeptSessionBody` reads a
 * current body, but each intent with v3.2's keys (a `chordFamilies` key refused as an unknown
 * field) read at Off, and every chord a triad: a seventh in a harmony event, or a carried seventh
 * in a request's or an intent's carry-in, refused. Returns a fresh deep-frozen body; throws a
 * refusal for anything invalid, never repairing it.
 */
// @spec-link [[module_presets_and_kept_sessions_upgrade_step]]
// @spec-link [[rule_earlier_kept_sessions_read_at_off]]
export function parseKeptSessionBodyV4(value: unknown): ParsedKeptBody {
  return parseBodyOfShape(value, PHRASE_V4)
}
