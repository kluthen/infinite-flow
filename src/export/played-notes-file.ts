/**
 * The played-notes export file of a finished session: the bytes, the file name and the MIME type
 * of one MIDI file holding the notes the player played, built from the session history by the
 * history's played-notes adapter and the played-notes MIDI encoder, never by re-encoding anything
 * here. It is a file of its own, never merged with the generated-notes file, and its name shares
 * that file's session stem so the two sort side by side. Pure: no DOM, no clock read, no storage,
 * no network. It reaches the page only through `generated-notes-file.ts`'s re-export, inside the
 * lazy export chunk `load-generated-notes-export.ts` loads on demand.
 */

import { playedNotesMidiInputFromHistory } from '../session/session-history-export'
import { exportFileStem, type ExportFile, type ExportableHistory } from './export-file'
import { encodePlayedNotesMidi } from './midi/played-notes-midi-encoder'

const MIDI_MIME_TYPE = 'audio/midi'

/**
 * Intent: the file name of a session's played-notes file,
 * `infinite-flow-{YYYY-MM-DD}-{HHmmss}-played.mid`: the same session stem as the generated-notes
 * file, then its own suffix, so the two files of one session are told apart and never mistaken
 * for one. Reads no clock. Throws a
 * GeneratedNotesFileError on a start time that is not finite epoch milliseconds.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[module_review_export_pipeline]]
export function playedNotesFileName(startedAtMs: number): string {
  return `${exportFileStem(startedAtMs)}-played.mid`
}

/**
 * Intent: the played-notes MIDI file of a session, built from its history: exactly the played-notes
 * encoder's bytes for the history's played-notes input, copied into an ArrayBuffer-backed view,
 * the kind a Blob is made from. The same history always gives the same bytes. The adapter's and
 * encoder's typed errors (an empty history, a history with no played note) propagate unchanged.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
export function buildPlayedNotesFile(history: ExportableHistory): ExportFile {
  const fileName = playedNotesFileName(history.startedAt)
  const bytes = encodePlayedNotesMidi(playedNotesMidiInputFromHistory(history.phrases()))
  return { fileName, mimeType: MIDI_MIME_TYPE, bytes: new Uint8Array(bytes) }
}
