/**
 * The played-note side of the session history: placing the finished notes and acknowledgements
 * the session hands in into the phrase records, on read. A played note belongs to
 * the recorded phrase its onset falls in, and an acknowledgement to the record of its phrase
 * number. Placement is computed from everything received so far, so it stays exact whatever order
 * the notes, acknowledgements and phrase records arrive in.
 */

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { RecordedPlayedNote } from './session-history'
import type { AudioTime } from './session-types'

/** The parts of a phrase record the placement reads and fills. */
interface PlaceableRecord {
  readonly phraseNumber: number
  readonly startedAt: AudioTime
  readonly acknowledgements: readonly ExpectedNoteIdentity[]
  readonly playedNotes: readonly RecordedPlayedNote[]
}

/**
 * Intent: the index of the recorded phrase whose span holds an onset: the last record started at
 * or before it, the last record taking every later onset. An onset before the first record's
 * start, or with no record, belongs to no phrase (-1).
 */
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_starting_note_only_starts_count_in]]
function phraseIndexAt(records: readonly PlaceableRecord[], onsetAt: AudioTime): number {
  let low = 0
  let high = records.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (records[middle]!.startedAt <= onsetAt) low = middle + 1
    else high = middle
  }
  return low - 1
}

/** Intent: the played notes grouped by the record that holds them, each group ordered by onset. */
// @spec-link [[rule_session_history_records_played_notes]]
function notesByRecord(
  records: readonly PlaceableRecord[],
  notes: readonly RecordedPlayedNote[],
): RecordedPlayedNote[][] {
  const groups = records.map((): RecordedPlayedNote[] => [])
  for (const note of notes) {
    const index = phraseIndexAt(records, note.onsetAt)
    if (index >= 0) groups[index]!.push(note)
  }
  // Array.prototype.sort is stable, so equal onsets keep their arrival order.
  for (const group of groups) group.sort((a, b) => a.onsetAt - b.onsetAt)
  return groups
}

/**
 * Intent: the records with their acknowledgements (arrival order, by phrase number) and their
 * played notes (by onset) filled in, each deep-frozen; a record that gains nothing is handed back
 * as it is. Acknowledgements of a phrase never recorded appear nowhere.
 */
// @spec-link [[rule_session_history_records_played_notes]]
export function withPlayedNotes<R extends PlaceableRecord>(
  records: readonly R[],
  notes: readonly RecordedPlayedNote[],
  acknowledgements: readonly ExpectedNoteIdentity[],
): R[] {
  const notesOf = notesByRecord(records, notes)
  const acknowledgementsOf = records.map((): ExpectedNoteIdentity[] => [])
  // Records are numbered 1, 2, 3 … with no gap, so phrase N is at index N - 1; a phrase never
  // recorded has no group and its acknowledgements are dropped.
  for (const identity of acknowledgements)
    acknowledgementsOf[identity.phraseNumber - 1]?.push(identity)
  return records.map((record, index) => {
    const playedNotes = notesOf[index]!
    const acknowledged = acknowledgementsOf[index]!
    if (playedNotes.length === 0 && acknowledged.length === 0) return record
    return deepFreeze({ ...record, acknowledgements: acknowledged, playedNotes })
  })
}
