/**
 * Very short notes: the one constant threshold (38 ms, from measurement M1), well under a
 * sixteenth note at 240 BPM; a played note shorter than it, note-on to note-off, is very short and
 * any other is not; the filter keeps every other note, in order, and the records it reads keep
 * their own fields. On the M1 recordings, the filter leaves out exactly the notes under the
 * threshold and keeps every note the measurement read as intended.
 */
import { describe, expect, it } from 'vitest'

import {
  VERY_SHORT_NOTE_SECONDS,
  isVeryShortNote,
  recordsWithoutVeryShortNotes,
  withoutVeryShortNotes,
} from '@/domain/played-notes/stray-notes'
import { lengthOf, strayNoteFixtures } from './stray-note-fixtures'

/** A sixteenth note at 240 BPM, the shortest note the app writes, in seconds. */
const SIXTEENTH_AT_240_BPM = 0.0625

/** Intent: a note from `onsetAt` lasting `seconds`. */
function noteOf(onsetAt: number, seconds: number, pitch = 60) {
  return { pitch, onsetAt, releaseAt: onsetAt + seconds }
}

// @test-link [[rule_stray_note_definition]]
describe('a very short note', () => {
  // @test-link [[rule_stray_note_definition]]
  it('is set by one constant, 38 ms, well under a sixteenth note at 240 BPM', () => {
    expect(VERY_SHORT_NOTE_SECONDS).toBe(0.038)
    expect(VERY_SHORT_NOTE_SECONDS).toBeLessThan(SIXTEENTH_AT_240_BPM * 0.75)
  })

  // @test-link [[rule_stray_note_definition]]
  it('is a note shorter than the threshold, note-on to note-off; any other is not', () => {
    expect(isVeryShortNote(noteOf(3, 0))).toBe(true)
    expect(isVeryShortNote(noteOf(3, 0.005))).toBe(true)
    expect(isVeryShortNote(noteOf(120.5, 0.0379))).toBe(true)
    expect(isVeryShortNote(noteOf(1, 0.038))).toBe(false)
    expect(isVeryShortNote(noteOf(1, 0.0381))).toBe(false)
    expect(isVeryShortNote(noteOf(1, SIXTEENTH_AT_240_BPM))).toBe(false)
  })
})

// @test-link [[rule_stray_notes_filtered_on_reading]]
describe('the very-short-note filter', () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('keeps every other note, in order, and leaves its input as it was', () => {
    const notes = [noteOf(1, 0.2, 60), noteOf(1.2, 0.01, 61), noteOf(1.21, 0.3, 62)]
    const copy = structuredClone(notes)

    expect(withoutVeryShortNotes(notes)).toEqual([notes[0], notes[2]])
    expect(notes).toEqual(copy)
  })

  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it("filters each record's played notes, every other field and an untouched record kept", () => {
    const kept = { phraseNumber: 1, playedNotes: [noteOf(0, 0.2)] }
    const filtered = { phraseNumber: 2, playedNotes: [noteOf(4, 0.004), noteOf(4.5, 0.1)] }

    const records = recordsWithoutVeryShortNotes([kept, filtered])

    expect(records[0]).toBe(kept)
    expect(records[1]).toEqual({ phraseNumber: 2, playedNotes: [filtered.playedNotes[1]] })
    expect(filtered.playedNotes).toHaveLength(2)
  })
})

// @test-link [[rule_stray_note_definition]]
// @test-link [[rule_stray_notes_filtered_on_reading]]
describe('the filter on the M1 recordings', () => {
  // @test-link [[rule_stray_note_definition]]
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('leaves out exactly the notes under 38 ms, and every one the measurement read as intended stays', () => {
    const counts = strayNoteFixtures().map(({ name, notes }) => {
      const kept = withoutVeryShortNotes(notes)
      expect(
        kept.every((note) => lengthOf(note) >= 0.038),
        name,
      ).toBe(true)
      expect(notes.filter((note) => !kept.includes(note)).every((n) => lengthOf(n) < 0.038)).toBe(
        true,
      )
      return [notes.length, notes.length - kept.length]
    })
    // Per recording: all notes, then those left out (docs/midi-tuning.md, M1).
    expect(counts).toEqual([
      [18, 3],
      [65, 2],
      [89, 22],
      [227, 30],
      [135, 29],
    ])
    // The shortest note M1 read as intended: an F (65) in a run, 45.8 ms, 16.7 s into the first
    // free-playing recording.
    const free = strayNoteFixtures()[2]!
    const intended = free.notes.find(
      (note) => note.pitch === 65 && Math.abs(note.onsetAt - 16.733) < 0.001,
    )
    expect(intended).toBeDefined()
    expect(withoutVeryShortNotes(free.notes)).toContain(intended)
  })
})
