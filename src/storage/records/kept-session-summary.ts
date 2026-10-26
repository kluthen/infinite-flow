/**
 * The session-wide record of a kept session, stored in the sessionSummaries store: the session's
 * own facts and what one row of the session list shows, whether it is a Jam session and, for a
 * Jam only, whether its key and mode suggestion was declined, with the record envelope's two
 * versions. It is written field by field from the facts handed in, and read back only when its
 * envelope is current and every field is valid: a newer record is left unread, any other is
 * unreadable. It holds the session seed and nothing derived from it, and no time on the audio
 * clock. The data version 1 and 2 readers and the data version 2 writer serve only the upgrade
 * steps that carry those records over. Pure: no storage access, no clock, no seed draw.
 */

import { presetLabel } from '@/domain/controls/preset-label'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  isBuiltInInstrumentProfileId,
  MY_INSTRUMENT_ID,
  type InstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import { makeSeed, type Seed } from '@/domain/random/seed'

import type { RecordVersions } from '../record-envelope'
import { isKeptPhraseRefusal, parseKeptProfileSelection } from './kept-phrase-parsers'
import {
  assertKeptAppVersion,
  KEPT_SESSION_SUMMARY_DATA_VERSION,
  readKept,
  type KeptReading,
} from './kept-reading'
import {
  booleanValue,
  exactRecord,
  finiteAtLeast,
  integerIn,
  KeptRecordError,
  nonEmptyString,
  positiveFinite,
} from './kept-record-shape'

/** The most characters (UTF-16 code units, as a text field counts them) a session comment holds. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_SESSION_COMMENT_MAX_LENGTH = 500

/** The instrument a kept session was played with: its id and its display name as shown then. */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionInstrument {
  readonly id: InstrumentProfileId
  readonly displayName: string
}

/**
 * A kept session's own facts as v3.1 kept them, as the session list and the review read them: its
 * wall-clock start (epoch milliseconds), its length in seconds from phrase 1's scheduled start to
 * the end of its last phrase, its phrase count, the preset label recorded at Start, its
 * instrument, its starting tempo and the tempo it reached, whether it is pinned, its favorites
 * count, its comment, whether its played notes are kept, the app version that recorded it and its
 * session seed. The data version 1 and 2 readers read these, which the upgrade steps carry over.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[module_kept_session_jam_upgrade_step]]
export interface KeptSessionSummaryV2 {
  readonly startedAt: number
  readonly lengthSeconds: number
  readonly phraseCount: number
  /**
   * The preset label recorded at the session's start, in the kept-session form ("Neutral",
   * "Jazz", "Custom, based on Neutral", "Custom, based on Jazz"): a snapshot nothing later changes.
   */
  readonly presetLabel: string
  readonly instrument: KeptSessionInstrument
  readonly startingTempo: number
  readonly tempoReached: number
  readonly pinned: boolean
  readonly favoritesCount: number
  readonly comment: string
  readonly playedNotesKept: boolean
  readonly recordedByAppVersion: string
  readonly sessionSeed: Seed
}

/**
 * A kept session's own facts: v3.1's (see `KeptSessionSummaryV2`), whether it is a Jam session
 * and, present exactly on a Jam session, whether the player declined its key and mode suggestion.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptSessionSummary extends KeptSessionSummaryV2 {
  readonly isJam: boolean
  readonly suggestionDeclined?: boolean
}

/** The stored session-wide record: the envelope's two versions, then the session's facts. */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionSummaryRecord extends RecordVersions, KeptSessionSummary {}

/** The session-wide record's facts the encoder computes; the recording app version is its own. */
export type KeptSessionSummaryFacts = Omit<KeptSessionSummary, 'recordedByAppVersion'>

