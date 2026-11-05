/**
 * The generated-notes MIDI encoder: a pure function from a session's phrases to the bytes of one
 * Standard MIDI File, type 1, at 960 MIDI ticks per quarter note. Track 1 is the conductor track:
 * the 4/4 time signature, the full tempo map and one marker per phrase. Track 2 holds the
 * generated line at concert pitch. Track 3, only when the player asks for the backing, holds the
 * backing. The phrases the file holds (every phrase, or the favorites only, each with its session
 * number) sit back to back from the first at time zero, and every track ends where the last phrase
 * ends. A Jam's file opens with its doodle instead: the quantized doodle on the generated line's
 * track from time zero, at its capture tempo under a "Doodle" marker, no backing under it, and the
 * first phrase at the doodle's last barline. The output depends only on the input, so the same
 * session always gives the same bytes.
 */
import { validateMidiExportInput, type GeneratedNotesMidiInput } from './midi-export-input'
import {
  backingNotes,
  conductorTrackEvents,
  doodleNotes,
  generatedLineNotes,
  MIDI_FILE_NAME,
  noteTrackEvents,
  phrasesOrigin,
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
 * Intent: encode a session's generated notes (every phrase, or the favorites only) as one type 1
 * Standard MIDI File, a Jam's opening with its doodle. Validates the
 * input first and crashes with a MidiExportError on any breach; never takes or writes a played
 * note, and writes the backing track only when the input carries the backing, never under the
 * doodle.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_jam_exports_line_up]]
export function encodeGeneratedNotesMidi(input: GeneratedNotesMidiInput): Uint8Array {
  validateMidiExportInput(input)
  const doodle = input.doodle ?? null
  const origin = phrasesOrigin(doodle)
  const endTick = phraseStartTick(input.phrases.length, origin)
  const tracks = [
    conductorTrackEvents(input.phrases, MIDI_FILE_NAME, doodle),
    noteTrackEvents(
      GENERATED_TRACK_NAME,
      [
        ...(doodle === null ? [] : doodleNotes(doodle)),
        ...input.phrases.flatMap((phrase, position) =>
          generatedLineNotes(phrase.timeline, phrase.number, position, origin),
        ),
      ],
      GENERATED_CHANNEL,
      GENERATED_VELOCITY,
    ),
  ]
  if (input.backing !== null) {
    tracks.push(
      noteTrackEvents(
        BACKING_TRACK_NAME,
        input.backing.flatMap((phrase, position) => backingNotes(phrase, position, origin)),
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
