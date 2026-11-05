/**
 * The played-notes export file built from a session history: its bytes are exactly the played-notes
 * encoder's output for the history's played-notes input, a second build gives the same bytes, it
 * holds the played notes and no generated note, the adapter's and encoder's typed errors reach the
 * caller, and its name carries the session's local start on the stem the generated-notes file
 * shares, with a suffix of its own. It also rides in the lazy export module the loader yields. A
 * Jam's file opens with its doodle section in both scopes, holding the raw doodle notes (very short
 * ones only when asked for), empty for a Jam on the kept doodle; a session that is no Jam gets
 * v3.1's file.
 */

import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { WHOLE_SESSION, exportFileStem, type ExportScope } from '@/export/export-file'
import { GeneratedNotesFileError, generatedNotesFileName } from '@/export/generated-notes-file'
import { loadGeneratedNotesExport } from '@/export/load-generated-notes-export'
import { MidiExportError } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import { buildPlayedNotesFile, playedNotesFileName } from '@/export/played-notes-file'
import { exportPlayedDoodleSection } from '@/jam/export/doodle-section'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import {
  SessionHistoryExportError,
  playedNotesMidiInputFromHistory,
} from '@/session/session-history-export'
import { recordedRecords } from '../components/review/review-fixtures'
import {
  jamHistory,
  keptDoodleJamPart,
  reviewedJamPart,
} from '../components/workspace/reviewed-jam-part-fixture'
import { SESSION_START_EPOCH_MS } from '../session/session-harness'
import { metaTexts, notesOf, readSmf } from './midi/smf-reader'

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

/** The marker meta event type of a Standard MIDI File. */
const MARKER = 0x06

/** The Jam-style session's favorites-only scope, phrase 2 kept. */
const FAVORITE_TWO: ExportScope = { kind: 'favoritesOnly', favorites: [2] }

/** The fixture's two-measure doodle ends, and the first exported phrase starts, at this tick. */
const DOODLE_END_TICK = 2 * 3840

/**
 * The fixture's raw doodle notes the file holds, as [pitch, velocity, start tick, end tick]: the
 * two played during the doodle, a quarter second each, timed from its first barline at 96 BPM
 * (1536 ticks a second); the one played on the count-in is no doodle note.
 */
const RAW_DOODLE_TICKS: readonly (readonly number[])[] = [
  [62, 72, 384, 768],
  [64, 72, 3840, 4224],
]

/** Intent: the played track's notes of a file as [pitch, velocity, start tick, end tick]. */
function playedTicks(bytes: Uint8Array): number[][] {
  return notesOf(readSmf(bytes).tracks[1]!).map((note) => [
    note.pitch,
    note.velocity,
    note.startTick,
    note.endTick,
  ])
}

/** Intent: a raw doodle note of `pitch` from `onsetAt`, lasting `seconds`. */
function rawNote(pitch: number, onsetAt: number, seconds: number): RecordedPlayedNote {
  return { pitch: makeConcertPitch(pitch), velocity: 50, onsetAt, releaseAt: onsetAt + seconds }
}

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe("the played-notes file of a Jam's session", () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it.each([
    ['whole session', WHOLE_SESSION, 'Phrase 1'],
    ['favorites only', FAVORITE_TWO, 'Phrase 2'],
  ] as const)(
    'holds the raw doodle notes in its Doodle section (%s), with nothing played in a phrase',
    (_, scope, firstPhrase) => {
      const doodle = exportPlayedDoodleSection(reviewedJamPart().doodle)

      const file = buildPlayedNotesFile(
        jamHistory(false),
        { includeVeryShortNotes: false },
        scope,
        doodle,
      )

      expect(metaTexts(readSmf(file.bytes).tracks[0]!, MARKER).slice(0, 2)).toEqual([
        { tick: 0, text: 'Doodle' },
        { tick: DOODLE_END_TICK, text: firstPhrase },
      ])
      expect(playedTicks(file.bytes)).toEqual(RAW_DOODLE_TICKS)
    },
  )

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it('holds the very short raw notes only when asked for', () => {
    const doodle = exportPlayedDoodleSection(
      reviewedJamPart([rawNote(62, 1.5, 0.25), rawNote(70, 2, 0.012)]).doodle,
    )
    /** Intent: the pitches of the file built with the option as given. */
    const pitches = (includeVeryShortNotes: boolean) =>
      playedTicks(
        buildPlayedNotesFile(jamHistory(true), { includeVeryShortNotes }, WHOLE_SESSION, doodle)
          .bytes,
      )
        .filter(([, , start]) => start! < DOODLE_END_TICK)
        .map(([pitch]) => pitch)

    expect(pitches(false)).toEqual([62])
    expect(pitches(true)).toEqual([62, 70])
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('gives no file when every note, in the phrases and the doodle, is very short, unless asked for', () => {
    const doodle = exportPlayedDoodleSection(reviewedJamPart([rawNote(70, 2, 0.012)]).doodle)

    expect(() =>
      buildPlayedNotesFile(
        jamHistory(false),
        { includeVeryShortNotes: false },
        WHOLE_SESSION,
        doodle,
      ),
    ).toThrow(MidiExportError)
    const file = buildPlayedNotesFile(
      jamHistory(false),
      { includeVeryShortNotes: true },
      WHOLE_SESSION,
      doodle,
    )
    expect(playedTicks(file.bytes).map(([pitch]) => pitch)).toEqual([70])
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('opens a Jam on the kept doodle with its Doodle section, holding no note', () => {
    const history = jamHistory(true)
    const phraseOneAt = history.phrases()[0]!.startedAt
    const doodle = exportPlayedDoodleSection(keptDoodleJamPart(phraseOneAt).doodle)
    expect(doodle.playedNotes).toEqual([])

    const file = buildPlayedNotesFile(
      history,
      { includeVeryShortNotes: false },
      WHOLE_SESSION,
      doodle,
    )

    expect(metaTexts(readSmf(file.bytes).tracks[0]!, MARKER)[0]).toEqual({
      tick: 0,
      text: 'Doodle',
    })
    const ticks = playedTicks(file.bytes)
    expect(ticks).toHaveLength(4)
    expect(ticks.every(([, , start]) => start! >= DOODLE_END_TICK)).toBe(true)
  })

  // @test-link [[req_played_notes_export]]
  it("gives v3.1's file for a session that is no Jam: no doodle section", () => {
    const records = recordedRecords()
    const scope: ExportScope = { kind: 'favoritesOnly', favorites: [1, 3] }

    for (const [asked, read] of [
      [WHOLE_SESSION, records],
      [scope, records.filter((record) => record.phraseNumber !== 2)],
    ] as const) {
      const file = buildPlayedNotesFile(
        historyOf(records),
        { includeVeryShortNotes: true },
        asked,
        null,
      )
      expect([...file.bytes]).toEqual([
        ...buildPlayedNotesFile(historyOf(records), { includeVeryShortNotes: true }, asked).bytes,
      ])
      expect(metaTexts(readSmf(file.bytes).tracks[0]!, MARKER).map(({ text }) => text)).toEqual(
        read.map((record) => `Phrase ${record.phraseNumber}`),
      )
    }
    expect([
      ...buildPlayedNotesFile(
        historyOf(records),
        { includeVeryShortNotes: true },
        WHOLE_SESSION,
        null,
      ).bytes,
    ]).toEqual([...encodePlayedNotesMidi(playedNotesMidiInputFromHistory(records))])
  })
})
