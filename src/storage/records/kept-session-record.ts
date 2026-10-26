/**
 * The kept-session codec: a finished session's in-memory history, with the facts the history does
 * not hold (pinned, favorites, comment, whether its played notes are kept, and a Jam session's
 * doodle, declined suggestion and fresh Jam moments), to the up to three records a kept session
 * is stored as (the session-wide record, the body and, only when kept, the played notes), and
 * those records back to exactly what the review and the exports read. Every time is in seconds
 * from phrase 1's scheduled start, except a fresh Jam's: its played-notes clock and its played
 * notes, the raw doodle notes before phrase 1 included, are kept in seconds from its count-in's
 * first beat, and its phrases' notes are read back in seconds from phrase 1's start. No record
 * holds an acknowledgement, the rhythm or tension provenance or the diagnostics, and decoding
 * makes none up. Pure: it never opens the database, reads a clock or draws a seed; the session's
 * key is the saver's and is in no record.
 */

import { presetLabel } from '@/domain/controls/preset-label'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { Preset } from '@/domain/presets/preset-selection'
import type {
  RecordedPlayedNote,
  ReviewedPhrase,
  SessionHistory,
  SessionHistoryRecord,
} from '@/session/session-history'
import { withPlayedNotes } from '@/session/session-history-played-notes'
import { sessionLengthSeconds } from '@/session/session-timing'

import {
  keptPlayedNotesRecord,
  parseKeptPlayedNotes,
  splitAtPhraseOne,
  type KeptPlayedNotesRecord,
  type SplitPlayedNotes,
} from './kept-played-notes'
import {
  KEPT_PLAYED_NOTES_DATA_VERSION,
  KEPT_SESSION_BODY_DATA_VERSION,
  KEPT_SESSION_SUMMARY_DATA_VERSION,
  readKept,
  type KeptReading,
  type KeptStoredValue,
} from './kept-reading'
import { KeptRecordError } from './kept-record-shape'
import {
  keptSessionBodyRecord,
  parseKeptSessionBody,
  rewrittenKeptBodyRecord,
  type KeptDoodle,
  type KeptPlayedNotesClock,
  type KeptSessionBodyRecord,
  type ParsedKeptBody,
  type ParsedKeptPhrase,
} from './kept-session-body'
import {
  keptSessionSummaryRecord,
  parseKeptSessionSummary,
  type KeptSessionSummary,
  type KeptSessionSummaryRecord,
} from './kept-session-summary'

export {
  decodeKeptSessionSummary,
  rewriteKeptSummary,
  type KeptSessionSummary,
  type KeptSummaryEdit,
} from './kept-session-summary'
export {
  KEPT_PLAYED_NOTES_DATA_VERSION,
  KEPT_SESSION_BODY_DATA_VERSION,
  KEPT_SESSION_SUMMARY_DATA_VERSION,
  type KeptReading,
} from './kept-reading'
export type {
  KeptDoodle,
  KeptPlayedNotesClock,
  KeptSessionBodyRecord,
  KeptPhraseRecord,
} from './kept-session-body'
export type { KeptPlayedNotesRecord, KeptPlayedNote } from './kept-played-notes'
export type { KeptSessionSummaryRecord } from './kept-session-summary'

/**
 * A fresh Jam's moments and raw doodle notes, on the audio clock (seconds): its count-in's first
 * beat, its doodle's first barline (not before the count-in) and the notes played during the
 * count-in and the doodle, each starting from the count-in's first beat and before phrase 1.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface KeptFreshJam {
  readonly countInStartsAt: number
  readonly doodleFirstBarlineAt: number
  readonly rawDoodleNotes: readonly RecordedPlayedNote[]
}

/**
 * The facts of a Jam session its history does not hold: its quantized doodle with its capture
 * tempo, whether the player declined its key and mode suggestion, and its fresh Jam moments, null
 * for a Jam on a kept doodle.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptJamFacts {
  readonly doodle: KeptDoodle
  readonly suggestionDeclined: boolean
  readonly fresh: KeptFreshJam | null
}

/**
 * The facts of a session its history does not hold: whether it is pinned, the numbers of its
 * favorite phrases, its comment (at most 500 characters), whether its played notes are kept, the
 * presets the session knew, which its preset label names its selection from, and, for a Jam
 * session only, its Jam facts.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_preset_label_kept_with_session]]
export interface KeptSessionFacts {
  readonly pinned: boolean
  readonly favorites: readonly number[]
  readonly comment: string
  readonly playedNotesKept: boolean
  /** The presets the session knew at its end: the built-ins, then the player's. */
  readonly presets: readonly Preset[]
  /** The Jam facts of a Jam session; absent for a session that is no Jam. */
  readonly jam?: KeptJamFacts
}

