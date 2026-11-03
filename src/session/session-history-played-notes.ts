/**
 * The played-note side of the session history: placing the finished notes and acknowledgements
 * the session hands in into the phrase records, on read. A played note belongs to
 * the recorded phrase its onset falls in, and an acknowledgement to the record of its phrase
 * number. Placement is computed from everything received so far, so it stays exact whatever order
 * the notes, acknowledgements and phrase records arrive in. In a fresh Jam the raw doodle notes,
 * which the capture names by their note-ons, are marked as the doodle's, also on read.
 */

import type { ExpectedNoteIdentity } from '../domain/acknowledgement/expected-note'
import type { Collection, PitchClass } from '../domain/controls/generation-controls'
import type { QuantizedDoodle } from '../domain/doodle/quantized-doodle'
import type { ConcertPitch } from '../domain/events/concert-pitch'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { RecordedPlayedNote } from './session-history'
import type { AudioTime } from './session-types'

/** A played note as the capture knows it from its note-on: its concert pitch and onset. */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface PlayedNoteIdentity {
  readonly pitch: ConcertPitch
  readonly onsetAt: AudioTime
}

/**
 * A fresh Jam's doodle as its capture hands it to the history once the doodle has ended: the
 * quantized doodle, the tempo it was captured at (kept beside it, never inside it), the doodle's
 * first barline and its end barline on the audio clock, and the raw doodle notes, every played
 * note whose snapped start falls in the doodle's measures (very short ones included: the filter
 * applies where they are read), by the identity of their note-on.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface RecordedDoodle {
  readonly doodle: QuantizedDoodle
  readonly captureTempo: number
  readonly firstBarlineAt: AudioTime
  readonly endBarlineAt: AudioTime
  readonly notes: readonly PlayedNoteIdentity[]
}

/**
 * The doodle as the history reads it back: the quantized doodle with its capture tempo and
 * barlines, and its raw notes as the played notes marked as the doodle's, by onset, each once it
 * has been recorded as a finished played note. They belong to no phrase.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface SessionDoodle {
  readonly doodle: QuantizedDoodle
  readonly captureTempo: number
  readonly firstBarlineAt: AudioTime
  readonly endBarlineAt: AudioTime
  readonly playedNotes: readonly RecordedPlayedNote[]
}

/**
 * The key and mode suggestion a fresh Jam worked out at its doodle's end, kept with the session
 * for its review: nothing to suggest, a doodle no key and mode fits, or a written key and mode.
 * The same shape as the suggestion Jam's code computes, named here so the history needs none of
 * Jam's code.
 */
// @spec-link [[module_key_suggestion]]
// @spec-link [[service_session_history]]
export type DoodleSuggestion =
  | { readonly kind: 'nothing' }
  | { readonly kind: 'no_fit' }
  | {
      readonly kind: 'suggested'
      readonly tonalCenter: PitchClass
      readonly collection: Collection
    }

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

/** Intent: the key one played note's identity (its pitch and onset) is matched by. */
function identityKey(note: PlayedNoteIdentity): string {
  return `${note.pitch}@${note.onsetAt}`
}

/**
 * Intent: the played notes the doodle names (one per identity, matched on its pitch and its exact
 * onset), by onset, ties in arrival order; a named note not yet recorded as finished is not there
 * yet. Frozen.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function doodlePlayedNotes(
  identities: readonly PlayedNoteIdentity[],
  notes: readonly RecordedPlayedNote[],
): readonly RecordedPlayedNote[] {
  const named = new Set(identities.map(identityKey))
  const marked = notes.filter((note) => named.has(identityKey(note)))
  return Object.freeze(marked.sort((a, b) => a.onsetAt - b.onsetAt))
}
