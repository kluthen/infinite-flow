/**
 * Reading raw Web MIDI message bytes: only note-on with non-zero velocity is a played note, a
 * note-off or a zero-velocity note-on is a note end, every other message is ignored, the channel
 * is reported but never filtered, and a malformed message is rejected with a typed error.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { MidiMessageError, parseMidiMessage } from '@/midi/midi-message'

// @test-link [[rule_only_note_on_counts_as_played]]
// @test-link [[req_midi_controller_input]]
describe('parseMidiMessage: note messages on any channel', () => {
  it.each([0, 1, 9, 15])('reads a note-on with non-zero velocity on channel %i', (channel) => {
    expect(parseMidiMessage(Uint8Array.of(0x90 | channel, 60, 100))).toEqual({
      kind: 'note-on',
      channel,
      pitch: makeConcertPitch(60),
      velocity: 100,
    })
  })

  it('reads the velocity bounds 1 and 127 and the pitch bounds 0 and 127', () => {
    expect(parseMidiMessage(Uint8Array.of(0x90, 0, 1))).toEqual({
      kind: 'note-on',
      channel: 0,
      pitch: makeConcertPitch(0),
      velocity: 1,
    })
    expect(parseMidiMessage(Uint8Array.of(0x9f, 127, 127))).toEqual({
      kind: 'note-on',
      channel: 15,
      pitch: makeConcertPitch(127),
      velocity: 127,
    })
  })

  it.each([0, 15])('reads a zero-velocity note-on on channel %i as a note-off', (channel) => {
    expect(parseMidiMessage(Uint8Array.of(0x90 | channel, 64, 0))).toEqual({
      kind: 'note-off',
      channel,
      pitch: makeConcertPitch(64),
    })
  })

  it.each([
    [0, 0],
    [0, 64],
    [15, 127],
    [7, 40],
  ])('reads a note-off on channel %i with release velocity %i', (channel, releaseVelocity) => {
    expect(parseMidiMessage(Uint8Array.of(0x80 | channel, 72, releaseVelocity))).toEqual({
      kind: 'note-off',
      channel,
      pitch: makeConcertPitch(72),
    })
  })
})

// @test-link [[rule_only_note_on_counts_as_played]]
describe('parseMidiMessage: every other message is ignored', () => {
  it.each([
    ['control change (breath) on channel 0', [0xb0, 2, 90]],
    ['control change on channel 15', [0xbf, 7, 100]],
    ['pitch bend on channel 0', [0xe0, 0, 64]],
    ['pitch bend on channel 15', [0xef, 127, 127]],
    ['channel aftertouch on channel 0', [0xd0, 80]],
    ['channel aftertouch on channel 15', [0xdf, 20]],
    ['poly aftertouch on channel 0', [0xa0, 60, 50]],
    ['poly aftertouch on channel 15', [0xaf, 60, 50]],
    ['program change on channel 0', [0xc0, 5]],
    ['program change on channel 15', [0xcf, 5]],
    ['SysEx', [0xf0, 0x7e, 0x7f, 0x06, 0x01, 0xf7]],
    ['MIDI time code quarter frame', [0xf1, 0x10]],
    ['song position pointer', [0xf2, 0, 0]],
    ['song select', [0xf3, 1]],
    ['tune request', [0xf6]],
    ['timing clock', [0xf8]],
    ['start', [0xfa]],
    ['continue', [0xfb]],
    ['stop', [0xfc]],
    ['active sensing', [0xfe]],
    ['system reset', [0xff]],
  ])('ignores %s', (_name, bytes) => {
    expect(parseMidiMessage(Uint8Array.from(bytes))).toEqual({ kind: 'ignored' })
  })
})

// @test-link [[req_midi_controller_input]]
describe('parseMidiMessage: malformed messages are rejected', () => {
  it.each([
    ['an empty message', []],
    ['a note-on with no data bytes', [0x90]],
    ['a note-on missing its velocity', [0x90, 60]],
    ['a note-off missing its velocity', [0x80, 60]],
    ['a note-on longer than three bytes', [0x90, 60, 100, 0]],
    ['a note-on whose pitch byte is a status byte', [0x90, 0x80, 100]],
    ['a note-on whose velocity byte is a status byte', [0x90, 60, 0xff]],
    ['a note-off whose pitch byte is a status byte', [0x80, 0x90, 0]],
    ['a message that starts with a data byte', [60, 100, 0]],
  ])('throws a MidiMessageError for %s', (_name, bytes) => {
    expect(() => parseMidiMessage(Uint8Array.from(bytes))).toThrow(MidiMessageError)
  })
})
