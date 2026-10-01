/**
 * Reading one raw Web MIDI message. Only a note-on with non-zero velocity is a played note; a
 * note-off, or a note-on with zero velocity, is read only as the end of a note; every other
 * message (control change such as breath, pitch bend, aftertouch, program change, SysEx and every
 * system message) is ignored. The channel is reported but never filtered: input is omni and every
 * pitch is read as concert pitch. Pure: no Web MIDI call, no clock.
 */

import { makeConcertPitch, type ConcertPitch } from '../domain/events/concert-pitch'

const STATUS_BIT = 0x80
const NOTE_OFF = 0x80
const NOTE_ON = 0x90
const NOTE_MESSAGE_LENGTH = 3

/** A MIDI message read for played-note tracking: a played note, a note end, or nothing. */
// @spec-link [[rule_only_note_on_counts_as_played]]
// @spec-link [[req_midi_controller_input]]
export type MidiMessage =
  | {
      readonly kind: 'note-on'
      readonly channel: number
      readonly pitch: ConcertPitch
      readonly velocity: number
    }
  | { readonly kind: 'note-off'; readonly channel: number; readonly pitch: ConcertPitch }
  | { readonly kind: 'ignored' }

/** Typed failure for a MIDI message that is not one complete, well-formed message. */
// @spec-link [[req_midi_controller_input]]
export class MidiMessageError extends Error {
  readonly kind = 'MidiMessageError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MidiMessageError'
  }
}

const IGNORED: MidiMessage = Object.freeze({ kind: 'ignored' })

/**
 * Intent: read one Web MIDI message into a note-on, a note-off or an ignored message. A 0x9n with
 * velocity 0 is a note-off. Web MIDI delivers only complete messages with a status byte, so an
 * empty message, a message starting with a data byte, a note message that is not exactly three
 * bytes, or a note data byte with the status bit set is a broken boundary and throws.
 */
// @spec-link [[rule_only_note_on_counts_as_played]]
// @spec-link [[req_midi_controller_input]]
export function parseMidiMessage(data: Uint8Array): MidiMessage {
  const status = data[0]
  if (status === undefined) {
    throw new MidiMessageError('A MIDI message must not be empty.')
  }
  if ((status & STATUS_BIT) === 0) {
    throw new MidiMessageError(
      `A MIDI message must start with a status byte, got 0x${status.toString(16)}.`,
    )
  }
  const type = status & 0xf0
  if (type !== NOTE_ON && type !== NOTE_OFF) {
    return IGNORED
  }
  const { pitch, velocity } = readNoteData(data)
  const channel = status & 0x0f
  if (type === NOTE_ON && velocity > 0) {
    return Object.freeze({ kind: 'note-on', channel, pitch, velocity })
  }
  return Object.freeze({ kind: 'note-off', channel, pitch })
}

/** Intent: read a note message's pitch and velocity, rejecting a wrong length or a non-data byte. */
function readNoteData(data: Uint8Array): { pitch: ConcertPitch; velocity: number } {
  if (data.length !== NOTE_MESSAGE_LENGTH) {
    throw new MidiMessageError(
      `A MIDI note message must be ${NOTE_MESSAGE_LENGTH} bytes, got ${data.length}.`,
    )
  }
  const pitchByte = data[1]
  const velocityByte = data[2]
  if (pitchByte === undefined || velocityByte === undefined) {
    throw new MidiMessageError('A MIDI note message is missing a data byte.')
  }
  if ((pitchByte & STATUS_BIT) !== 0 || (velocityByte & STATUS_BIT) !== 0) {
    throw new MidiMessageError(
      `A MIDI note message's data bytes must be below 0x80, got 0x${pitchByte.toString(16)} 0x${velocityByte.toString(16)}.`,
    )
  }
  return { pitch: makeConcertPitch(pitchByte), velocity: velocityByte }
}
