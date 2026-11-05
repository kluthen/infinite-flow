/**
 * The generated-notes export file of a finished session: the bytes, the file name and the MIME type
 * of one MusicXML or MIDI file, built from the session history by the history's encoder adapters
 * and the two encoders, never by re-encoding anything here. The MIDI backing track is the backing
 * renderer's output for each phrase's harmony, in the meter the audio transport renders it in, so
 * the file holds what sounded. Pure: no DOM, no clock read, no storage, no network. The shell loads
 * this module on demand through `load-generated-notes-export.ts`, outside the entry chunk; it
 * re-exports the played-notes file builder (`played-notes-file.ts`), so that one lazy chunk holds
 * every session export file.
 */

import { renderBacking } from '../domain/backing/backing-renderer'
import { FOUR_FOUR_METER } from '../domain/generation/generation-request'
import { midiInputFromHistory, musicXmlInputFromHistory } from '../session/session-history-export'
import type { ReviewedPhrase } from '../session/session-history'
import {
  GeneratedNotesFileError,
  WHOLE_SESSION,
  exportFileStem,
  scopeNameSuffix,
  type ExportDoodleSection,
  type ExportFile,
  type ExportScope,
  type ExportableHistory,
} from './export-file'
import { phrasesInScope } from './favorites-selection'
import { encodeGeneratedNotesMidi } from './midi/midi-encoder'
import type { MidiBackingPhrase } from './midi/midi-export-input'
import { encodeGeneratedNotesMusicXml } from './musicxml/musicxml-encoder'

/** The two generated-notes formats the player can pick. */
// @spec-link [[req_session_export]]
export type GeneratedNotesFormat = 'musicxml' | 'midi'

/**
 * What the player asked for: the format and, for MIDI only, whether the backing track goes in
 * (off by default in the UI). `backingTrack` is ignored for MusicXML, which never holds a backing.
 */
// @spec-link [[req_session_export]]
export interface GeneratedNotesRequest {
  readonly format: GeneratedNotesFormat
  readonly backingTrack: boolean
}

export {
  GeneratedNotesFileError,
  WHOLE_SESSION,
  exportFileStem,
  type ExportDoodleSection,
  type ExportFile,
  type ExportScope,
  type ExportableHistory,
}

/**
 * The played-notes file rides in this module's lazy chunk: re-exported here, so the one load
 * through `load-generated-notes-export.ts` yields both builders.
 */
// @spec-link [[req_played_notes_export]]
export { buildPlayedNotesFile, playedNotesFileName } from './played-notes-file'

const MUSICXML_MIME_TYPE = 'application/vnd.recordare.musicxml+xml'
const MIDI_MIME_TYPE = 'audio/midi'

const FILE_EXTENSIONS: Readonly<Record<GeneratedNotesFormat, string>> = {
  musicxml: 'musicxml',
  midi: 'mid',
}

/**
 * Intent: the file name of a session's generated-notes file,
 * `infinite-flow-{YYYY-MM-DD}-{HHmmss}-generated.musicxml` or `.mid`: the session's export stem
 * (its start in the player's local time), shared with the played-notes file, with `-favorites`
 * after `generated` under the favorites-only scope. Reads no clock. Throws a
 * GeneratedNotesFileError on a start time that is not finite epoch milliseconds.
 */
// @spec-link [[req_session_export]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
export function generatedNotesFileName(
  startedAtMs: number,
  format: GeneratedNotesFormat,
  scope: ExportScope = WHOLE_SESSION,
): string {
  return `${exportFileStem(startedAtMs)}-generated${scopeNameSuffix(scope)}.${FILE_EXTENSIONS[format]}`
}

/**
 * Intent: the backing track's notes for every recorded phrase, numbered like the phrase: the bass
 * then the chords the backing renderer gives for the phrase's stored harmony, rendered in 4/4 as
 * the audio transport renders it, so the file's backing equals what sounded.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function backingForExport(records: readonly ReviewedPhrase[]): readonly MidiBackingPhrase[] {
  return records.map((record) => {
    const { bass, chords } = renderBacking(
      record.outcome.provenance.harmony.events,
      FOUR_FOUR_METER,
    )
    return { number: record.phraseNumber, notes: [...bass, ...chords] }
  })
}

/**
 * Intent: the MusicXML file of the recorded phrases, as UTF-8 bytes, a Jam's opening with its
 * doodle.
 */
// @spec-link [[rule_generated_notes_musicxml_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
function musicXmlBytes(
  records: readonly ReviewedPhrase[],
  doodle: ExportDoodleSection | null,
): Uint8Array<ArrayBuffer> {
  const input = musicXmlInputFromHistory(records)
  const withDoodle = doodle === null ? input : { ...input, doodle: doodle.musicXml }
  return new TextEncoder().encode(encodeGeneratedNotesMusicXml(withDoodle))
}

/**
 * Intent: the MIDI file of the recorded phrases, with the backing track only when asked for, a
 * Jam's opening with its doodle. The encoder's bytes are copied into an ArrayBuffer-backed view,
 * the kind a Blob is made from.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
function midiBytes(
  records: readonly ReviewedPhrase[],
  backingTrack: boolean,
  doodle: ExportDoodleSection | null,
): Uint8Array<ArrayBuffer> {
  const backing = backingTrack ? backingForExport(records) : null
  const input = midiInputFromHistory(records, backing)
  const withDoodle = doodle === null ? input : { ...input, doodle: doodle.midi }
  return new Uint8Array(encodeGeneratedNotesMidi(withDoodle))
}

/**
 * Intent: the one generated-notes file the player asked for, built from the phrases `scope` picks
 * from the session history (the whole session by default; ./favorites-selection.ts): MusicXML in
 * the session profile's written pitch, or MIDI at concert pitch with the backing track only when
 * asked for. A Jam's file (`doodle` given) opens with its doodle section in either scope, the doodle
 * never a favorite; a session that is no Jam passes null and gets v3.1's file. Holds no played
 * note, and the same history, request, scope and doodle always give the same bytes. The
 * selection's, encoders' and adapters' typed errors propagate unchanged.
 */
// @spec-link [[req_session_export]]
// @spec-link [[module_review_export_pipeline]]
// @spec-link [[rule_favorites_only_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export function buildGeneratedNotesFile(
  history: ExportableHistory,
  request: GeneratedNotesRequest,
  scope: ExportScope = WHOLE_SESSION,
  doodle: ExportDoodleSection | null = null,
): ExportFile {
  const records = phrasesInScope(history.phrases(), scope)
  const fileName = generatedNotesFileName(history.startedAt, request.format, scope)
  switch (request.format) {
    case 'musicxml':
      return { fileName, mimeType: MUSICXML_MIME_TYPE, bytes: musicXmlBytes(records, doodle) }
    case 'midi':
      return {
        fileName,
        mimeType: MIDI_MIME_TYPE,
        bytes: midiBytes(records, request.backingTrack, doodle),
      }
    default:
      throw new GeneratedNotesFileError(
        `Unknown generated-notes format: ${String(request.format)}.`,
      )
  }
}
