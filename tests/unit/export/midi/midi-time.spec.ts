import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import { MidiExportError } from '@/export/midi/midi-export-input'
import {
  MIDI_TICKS_PER_PHRASE,
  MIDI_TICKS_PER_QUARTER_NOTE,
  microsecondsPerQuarterNote,
  midiTicksOfWholeNotes,
} from '@/export/midi/midi-time'

const SLOWEST_BPM = 60

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[rule_played_notes_export_unquantized_timing]]
describe('MIDI time resolution', () => {
  it('is fixed at 960 MIDI ticks per quarter note', () => {
    expect(MIDI_TICKS_PER_QUARTER_NOTE).toBe(960)
    expect(MIDI_TICKS_PER_PHRASE).toBe(4 * 4 * 960)
  })

  it('keeps half a MIDI tick under 1 ms at the slowest tempo', () => {
    const tickMicroseconds = microsecondsPerQuarterNote(SLOWEST_BPM) / MIDI_TICKS_PER_QUARTER_NOTE
    expect(tickMicroseconds / 2).toBeLessThanOrEqual(1000)
  })

  it('moves no onset more than 1 ms when rounded to the nearest MIDI tick at 60 BPM', () => {
    const quarter = microsecondsPerQuarterNote(SLOWEST_BPM)
    let worst = 0
    for (let onset = 0; onset <= quarter; onset++) {
      const tick = Math.round((onset * MIDI_TICKS_PER_QUARTER_NOTE) / quarter)
      const back = (tick * quarter) / MIDI_TICKS_PER_QUARTER_NOTE
      worst = Math.max(worst, Math.abs(back - onset))
    }
    expect(worst).toBeLessThanOrEqual(1000)
    // The sweep reaches the worst case, half a tick (about 520.8 µs), to within 1 µs.
    expect(worst).toBeLessThanOrEqual(quarter / MIDI_TICKS_PER_QUARTER_NOTE / 2)
    expect(worst).toBeGreaterThan(quarter / MIDI_TICKS_PER_QUARTER_NOTE / 2 - 1)
  })

  it('puts every sixteenth-note position of a phrase exactly on a MIDI tick', () => {
    for (let sixteenths = 0; sixteenths <= 64; sixteenths++) {
      expect(midiTicksOfWholeNotes(makeRational(sixteenths, 16))).toBe(sixteenths * 240)
    }
  })

  it('also puts eighth-note triplets and thirty-second notes exactly on a MIDI tick', () => {
    expect(midiTicksOfWholeNotes(makeRational(1, 12))).toBe(320)
    expect(midiTicksOfWholeNotes(makeRational(1, 32))).toBe(120)
  })

  it('rejects a time that falls between two MIDI ticks', () => {
    expect(() => midiTicksOfWholeNotes(makeRational(1, 7))).toThrow(MidiExportError)
  })
})

// @test-link [[rule_generated_notes_midi_export]]
describe('microsecondsPerQuarterNote', () => {
  it('gives the exact value when there is one', () => {
    expect(microsecondsPerQuarterNote(60)).toBe(1_000_000)
    expect(microsecondsPerQuarterNote(120)).toBe(500_000)
    expect(microsecondsPerQuarterNote(240)).toBe(250_000)
  })

  it('rounds to the nearest microsecond otherwise', () => {
    expect(microsecondsPerQuarterNote(70)).toBe(857_143)
    expect(microsecondsPerQuarterNote(90)).toBe(666_667)
    expect(microsecondsPerQuarterNote(65)).toBe(923_077)
  })
})