/**
 * Every key the session-wide record always holds (`suggestionDeclined` too, on a Jam session
 * only), and no other: the allowlist the record is written and read against. No acknowledgement,
 * provenance, diagnostics or seed derived from the session seed.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
// @spec-link [[rule_kept_session_holds_no_acknowledgements]]
export const KEPT_SESSION_SUMMARY_KEYS = Object.freeze([
  'dataVersion',
  'appVersion',
  'startedAt',
  'lengthSeconds',
  'phraseCount',
  'presetLabel',
  'instrument',
  'startingTempo',
  'tempoReached',
  'pinned',
  'favoritesCount',
  'comment',
  'playedNotesKept',
  'recordedByAppVersion',
  'sessionSeed',
  'isJam',
] as const)

/** The data version of v3.1's session-wide record shape, which only the upgrade steps write. */
const SUMMARY_V2_DATA_VERSION = 2

/** Every key a data version 2 session-wide record, v3.1's, holds: no Jam mark. */
const KEPT_SESSION_SUMMARY_V2_KEYS: readonly string[] = Object.freeze(
  KEPT_SESSION_SUMMARY_KEYS.filter((key) => key !== 'isJam'),
)

/** Intent: refuse, as a caller defect, a comment longer than a session comment may be. */
function assertCommentLength(comment: string): void {
  if (comment.length > KEPT_SESSION_COMMENT_MAX_LENGTH)
    throw new Error(
      `kept session record: a comment holds at most ${KEPT_SESSION_COMMENT_MAX_LENGTH} characters, got ${comment.length}`,
    )
}

/**
 * Intent: the session-wide record of the given facts, written at the record's data version (4) by
 * the app version given, which is also recorded as the version that recorded the session. Every
 * field is copied by name onto a fresh record. Throws on an empty app version, a comment over 500
 * characters, or a declined suggestion given for a session that is no Jam or missing on a Jam.
 */
// @spec-link [[module_kept_session_codec]]
export function keptSessionSummaryRecord(
  facts: KeptSessionSummaryFacts,
  appVersion: string,
): KeptSessionSummaryRecord {
  return summaryRecord(facts, appVersion, appVersion)
}

/**
 * Intent: v3.1's fields of a session-wide record of the given facts, recorded by `recordedBy` and
 * written by `appVersion` at `dataVersion`, every field copied by name onto a fresh record. Throws
 * on an empty app version or a comment over 500 characters.
 */
function v2Fields(
  facts: Omit<KeptSessionSummaryV2, 'recordedByAppVersion'>,
  recordedBy: string,
  appVersion: string,
  dataVersion: number,
): RecordVersions & KeptSessionSummaryV2 {
  assertKeptAppVersion(appVersion)
  assertCommentLength(facts.comment)
  return {
    dataVersion,
    appVersion,
    startedAt: facts.startedAt,
    lengthSeconds: facts.lengthSeconds,
    phraseCount: facts.phraseCount,
    presetLabel: facts.presetLabel,
    instrument: { id: facts.instrument.id, displayName: facts.instrument.displayName },
    startingTempo: facts.startingTempo,
    tempoReached: facts.tempoReached,
    pinned: facts.pinned,
    favoritesCount: facts.favoritesCount,
    comment: facts.comment,
    playedNotesKept: facts.playedNotesKept,
    recordedByAppVersion: recordedBy,
    sessionSeed: facts.sessionSeed,
  }
}

/**
 * Intent: the session-wide record of the given facts, recorded by `recordedBy` and written by
 * `appVersion` at the session-wide record's data version (4), every field copied by name onto a
 * fresh record, the declined suggestion on a Jam only. Throws on an empty app version, a comment
 * over 500 characters, or a declined suggestion given for a session that is no Jam or missing on
 * a Jam.
 */
function summaryRecord(
  facts: KeptSessionSummaryFacts,
  recordedBy: string,
  appVersion: string,
): KeptSessionSummaryRecord {
  if ((facts.suggestionDeclined !== undefined) !== facts.isJam)
    throw new Error('kept session record: a declined suggestion is given exactly for a Jam session')
  return {
    ...v2Fields(facts, recordedBy, appVersion, KEPT_SESSION_SUMMARY_DATA_VERSION),
    isJam: facts.isJam,
    ...(facts.suggestionDeclined === undefined
      ? {}
      : { suggestionDeclined: facts.suggestionDeclined }),
  }
}

