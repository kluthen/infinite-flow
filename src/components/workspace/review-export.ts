/**
 * The Review's generated-notes export as the page runs it: the export code (both encoders and the
 * backing renderer) is loaded on demand through its lazy boundary, the one file the player asked
 * for is built from the session history, and the browser downloads it. Every failure, a failed
 * load of the export code included, is a rejection the Review shows as its export error. Nothing
 * here is stored or sent: the download is the only way the file leaves the page.
 */
import type { ExportRequest } from '@/components/review/review-types'
import { downloadFile } from '@/export/browser-download'
import {
  loadGeneratedNotesExport,
  type ExportFile,
  type ExportableHistory,
  type GeneratedNotesExportModule,
} from '@/export/load-generated-notes-export'

/** What an export uses: the on-demand load of the export code, and the browser's download. */
// @spec-link [[req_session_export]]
export interface ReviewExportPorts {
  readonly load: () => Promise<Pick<GeneratedNotesExportModule, 'buildGeneratedNotesFile'>>
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
