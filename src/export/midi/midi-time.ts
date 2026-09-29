/**
 * Time in the exported MIDI files. A Standard MIDI File counts time in MIDI ticks, a fixed
 * fraction of a quarter note set once in the file header (not the app's sixteenth-note tick). The
 * export fixes that fraction at 960 MIDI ticks per quarter note for every MIDI file it writes, so
 * the generated-notes file and the played-notes file of one session share one time grid and line
 * up. Tempo is written as microseconds per quarter note, the only unit the format has for it.
 */
import type { Rational } from '@/domain/time/rational'
import { MidiExportError } from './midi-export-input'

/**
 * The file's time resolution: 960 MIDI ticks per quarter note. At 60 BPM, the slowest tempo, a
 * quarter note lasts 1 s, so one MIDI tick lasts 1000 / 960 ≈ 1.042 ms. Rounding a time to the
 * nearest tick moves it by at most half of that, about 0.521 ms, so no onset ever moves by more
 * than 1 ms; at any faster tempo a tick is shorter still. 480 would allow up to about 1.042 ms at
 * 60 BPM, over the bound. 960 is also a multiple of 2, 3, 4, 5, 6 and 8, so every sixteenth note
 * (240 ticks), triplet and thirty-second note of the written rhythm falls exactly on a tick.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
export const MIDI_TICKS_PER_QUARTER_NOTE = 960

const QUARTER_NOTES_PER_WHOLE_NOTE = 4
const MIDI_TICKS_PER_WHOLE_NOTE = MIDI_TICKS_PER_QUARTER_NOTE * QUARTER_NOTES_PER_WHOLE_NOTE
const MEASURES_PER_PHRASE = 4
const MICROSECONDS_PER_MINUTE = 60_000_000

/** The length of one four-measure 4/4 phrase in MIDI ticks: 15360. */
// @spec-link [[rule_generated_notes_midi_export]]
export const MIDI_TICKS_PER_PHRASE = MIDI_TICKS_PER_WHOLE_NOTE * MEASURES_PER_PHRASE

/**
 * Intent: convert an exact musical time, in whole notes, to MIDI ticks. The result is exact: a
 * time that falls between two MIDI ticks is rejected with a MidiExportError, never rounded.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function midiTicksOfWholeNotes(value: Rational): number {
  const scaled = value.numerator * MIDI_TICKS_PER_WHOLE_NOTE
  if (scaled % value.denominator !== 0) {
    throw new MidiExportError(
      `${value.numerator}/${value.denominator} of a whole note falls between two MIDI ticks.`,
    )
  }
  return scaled / value.denominator
}

/**
 * Intent: the tempo meta event's value for a tempo in quarter notes per minute: microseconds per
 * quarter note, rounded to the nearest whole microsecond. The format holds only whole
 * microseconds, and most tempos (70 BPM is 857142.86 µs) have no exact value; the rounding moves
 * a quarter note by under half a microsecond, so a whole four-measure phrase by under 8 µs.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function microsecondsPerQuarterNote(bpm: number): number {
  return Math.round(MICROSECONDS_PER_MINUTE / bpm)
}