/**
 * Intent: the session-wide record of a read summary at the record's data version (4), written by
 * `appVersion`, the app version that recorded the session, the Jam mark and the declined
 * suggestion kept as read: a stored record encoded again after the session's save, or a data
 * version 2 record the upgrade step to data version 4 read. Throws on an empty app version, a
 * comment over 500 characters, or a declined suggestion on a session that is no Jam or missing on
 * a Jam.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_jam_upgrade_step]]
export function rewrittenKeptSummaryRecord(
  summary: KeptSessionSummary,
  appVersion: string,
): KeptSessionSummaryRecord {
  const { recordedByAppVersion, ...facts } = summary
  return summaryRecord(facts, recordedByAppVersion, appVersion)
}

/**
 * Intent: a read v3.1 summary encoded as v3.1's session-wide record at data version 2 by
 * `appVersion`, the app version that recorded the session kept as read, with no Jam mark: the
 * record the upgrade step to data version 2 writes for a data version 1 record it read, which the
 * step to data version 4 then carries on. Throws on an empty app version or a comment over 500
 * characters.
 */
// @spec-link [[module_kept_session_upgrade_step]]
export function rewrittenKeptSummaryRecordV2(
  summary: KeptSessionSummaryV2,
  appVersion: string,
): RecordVersions & KeptSessionSummaryV2 {
  const { recordedByAppVersion, ...facts } = summary
  return v2Fields(facts, recordedByAppVersion, appVersion, SUMMARY_V2_DATA_VERSION)
}

/**
 * The session's own facts a change after its save may change: whether it is pinned, its
 * favorites count, its comment and whether its played notes are kept.
 */
// @spec-link [[module_kept_session_changes]]
export type KeptSummaryEdit = Partial<
  Pick<KeptSessionSummary, 'pinned' | 'favoritesCount' | 'comment' | 'playedNotesKept'>
>

/**
 * Intent: a stored session-wide record encoded again after the session's save, with only the
 * player's change applied to what is stored, so a fact another tab changed since the load stays;
 * the app version that recorded the session stays, the record is written by `appVersion`. Nothing
 * when no record is stored, or it cannot be read, or a newer app wrote it. Throws on an empty app
 * version or a comment over 500 characters.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[entity_kept_session_record]]
export function rewriteKeptSummary(
  stored: unknown,
  edit: KeptSummaryEdit,
  appVersion: string,
): KeptSessionSummaryRecord | null {
  if (stored === undefined) return null
  const reading = decodeKeptSessionSummary(stored)
  if (reading.reading !== 'current') return null
  return rewrittenKeptSummaryRecord({ ...reading.value, ...edit }, appVersion)
}

/** Intent: a stored instrument: exactly a known instrument id and a non-empty display name. */
function parseInstrument(value: unknown): KeptSessionInstrument {
  const record = exactRecord(value, ['id', 'displayName'], 'Kept session.instrument')
  const { id } = record
  if (!isBuiltInInstrumentProfileId(id) && id !== MY_INSTRUMENT_ID)
    throw new KeptRecordError(`Kept session.instrument.id is unknown: ${JSON.stringify(id)}.`)
  return {
    id,
    displayName: nonEmptyString(record.displayName, 'Kept session.instrument.displayName'),
  }
}

/** Intent: a stored comment: a string of at most 500 characters, empty until one is written. */
function parseComment(value: unknown): string {
  if (typeof value !== 'string' || value.length > KEPT_SESSION_COMMENT_MAX_LENGTH)
    throw new KeptRecordError(
      `Kept session.comment must be a string of at most ${KEPT_SESSION_COMMENT_MAX_LENGTH} characters.`,
    )
  return value
}

/** Intent: the stored session seed, a number the domain's seed maker accepts. */
function parseSessionSeed(value: unknown): Seed {
  if (typeof value !== 'number')
    throw new KeptRecordError('Kept session.sessionSeed must be a number.')
  return makeSeed(value)
}

