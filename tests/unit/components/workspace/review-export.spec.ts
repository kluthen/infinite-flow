/**
 * The Review's exports as the page wires them: the export code is loaded on demand, the one file
 * asked for (generated notes or played notes) is built from the session history and handed to the
 * browser as one download; exporting twice gives identical bytes; every failure, a failed load of
 * the export code included, rejects so the Review can show its error, with nothing downloaded; and
 * the played-notes action is offered only for a history that holds a played note.
 */
import { describe, expect, it, vi } from 'vitest'

import {
  browserReviewExportPorts,
  exportGeneratedNotes,
  exportPlayedNotes,
  historyHoldsPlayedNote,
  playedNotesFileHoldsNote,
  playedNotesUnavailable,
  type ReviewExportPorts,
} from '@/components/workspace/review-export'
import { BrowserDownloadError } from '@/export/browser-download'
import { WHOLE_SESSION, type ExportScope } from '@/export/export-file'
import type { ExportFile } from '@/export/generated-notes-file'
import {
  GeneratedNotesExportLoadError,
  loadGeneratedNotesExport,
  type ExportableHistory,
} from '@/export/load-generated-notes-export'
import { MidiExportError } from '@/export/midi/midi-export-input'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { recordedRecords } from '../review/review-fixtures'
import { sevenPhraseHistory, sevenPhraseRecords } from '../../export/favorites-fixtures'
import { SESSION_START_EPOCH_MS } from '../../session/session-harness'

/** Intent: the recorded three-phrase session's history, started at the fixed test time. */
function history(startedAt = SESSION_START_EPOCH_MS): ExportableHistory {
  const records = recordedRecords()
  return { phrases: () => records, startedAt }
}

/** Intent: ports over the real lazy export code, recording every file handed to the browser. */
function recordingPorts(load: ReviewExportPorts['load'] = loadGeneratedNotesExport) {
  const downloads: ExportFile[] = []
  const ports: ReviewExportPorts = { load, download: (file) => downloads.push(file) }
  return { ports, downloads }
}

/** Intent: the session start's local date and time as the file name carries them. */
function localStamp(epochMs: number): string {
  const start = new Date(epochMs)
  const two = (value: number) => String(value).padStart(2, '0')
  const date = `${start.getFullYear()}-${two(start.getMonth() + 1)}-${two(start.getDate())}`
  return `${date}-${two(start.getHours())}${two(start.getMinutes())}${two(start.getSeconds())}`
}