/** The records a kept session is stored as; `playedNotes` is null unless they are kept. */
// @spec-link [[entity_kept_session_record]]
export interface KeptSessionRecords {
  readonly summary: KeptSessionSummaryRecord
  readonly body: KeptSessionBodyRecord
  readonly playedNotes: KeptPlayedNotesRecord | null
}

/** What the encoder reads from a finished session's history. */
export type KeptSessionHistory = Pick<
  SessionHistory,
  'phrases' | 'startedAt' | 'instrumentProfileId' | 'selection' | 'sessionSeed'
>

/**
 * One kept phrase as the review and the exports read it: a reviewed phrase (the clef it was drawn
 * in included), its start in seconds from phrase 1's start, with its repeat mark and its favorite
 * mark.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[module_kept_session_codec]]
export interface KeptPhrase extends ReviewedPhrase {
  readonly isRepeat: boolean
  readonly repeatOf?: number
  readonly favorite: boolean
}

/**
 * A decoded Jam session's Jam parts: its doodle with its capture tempo, its played-notes clock
 * (null for a Jam on a kept doodle), and its raw doodle notes in seconds from the count-in's first
 * beat, as stored (none without a clock or when the played notes are not kept).
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface KeptJam {
  readonly doodle: KeptDoodle
  readonly playedNotesClock: KeptPlayedNotesClock | null
  readonly rawDoodleNotes: readonly RecordedPlayedNote[]
}

/**
 * A decoded kept session: its session-wide facts, its phrases in sounding order and its Jam parts,
 * null for a session that is no Jam.
 */
// @spec-link [[module_kept_session_codec]]
export interface KeptSession {
  readonly summary: KeptSessionSummary
  readonly phrases: readonly KeptPhrase[]
  readonly jam: KeptJam | null
}

/**
 * Intent: refuse, as caller defects, phrases the session's instrument did not play (every phrase is
 * played with the instrument locked at Start) and favorites that are not phrases of the session or
 * are listed twice; returns the favorites as a set.
 */
function checkedFavorites(
  records: readonly SessionHistoryRecord[],
  history: KeptSessionHistory,
  favorites: readonly number[],
): ReadonlySet<number> {
  for (const record of records) {
    if (record.intent.instrumentProfile.id !== history.instrumentProfileId)
      throw new Error(
        `kept session record: phrase ${record.phraseNumber} was played on ${record.intent.instrumentProfile.id}, the session on ${history.instrumentProfileId}`,
      )
  }
  const numbers = new Set(records.map((record) => record.phraseNumber))
  const chosen = new Set<number>()
  for (const favorite of favorites) {
    if (!numbers.has(favorite) || chosen.has(favorite))
      throw new Error(`kept session record: favorite ${favorite} is unknown or listed twice`)
    chosen.add(favorite)
  }
  return chosen
}

/**
 * Intent: the played-notes clock of a fresh Jam whose phrase 1 starts at `phraseOneStartsAt` on
 * the audio clock: its first barline and phrase 1's start in seconds from its count-in's first
 * beat. Throws, as a caller defect, on a first barline before the count-in, a phrase 1 starting
 * at or before the first barline, or a raw doodle note starting before the count-in or at or
 * after phrase 1's start.
 */
