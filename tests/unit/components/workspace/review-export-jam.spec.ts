/**
 * The Review's played-notes export in a Jam session, read without loading the export code: the
 * raw doodle notes count as played notes in either scope (the doodle is never a favorite), so a
 * Jam in which only the doodle was played holds a note and its file holds one; with very short
 * notes left out, the doodle's count with the phrases', and under `Favorites only` the very-short
 * reason names the doodle too; when Jam's code could not load, that reason comes first. A session
 * that is no Jam keeps v3.1's reasons.
 */
import { describe, expect, it } from 'vitest'

import {
  exportPlayedNotes,
  playedNotesFileHoldsNote,
  playedNotesUnavailable,
  type PlayedNotesExportRequest,
  type ReviewExportPorts,
} from '@/components/workspace/review-export'
import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import { loadGeneratedNotesExport, type ExportFile } from '@/export/load-generated-notes-export'
import { exportPlayedDoodleSection } from '@/jam/export/doodle-section'
import type { RecordedPlayedNote, SessionHistoryRecord } from '@/session/session-history'
import { notesOf, readSmf } from '../../export/midi/smf-reader'
import { sevenPhraseRecords } from '../../export/favorites-fixtures'
import { RAW_DOODLE_NOTES, jamHistory, reviewedJamPart } from './reviewed-jam-part-fixture'

/** The Jam-style session's favorites-only scope, phrase 2 its only favorite. */
const FAVORITE_TWO: ExportScope = { kind: 'favoritesOnly', favorites: [2] }

/** Intent: the played-notes request under `scope`, very short notes included or not. */
function request(scope: ExportScope, include: boolean): PlayedNotesExportRequest {
  return { includeVeryShortNotes: include, scope }
}

/** Intent: `notes` made very short: each released 12 ms after its onset. */
function veryShort<N extends RecordedPlayedNote>(notes: readonly N[]): N[] {
  return notes.map((note) => ({ ...note, releaseAt: note.onsetAt + 0.012 }))
}

/** Intent: the Jam-style session's records, nothing played in its phrases. */
function silentPhrases(): readonly SessionHistoryRecord[] {
  return jamHistory(false).phrases()
}

/** Intent: the Jam-style session's records, each phrase's two played notes very short. */
function veryShortPhrases(): SessionHistoryRecord[] {
  return jamHistory(true)
    .phrases()
    .map((record) => ({ ...record, playedNotes: veryShort(record.playedNotes) }))
}

/** Intent: what the reasons read of a Jam: its raw doodle notes, Jam's code loaded or failed. */
function jam(doodleNotes: readonly RecordedPlayedNote[], codeFailed = false) {
  return { doodleNotes, codeFailed }
}

/** Intent: ports over the real lazy export code, recording every file handed to the browser. */
function recordingPorts() {
  const downloads: ExportFile[] = []
  const ports: ReviewExportPorts = {
    load: loadGeneratedNotesExport,
    download: (file) => downloads.push(file),
  }
  return { ports, downloads }
}

