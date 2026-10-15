/**
 * The played-notes MIDI encoder: a pure function from a session's played notes to the bytes of
 * one Standard MIDI File, type 1, at 960 MIDI ticks per quarter note. Track 1 is the conductor
 * track, built exactly as the generated-notes file's: the 4/4 time signature, the full tempo map
 * and one marker per phrase, with the file's first phrase at time zero, ending where the last
 * phrase ends, so the two files of one session and one scope line up phrase by phrase. Track 2 holds the notes the player played,
 * unquantized, at their concert pitch and original velocity. The file never holds the backing or
 * a generated note. The output depends only on the input, so the same session always gives the
 * same bytes.
 */
import { MIDI_TICKS_PER_QUARTER_NOTE } from './midi-time'
import {
  conductorTrackEvents,
  MIDI_FILE_NAME,
  phraseStartTick,
  voicedNoteTrackEvents,
} from './midi-tracks'
import { validatePlayedNotesMidiInput, type PlayedNotesMidiInput } from './played-notes-midi-input'
import { playedTrackNotes } from './played-notes-placement'
import { trackChunk, typeOneHeaderChunk } from './smf-writer'

const PLAYED_TRACK_NAME = 'Played notes'

/**
 * Intent: encode a session's played notes (every phrase, or the favorites only) as one type 1
 * Standard MIDI File. Validates the
 * input first and crashes with a MidiExportError on any breach. The conductor track ends where the
 * last phrase ends, as in the generated-notes file; the played track ends there too, or one tick
 * later when a note played just before the end rounds onto it.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_played_notes_export_aligns_with_generated_midi]]
// @spec-link [[rule_export_contents_never_merged]]
export function encodePlayedNotesMidi(input: PlayedNotesMidiInput): Uint8Array {
  validatePlayedNotesMidiInput(input)
  const fileEnd = phraseStartTick(input.phrases.length)
  const notes = playedTrackNotes(input.phrases, fileEnd)
  const playedEnd = notes.reduce((end, note) => Math.max(end, note.endTick), fileEnd)
  return new Uint8Array([
    ...typeOneHeaderChunk(2, MIDI_TICKS_PER_QUARTER_NOTE),
    ...trackChunk(conductorTrackEvents(input.phrases, MIDI_FILE_NAME), fileEnd),
    ...trackChunk(voicedNoteTrackEvents(PLAYED_TRACK_NAME, notes), playedEnd),
  ])
}
