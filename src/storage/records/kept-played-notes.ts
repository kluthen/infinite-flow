/**
 * The played-notes record of a kept session, stored in the playedNotes store only while the player
 * keeps them: every note the session placed in a phrase, in onset order, each with its concert
 * pitch, velocity, onset and release in seconds from phrase 1's scheduled start, with the record
 * envelope's two versions. Written field by field, read back only when every note is valid. Pure:
 * no storage access.
 */

import { parseConcertPitch, type ConcertPitch } from '@/domain/events/concert-pitch'
import { deepFreeze } from '@/domain/events/deep-freeze'
import type { RecordedPlayedNote, ReviewedPhrase } from '@/session/session-history'

import type { RecordVersions } from '../record-envelope'
import { assertKeptAppVersion, KEPT_SESSION_DATA_VERSION } from './kept-reading'
import {
  anyArray,
  exactRecord,
  finiteAtLeast,
  integerIn,
  KeptRecordError,
} from './kept-record-shape'

/** One kept played note: its concert pitch, velocity, and onset and release in session seconds. */
// @spec-link [[entity_kept_session_record]]
export interface KeptPlayedNote {
  readonly pitch: ConcertPitch
  readonly velocity: number
  readonly onset: number
  readonly release: number
}

/** The stored played-notes record: the envelope's two versions and the notes in onset order. */
// @spec-link [[entity_kept_session_record]]
// @spec-link [[rule_kept_session_content]]
export interface KeptPlayedNotesRecord extends RecordVersions {
  readonly notes: readonly KeptPlayedNote[]
}

/** Every key the played-notes record holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_PLAYED_NOTES_KEYS = Object.freeze(['dataVersion', 'appVersion', 'notes'] as const)

/** Every key one kept played note holds, and no other. */
// @spec-link [[entity_kept_session_record]]
export const KEPT_PLAYED_NOTE_KEYS = Object.freeze([
  'pitch',
  'velocity',
  'onset',
  'release',
] as const)

/** The highest MIDI velocity; a played note's velocity is 1 to this. */
const MAX_VELOCITY = 127

/**
 * Intent: the played-notes record of a session's phrases: every note placed in a phrase, copied by
 * name with its times rebased to seconds from `origin` (phrase 1's scheduled start on the audio
 * clock), in onset order, equal onsets keeping their session order.
 */
// @spec-link [[module_kept_session_codec]]
// @spec-link [[rule_kept_session_content]]
export function keptPlayedNotesRecord(
  phrases: readonly ReviewedPhrase[],
  origin: number,
  appVersion: string,
): KeptPlayedNotesRecord {
  assertKeptAppVersion(appVersion)
  const notes = phrases.flatMap((phrase) =>
    phrase.playedNotes.map((note): KeptPlayedNote => ({
      pitch: note.pitch,
      velocity: note.velocity,
      onset: note.onsetAt - origin,
      release: note.releaseAt - origin,
    })),
  )
  // Array.prototype.sort is stable, so equal onsets keep their session order.
  notes.sort((a, b) => a.onset - b.onset)
  return { dataVersion: KEPT_SESSION_DATA_VERSION, appVersion, notes }
}

/** Intent: one stored played note, as a session note in session seconds, or a refusal. */
function parseNote(value: unknown, context: string): RecordedPlayedNote {
  const record = exactRecord(value, KEPT_PLAYED_NOTE_KEYS, context)
  const onsetAt = finiteAtLeast(record.onset, 0, `${context}.onset`)
  return {
    pitch: parseConcertPitch(record.pitch),
    velocity: integerIn(record.velocity, 1, MAX_VELOCITY, `${context}.velocity`),
    onsetAt,
    releaseAt: finiteAtLeast(record.release, onsetAt, `${context}.release`),
  }
}

/**
 * Intent: read a current played-notes record back into the session's played notes, with times in
 * seconds from phrase 1's start: exactly its keys, every note valid (none before phrase 1's
 * start, none released before its onset) and the notes in onset order. Returns a fresh deep-frozen
 * list; throws a refusal for anything invalid, never sorting or repairing it.
 */
// @spec-link [[module_kept_session_codec]]
export function parseKeptPlayedNotes(value: unknown): readonly RecordedPlayedNote[] {
  const record = exactRecord(value, KEPT_PLAYED_NOTES_KEYS, 'Kept played notes')
  const notes = anyArray(record.notes, 'Kept played notes.notes').map((note, index) =>
    parseNote(note, `Kept played notes.notes[${index}]`),
  )
  notes.forEach((note, index) => {
    if (index > 0 && note.onsetAt < notes[index - 1]!.onsetAt)
      throw new KeptRecordError(`Kept played notes.notes[${index}] is out of onset order.`)
  })
  return deepFreeze(notes)
}
