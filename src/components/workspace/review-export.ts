/**
 * The Review's exports as the page runs them, the generated-notes file and the played-notes file:
 * the export code (every encoder and the backing renderer) is loaded on demand through its lazy
 * boundary, the one file the player asked for is built from the session history, and the browser
 * downloads it. Every failure, a failed load of the export code included, is a rejection the
 * Review shows as its export error. Nothing here is stored or sent: the download is the only way
 * the file leaves the page. Whether the played-notes file would hold a note, and why not, is read
 * without loading the export code (./played-notes-availability.ts).
 */
import { downloadFile } from '@/export/browser-download'
import type { ExportDoodleSection, ExportScope } from '@/export/export-file'
import type { PlayedNotesDoodleSection } from '@/export/midi/played-notes-midi-input'
import {
  loadGeneratedNotesExport,
  type ExportFile,
  type ExportableHistory,
  type GeneratedNotesExportModule,
  type GeneratedNotesRequest,
} from '@/export/load-generated-notes-export'

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
 * What the generated-notes export is asked for: the format, the backing track for MIDI, and the
 * scope, the favorite phrases' numbers already read when it names favorites only.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_favorites_only_export]]
export interface GeneratedNotesExportRequest extends GeneratedNotesRequest {
  readonly scope: ExportScope
}

/**
 * Intent: build the one file `request` asks for from the phrases its scope picks from `history`
 * and hand it to the browser, a Jam's file opening with `doodle` (built by Jam's code; null for a
 * session that is no Jam); the same history, request and doodle always give the same bytes.
 * Resolves once the download is handed over; any failure on the way rejects, with nothing
 * downloaded unless the download itself failed.
 */
// @spec-link [[req_session_export]]
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export async function exportGeneratedNotes(
  history: ExportableHistory,
  request: GeneratedNotesExportRequest,
  ports: ReviewExportPorts,
  doodle: ExportDoodleSection | null = null,
): Promise<void> {
  const { buildGeneratedNotesFile } = await ports.load()
  const { format, backingTrack, scope } = request
  ports.download(buildGeneratedNotesFile(history, { format, backingTrack }, scope, doodle))
}

/**
 * What the played-notes export is asked for: whether the file holds very short notes too
 * (`Include very short notes`, off by default), and the scope, as for the generated notes.
 */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_favorites_only_export]]
export interface PlayedNotesExportRequest {
  readonly includeVeryShortNotes: boolean
  readonly scope: ExportScope
}

/**
 * Intent: build the session's played-notes MIDI file from the phrases the scope picks from
 * `history`, as `request` asks (very short notes left out unless included), and hand it to the
 * browser, as a file of its own, a Jam's opening with `doodle` (built by Jam's code; null for a
 * session that is no Jam); the same history, request and doodle always give the same bytes.
 * Resolves once the download is handed over; any
 * failure on the way (the export code failing to load, a history with no played note to hold)
 * rejects, with nothing downloaded unless the download itself failed.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_session_data_never_sent_or_stored]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export async function exportPlayedNotes(
  history: ExportableHistory,
  request: PlayedNotesExportRequest,
  ports: ReviewExportPorts,
  doodle: PlayedNotesDoodleSection | null = null,
): Promise<void> {
  const { buildPlayedNotesFile } = await ports.load()
  const { includeVeryShortNotes, scope } = request
  ports.download(buildPlayedNotesFile(history, { includeVeryShortNotes }, scope, doodle))
}
