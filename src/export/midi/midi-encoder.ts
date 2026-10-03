/**
 * The generated-notes MIDI encoder: a pure function from a session's phrases to the bytes of one
 * Standard MIDI File, type 1, at 960 MIDI ticks per quarter note. Track 1 is the conductor track:
 * the 4/4 time signature, the full tempo map and one marker per phrase. Track 2 holds the
 * generated line at concert pitch. Track 3, only when the player asks for the backing, holds the
 * backing. The phrases sit back to back from phrase 1 at time zero, and every track ends where the
 * last phrase ends. The output depends only on the input, so the same session always gives the
 * same bytes.
 */
import { validateMidiExportInput, type GeneratedNotesMidiInput } from './midi-export-input'
import {
  backingNotes,
  conductorTrackEvents,
  generatedLineNotes,
  MIDI_FILE_NAME,
  noteTrackEvents,
  phraseStartTick,
} from './midi-tracks'
import { MIDI_TICKS_PER_QUARTER_NOTE } from './midi-time'
import { trackChunk, typeOneHeaderChunk } from './smf-writer'

const GENERATED_TRACK_NAME = 'Generated notes'
const BACKING_TRACK_NAME = 'Backing'

/** Zero-based MIDI channels: the generated line on channel 1, the backing on channel 2. */
const GENERATED_CHANNEL = 0
const BACKING_CHANNEL = 1

/**
 * Fixed note-on velocities: the file keeps no dynamics, since the generated line has none. The
 * line is written a little louder than the backing so it stands out when the file is played.
 */
const GENERATED_VELOCITY = 96
const BACKING_VELOCITY = 72

/**
 * Intent: encode a whole session's generated notes as one type 1 Standard MIDI File. Validates the
 * input first and crashes with a MidiExportError on any breach; never takes or writes a played
 * note, and writes the backing track only when the input carries the backing.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
export function encodeGeneratedNotesMidi(input: GeneratedNotesMidiInput): Uint8Array {
  validateMidiExportInput(input)
  const endTick = phraseStartTick(input.phrases.length + 1)
  const tracks = [
    conductorTrackEvents(input.phrases, MIDI_FILE_NAME),
    noteTrackEvents(
      GENERATED_TRACK_NAME,
      input.phrases.flatMap((phrase) => generatedLineNotes(phrase.timeline, phrase.number)),
      GENERATED_CHANNEL,
      GENERATED_VELOCITY,
    ),
  ]
  if (input.backing !== null) {
    tracks.push(
      noteTrackEvents(
        BACKING_TRACK_NAME,
        input.backing.flatMap(backingNotes),
        BACKING_CHANNEL,
        BACKING_VELOCITY,
      ),
    )
  }
  return new Uint8Array([
    ...typeOneHeaderChunk(tracks.length, MIDI_TICKS_PER_QUARTER_NOTE),
    ...tracks.flatMap((events) => trackChunk(events, endTick)),
  ])
}
