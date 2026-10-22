/**
 * Very short notes. A played note is very short when its length, note-on to note-off, is under one
 * constant threshold, the same for every controller and never a player setting. It is a length
 * rule aimed at stray notes, the in-between notes a controller sends while the fingers move from
 * one position to the next, which a real instrument would swallow: it catches most of them, not
 * all, since some in-between notes last as long as notes the player meant and no length tells
 * those apart. Played notes are stored as received; this filter is applied only where they are
 * read for the review's lane, the played-notes export and Jam's doodle (where a very short note
 * never starts, extends or shapes the doodle), so a later change of the threshold loses nothing.
 * Pure: no clock, no storage.
 */

/**
 * The very-short-note threshold, in seconds: 38 ms, from measurement M1 (docs/midi-tuning.md,
 * "Very short notes (M1)"), five sessions on the reference breath controller over USB (534 notes,
 * `tests/fixtures/stray-notes/`). The controller reports lengths in steps of about 5 ms. The
 * shortest note read as intended there lasted 45.8 ms (a rushed run note), and the 41 ms step held
 * only in-between notes and halves of split notes: 38 ms sits between the 36 and 41 ms steps, one
 * full step below that note, and 24.5 ms under a sixteenth note at 240 BPM (62.5 ms). It leaves
 * out 66 of the 77 in-between notes found; the others last 41 to 97 ms, as long as intended
 * notes, so no length tells them apart.
 */
// @spec-link [[rule_stray_note_definition]]
export const VERY_SHORT_NOTE_SECONDS = 0.038

/** A played note's span on the audio clock, in seconds: all the filter reads. */
// @spec-link [[rule_stray_note_definition]]
export interface TimedNote {
  readonly onsetAt: number
  readonly releaseAt: number
}

/** Intent: whether a played note is very short: its length is under the threshold. */
// @spec-link [[rule_stray_note_definition]]
export function isVeryShortNote(note: TimedNote): boolean {
  return note.releaseAt - note.onsetAt < VERY_SHORT_NOTE_SECONDS
}

/** Intent: the played notes that are not very short, in their order; the input is unchanged. */
// @spec-link [[rule_stray_notes_filtered_on_reading]]
export function withoutVeryShortNotes<N extends TimedNote>(notes: readonly N[]): N[] {
  return notes.filter((note) => !isVeryShortNote(note))
}

/**
 * Intent: the records with their very short played notes left out, every other field kept; a
 * record that holds none is returned as it is.
 */
// @spec-link [[rule_stray_notes_filtered_on_reading]]
export function recordsWithoutVeryShortNotes<
  N extends TimedNote,
  R extends { readonly playedNotes: readonly N[] },
>(records: readonly R[]): R[] {
  return records.map((record) => {
    const playedNotes = withoutVeryShortNotes(record.playedNotes)
    return playedNotes.length === record.playedNotes.length ? record : { ...record, playedNotes }
  })
}