function freshJamClock(fresh: KeptFreshJam, phraseOneStartsAt: number): KeptPlayedNotesClock {
  const { countInStartsAt, doodleFirstBarlineAt } = fresh
  if (doodleFirstBarlineAt < countInStartsAt)
    throw new Error('kept session record: the doodle starts before its count-in')
  if (phraseOneStartsAt <= doodleFirstBarlineAt)
    throw new Error("kept session record: phrase 1 starts at or before the doodle's first barline")
  for (const note of fresh.rawDoodleNotes) {
    if (note.onsetAt < countInStartsAt || note.onsetAt >= phraseOneStartsAt)
      throw new Error(
        `kept session record: a raw doodle note at ${note.onsetAt} is outside the count-in and doodle`,
      )
  }
  return {
    doodleFirstBarline: doodleFirstBarlineAt - countInStartsAt,
    phraseOneStart: phraseOneStartsAt - countInStartsAt,
  }
}

/**
 * Intent: the played-notes record of a session's phrases whose phrase 1 starts at
 * `phraseOneStartsAt` on the audio clock: for a fresh Jam, its raw doodle notes and the phrases'
 * notes in seconds from its count-in's first beat; otherwise the phrases' notes in seconds from
 * phrase 1's start.
 */
function playedNotesRecord(
  phrases: readonly ReviewedPhrase[],
  phraseOneStartsAt: number,
  fresh: KeptFreshJam | null,
  appVersion: string,
): KeptPlayedNotesRecord {
  if (fresh === null) return keptPlayedNotesRecord(phrases, [], phraseOneStartsAt, appVersion)
  return keptPlayedNotesRecord(phrases, fresh.rawDoodleNotes, fresh.countInStartsAt, appVersion)
}

/**
 * Intent: the records of a finished session: the session-wide record (its facts from the history,
 * the preset label of the preset selection the history keeps from the session's start, named from
 * the presets the session knew, the instrument's display name from phrase 1's intent, the starting
 * tempo from phrase 1, the tempo reached from the last phrase, and whether it is a Jam with, for a
 * Jam, whether its suggestion was declined), the body, and the played notes only when they are
 * kept, each written by `appVersion`, the session-wide record and the body at data version 4, the
 * played notes at data version 1, every field copied by name. The body holds a Jam's doodle and,
 * for a fresh Jam, its played-notes clock, kept whether or not the played notes are. Every time is
 * in seconds from phrase 1's scheduled start, but a fresh Jam's played notes, its raw doodle notes
 * included, which are in seconds from its count-in's first beat. Throws, as a caller defect, on a
 * history with no phrase, an empty app version, a comment over 500 characters, an unknown or
 * repeated favorite, a selected preset none of the given presets has, a phrase played on another
 * instrument than the session's, or a fresh Jam's moments out of order (see `freshJamClock`).
 * Every phrase keeps the clef the history recorded it in.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
// @spec-link [[rule_kept_session_holds_no_acknowledgements]]
// @spec-link [[rule_preset_label_kept_with_session]]
export function encodeKeptSession(
  history: KeptSessionHistory,
  facts: KeptSessionFacts,
  appVersion: string,
): KeptSessionRecords {
  const records = history.phrases()
  const first = records[0]
  const last = records.at(-1)
  if (first === undefined || last === undefined)
    throw new Error('kept session record: a session with no phrase cannot be kept')
  const favorites = checkedFavorites(records, history, facts.favorites)
  const { jam } = facts
  const fresh = jam === undefined ? null : jam.fresh
  const clock = fresh === null ? null : freshJamClock(fresh, first.startedAt)
  const summary = keptSessionSummaryRecord(
    {
      startedAt: history.startedAt,
      lengthSeconds: sessionLengthSeconds(first, last),
      phraseCount: records.length,
      presetLabel: presetLabel(history.selection, facts.presets),
      instrument: {
        id: history.instrumentProfileId,
        displayName: first.intent.instrumentProfile.displayName,
      },
      startingTempo: first.tempo,
      tempoReached: last.tempo,
      pinned: facts.pinned,
      favoritesCount: favorites.size,
      comment: facts.comment,
      playedNotesKept: facts.playedNotesKept,
      sessionSeed: history.sessionSeed,
      ...(jam === undefined
        ? { isJam: false }
        : { isJam: true, suggestionDeclined: jam.suggestionDeclined }),
    },
    appVersion,
  )
  const doodle = jam === undefined ? null : jam.doodle
  return {
    summary,
    body: keptSessionBodyRecord(
      records,
      favorites,
      { doodle, playedNotesClock: clock },
      appVersion,
    ),
    playedNotes: facts.playedNotesKept
      ? playedNotesRecord(records, first.startedAt, fresh, appVersion)
      : null,
  }
}

/**
 * Intent: the played-notes record of a finished session whose notes are kept after its save, the
 * very record its save writes when they are kept: every note placed in a phrase, times in seconds
 * from phrase 1's scheduled start; for a fresh Jam (`fresh` given), its raw doodle notes too, and
 * every time in seconds from its count-in's first beat. Throws, as a caller defect, on a history
 * with no phrase, an empty app version, or a fresh Jam's moments out of order.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[module_kept_session_changes]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function encodeKeptPlayedNotes(
  history: { phrases(): readonly ReviewedPhrase[] },
  appVersion: string,
  fresh?: KeptFreshJam,
): KeptPlayedNotesRecord {
  const records = history.phrases()
  const first = records[0]
  if (first === undefined)
    throw new Error('kept session record: a session with no phrase has no played notes to keep')
  if (fresh === undefined) return playedNotesRecord(records, first.startedAt, null, appVersion)
  freshJamClock(fresh, first.startedAt) // Refuses a fresh Jam's moments out of order.
  return playedNotesRecord(records, first.startedAt, fresh, appVersion)
}

/**
 * A kept session's body encoded again with one phrase's favorite mark changed, and the number of
 * favorite phrases it then holds, which its session-wide record states.
 */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[module_kept_session_changes]]
