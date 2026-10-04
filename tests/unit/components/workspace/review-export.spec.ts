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
  type ReviewExportPorts,
} from '@/components/workspace/review-export'
import { BrowserDownloadError } from '@/export/browser-download'
import type { ExportFile } from '@/export/generated-notes-file'
import {
  GeneratedNotesExportLoadError,
  loadGeneratedNotesExport,
  type ExportableHistory,
} from '@/export/load-generated-notes-export'
import { MidiExportError } from '@/export/midi/midi-export-input'
import { recordedRecords } from '../review/review-fixtures'
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

      await exportGeneratedNotes(history(), { format, backingTrack }, ports)

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

      await exportGeneratedNotes(history(), { format, backingTrack }, ports)
      await exportGeneratedNotes(history(), { format, backingTrack }, ports)

      expect(downloads).toHaveLength(2)
      expect(downloads[1]?.fileName).toBe(downloads[0]?.fileName)
      expect([...(downloads[1]?.bytes ?? [])]).toEqual([...(downloads[0]?.bytes ?? [])])
    },
  )

  // @test-link [[req_session_export]]
  it('holds the backing track in the MIDI file only when asked for', async () => {
    const { ports, downloads } = recordingPorts()

    await exportGeneratedNotes(history(), { format: 'midi', backingTrack: false }, ports)
    await exportGeneratedNotes(history(), { format: 'midi', backingTrack: true }, ports)

    expect(downloads[1]?.bytes.byteLength).toBeGreaterThan(downloads[0]?.bytes.byteLength ?? 0)
  })

  // @test-link [[req_session_export]]
  it('rejects, downloading nothing, when the export code fails to load', async () => {
    const failure = new GeneratedNotesExportLoadError('chunk failed to fetch', new Error('offline'))
    const { ports, downloads } = recordingPorts(() => Promise.reject(failure))

    await expect(
      exportGeneratedNotes(history(), { format: 'musicxml', backingTrack: false }, ports),
    ).rejects.toBe(failure)
    expect(downloads).toEqual([])
  })

  // @test-link [[req_session_export]]
  it('rejects, downloading nothing, when the file cannot be built', async () => {
    const { ports, downloads } = recordingPorts()

    await expect(
      exportGeneratedNotes(history(Number.NaN), { format: 'midi', backingTrack: false }, ports),
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
      exportGeneratedNotes(history(), { format: 'musicxml', backingTrack: false }, ports),
    ).rejects.toBe(failure)
    expect(ports.download).toHaveBeenCalledTimes(1)
  })

  // @test-link [[req_session_export]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it("hands the file to the given document's download, the only way it leaves the page", async () => {
    const windowless = document.implementation.createHTMLDocument('no window')
    const ports = browserReviewExportPorts(windowless)

    await expect(
      exportGeneratedNotes(history(), { format: 'musicxml', backingTrack: false }, ports),
    ).rejects.toBeInstanceOf(BrowserDownloadError)
  })
})

/** Intent: the recorded session's history with every played note taken out. */
function silentHistory(): ExportableHistory {
  const records = recordedRecords().map((record) => ({ ...record, playedNotes: [] }))
  return { phrases: () => records, startedAt: SESSION_START_EPOCH_MS }
}

// @test-link [[req_played_notes_export]]
describe('the Review played-notes export', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_session_data_never_sent_or_stored]]
  it('downloads exactly one MIDI file, named from the session start', async () => {
    const { ports, downloads } = recordingPorts()

    await exportPlayedNotes(history(), ports)

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

    await exportPlayedNotes(history(), ports)
    await exportPlayedNotes(history(), ports)

    expect(downloads).toHaveLength(2)
    expect([...(downloads[1]?.bytes ?? [])]).toEqual([...(downloads[0]?.bytes ?? [])])
  })

  // @test-link [[req_played_notes_export]]
  it('rejects, downloading nothing, when the export code fails to load', async () => {
    const failure = new GeneratedNotesExportLoadError('chunk failed to fetch', new Error('offline'))
    const { ports, downloads } = recordingPorts(() => Promise.reject(failure))

    await expect(exportPlayedNotes(history(), ports)).rejects.toBe(failure)
    expect(downloads).toEqual([])
  })

  // @test-link [[req_played_notes_export]]
  it('rejects, downloading nothing, when the file cannot be built', async () => {
    const { ports, downloads } = recordingPorts()

    await expect(exportPlayedNotes(silentHistory(), ports)).rejects.toBeInstanceOf(MidiExportError)
    await expect(exportPlayedNotes(history(Number.NaN), ports)).rejects.toMatchObject({
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