/**
 * Every key a data version 1 session-wide record holds: the musical profile selection where data
 * version 2 holds the preset label.
 */
const KEPT_SESSION_SUMMARY_V1_KEYS: readonly string[] = Object.freeze(
  KEPT_SESSION_SUMMARY_V2_KEYS.map((key) => (key === 'presetLabel' ? 'musicalProfile' : key)),
)

/**
 * Intent: a stored session-wide record's v3.1 facts, the record's keys already checked, each field
 * valid, with the preset label read by the caller. Returns a fresh value; throws a refusal for
 * anything invalid, never repairing it.
 */
function summaryFacts(record: Record<string, unknown>, label: string): KeptSessionSummaryV2 {
  const phraseCount = integerIn(
    record.phraseCount,
    1,
    Number.MAX_SAFE_INTEGER,
    'Kept session.phraseCount',
  )
  return {
    startedAt: finiteAtLeast(record.startedAt, 0, 'Kept session.startedAt'),
    lengthSeconds: positiveFinite(record.lengthSeconds, 'Kept session.lengthSeconds'),
    phraseCount,
    presetLabel: label,
    instrument: parseInstrument(record.instrument),
    startingTempo: positiveFinite(record.startingTempo, 'Kept session.startingTempo'),
    tempoReached: positiveFinite(record.tempoReached, 'Kept session.tempoReached'),
    pinned: booleanValue(record.pinned, 'Kept session.pinned'),
    favoritesCount: integerIn(record.favoritesCount, 0, phraseCount, 'Kept session.favoritesCount'),
    comment: parseComment(record.comment),
    playedNotesKept: booleanValue(record.playedNotesKept, 'Kept session.playedNotesKept'),
    recordedByAppVersion: nonEmptyString(
      record.recordedByAppVersion,
      'Kept session.recordedByAppVersion',
    ),
    sessionSeed: parseSessionSeed(record.sessionSeed),
  }
}

/**
 * Intent: a stored Jam mark: a boolean, with `suggestionDeclined`, a boolean, present exactly on a
 * Jam session.
 */
function parseJamMark(
  record: Record<string, unknown>,
): Pick<KeptSessionSummary, 'isJam' | 'suggestionDeclined'> {
  const isJam = booleanValue(record.isJam, 'Kept session.isJam')
  if (Object.hasOwn(record, 'suggestionDeclined') !== isJam)
    throw new KeptRecordError(
      'Kept session.suggestionDeclined must be present exactly on a Jam session.',
    )
  if (!isJam) return { isJam }
  return {
    isJam,
    suggestionDeclined: booleanValue(record.suggestionDeclined, 'Kept session.suggestionDeclined'),
  }
}

/**
 * Intent: read a current (data version 4) session-wide record's facts, with exactly its
 * allowlisted keys (the declined suggestion on a Jam session only) and each field valid; the
 * envelope's versions are not part of the facts. Returns a fresh deep-frozen value; throws a
 * refusal for anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[entity_kept_session_record]]
export function parseKeptSessionSummary(value: unknown): KeptSessionSummary {
  const record = exactRecord(value, KEPT_SESSION_SUMMARY_KEYS, 'Kept session', [
    'suggestionDeclined',
  ])
  const facts = summaryFacts(record, nonEmptyString(record.presetLabel, 'Kept session.presetLabel'))
  return deepFreeze({ ...facts, ...parseJamMark(record) })
}

/**
 * Intent: read a data version 2 session-wide record's facts, v3.1's, as the upgrade step to data
 * version 4 reads it: exactly v3.1's keys (no Jam mark), every field as `parseKeptSessionSummary`
 * reads it. Returns a fresh deep-frozen value; throws a refusal for anything invalid, never
 * repairing it.
 */
// @spec-link [[module_kept_session_jam_upgrade_step]]
export function parseKeptSessionSummaryV2(value: unknown): KeptSessionSummaryV2 {
  const record = exactRecord(value, KEPT_SESSION_SUMMARY_V2_KEYS, 'Kept session')
  return deepFreeze(
    summaryFacts(record, nonEmptyString(record.presetLabel, 'Kept session.presetLabel')),
  )
}

