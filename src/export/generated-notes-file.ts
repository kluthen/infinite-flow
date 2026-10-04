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
import type { SessionHistoryRecord } from '../session/session-history'
import {
  GeneratedNotesFileError,
  exportFileStem,
  type ExportFile,
  type ExportableHistory,
} from './export-file'
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

export { GeneratedNotesFileError, exportFileStem, type ExportFile, type ExportableHistory }

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
 * (its start in the player's local time), shared with the played-notes file. Reads no clock.
 * Throws a GeneratedNotesFileError on a start time that is not finite epoch milliseconds.
 */
// @spec-link [[req_session_export]]
export function generatedNotesFileName(startedAtMs: number, format: GeneratedNotesFormat): string {
  return `${exportFileStem(startedAtMs)}-generated.${FILE_EXTENSIONS[format]}`
}

/**
 * Intent: the backing track's notes for every recorded phrase, numbered like the phrase: the bass
 * then the chords the backing renderer gives for the phrase's stored harmony, rendered in 4/4 as
 * the audio transport renders it, so the file's backing equals what sounded.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function backingForExport(
  records: readonly SessionHistoryRecord[],
): readonly MidiBackingPhrase[] {
  return records.map((record) => {
    const { bass, chords } = renderBacking(
      record.outcome.provenance.harmony.events,
      FOUR_FOUR_METER,
    )
    return { number: record.phraseNumber, notes: [...bass, ...chords] }
  })
}

/** Intent: the MusicXML file of the recorded phrases, as UTF-8 bytes. */
// @spec-link [[rule_generated_notes_musicxml_export]]
function musicXmlBytes(records: readonly SessionHistoryRecord[]): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(encodeGeneratedNotesMusicXml(musicXmlInputFromHistory(records)))
}

/**
 * Intent: the MIDI file of the recorded phrases, with the backing track only when asked for. The
 * encoder's bytes are copied into an ArrayBuffer-backed view, the kind a Blob is made from.
 */
// @spec-link [[rule_generated_notes_midi_export]]
function midiBytes(
  records: readonly SessionHistoryRecord[],
  backingTrack: boolean,
): Uint8Array<ArrayBuffer> {
  const backing = backingTrack ? backingForExport(records) : null
  return new Uint8Array(encodeGeneratedNotesMidi(midiInputFromHistory(records, backing)))
}

/**
 * Intent: the one generated-notes file the player asked for, built from the session history:
 * MusicXML in the session profile's written pitch, or MIDI at concert pitch with the backing track
 * only when asked for. Holds no played note, and the same history and request always give the same
 * bytes. The encoders' and adapters' typed errors propagate unchanged.
 */
// @spec-link [[req_session_export]]
export function buildGeneratedNotesFile(
  history: ExportableHistory,
  request: GeneratedNotesRequest,
): ExportFile {
  const records = history.phrases()
  const fileName = generatedNotesFileName(history.startedAt, request.format)
  switch (request.format) {
    case 'musicxml':
      return { fileName, mimeType: MUSICXML_MIME_TYPE, bytes: musicXmlBytes(records) }
    case 'midi':
      return {
        fileName,
        mimeType: MIDI_MIME_TYPE,
        bytes: midiBytes(records, request.backingTrack),
      }
    default:
      throw new GeneratedNotesFileError(
        `Unknown generated-notes format: ${String(request.format)}.`,
      )
  }
}
