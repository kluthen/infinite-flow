/**
 * A kept session and very short notes: its played notes are stored as received, very short ones
 * included, and read back with them, so only the readers (the review's lane, the played-notes
 * export) leave them out, and a later change of the threshold loses nothing.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { buildPlayedNotesFile } from '@/export/played-notes-file'
import type { SessionHistoryRecord } from '@/session/session-history'
import {
  decodeKeptSession,
  encodeKeptSession,
  type KeptSession,
} from '@/storage/records/kept-session-record'
import { notesOf, readSmf } from '../export/midi/smf-reader'
import { APP_VERSION, historyOf, recordedKeptSession, storedRecords } from './kept-session-fixtures'

/** Intent: a recorded two-phrase session with a 5 ms note of pitch 90 added to each phrase. */
function sessionWithVeryShortNotes(): readonly SessionHistoryRecord[] {
  return recordedKeptSession('bb-tenor', 2)
    .phrases()
    .map((record) => ({
      ...record,
      playedNotes: [
        ...record.playedNotes,
        {
          pitch: makeConcertPitch(90),
          velocity: 127,
          onsetAt: record.startedAt + 1.5,
          releaseAt: record.startedAt + 1.505,
        },
      ].sort((a, b) => a.onsetAt - b.onsetAt),
    }))
}

/** Intent: decoded phrases as the export reads a history. */
function exportableOf(phrases: KeptSession['phrases'], startedAt: number) {
  return { phrases: () => phrases, startedAt }
}

/** Intent: the pitches of a played-notes file's notes. */
function filePitches(bytes: Uint8Array): number[] {
  return notesOf(readSmf(bytes).tracks[1]!).map((note) => note.pitch)
}

// @test-link [[rule_stray_notes_filtered_on_reading]]
describe('a kept session with very short played notes', () => {
  // @test-link [[rule_stray_notes_filtered_on_reading]]
  it('stores and reads back every played note, very short ones included', () => {
    const records = sessionWithVeryShortNotes()
    const kept = encodeKeptSession(
      historyOf(records, 'bb-tenor'),
      {
        pinned: false,
        favorites: [],
        comment: '',
        playedNotesKept: true,
        presets: BUILT_IN_PRESETS,
      },
      APP_VERSION,
    )

    expect(kept.playedNotes!.notes.filter((note) => note.pitch === 90)).toHaveLength(2)
    const reading = decodeKeptSession(storedRecords(kept))
    if (reading.reading !== 'current') throw new Error(`Read as ${reading.reading}.`)
    const phrases = reading.value.phrases
    expect(phrases.map((phrase) => phrase.playedNotes.length)).toEqual(
      records.map((record) => record.playedNotes.length),
    )
    expect(phrases.flatMap((phrase) => phrase.playedNotes).filter((n) => n.pitch === 90)).toEqual([
      expect.objectContaining({ velocity: 127 }),
      expect.objectContaining({ velocity: 127 }),
    ])

    const exportable = exportableOf(phrases, reading.value.summary.startedAt)
    expect(filePitches(buildPlayedNotesFile(exportable).bytes)).not.toContain(90)
    expect(
      filePitches(buildPlayedNotesFile(exportable, { includeVeryShortNotes: true }).bytes),
    ).toContain(90)
  })
})
