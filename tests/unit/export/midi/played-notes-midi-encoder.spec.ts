import { describe, expect, it } from 'vitest'

import { MidiExportError } from '@/export/midi/midi-export-input'
import { encodePlayedNotesMidi } from '@/export/midi/played-notes-midi-encoder'
import type { PlayedNotesMidiInput } from '@/export/midi/played-notes-midi-input'
import { phraseStarts, playedSession, type PlayedOffsets } from './played-notes-fixtures'
import {
  metaTexts,
  notesOf,
  readSmf,
  type SmfEvent,
  type SmfFile,
  type SmfNote,
} from './smf-reader'

const TRACK_NAME = 0x03
const END_OF_TRACK = 0x2f
const PHRASE_TICKS = 15360

/** Intent: encode a played session and read the file back. */
function encodeAndRead(input: PlayedNotesMidiInput): SmfFile {
  return readSmf(encodePlayedNotesMidi(input))
}

/** Intent: the played track's notes as [channel, pitch, velocity, start tick, end tick]. */
function playedNotes(file: SmfFile): [number, number, number, number, number][] {
  return notesOf(file.tracks[1]!).map((note: SmfNote) => [
    note.channel,
    note.pitch,
    note.velocity,
    note.startTick,
    note.endTick,
  ])
}

/** Intent: the tick of a track's end-of-track event, which must be its last event. */
function endTick(track: readonly SmfEvent[]): number {
  const last = track[track.length - 1]!
  expect(last.kind === 'meta' && last.type === END_OF_TRACK).toBe(true)
  return last.tick
}

/** Intent: a two-phrase session at 120 BPM from 4 s, the given notes in phrase 2. */
function inPhraseTwo(notes: readonly PlayedOffsets[]): PlayedNotesMidiInput {
  return playedSession(4, [120, 120], [[], notes])
}

/** Intent: `count` notes of one pitch, each attacked while every one before still sounds. */
function stackedAttacks(count: number): PlayedOffsets[] {
  return Array.from({ length: count }, (_, index) => ({
    pitch: 64,
    velocity: 60 + index,
    onset: 0.1 * index,
    release: 3,
  }))
}

// @test-link [[req_played_notes_export]]
describe('encodePlayedNotesMidi: which notes', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_export_contents_never_merged]]
  it('writes exactly the played notes, pitch as received and original velocity, in two tracks', () => {
    const file = encodeAndRead(
      playedSession(
        1.5,
        [120, 120],
        [
          [
            { pitch: 61, velocity: 33, onset: 0.5, release: 1 },
            { pitch: 108, velocity: 127, onset: 2, release: 2.25 },
          ],
          [{ pitch: 21, velocity: 1, onset: 0, release: 0.75 }],
        ],
      ),
    )

    expect(file.format).toBe(1)
    expect(file.tracks).toHaveLength(2)
    expect(metaTexts(file.tracks[1]!, TRACK_NAME)).toEqual([{ tick: 0, text: 'Played notes' }])
    expect(playedNotes(file)).toEqual([
      [0, 61, 33, 960, 1920],
      [0, 108, 127, 3840, 4320],
      [0, 21, 1, 15360, 16800],
    ])
    const played = file.tracks[1]!
    expect(played.filter((event) => event.kind === 'meta')).toHaveLength(2)
    expect(played.every((event) => event.kind !== 'sysex')).toBe(true)
  })

  // @test-link [[req_played_notes_export]]
  it("drops an onset at the last phrase's end, and keeps one just before it, at least a tick long", () => {
    const file = encodeAndRead(
      inPhraseTwo([
        { pitch: 60, velocity: 70, onset: 7.9998, release: 8.5 },
        { pitch: 62, velocity: 70, onset: 8, release: 8.5 },
        { pitch: 64, velocity: 70, onset: 9, release: 9.5 },
      ]),
    )

    expect(playedNotes(file)).toEqual([[0, 60, 70, 2 * PHRASE_TICKS, 2 * PHRASE_TICKS + 1]])
    expect(endTick(file.tracks[0]!)).toBe(2 * PHRASE_TICKS)
    expect(endTick(file.tracks[1]!)).toBe(2 * PHRASE_TICKS + 1)
  })

  // @test-link [[req_played_notes_export]]
  it("keeps an onset after a phrase's end but before the next phrase's late start, rounded", () => {
    const session = playedSession(
      4,
      [120, 120],
      [[{ pitch: 60, velocity: 70, onset: 8.0004, release: 8.5005 }], []],
    )
    const [first, second] = session.phrases
    // Phrase 2 starts 0.5 ms after phrase 1's end at 12 s, within the 1 ms back-to-back tolerance.
    const late = { phrases: [first!, { ...second!, startedAt: second!.startedAt + 0.0005 }] }

    // 8.0004 s at 120 BPM is 15360.768 ticks; the release is 0.5 s into phrase 2.
    expect(playedNotes(encodeAndRead(late))).toEqual([[0, 60, 70, PHRASE_TICKS + 1, 16320]])
  })

  // @test-link [[req_played_notes_export]]
  it('validates its input first: a session with no played note gives no file', () => {
    expect(() => encodePlayedNotesMidi(inPhraseTwo([]))).toThrow(MidiExportError)
  })

  // @test-link [[req_played_notes_export]]
  it('gives the same bytes every time for the same session', () => {
    const session = (): PlayedNotesMidiInput =>
      inPhraseTwo([...stackedAttacks(3), { pitch: 70, velocity: 99, onset: 4.321, release: 5.5 }])
    expect(encodePlayedNotesMidi(session())).toEqual(encodePlayedNotesMidi(session()))
  })
})

