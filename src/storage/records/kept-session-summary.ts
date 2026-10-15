/**
 * The session-wide record of a kept session, stored in the sessionSummaries store: the session's
 * own facts and what one row of the session list shows, with the record envelope's two versions.
 * It is written field by field from the facts handed in, and read back only when its envelope is
 * current and every field is valid: a newer record is left unread, any other is unreadable. It
 * holds the session seed and nothing derived from it, and no time on the audio clock. Pure: no
 * storage access, no clock, no seed draw.
 */

import type { ProfileSelection } from '@/domain/controls/profile-selection'
import { deepFreeze } from '@/domain/events/deep-freeze'
import {
  isBuiltInInstrumentProfileId,
  MY_INSTRUMENT_ID,
  type InstrumentProfileId,
} from '@/domain/profile/instrument-profiles'
import { makeSeed, type Seed } from '@/domain/random/seed'

import type { RecordVersions } from '../record-envelope'
import { parseKeptProfileSelection } from './kept-phrase-parsers'
import {
  assertKeptAppVersion,
  KEPT_SESSION_DATA_VERSION,
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
 * A kept session's own facts, as the session list and the review read them: its wall-clock start
 * (epoch milliseconds), its length in seconds from phrase 1's scheduled start to the end of its
 * last phrase, its phrase count, the musical profile selected at Start, its instrument, its
 * starting tempo and the tempo it reached, whether it is pinned, its favorites count, its comment,
 * whether its played notes are kept, the app version that recorded it and its session seed.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptSessionSummary {
  readonly startedAt: number
  readonly lengthSeconds: number
  readonly phraseCount: number
  readonly musicalProfile: ProfileSelection
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

/** The stored session-wide record: the envelope's two versions, then the session's facts. */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionSummaryRecord extends RecordVersions, KeptSessionSummary {}

/** The session-wide record's facts the encoder computes; the recording app version is its own. */
export type KeptSessionSummaryFacts = Omit<KeptSessionSummary, 'recordedByAppVersion'>

/**
 * Every key the session-wide record holds, and no other: the allowlist the record is written and
 * read against. No acknowledgement, provenance, diagnostics or seed derived from the session seed.
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
  'musicalProfile',
  'instrument',
  'startingTempo',
  'tempoReached',
  'pinned',
  'favoritesCount',
  'comment',
  'playedNotesKept',
  'recordedByAppVersion',
  'sessionSeed',
] as const)

/** Intent: refuse, as a caller defect, a comment longer than a session comment may be. */
function assertCommentLength(comment: string): void {
  if (comment.length > KEPT_SESSION_COMMENT_MAX_LENGTH)
    throw new Error(
      `kept session record: a comment holds at most ${KEPT_SESSION_COMMENT_MAX_LENGTH} characters, got ${comment.length}`,
    )
}

/**
 * Intent: the session-wide record of the given facts, written at data version 1 by the app version
 * given, which is also recorded as the version that recorded the session. Every field is copied by
 * name onto a fresh record. Throws on an empty app version or a comment over 500 characters.
 */
// @spec-link [[module_kept_session_codec]]
export function keptSessionSummaryRecord(
  facts: KeptSessionSummaryFacts,
  appVersion: string,
): KeptSessionSummaryRecord {
  return summaryRecord(facts, appVersion, appVersion)
}

/**
 * Intent: the session-wide record of the given facts, recorded by `recordedBy` and written by
 * `appVersion` at data version 1, every field copied by name onto a fresh record. Throws on an
 * empty app version or a comment over 500 characters.
 */
function summaryRecord(
  facts: KeptSessionSummaryFacts,
  recordedBy: string,
  appVersion: string,
): KeptSessionSummaryRecord {
  assertKeptAppVersion(appVersion)
  assertCommentLength(facts.comment)
  return {
    dataVersion: KEPT_SESSION_DATA_VERSION,
    appVersion,
    startedAt: facts.startedAt,
    lengthSeconds: facts.lengthSeconds,
    phraseCount: facts.phraseCount,
    musicalProfile: {
      musicalProfile: facts.musicalProfile.musicalProfile,
      isCustom: facts.musicalProfile.isCustom,
    },
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
  const { recordedByAppVersion, ...facts } = reading.value
  return summaryRecord({ ...facts, ...edit }, recordedByAppVersion, appVersion)
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
 * Intent: read a current session-wide record's facts, with exactly its allowlisted keys and each
 * field valid; the envelope's versions are not part of the facts. Returns a fresh deep-frozen
 * value; throws a refusal for anything invalid, never repairing it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptSessionSummary(value: unknown): KeptSessionSummary {
  const record = exactRecord(value, KEPT_SESSION_SUMMARY_KEYS, 'Kept session')
  const phraseCount = integerIn(
    record.phraseCount,
    1,
    Number.MAX_SAFE_INTEGER,
    'Kept session.phraseCount',
  )
  return deepFreeze({
    startedAt: finiteAtLeast(record.startedAt, 0, 'Kept session.startedAt'),
    lengthSeconds: positiveFinite(record.lengthSeconds, 'Kept session.lengthSeconds'),
    phraseCount,
    musicalProfile: parseKeptProfileSelection(record.musicalProfile, 'Kept session.musicalProfile'),
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
  })
}

/**
 * Intent: a stored session-wide record as the session list reads it: its facts when current and
 * valid, `newer` when a newer app wrote it (left unread), `unreadable` otherwise.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function decodeKeptSessionSummary(value: unknown): KeptReading<KeptSessionSummary> {
  return readKept([value], () => parseKeptSessionSummary(value))
}
