/**
 * The played-notes file and very short notes, on the M1 recordings replayed as sessions: by
 * default the file holds every note of 38 ms or more and none shorter; with
 * `includeVeryShortNotes` it holds every note as received. A session whose every note is very
 * short has no file to build by default.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { MidiExportError } from '@/export/midi/midi-export-input'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import type { SessionHistoryRecord } from '@/session/session-history'
import { longHistory } from '../components/review/review-fixtures'
import {
  lengthOf,
  strayNoteFixtures,
  type FixtureNote,
} from '../domain/played-notes/stray-note-fixtures'
import { SESSION_START_EPOCH_MS } from '../session/session-harness'
import { notesOf, readSmf } from './midi/smf-reader'

/** The replayed sessions' tempo: 60 BPM, so a phrase lasts 16 s and a tick under 1.1 ms. */
const TEMPO = 60
const PHRASE_SECONDS = 16
const MS_PER_TICK = 1000 / 960

/** Intent: a session of back-to-back 60 BPM phrases holding `notes`, each in its onset's phrase. */
function sessionOf(notes: readonly FixtureNote[]): readonly SessionHistoryRecord[] {
  const end = Math.max(...notes.map((note) => note.releaseAt))
  const count = Math.ceil((end + 1) / PHRASE_SECONDS)
  return longHistory(count).map((record, index) => {
    const startedAt = index * PHRASE_SECONDS
    return {
      ...record,
      tempo: TEMPO,
      startedAt,
      playedNotes: notes
        .filter((note) => note.onsetAt >= startedAt && note.onsetAt < startedAt + PHRASE_SECONDS)
        .map((note) => ({ ...note, pitch: makeConcertPitch(note.pitch) })),
    }
  })
}

/** Intent: the played track's notes of a file: `pitch:velocity` sorted, and lengths in ms. */
function fileNotes(bytes: Uint8Array) {
  const notes = notesOf(readSmf(bytes).tracks[1]!)
  return {
    keys: notes.map((note) => `${note.pitch}:${note.velocity}`).sort(),
    lengthsMs: notes.map((note) => (note.endTick - note.startTick) * MS_PER_TICK),
  }
}

/** Intent: `pitch:velocity` of every note, sorted, as `fileNotes` gives them. */
function keysOf(notes: readonly FixtureNote[]): string[] {
  return notes.map((note) => `${note.pitch}:${note.velocity}`).sort()
}

/** Intent: a history over `records` as the export reads one. */
function historyOf(records: readonly SessionHistoryRecord[]) {
  return { phrases: () => records, startedAt: SESSION_START_EPOCH_MS }
}

// @test-link [[rule_played_notes_export_omits_stray_notes]]
// @test-link [[req_played_notes_export]]
describe('the played-notes file and very short notes', () => {
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds, by default, every M1 note of 38 ms or more and none shorter', () => {
    for (const { name, notes } of strayNoteFixtures()) {
      const history = historyOf(sessionOf(notes))

      const file = fileNotes(buildPlayedNotesFile(history).bytes)

      expect(file.keys, name).toEqual(keysOf(notes.filter((note) => lengthOf(note) >= 0.038)))
      expect(Math.min(...file.lengthsMs), name).toBeGreaterThanOrEqual(38 - MS_PER_TICK)
      expect(buildPlayedNotesFile(history, { includeVeryShortNotes: false })).toEqual(
        buildPlayedNotesFile(history),
      )
    }
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds every M1 note as received with the option', () => {
    for (const { name, notes } of strayNoteFixtures()) {
      const history = historyOf(sessionOf(notes))

      const file = fileNotes(buildPlayedNotesFile(history, { includeVeryShortNotes: true }).bytes)

      expect(file.keys, name).toEqual(keysOf(notes))
      const expected = notes.map((note) => lengthOf(note) * 1000).sort((a, b) => a - b)
      file.lengthsMs
        .sort((a, b) => a - b)
        .forEach((length, index) =>
          expect(Math.abs(length - expected[index]!), name).toBeLessThanOrEqual(MS_PER_TICK),
        )
    }
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('has no file to build by default for a session whose every note is very short', () => {
    const history = historyOf(
      sessionOf([
        { pitch: 55, velocity: 127, onsetAt: 1, releaseAt: 1.005 },
        { pitch: 57, velocity: 127, onsetAt: 1.005, releaseAt: 1.02 },
      ]),
    )

    expect(() => buildPlayedNotesFile(history)).toThrow(MidiExportError)
    expect(
      fileNotes(buildPlayedNotesFile(history, { includeVeryShortNotes: true }).bytes).keys,
    ).toEqual(['55:127', '57:127'])
  })
})