// @test-link [[rule_raw_doodle_notes_are_played_notes]]
describe('the Review played-notes export in a Jam', () => {
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_favorites_only_export]]
  it('holds a played note when only the doodle was played, in both scopes, no favorite holding one', () => {
    const records = silentPhrases()

    for (const scope of [WHOLE_SESSION, FAVORITE_TWO]) {
      for (const include of [false, true]) {
        expect(playedNotesFileHoldsNote(records, request(scope, include))).toBe(false)
        expect(playedNotesFileHoldsNote(records, request(scope, include), RAW_DOODLE_NOTES)).toBe(
          true,
        )
        expect(
          playedNotesUnavailable(records, request(scope, include), jam(RAW_DOODLE_NOTES)),
        ).toBe(null)
      }
    }
  })

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_jam_exports_open_with_doodle]]
  it('builds that Jam a file holding the doodle notes, in both scopes', async () => {
    const history = jamHistory(false)
    const doodle = exportPlayedDoodleSection(reviewedJamPart().doodle)
    const { ports, downloads } = recordingPorts()

    await exportPlayedNotes(history, request(WHOLE_SESSION, false), ports, doodle)
    await exportPlayedNotes(history, request(FAVORITE_TWO, false), ports, doodle)

    expect(downloads.map((file) => file.fileName)).toEqual([
      expect.stringMatching(/-played\.mid$/u),
      expect.stringMatching(/-played-favorites\.mid$/u),
    ])
    for (const file of downloads) {
      expect(notesOf(readSmf(file.bytes).tracks[1]!).map((note) => note.pitch)).toEqual([62, 64])
    }
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  // @test-link [[rule_favorites_only_export]]
  it("says the favorites' and the doodle's notes are all very short under Favorites only, every note under Whole session", () => {
    const records = veryShortPhrases()
    const doodle = jam(veryShort(RAW_DOODLE_NOTES))

    expect(
      playedNotesFileHoldsNote(records, request(FAVORITE_TWO, false), doodle.doodleNotes),
    ).toBe(false)
    expect(playedNotesUnavailable(records, request(FAVORITE_TWO, false), doodle)).toBe(
      'everyFavoriteAndDoodleNoteVeryShort',
    )
    expect(playedNotesUnavailable(records, request(WHOLE_SESSION, false), doodle)).toBe(
      'everyNoteVeryShort',
    )
    expect(playedNotesUnavailable(records, request(FAVORITE_TWO, true), doodle)).toBeNull()
    expect(playedNotesUnavailable(records, request(WHOLE_SESSION, true), doodle)).toBeNull()
    // Only the doodle very short, the favorite's notes not: nothing to say.
    expect(
      playedNotesUnavailable(jamHistory(true).phrases(), request(FAVORITE_TWO, false), doodle),
    ).toBeNull()
    // Only the doodle's notes not very short: they hold the file.
    expect(
      playedNotesUnavailable(records, request(FAVORITE_TWO, false), jam(RAW_DOODLE_NOTES)),
    ).toBeNull()
  })

  // @test-link [[rule_favorites_only_export]]
  it('says no favorite holds a played note only when the doodle holds none either', () => {
    const records = silentPhrases()

    expect(playedNotesUnavailable(records, request(FAVORITE_TWO, false), jam([]))).toBe(
      'noPlayedNoteInFavorites',
    )
    expect(playedNotesUnavailable(records, request(FAVORITE_TWO, true), jam([]))).toBe(
      'noPlayedNoteInFavorites',
    )
    expect(
      playedNotesUnavailable(
        records,
        request(FAVORITE_TWO, false),
        jam(veryShort(RAW_DOODLE_NOTES)),
      ),
    ).toBe('everyFavoriteAndDoodleNoteVeryShort')
  })

  // @test-link [[rule_jam_code_loaded_on_demand]]
  it("says Jam's code could not load before every other reason, whatever the scope and option", () => {
    const failed = jam(RAW_DOODLE_NOTES, true)
    const failedEmpty = jam([], true)

    for (const scope of [WHOLE_SESSION, FAVORITE_TWO]) {
      for (const include of [false, true]) {
        expect(
          playedNotesUnavailable(jamHistory(true).phrases(), request(scope, include), failed),
        ).toBe('doodleNotLoaded')
        expect(playedNotesUnavailable(silentPhrases(), request(scope, include), failedEmpty)).toBe(
          'doodleNotLoaded',
        )
        expect(playedNotesUnavailable(veryShortPhrases(), request(scope, include), failed)).toBe(
          'doodleNotLoaded',
        )
      }
    }
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('keeps the reasons of a session that is no Jam', () => {
    const records = sevenPhraseRecords([[[60, 1, 1.25]], [], [[62, 1, 1.01]]])
    /** Intent: the favorites-only scope of the given phrase numbers. */
    const favorites = (...numbers: number[]): ExportScope => ({
      kind: 'favoritesOnly',
      favorites: numbers,
    })
    const cases: readonly (readonly [ExportScope, boolean])[] = [
      [favorites(2), false],
      [favorites(2, 3), false],
      [favorites(2, 3), true],
      [favorites(1), false],
      [WHOLE_SESSION, false],
    ]

    expect(
      cases.map(([scope, include]) =>
        playedNotesUnavailable(records, request(scope, include), null),
      ),
    ).toEqual(['noPlayedNoteInFavorites', 'everyFavoriteNoteVeryShort', null, null, null])
    for (const [scope, include] of cases) {
      expect(playedNotesUnavailable(records, request(scope, include), null)).toBe(
        playedNotesUnavailable(records, request(scope, include)),
      )
    }
  })
})
