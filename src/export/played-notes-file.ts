/**
 * The played-notes export file of a finished session: the bytes, the file name and the MIME type
 * of one MIDI file holding the notes the player played (very short notes left out unless the
 * player includes them, `@/domain/played-notes/stray-notes`), built from the session history by the
 * history's played-notes adapter and the played-notes MIDI encoder, never by re-encoding anything
 * here. It is a file of its own, never merged with the generated-notes file, and its name shares
 * that file's session stem so the two sort side by side. Pure: no DOM, no clock read, no storage,
 * no network. It reaches the page only through `generated-notes-file.ts`'s re-export, inside the
 * lazy export chunk `load-generated-notes-export.ts` loads on demand.
 */

import { recordsWithoutVeryShortNotes } from '../domain/played-notes/stray-notes'
import { playedNotesMidiInputFromHistory } from '../session/session-history-export'
import {
  WHOLE_SESSION,
  exportFileStem,
  scopeNameSuffix,
  type ExportFile,
  type ExportScope,
  type ExportableHistory,
} from './export-file'
import { phrasesInScope } from './favorites-selection'
import { encodePlayedNotesMidi } from './midi/played-notes-midi-encoder'

const MIDI_MIME_TYPE = 'audio/midi'

/** What the played-notes file holds beyond its default: very short notes, when asked for. */
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
export interface PlayedNotesFileOptions {
  readonly includeVeryShortNotes: boolean
}

/** The file's default: very short notes left out. */
const DEFAULT_OPTIONS: PlayedNotesFileOptions = { includeVeryShortNotes: false }

/**
 * Intent: the file name of a session's played-notes file,
 * `infinite-flow-{YYYY-MM-DD}-{HHmmss}-played.mid`: the same session stem as the generated-notes
 * file, then its own suffix, so the two files of one session are told apart and never mistaken
 * for one; `-played-favorites.mid` under the favorites-only scope. Reads no clock. Throws a
 * GeneratedNotesFileError on a start time that is not finite epoch milliseconds.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
export function playedNotesFileName(
  startedAtMs: number,
  scope: ExportScope = WHOLE_SESSION,
): string {
  return `${exportFileStem(startedAtMs)}-played${scopeNameSuffix(scope)}.mid`
}

/**
 * Intent: the played-notes MIDI file of a session, built from the phrases `scope` picks from its
 * history (the whole session by default; ./favorites-selection.ts): exactly the played-notes
 * encoder's bytes for their played-notes input, very short notes left out unless
 * `options.includeVeryShortNotes` (then every note as received), copied into an ArrayBuffer-backed
 * view, the kind a Blob is made from. A note is judged very short by its length as played, before
 * the scope stops a held note at a favorite phrase's end. The same history, options and scope
 * always give the same bytes. The selection's, adapter's and encoder's typed errors (an empty
 * history, a scope with no favorite, a file with no played note to hold) propagate unchanged.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_played_notes_export_omits_stray_notes]]
// @spec-link [[rule_favorites_only_export]]
export function buildPlayedNotesFile(
  history: ExportableHistory,
  options: PlayedNotesFileOptions = DEFAULT_OPTIONS,
  scope: ExportScope = WHOLE_SESSION,
): ExportFile {
  const fileName = playedNotesFileName(history.startedAt, scope)
  const phrases = history.phrases()
  const read = options.includeVeryShortNotes ? phrases : recordsWithoutVeryShortNotes(phrases)
  const bytes = encodePlayedNotesMidi(playedNotesMidiInputFromHistory(phrasesInScope(read, scope)))
  return { fileName, mimeType: MIDI_MIME_TYPE, bytes: new Uint8Array(bytes) }
}