// @test-link [[req_session_export]]
// @test-link [[module_review_export_pipeline]]
describe('the Review export', () => {
  // @test-link [[req_session_export]]
  // @test-link [[rule_generated_notes_musicxml_export]]
  // @test-link [[rule_generated_notes_midi_export]]
  it.each([
    ['musicxml', false, 'musicxml', 'application/vnd.recordare.musicxml+xml'],
    ['midi', false, 'mid', 'audio/midi'],
    ['midi', true, 'mid', 'audio/midi'],
  ] as const)(
    'downloads exactly one %s file (backing %s), named from the session start',
    async (format, backingTrack, extension, mimeType) => {
      const { ports, downloads } = recordingPorts()

      await exportGeneratedNotes(history(), { format, backingTrack, scope: WHOLE_SESSION }, ports)

      expect(downloads).toHaveLength(1)
      expect(downloads[0]).toMatchObject({
        fileName: `infinite-flow-${localStamp(SESSION_START_EPOCH_MS)}-generated.${extension}`,
        mimeType,
      })
      expect(downloads[0]?.bytes.byteLength).toBeGreaterThan(0)
    },
  )

  // @test-link [[req_session_export]]
  it.each([
    ['musicxml', false],
    ['midi', false],
    ['midi', true],
  ] as const)(
    'gives identical bytes when %s is exported twice (backing %s)',
    async (format, backingTrack) => {
      const { ports, downloads } = recordingPorts()

      await exportGeneratedNotes(history(), { format, backingTrack, scope: WHOLE_SESSION }, ports)
      await exportGeneratedNotes(history(), { format, backingTrack, scope: WHOLE_SESSION }, ports)

      expect(downloads).toHaveLength(2)
      expect(downloads[1]?.fileName).toBe(downloads[0]?.fileName)
      expect([...(downloads[1]?.bytes ?? [])]).toEqual([...(downloads[0]?.bytes ?? [])])
    },
  )

  // @test-link [[req_session_export]]
  it('holds the backing track in the MIDI file only when asked for', async () => {
    const { ports, downloads } = recordingPorts()

    await exportGeneratedNotes(
      history(),
      { format: 'midi', backingTrack: false, scope: WHOLE_SESSION },
      ports,
    )
    await exportGeneratedNotes(
      history(),
      { format: 'midi', backingTrack: true, scope: WHOLE_SESSION },
      ports,
    )

    expect(downloads[1]?.bytes.byteLength).toBeGreaterThan(downloads[0]?.bytes.byteLength ?? 0)
  })

  // @test-link [[req_session_export]]
  it('rejects, downloading nothing, when the export code fails to load', async () => {
    const failure = new GeneratedNotesExportLoadError('chunk failed to fetch', new Error('offline'))
    const { ports, downloads } = recordingPorts(() => Promise.reject(failure))

    await expect(
      exportGeneratedNotes(
        history(),
        { format: 'musicxml', backingTrack: false, scope: WHOLE_SESSION },
        ports,
      ),
    ).rejects.toBe(failure)
    expect(downloads).toEqual([])
  })

  // @test-link [[req_session_export]]
  it('rejects, downloading nothing, when the file cannot be built', async () => {
    const { ports, downloads } = recordingPorts()

    await expect(
      exportGeneratedNotes(
        history(Number.NaN),
        { format: 'midi', backingTrack: false, scope: WHOLE_SESSION },
        ports,
      ),
    ).rejects.toMatchObject({ kind: 'GeneratedNotesFileError' })
    expect(downloads).toEqual([])
  })

  // @test-link [[req_session_export]]
  it('rejects when the browser cannot take the download', async () => {
    const failure = new BrowserDownloadError('no window')
    const ports: ReviewExportPorts = {
      load: loadGeneratedNotesExport,
      download: vi.fn(() => {
        throw failure
      }),
    }

    await expect(
      exportGeneratedNotes(
        history(),
        { format: 'musicxml', backingTrack: false, scope: WHOLE_SESSION },
        ports,
      ),
    ).rejects.toBe(failure)
    expect(ports.download).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_session_export]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it("hands the file to the given document's download, the only way it leaves the page", async () => {
    const windowless = document.implementation.createHTMLDocument('no window')
    const ports = browserReviewExportPorts(windowless)

    await expect(
      exportGeneratedNotes(
        history(),
        { format: 'musicxml', backingTrack: false, scope: WHOLE_SESSION },
        ports,
      ),
    ).rejects.toBeInstanceOf(BrowserDownloadError)
  })
})

/** The played-notes export as it starts: very short notes left out. */
const DEFAULT_REQUEST = { includeVeryShortNotes: false, scope: WHOLE_SESSION } as const

/** Intent: the recorded session's history with every played note taken out. */
function silentHistory(): ExportableHistory {
  const records = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
  return { phrases: () => records, startedAt: SESSION_START_EPOCH_MS }
}

// @test-link [[req_played_notes_export]]
// @test-link [[module_review_export_pipeline]]
describe('the Review played-notes export', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('downloads exactly one MIDI file, named from the session start', async () => {
    const { ports, downloads } = recordingPorts()

    await exportPlayedNotes(history(), DEFAULT_REQUEST, ports)

    expect(downloads).toHaveLength(1)
    expect(downloads[0]).toMatchObject({
      fileName: `infinite-flow-${localStamp(SESSION_START_EPOCH_MS)}-played.mid`,
      mimeType: 'audio/midi',
    })
    expect(downloads[0]?.bytes.byteLength).toBeGreaterThan(0)
  })

  // @test-link [[req_played_notes_export]]
  it('gives identical bytes when exported twice', async () => {
    const { ports, downloads } = recordingPorts()

    await exportPlayedNotes(history(), DEFAULT_REQUEST, ports)
    await exportPlayedNotes(history(), DEFAULT_REQUEST, ports)

    expect(downloads).toHaveLength(2)
    expect([...(downloads[1]?.bytes ?? [])]).toEqual([...(downloads[0]?.bytes ?? [])])
  })

  // @test-link [[req_played_notes_export]]
  it('rejects, downloading nothing, when the export code fails to load', async () => {
    const failure = new GeneratedNotesExportLoadError('chunk failed to fetch', new Error('offline'))
    const { ports, downloads } = recordingPorts(() => Promise.reject(failure))

    await expect(exportPlayedNotes(history(), DEFAULT_REQUEST, ports)).rejects.toBe(failure)
    expect(downloads).toEqual([])
  })

  // @test-link [[req_played_notes_export]]
  it('rejects, downloading nothing, when the file cannot be built', async () => {
    const { ports, downloads } = recordingPorts()

    await expect(exportPlayedNotes(silentHistory(), DEFAULT_REQUEST, ports)).rejects.toBeInstanceOf(
      MidiExportError,
    )
    await expect(
      exportPlayedNotes(history(Number.NaN), DEFAULT_REQUEST, ports),
    ).rejects.toMatchObject({
      kind: 'GeneratedNotesFileError',
    })
    expect(downloads).toEqual([])
  })

  // @test-link [[req_played_notes_export]]
  it('holds a played note only when some record does', () => {
    expect(historyHoldsPlayedNote(recordedRecords())).toBe(true)
    expect(historyHoldsPlayedNote(silentHistory().phrases())).toBe(false)
    expect(historyHoldsPlayedNote([])).toBe(false)
    expect(historyHoldsPlayedNote([...silentHistory().phrases(), recordedRecords().at(-1)!])).toBe(
      true,
    )
  })
})

