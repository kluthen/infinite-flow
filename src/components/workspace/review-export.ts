/**
 * The Review's exports as the page runs them, the generated-notes file and the played-notes file:
 * the export code (every encoder and the backing renderer) is loaded on demand through its lazy
 * boundary, the one file the player asked for is built from the session history, and the browser
 * downloads it. Every failure, a failed load of the export code included, is a rejection the
 * Review shows as its export error. Nothing here is stored or sent: the download is the only way
 * the file leaves the page.
 */
import type { ExportRequest } from '@/components/review/review-types'
import { recordsWithoutVeryShortNotes } from '@/domain/played-notes/stray-notes'
import { downloadFile } from '@/export/browser-download'
import {
  loadGeneratedNotesExport,
  type ExportFile,
  type ExportableHistory,
  type GeneratedNotesExportModule,
} from '@/export/load-generated-notes-export'
import type { ReviewedPhrase } from '@/session/session-history'

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
// @spec-link [[module_review_export_pipeline]]
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
// @spec-link [[module_review_export_pipeline]]
export async function exportGeneratedNotes(
  history: ExportableHistory,
  request: ExportRequest,
  ports: ReviewExportPorts,
): Promise<void> {
  const { buildGeneratedNotesFile } = await ports.load()
  ports.download(buildGeneratedNotesFile(history, request))
}

/**
 * What the played-notes export is asked for: whether the file holds very short notes too
 * (`Include very short notes`, off by default).
 */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
export interface PlayedNotesExportRequest {
  readonly includeVeryShortNotes: boolean
}

/**
 * Intent: build the session's played-notes MIDI file from `history` as `request` asks (very short
 * notes left out unless included) and hand it to the browser, as a file of its own; the same
 * history and request always give the same bytes. Resolves once the download is handed over; any
 * failure on the way (the export code failing to load, a history with no played note to hold)
 * rejects, with nothing downloaded unless the download itself failed.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
export async function exportPlayedNotes(
  history: ExportableHistory,
  request: PlayedNotesExportRequest,
  ports: ReviewExportPorts,
): Promise<void> {
  const { buildPlayedNotesFile } = await ports.load()
  ports.download(buildPlayedNotesFile(history, request))
}

/**
 * Intent: whether the session holds a played note to export, very short ones included, read
 * without loading the export code, so the Review shows the played-notes action only when it can
 * make a file. History records
 * hold only the notes played within a phrase (session-history-played-notes.ts places a note in the
 * record whose phrase its onset falls in and drops one played before phrase 1 starts, the count-in
 * included), so a note played only before the first phrase never shows the action.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
export function historyHoldsPlayedNote(
  records: readonly Pick<ReviewedPhrase, 'playedNotes'>[],
): boolean {
  return records.some((record) => record.playedNotes.length > 0)
}

/**
 * Intent: whether the played-notes file `request` asks for would hold a note, read without loading
 * the export code: some played note in a phrase that is not very short, or any one when very
 * short notes are included. `Export played notes` is disabled while it would not.
 */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[module_review_export_pipeline]]
export function playedNotesFileHoldsNote(
  records: readonly Pick<ReviewedPhrase, 'playedNotes'>[],
  request: PlayedNotesExportRequest,
): boolean {
  const read = request.includeVeryShortNotes ? records : recordsWithoutVeryShortNotes(records)
  return historyHoldsPlayedNote(read)
}