export interface RewrittenKeptBody {
  readonly body: KeptSessionBodyRecord
  readonly favoritesCount: number
}

/**
 * Intent: a stored body encoded again after the session's save with phrase `phraseNumber` marked
 * a favorite or not, as `favorite` says, every other mark and field (the doodle too) as stored,
 * written by `appVersion`; with the number of favorites it then holds. Nothing when no body is
 * stored, or it cannot be read, or a newer app wrote it. Throws, as a caller defect, on a phrase
 * the body does not hold or an empty app version.
 */
// @spec-link [[module_kept_session_changes]]
// @spec-link [[req_favorite_phrases]]
export function rewriteKeptBodyFavorite(
  stored: unknown,
  phraseNumber: number,
  favorite: boolean,
  appVersion: string,
): RewrittenKeptBody | null {
  if (stored === undefined) return null
  const reading = readKept([{ value: stored, shapeVersion: KEPT_SESSION_BODY_DATA_VERSION }], () =>
    parseKeptSessionBody(stored),
  )
  if (reading.reading !== 'current') return null
  const { phrases } = reading.value
  if (!phrases.some((phrase) => phrase.phraseNumber === phraseNumber))
    throw new Error(`kept session record: the body holds no phrase ${phraseNumber}`)
  const marked = new Set(phrases.filter((phrase) => phrase.favorite).map((p) => p.phraseNumber))
  if (favorite) marked.add(phraseNumber)
  else marked.delete(phraseNumber)
  const body = rewrittenKeptBodyRecord(reading.value, (number) => marked.has(number), appVersion)
  return { body, favoritesCount: marked.size }
}

/**
 * Intent: refuse a body that disagrees with its session-wide record: another phrase count or
 * favorites count, a phrase played on another instrument than the session's, or a doodle held
 * by a session that is no Jam or missing from a Jam.
 */
function assertBodyMatchesSummary(summary: KeptSessionSummary, body: ParsedKeptBody): void {
  const { phrases } = body
  if (phrases.length !== summary.phraseCount)
    throw new KeptRecordError('Kept session: the body does not hold the phrase count.')
  if (phrases.filter((phrase) => phrase.favorite).length !== summary.favoritesCount)
    throw new KeptRecordError('Kept session: the body does not hold the favorites count.')
  if (phrases.some((phrase) => phrase.intent.instrumentProfile.id !== summary.instrument.id))
    throw new KeptRecordError('Kept session: a phrase was played on another instrument.')
  if (summary.isJam !== (body.doodle !== null))
    throw new KeptRecordError('Kept session: the body holds a doodle exactly for a Jam session.')
}

/**
 * Intent: a session's played notes as read, split by its body's clock: with a fresh Jam's clock,
 * the raw doodle notes before phrase 1 and the others rebased to phrase 1's start; without one,
 * no raw doodle note and every note as read.
 */