// @test-link [[req_played_notes_export]]
// @test-link [[rule_played_notes_export_unquantized_timing]]
describe('encodePlayedNotesMidi: how long notes last', () => {
  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it("stops a note still held at the session's end there", () => {
    const file = encodeAndRead(inPhraseTwo([{ pitch: 67, velocity: 64, onset: 7, release: 20 }]))

    expect(playedNotes(file)).toEqual([[0, 67, 64, 15360 + 13440, 2 * PHRASE_TICKS]])
    expect(endTick(file.tracks[0]!)).toBe(2 * PHRASE_TICKS)
    expect(endTick(file.tracks[1]!)).toBe(2 * PHRASE_TICKS)
  })

  // @test-link [[req_played_notes_export]]
  it('gives a note released at its onset one tick', () => {
    const file = encodeAndRead(inPhraseTwo([{ pitch: 67, velocity: 64, onset: 1, release: 1 }]))

    expect(playedNotes(file)).toEqual([[0, 67, 64, 17280, 17281]])
  })

  // @test-link [[req_played_notes_export]]
  // @test-link [[rule_played_notes_export_unquantized_timing]]
  it('converts the release of a note held across a tempo change in the later phrase', () => {
    const starts = phraseStarts(2, [90, 120])
    const file = encodeAndRead(
      playedSession(
        2,
        [90, 120],
        [[{ pitch: 72, velocity: 100, onset: 10, release: starts[1]! + 0.5 - starts[0]! }], []],
      ),
    )

    // 10 s at 90 BPM is 14400 ticks; 0.5 s into phrase 2 at 120 BPM is 960 ticks after 15360.
    expect(playedNotes(file)).toEqual([[0, 72, 100, 14400, 16320]])
  })
})

// @test-link [[req_played_notes_export]]
describe('encodePlayedNotesMidi: channels', () => {
  // @test-link [[req_played_notes_export]]
  it('keeps both of two overlapping attacks of one pitch, the second on the next channel', () => {
    const file = encodeAndRead(
      inPhraseTwo([
        { pitch: 62, velocity: 77, onset: 1, release: 2 },
        { pitch: 62, velocity: 88, onset: 1.5, release: 2.5 },
        { pitch: 62, velocity: 99, onset: 2.5, release: 3 },
      ]),
    )

    expect(playedNotes(file)).toEqual([
      [0, 62, 77, 17280, 19200],
      [1, 62, 88, 18240, 20160],
      [0, 62, 99, 20160, 21120],
    ])
  })

  // @test-link [[req_played_notes_export]]
  it('never uses channel 10, and refuses more than fifteen of one pitch at once', () => {
    const fifteen = playedNotes(encodeAndRead(inPhraseTwo(stackedAttacks(15))))
    expect(fifteen.map(([channel]) => channel)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15,
    ])

    expect(() => encodePlayedNotesMidi(inPhraseTwo(stackedAttacks(16)))).toThrow(MidiExportError)
  })
})
