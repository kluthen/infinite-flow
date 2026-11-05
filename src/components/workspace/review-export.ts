/**
 * The Review's exports as the page runs them, the generated-notes file and the played-notes file:
 * the export code (every encoder and the backing renderer) is loaded on demand through its lazy
 * boundary, the one file the player asked for is built from the session history, and the browser
 * downloads it. Every failure, a failed load of the export code included, is a rejection the
 * Review shows as its export error. Nothing here is stored or sent: the download is the only way
 * the file leaves the page.
 */
import type { PlayedNotesUnavailable } from '@/components/review/review-types'
import {
  recordsWithoutVeryShortNotes,
  withoutVeryShortNotes,
} from '@/domain/played-notes/stray-notes'
import { downloadFile } from '@/export/browser-download'
import type { ExportDoodleSection, ExportScope } from '@/export/export-file'
import { phrasesInScope } from '@/export/favorites-selection'
import type { PlayedNotesDoodleSection } from '@/export/midi/played-notes-midi-input'
import {
  loadGeneratedNotesExport,
  type ExportFile,
  type ExportableHistory,
  type GeneratedNotesExportModule,
  type GeneratedNotesRequest,
} from '@/export/load-generated-notes-export'
import type { RecordedPlayedNote, ReviewedPhrase } from '@/session/session-history'

/** What the played-notes readers read of a phrase: its number, start, tempo and played notes. */
type PlayedPhrase = Pick<ReviewedPhrase, 'phraseNumber' | 'startedAt' | 'tempo' | 'playedNotes'>

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
 * the export code: some played note in a phrase of its scope that is not very short, or any one
 * when very short notes are included, as the file's selection keeps them; in a Jam, a raw doodle
 * note counts the same way in either scope, the doodle never a favorite (`doodleNotes`: the Jam
 * part's raw doodle notes; none for a session that is no Jam). `Export played notes` is disabled
 * while it would not.
 */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function playedNotesFileHoldsNote(
  records: readonly PlayedPhrase[],
  request: PlayedNotesExportRequest,
  doodleNotes: readonly RecordedPlayedNote[] = [],
): boolean {
  const read = request.includeVeryShortNotes ? records : recordsWithoutVeryShortNotes(records)
  const doodle = request.includeVeryShortNotes ? doodleNotes : withoutVeryShortNotes(doodleNotes)
  return doodle.length > 0 || historyHoldsPlayedNote(phrasesInScope(read, request.scope))
}

/**
 * What the reasons read of a Jam session beside its phrases: its raw doodle notes, and whether
 * Jam's code, which builds the doodle's part of each file, failed to load for this Review.
 */
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export interface PlayedNotesJam {
  readonly doodleNotes: readonly RecordedPlayedNote[]
  readonly codeFailed: boolean
}

/**
 * Intent: why the played-notes file `request` asks for would hold no note, the first reason that
 * applies, or null when it holds one. In a Jam whose code could not load, that comes first. Under
 * favorites only, no favorite phrase holding a played note (very short ones counted) and, in a Jam,
 * no raw doodle note either, then every one of theirs very short (in a Jam, its favorites' and its
 * doodle's); under the whole session, every played note very short.
 */
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
// @spec-link [[rule_jam_code_loaded_on_demand]]
export function playedNotesUnavailable(
  records: readonly PlayedPhrase[],
  request: PlayedNotesExportRequest,
  jam: PlayedNotesJam | null = null,
): PlayedNotesUnavailable | null {
  if (jam?.codeFailed === true) return 'doodleNotLoaded'
  const doodleNotes = jam?.doodleNotes ?? []
  if (playedNotesFileHoldsNote(records, request, doodleNotes)) return null
  if (request.scope.kind === 'wholeSession') return 'everyNoteVeryShort'
  if (doodleNotes.length === 0 && !historyHoldsPlayedNote(phrasesInScope(records, request.scope)))
    return 'noPlayedNoteInFavorites'
  return jam === null ? 'everyFavoriteNoteVeryShort' : 'everyFavoriteAndDoodleNoteVeryShort'
}
