import { describe, expect, it } from 'vitest'

import { metaTexts, notesOf, readSmf, tempoMap } from './smf-reader'

const ascii = (text: string): number[] => Array.from(text, (character) => character.charCodeAt(0))
const uint32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
]

function file(
  format: number,
  division: number,
  tracks: readonly (readonly number[])[],
): Uint8Array {
  return new Uint8Array([
    ...ascii('MThd'),
    ...uint32(6),
    0,
    format,
    0,
    tracks.length,
    (division >> 8) & 0xff,
    division & 0xff,
    ...tracks.flatMap((body) => [...ascii('MTrk'), ...uint32(body.length), ...body]),
  ])
}

/**
 * A track assembled by hand, independent of the encoder: a marker, a tempo of 500000 µs per
 * quarter note, then C4 and E4 written with running status, a note-on at velocity 0 as the
 * release of C4, and a delta of 200 ticks written as the two-byte quantity 0x81 0x48.
 */
const HAND_TRACK: readonly number[] = [
  ...[0x00, 0xff, 0x06, 0x01, ...ascii('A')],
  ...[0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20],
  ...[0x00, 0x90, 60, 100],
  ...[0x00, 64, 90],
  ...[0x81, 0x48, 60, 0],
  ...[0x10, 0x80, 64, 64],
  ...[0x00, 0xff, 0x2f, 0x00],
]

// @test-link [[rule_generated_notes_midi_export]]
describe('the test SMF reader', () => {
  it('reads a hand-assembled file with running status and a zero-velocity release', () => {
    const smf = readSmf(file(1, 480, [HAND_TRACK]))
    expect(smf.format).toBe(1)
    expect(smf.division).toBe(480)
    const [track] = smf.tracks
    expect(metaTexts(track!, 0x06)).toEqual([{ tick: 0, text: 'A' }])
    expect(tempoMap(track!)).toEqual([{ tick: 0, microsecondsPerQuarter: 500000 }])
    expect(notesOf(track!)).toEqual([
      { channel: 0, pitch: 60, velocity: 100, startTick: 0, endTick: 200 },
      { channel: 0, pitch: 64, velocity: 90, startTick: 0, endTick: 216 },
    ])
  })

  it('rejects a malformed file', () => {
    const endless = HAND_TRACK.slice(0, -4)
    const good = file(1, 480, [HAND_TRACK])
    const cases: Uint8Array[] = [
      new Uint8Array([...ascii('RIFF'), ...good.slice(4)]),
      file(1, 480, [endless]),
      new Uint8Array([...good, 0]),
      good.slice(0, good.length - 1),
    ]
    for (const bytes of cases) expect(() => readSmf(bytes)).toThrow()
  })

  it('rejects a note left sounding or released twice', () => {
    const stillSounding = [0x00, 0x90, 60, 100, 0x00, 0xff, 0x2f, 0x00]
    const releasedTwice = [
      0x00, 0x90, 60, 100, 0x10, 0x80, 60, 0, 0x00, 0x80, 60, 0, 0x00, 0xff, 0x2f, 0x00,
    ]
    for (const body of [stillSounding, releasedTwice]) {
      expect(() => notesOf(readSmf(file(1, 480, [body])).tracks[0]!)).toThrow()
    }
  })
})
