/**
 * The played-notes export file built from a session history: its bytes are exactly the played-notes
 * encoder's output for the history's played-notes input, a second build gives the same bytes, it
 * holds the played notes and no generated note, the adapter's and encoder's typed errors reach the
 * caller, and its name carries the session's local start on the stem the generated-notes file
 * shares, with a suffix of its own. It also rides in the lazy export module the loader yields.
 */

import { describe, expect, it } from 'vitest'

import { exportFileStem } from '@/export/export-file'
import { GeneratedNotesFileError, generatedNotesFileName } from '@/export/generated-notes-file'
import { loadGeneratedNotesExport } from '@/export/load-generated-notes-export'
import { MidiExportError } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import { buildPlayedNotesFile, playedNotesFileName } from '@/export/played-notes-file'
import type { SessionHistoryRecord } from '@/session/session-history'
import {
  SessionHistoryExportError,
  playedNotesMidiInputFromHistory,
} from '@/session/session-history-export'
import { recordedRecords } from '../components/review/review-fixtures'
import { SESSION_START_EPOCH_MS } from '../session/session-harness'
import { notesOf, readSmf } from './midi/smf-reader'

/** Intent: a history over `records`, started at `startedAt`, as the export reads it. */
function historyOf(records: readonly SessionHistoryRecord[], startedAt = SESSION_START_EPOCH_MS) {
  return { phrases: () => records, startedAt }
}

// @test-link [[req_played_notes_export]]
// @test-link [[rule_export_contents_never_merged]]
describe('the played-notes file name', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  it('carries the session start in local time, then the played suffix', () => {
    expect(playedNotesFileName(new Date(2026, 9, 4, 7, 5, 9).getTime())).toBe(
      'infinite-flow-2026-10-04-070509-played.mid',
    )
    expect(playedNotesFileName(new Date(2027, 0, 1, 0, 0, 0).getTime())).toBe(
      'infinite-flow-2027-01-01-000000-played.mid',
    )
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  it('shares its stem with the generated-notes file of the same session, never its name', () => {
    const start = new Date(2026, 8, 30, 21, 45, 3).getTime()
    const stem = exportFileStem(start)

    expect(stem).toBe('infinite-flow-2026-09-30-214503')
    expect(playedNotesFileName(start)).toBe(`${stem}-played.mid`)
    expect(generatedNotesFileName(start, 'midi')).toBe(`${stem}-generated.mid`)
    expect(playedNotesFileName(start)).not.toBe(generatedNotesFileName(start, 'midi'))
  })

  // @test-link [[req_played_notes_export]]
  it('refuses a start time that is not finite epoch milliseconds', () => {
    expect(() => playedNotesFileName(Number.NaN)).toThrow(GeneratedNotesFileError)
    expect(() => exportFileStem(Number.NEGATIVE_INFINITY)).toThrow(GeneratedNotesFileError)
  })
})

// @test-link [[req_played_notes_export]]
describe('the played-notes file', () => {
  // @test-link [[req_played_notes_export]]
  it("holds exactly the played-notes encoder's bytes for the history, as audio/midi", () => {
    const records = recordedRecords()

    const file = buildPlayedNotesFile(historyOf(records))

    expect(file.fileName).toBe(playedNotesFileName(SESSION_START_EPOCH_MS))
    expect(file.mimeType).toBe('audio/midi')
    expect(file.bytes.buffer).toBeInstanceOf(ArrayBuffer)
    expect([...file.bytes]).toEqual([
      ...encodePlayedNotesMidi(playedNotesMidiInputFromHistory(records)),
    ])
  })

  // @test-link [[req_played_notes_export]]
  it('gives the same name and bytes when built twice from the same history', () => {
    const first = buildPlayedNotesFile(historyOf(recordedRecords()))
    const second = buildPlayedNotesFile(historyOf(recordedRecords()))

    expect(second.fileName).toBe(first.fileName)
    expect([...second.bytes]).toEqual([...first.bytes])
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  it('holds the played notes and no generated note', () => {
    const file = buildPlayedNotesFile(historyOf(recordedRecords()))

    const tracks = readSmf(file.bytes).tracks
    expect(tracks).toHaveLength(2)
    expect(notesOf(tracks[0]!)).toEqual([])
    expect(notesOf(tracks[1]!).map((note) => [note.pitch, note.velocity])).toEqual([
      [61, 90],
      [61, 90],
      [61, 90],
    ])
  })

  // @test-link [[req_played_notes_export]]
  it("lets the adapter's and the encoder's typed errors through", () => {
    const silent = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))

    expect(() => buildPlayedNotesFile(historyOf([]))).toThrow(SessionHistoryExportError)
    expect(() => buildPlayedNotesFile(historyOf(silent))).toThrow(MidiExportError)
    expect(() => buildPlayedNotesFile(historyOf(recordedRecords(), Number.NaN))).toThrow(
      GeneratedNotesFileError,
    )
  })

  // @test-link [[req_played_notes_export]]
  it('comes with the generated-notes builder from the one lazy export load', async () => {
    const exportModule = await loadGeneratedNotesExport()

    expect(exportModule.buildPlayedNotesFile).toBe(buildPlayedNotesFile)
    expect(typeof exportModule.buildGeneratedNotesFile).toBe('function')
  })
})