/** Intent: a history over `records`, started at the fixed test time. */
function historyOver(records: ReturnType<ExportableHistory['phrases']>): ExportableHistory {
  return { phrases: () => records, startedAt: SESSION_START_EPOCH_MS }
}

/**
 * Intent: the recorded session's history with every played note replaced by a very short note
 * (12 ms) of `pitch`, at the same onset.
 */
function veryShortHistory(pitch = 50): ExportableHistory {
  const records = recordedRecords().map((record) => ({
    ...record,
    playedNotes: record.playedNotes.map((note) => ({
      ...note,
      pitch: makeConcertPitch(pitch),
      releaseAt: note.onsetAt + 0.012,
    })),
  }))
  return { phrases: () => records, startedAt: SESSION_START_EPOCH_MS }
}

// @test-link [[rule_played_notes_export_omits_stray_notes]]
describe('the Review played-notes export and very short notes', () => {
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('builds the file the request asks for: very short notes left out, or every note', async () => {
    const [first, second, third] = recordedRecords()
    const records = [first!, veryShortHistory().phrases()[1]!, third!]
    expect(second!.playedNotes).not.toEqual(records[1]!.playedNotes)
    const mixed = historyOver(records)
    const { ports, downloads } = recordingPorts()
    const exportModule = await loadGeneratedNotesExport()

    await exportPlayedNotes(mixed, DEFAULT_REQUEST, ports)
    await exportPlayedNotes(mixed, { includeVeryShortNotes: true, scope: WHOLE_SESSION }, ports)

    expect(downloads.map((file) => [...file.bytes])).toEqual([
      [...exportModule.buildPlayedNotesFile(mixed, DEFAULT_REQUEST).bytes],
      [...exportModule.buildPlayedNotesFile(mixed, { includeVeryShortNotes: true }).bytes],
    ])
    expect(downloads[0]!.bytes).not.toEqual(downloads[1]!.bytes)
  })

  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds a note to export only when one is not very short, or with the option', () => {
    const veryShort = veryShortHistory().phrases()

    expect(playedNotesFileHoldsNote(recordedRecords(), DEFAULT_REQUEST)).toBe(true)
    expect(playedNotesFileHoldsNote(veryShort, DEFAULT_REQUEST)).toBe(false)
    expect(
      playedNotesFileHoldsNote(veryShort, { includeVeryShortNotes: true, scope: WHOLE_SESSION }),
    ).toBe(true)
    expect(historyHoldsPlayedNote(veryShort)).toBe(true)
    expect(
      playedNotesFileHoldsNote(silentHistory().phrases(), {
        includeVeryShortNotes: true,
        scope: WHOLE_SESSION,
      }),
    ).toBe(false)
  })
})