function splitByClock(
  notes: readonly RecordedPlayedNote[],
  clock: KeptPlayedNotesClock | null,
): SplitPlayedNotes {
  if (clock === null) return { rawDoodleNotes: [], fromPhraseOne: notes }
  return splitAtPhraseOne(notes, clock.phraseOneStart)
}

/**
 * Intent: the decoded phrases with the played notes placed in them exactly as the session history
 * places them (each in the phrase its onset falls in, by onset), every field copied by name, and
 * an outcome holding only what the records hold: the result's id and seed are the stored request's.
 */
function keptPhrases(
  phrases: readonly ParsedKeptPhrase[],
  notes: readonly RecordedPlayedNote[],
): readonly KeptPhrase[] {
  const slots = phrases.map((phrase) => ({
    phraseNumber: phrase.phraseNumber,
    startedAt: phrase.startedAt,
    acknowledgements: [],
    playedNotes: [],
  }))
  const placed = withPlayedNotes(slots, notes, [])
  return phrases.map((phrase, index) => ({
    phraseNumber: phrase.phraseNumber,
    startedAt: phrase.startedAt,
    outcome: {
      result: {
        requestId: phrase.request.requestId,
        seed: phrase.request.seed,
        timeline: phrase.timeline,
      },
      provenance: { harmony: phrase.harmony },
    },
    intent: phrase.intent,
    tempo: phrase.tempo,
    isRepeat: phrase.isRepeat,
    ...(phrase.repeatOf === undefined ? {} : { repeatOf: phrase.repeatOf }),
    favorite: phrase.favorite,
    clef: phrase.clef,
    playedNotes: placed[index]!.playedNotes,
  }))
}

/** What a kept session's stored values are, as read from its three stores. */
export interface StoredKeptSession {
  readonly summary: unknown
  readonly body: unknown
  /** The played-notes record, `undefined` when none is stored. */
  readonly playedNotes: unknown
}

/** Intent: read current records into a kept session, or throw a refusal for anything invalid. */
function keptSession(stored: StoredKeptSession): KeptSession {
  const summary = parseKeptSessionSummary(stored.summary)
  const body = parseKeptSessionBody(stored.body)
  assertBodyMatchesSummary(summary, body)
  if (summary.playedNotesKept !== (stored.playedNotes !== undefined))
    throw new KeptRecordError('Kept session: a played-notes record exists exactly when kept.')
  const notes = summary.playedNotesKept ? parseKeptPlayedNotes(stored.playedNotes) : []
  const { rawDoodleNotes, fromPhraseOne } = splitByClock(notes, body.playedNotesClock)
  const jam =
    body.doodle === null
      ? null
      : { doodle: body.doodle, playedNotesClock: body.playedNotesClock, rawDoodleNotes }
  return deepFreeze({ summary, phrases: keptPhrases(body.phrases, fromPhraseOne), jam })
}

/**
 * Intent: a kept session's stored values back into what the review and the exports read: its
 * session-wide facts, its phrases, phrase 1 starting at 0, with the played notes placed in them,
 * and, for a Jam, its doodle, its played-notes clock (a fresh Jam's) and its raw doodle notes: with
 * a clock, the played notes before phrase 1's start on it, in seconds from the count-in's first
 * beat, every other note counted from phrase 1's start before it is placed. Without a clock, a
 * played note before phrase 1 is refused. Any newer record leaves the whole session unread
 * (`newer`); any unreadable or invalid one, or records that disagree (a doodle exactly on a Jam
 * included), make it `unreadable`, never repaired, defaulted or partly decoded.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_outdated_tab_reads_what_it_can]]
export function decodeKeptSession(stored: StoredKeptSession): KeptReading<KeptSession> {
  const values: KeptStoredValue[] = [
    { value: stored.summary, shapeVersion: KEPT_SESSION_SUMMARY_DATA_VERSION },
    { value: stored.body, shapeVersion: KEPT_SESSION_BODY_DATA_VERSION },
  ]
  if (stored.playedNotes !== undefined)
    values.push({ value: stored.playedNotes, shapeVersion: KEPT_PLAYED_NOTES_DATA_VERSION })
  return readKept(values, () => keptSession(stored))
}
