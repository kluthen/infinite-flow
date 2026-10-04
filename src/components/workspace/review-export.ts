/**
 * The Review's exports as the page runs them, the generated-notes file and the played-notes file:
 * the export code (every encoder and the backing renderer) is loaded on demand through its lazy
 * boundary, the one file the player asked for is built from the session history, and the browser
 * downloads it. Every failure, a failed load of the export code included, is a rejection the
 * Review shows as its export error. Nothing here is stored or sent: the download is the only way
 * the file leaves the page.
 */
import type { ExportRequest } from '@/components/review/review-types'
import { downloadFile } from '@/export/browser-download'
import {
  loadGeneratedNotesExport,
  type ExportFile,
  type ExportableHistory,
  type GeneratedNotesExportModule,
} from '@/export/load-generated-notes-export'
import type { SessionHistoryRecord } from '@/session/session-history'

/** What an export uses: the on-demand load of the export code, and the browser's download. */
// @spec-link [[req_session_export]]
// @spec-link [[req_played_notes_export]]
export interface ReviewExportPorts {
  readonly load: () => Promise<
    Pick<GeneratedNotesExportModule, 'buildGeneratedNotesFile' | 'buildPlayedNotesFile'>
  >
  readonly download: (file: ExportFile) => void
}

/** Intent: the page's own ports: the lazy export code, and a download made through `doc`. */
// @spec-link [[req_session_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
export function browserReviewExportPorts(doc: Document): ReviewExportPorts {
  return { load: loadGeneratedNotesExport, download: (file) => downloadFile(file, doc) }
}

/**
 * Intent: build the one file `request` asks for from `history` and hand it to the browser; the
 * same history and request always give the same bytes. Resolves once the download is handed
 * over; any failure on the way rejects, with nothing downloaded unless the download itself failed.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[rule_generated_notes_midi_export]]
export async function exportGeneratedNotes(
  history: ExportableHistory,
  request: ExportRequest,
  ports: ReviewExportPorts,
): Promise<void> {
  const { buildGeneratedNotesFile } = await ports.load()
  ports.download(buildGeneratedNotesFile(history, request))
}

/**
 * Intent: build the session's played-notes MIDI file from `history` and hand it to the browser,
 * as a file of its own; the same history always gives the same bytes. Resolves once the download
 * is handed over; any failure on the way (the export code failing to load, a history with no
 * played note) rejects, with nothing downloaded unless the download itself failed.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
export async function exportPlayedNotes(
  history: ExportableHistory,
  ports: ReviewExportPorts,
): Promise<void> {
  const { buildPlayedNotesFile } = await ports.load()
  ports.download(buildPlayedNotesFile(history))
}

/**
 * Intent: whether the session holds a played note to export, read without loading the export
 * code, so the Review shows the played-notes action only when it can make a file. History records
 * hold only the notes played within a phrase (session-history-played-notes.ts places a note in the
 * record whose phrase its onset falls in and drops one played before phrase 1 starts, the count-in
 * included), so a note played only before the first phrase never shows the action.
 */
// @spec-link [[req_played_notes_export]]
export function historyHoldsPlayedNote(
  records: readonly Pick<SessionHistoryRecord, 'playedNotes'>[],
): boolean {
  return records.some((record) => record.playedNotes.length > 0)
}