/** Intent: the favorites-only scope of the given phrase numbers. */
function favoritesOnly(...favorites: number[]): ExportScope {
  return { kind: 'favoritesOnly', favorites }
}

/**
 * Intent: the seven-phrase session with a played note only in phrase 1 (a quarter second) and in
 * phrase 3 (very short, 10 ms).
 */
function notesInPhrasesOneAndThree() {
  return sevenPhraseRecords([[[60, 1, 1.25]], [], [[62, 1, 1.01]]])
}

// @test-link [[rule_favorites_only_export]]
// @test-link [[module_review_export_pipeline]]
describe('the Review exports under the favorites-only scope', () => {
  // @test-link [[rule_favorites_only_export]]
  it('builds and downloads the files of the scope the request names', async () => {
    const favorites = sevenPhraseHistory()
    const scope = favoritesOnly(2, 5, 6)
    const { ports, downloads } = recordingPorts()
    const exportModule = await loadGeneratedNotesExport()

    await exportGeneratedNotes(favorites, { format: 'midi', backingTrack: true, scope }, ports)
    await exportPlayedNotes(favorites, { includeVeryShortNotes: false, scope }, ports)

    const generated = exportModule.buildGeneratedNotesFile(
      favorites,
      { format: 'midi', backingTrack: true },
      scope,
    )
    const played = exportModule.buildPlayedNotesFile(
      favorites,
      { includeVeryShortNotes: false },
      scope,
    )
    expect(downloads.map((file) => file.fileName)).toEqual([generated.fileName, played.fileName])
    expect(downloads[0]!.fileName).toMatch(/-generated-favorites\.mid$/u)
    expect([...downloads[0]!.bytes]).toEqual([...generated.bytes])
    expect([...downloads[1]!.bytes]).toEqual([...played.bytes])
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('holds a played note only when a favorite phrase holds one, as the option reads it', () => {
    const records = notesInPhrasesOneAndThree()
    /** Intent: the request with the option off, then on, under `scope`. */
    const off = (scope: ExportScope) => ({ includeVeryShortNotes: false, scope })
    const on = (scope: ExportScope) => ({ includeVeryShortNotes: true, scope })

    expect(playedNotesFileHoldsNote(records, off(favoritesOnly(1)))).toBe(true)
    expect(playedNotesFileHoldsNote(records, on(favoritesOnly(2)))).toBe(false)
    expect(playedNotesFileHoldsNote(records, off(favoritesOnly(3)))).toBe(false)
    expect(playedNotesFileHoldsNote(records, on(favoritesOnly(3)))).toBe(true)
    expect(playedNotesFileHoldsNote(records, off(WHOLE_SESSION))).toBe(true)
  })

  // @test-link [[rule_favorites_only_export]]
  // @test-link [[rule_played_notes_export_omits_stray_notes]]
  it('says why the played-notes file would hold no note, the favorites-only reasons first', () => {
    const records = notesInPhrasesOneAndThree()
    const veryShortOnly = sevenPhraseRecords([[], [], [[62, 1, 1.01]]])
    /** Intent: the request with the option off, then on, under `scope`. */
    const off = (scope: ExportScope) => ({ includeVeryShortNotes: false, scope })
    const on = (scope: ExportScope) => ({ includeVeryShortNotes: true, scope })

    expect(playedNotesUnavailable(records, off(favoritesOnly(2)))).toBe('noPlayedNoteInFavorites')
    expect(playedNotesUnavailable(records, on(favoritesOnly(2, 4)))).toBe('noPlayedNoteInFavorites')
    expect(playedNotesUnavailable(records, off(favoritesOnly(2, 3)))).toBe(
      'everyFavoriteNoteVeryShort',
    )
    expect(playedNotesUnavailable(records, on(favoritesOnly(2, 3)))).toBeNull()
    expect(playedNotesUnavailable(records, off(favoritesOnly(1, 3)))).toBeNull()
    expect(playedNotesUnavailable(records, off(WHOLE_SESSION))).toBeNull()
    expect(playedNotesUnavailable(veryShortOnly, off(WHOLE_SESSION))).toBe('everyNoteVeryShort')
    expect(playedNotesUnavailable(veryShortOnly, on(WHOLE_SESSION))).toBeNull()
  })
})
