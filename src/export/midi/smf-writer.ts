/**
 * The byte layer of a Standard MIDI File: the header chunk, track chunks, and the few events the
 * export writes (note-on, note-off and meta events). A track is built from events at absolute
 * times in MIDI ticks; the writer turns them into the delta times the format stores, as
 * variable-length quantities, and closes every track with its end-of-track event. Every status
 * byte is written in full (no running status), so each event reads on its own.
 */
import { MidiExportError } from './midi-export-input'

/** One event of a track: its absolute time in MIDI ticks and its bytes without the delta time. */
export interface TimedMidiEvent {
  readonly tick: number
  readonly bytes: readonly number[]
}

const MAX_VARIABLE_LENGTH = 0x0fffffff
const META = 0xff
const META_TRACK_NAME = 0x03
const META_MARKER = 0x06
const META_END_OF_TRACK = 0x2f
const META_TEMPO = 0x51
const META_TIME_SIGNATURE = 0x58
const NOTE_OFF = 0x80
const NOTE_ON = 0x90
const RELEASE_VELOCITY = 64
const MAX_TEMPO_MICROSECONDS = 0xffffff

/** Intent: the bytes of a text string, crashing on any character outside printable ASCII. */
function asciiBytes(text: string): number[] {
  return Array.from(text, (character) => {
    const code = character.charCodeAt(0)
    if (code < 0x20 || code > 0x7e) {
      throw new MidiExportError(`MIDI text "${text}" holds a character outside printable ASCII.`)
    }
    return code
  })
}

/** Intent: a value as a MIDI variable-length quantity, seven bits per byte, high bytes first. */
// @spec-link [[rule_generated_notes_midi_export]]
export function variableLengthQuantity(value: number): number[] {
  if (!Number.isInteger(value) || value < 0 || value > MAX_VARIABLE_LENGTH) {
    throw new MidiExportError(`${value} cannot be written as a MIDI variable-length quantity.`)
  }
  const bytes = [value & 0x7f]
  let rest = value >>> 7
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80)
    rest >>>= 7
  }
  return bytes
}

/** Intent: an unsigned integer as `length` big-endian bytes. */
function bigEndian(value: number, length: number): number[] {
  return Array.from({ length }, (_, index) => (value >>> (8 * (length - 1 - index))) & 0xff)
}

/** Intent: a meta event of `type` with its data, length-prefixed. */
function metaEvent(type: number, data: readonly number[]): number[] {
  return [META, type, ...variableLengthQuantity(data.length), ...data]
}

/** Intent: the track-name meta event. */
// @spec-link [[rule_generated_notes_midi_export]]
export function trackNameEvent(name: string): number[] {
  return metaEvent(META_TRACK_NAME, asciiBytes(name))
}

/** Intent: a marker meta event, the label a DAW shows on its timeline. */
// @spec-link [[rule_generated_notes_midi_export]]
export function markerEvent(text: string): number[] {
  return metaEvent(META_MARKER, asciiBytes(text))
}

/** Intent: a tempo meta event: microseconds per quarter note in three bytes. */
// @spec-link [[rule_generated_notes_midi_export]]
export function tempoEvent(microsecondsPerQuarterNote: number): number[] {
  if (
    !Number.isInteger(microsecondsPerQuarterNote) ||
    microsecondsPerQuarterNote <= 0 ||
    microsecondsPerQuarterNote > MAX_TEMPO_MICROSECONDS
  ) {
    throw new MidiExportError(`${microsecondsPerQuarterNote} µs is not a MIDI tempo.`)
  }
  return metaEvent(META_TEMPO, bigEndian(microsecondsPerQuarterNote, 3))
}

/**
 * Intent: the 4/4 time-signature meta event: 4 beats, a quarter-note beat (2 as a power of two),
 * a metronome click every 24 MIDI clocks (one quarter note), and 8 thirty-second notes per quarter.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function fourFourTimeSignatureEvent(): number[] {
  return metaEvent(META_TIME_SIGNATURE, [4, 2, 24, 8])
}

/** Intent: crash early unless a channel event's values fit their seven- and four-bit fields. */
function assertChannelValues(channel: number, pitch: number, velocity: number): void {
  const fits = (value: number, max: number): boolean =>
    Number.isInteger(value) && value >= 0 && value <= max
  if (!fits(channel, 15) || !fits(pitch, 127) || !fits(velocity, 127)) {
    throw new MidiExportError(
      `Channel ${channel}, pitch ${pitch}, velocity ${velocity} do not fit.`,
    )
  }
}

/** Intent: a note-on event on a zero-based channel. */
// @spec-link [[rule_generated_notes_midi_export]]
export function noteOnEvent(channel: number, pitch: number, velocity: number): number[] {
  assertChannelValues(channel, pitch, velocity)
  return [NOTE_ON | channel, pitch, velocity]
}

/** Intent: a note-off event on a zero-based channel, at the neutral release velocity 64. */
// @spec-link [[rule_generated_notes_midi_export]]
export function noteOffEvent(channel: number, pitch: number): number[] {
  assertChannelValues(channel, pitch, RELEASE_VELOCITY)
  return [NOTE_OFF | channel, pitch, RELEASE_VELOCITY]
}

/**
 * Intent: one track chunk from events already in time order, closed by its end-of-track event at
 * `endTick`. Crashes on an event out of order or after the end.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function trackChunk(events: readonly TimedMidiEvent[], endTick: number): number[] {
  const body: number[] = []
  let previousTick = 0
  for (const event of [...events, { tick: endTick, bytes: metaEvent(META_END_OF_TRACK, []) }]) {
    if (event.tick < previousTick) {
      throw new MidiExportError(
        `A MIDI event at tick ${event.tick} comes after tick ${previousTick}.`,
      )
    }
    body.push(...variableLengthQuantity(event.tick - previousTick), ...event.bytes)
    previousTick = event.tick
  }
  return [...asciiBytes('MTrk'), ...bigEndian(body.length, 4), ...body]
}

/** Intent: the header chunk of a type 1 file with `trackCount` tracks at the given resolution. */
// @spec-link [[rule_generated_notes_midi_export]]
export function typeOneHeaderChunk(trackCount: number, ticksPerQuarterNote: number): number[] {
  return [
    ...asciiBytes('MThd'),
    ...bigEndian(6, 4),
    ...bigEndian(1, 2),
    ...bigEndian(trackCount, 2),
    ...bigEndian(ticksPerQuarterNote, 2),
  ]
}