/**
 * Intent: read a data version 1 session-wide record's facts, as the upgrade step to data version
 * 2 reads it: exactly that version's keys, every field as `parseKeptSessionSummaryV2` reads it, and
 * its musical profile selection (a known profile and a boolean) recorded as the preset label it
 * names. Returns a fresh deep-frozen value; throws a refusal for anything invalid, never
 * repairing it.
 */
// @spec-link [[module_kept_session_upgrade_step]]
// @spec-link [[rule_preset_label_kept_with_session]]
export function parseKeptSessionSummaryV1(value: unknown): KeptSessionSummaryV2 {
  const record = exactRecord(value, KEPT_SESSION_SUMMARY_V1_KEYS, 'Kept session')
  const selection = parseKeptProfileSelection(record.musicalProfile, 'Kept session.musicalProfile')
  return deepFreeze(summaryFacts(record, presetLabel(selection)))
}

/**
 * Intent: a stored session-wide record as the session list reads it: its facts when current and
 * valid, `newer` when a newer app wrote it (left unread), `unreadable` otherwise.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function decodeKeptSessionSummary(value: unknown): KeptReading<KeptSessionSummary> {
  return readKept([{ value, shapeVersion: KEPT_SESSION_SUMMARY_DATA_VERSION }], () =>
    parseKeptSessionSummary(value),
  )
}

/**
 * What this version can read of a session-wide record a newer version wrote: each fact the session
 * list shows, kept only when it reads exactly as this version writes it.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[module_kept_session_reach]]
export type NewerKeptSummaryFacts = Partial<
  Pick<
    KeptSessionSummary,
    | 'startedAt'
    | 'lengthSeconds'
    | 'phraseCount'
    | 'presetLabel'
    | 'instrument'
    | 'pinned'
    | 'favoritesCount'
    | 'comment'
    | 'playedNotesKept'
  >
>

/** The readers of each fact a newer record's row may show, by the field that holds it. */
const NEWER_FACT_READERS: {
  readonly [K in keyof NewerKeptSummaryFacts]-?: (value: unknown) => NewerKeptSummaryFacts[K]
} = {
  startedAt: (value) => finiteAtLeast(value, 0, 'Kept session.startedAt'),
  lengthSeconds: (value) => positiveFinite(value, 'Kept session.lengthSeconds'),
  phraseCount: (value) => integerIn(value, 1, Number.MAX_SAFE_INTEGER, 'Kept session.phraseCount'),
  presetLabel: (value) => nonEmptyString(value, 'Kept session.presetLabel'),
  instrument: parseInstrument,
  pinned: (value) => booleanValue(value, 'Kept session.pinned'),
  favoritesCount: (value) =>
    integerIn(value, 0, Number.MAX_SAFE_INTEGER, 'Kept session.favoritesCount'),
  comment: parseComment,
  playedNotesKept: (value) => booleanValue(value, 'Kept session.playedNotesKept'),
}

/**
 * Intent: read what this version can of a session-wide record a newer version wrote, for its row:
 * each fact the list shows, field by field, a field this version refuses left out (this tolerant
 * read is the outdated tab's, never a repair: the record is never written back). Returns a fresh
 * deep-frozen value; a value that is not a record gives no fact.
 */
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
// @spec-link [[module_kept_session_reach]]
export function readNewerKeptSummary(value: unknown): NewerKeptSummaryFacts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return deepFreeze({})
  const record = value as Readonly<Record<string, unknown>>
  const facts: Record<string, unknown> = {}
  for (const [field, read] of Object.entries(NEWER_FACT_READERS)) {
    try {
      facts[field] = (read as (value: unknown) => unknown)(record[field])
    } catch (error) {
      if (!isKeptPhraseRefusal(error)) throw error
    }
  }
  return deepFreeze(facts as NewerKeptSummaryFacts)
}
