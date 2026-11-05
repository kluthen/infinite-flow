import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { encodeGeneratedNotesMidi } from '@/export/midi/midi-encoder'
import type { GeneratedNotesMidiInput, MidiDoodleSection } from '@/export/midi/midi-export-input'
import {
  midiPhrase,
  plainTimeline,
  referenceSessionWithBacking,
  referenceSessionWithoutBacking,
  tiedTimeline,
} from './midi-session-fixtures'
import { metaTexts, notesOf, readSmf, tempoMap, type SmfEvent, type SmfFile } from './smf-reader'

const TRACK_NAME = 0x03
const MARKER = 0x06
const END_OF_TRACK = 0x2f
const TIME_SIGNATURE = 0x58
const PHRASE_TICKS = 15360
const MEASURE_TICKS = 3840

function encodeAndRead(input: GeneratedNotesMidiInput): SmfFile {
  return readSmf(encodeGeneratedNotesMidi(input))
}

function trackName(track: readonly SmfEvent[]): string {
  const names = metaTexts(track, TRACK_NAME)
  expect(names).toHaveLength(1)
  expect(names[0]!.tick).toBe(0)
  return names[0]!.text
}

function endTick(track: readonly SmfEvent[]): number {
  const last = track[track.length - 1]!
  expect(last.kind === 'meta' && last.type === END_OF_TRACK).toBe(true)
  return last.tick
}

/** The generated notes of the "tied" shape as [pitch, start, end] in MIDI ticks, worked by hand. */
const TIED_NOTES: readonly (readonly [number, number, number])[] = [
  [60, 0, 960],
  [64, 960, 1920],
  [67, 1920, 2400],
  [69, 2400, 2880],
  [67, 2880, 3840],
  [69, 3840, 5760],
  [71, 5760, 6000],
  [69, 6000, 6240],
  [67, 6240, 6480],
  [66, 6480, 6720],
  [67, 6720, 7680],
  [64, 8640, 12480],
  [62, 12480, 13440],
  [60, 13440, 15360],
]

/** The generated notes of the "plain" shape, worked by hand. */
const PLAIN_NOTES: readonly (readonly [number, number, number])[] = [
  [67, 0, 1920],
  [64, 1920, 3840],
  [62, 3840, 7680],
  [65, 7680, 9600],
  [69, 9600, 11520],
  [60, 11520, 15360],
]

function shifted(
  notes: readonly (readonly [number, number, number])[],
  offset: number,
): [number, number, number][] {
  return notes.map(([pitch, start, end]) => [pitch, start + offset, end + offset])
}

/**
 * Intent: a Jam's doodle section of `measureCount` measures at `tempo`: in each measure m (0 up),
 * concert 62 + m for a quarter note on beat 1, then concert 70 + m for a half note from beat 3.
 */
function doodleSection(measureCount: number, tempo: number): MidiDoodleSection {
  return {
    measureCount,
    tempo,
    notes: Array.from({ length: measureCount }, (_, measure) => [
      {
        pitch: makeConcertPitch(62 + measure),
        start: makeRational(4 * measure, 4),
        duration: makeRational(1, 4),
      },
      {
        pitch: makeConcertPitch(70 + measure),
        start: makeRational(4 * measure + 2, 4),
        duration: makeRational(2, 4),
      },
    ]).flat(),
  }
}

/** The notes of `doodleSection(measureCount, …)` as [pitch, start, end] in MIDI ticks, by hand. */
function doodleTicks(measureCount: number): [number, number, number][] {
  return Array.from({ length: measureCount }, (_, measure): [number, number, number][] => [
    [62 + measure, measure * 3840, measure * 3840 + 960],
    [70 + measure, measure * 3840 + 1920, measure * 3840 + 3840],
  ]).flat()
}

/**
 * Intent: an independent reading of a concert timeline as sounding notes in MIDI ticks: a tie
 * continuation lengthens the note before it, a rest sounds nothing. 240 MIDI ticks per sixteenth.
 */
function soundingNotes(timeline: ConcertEventTimeline, offset: number): [number, number, number][] {
  const notes: [number, number, number][] = []
  let position = 0
  for (const measure of timeline.measures) {
    for (const event of measure.events) {
      const length = (event.duration.numerator * 3840) / event.duration.denominator
      if (event.kind === 'note' && event.tieContinuation) notes[notes.length - 1]![2] += length
      else if (event.kind === 'note')
        notes.push([event.pitch, position + offset, position + offset + length])
      position += length
    }
  }
  return notes
}

// @test-link [[rule_generated_notes_midi_export]]
describe('encodeGeneratedNotesMidi: file shape', () => {
  it('writes a type 1 file at 960 MIDI ticks per quarter note', () => {
    const file = encodeAndRead(referenceSessionWithoutBacking())
    expect(file.format).toBe(1)
    expect(file.division).toBe(960)
  })

  it('has a tempo-and-marker track and the generated line on its own track, backing off', () => {
    const file = encodeAndRead(referenceSessionWithoutBacking())
    expect(file.tracks.map(trackName)).toEqual(['Infinite Flow', 'Generated notes'])
    expect(notesOf(file.tracks[0]!)).toEqual([])
  })

  it('adds the backing on its own track only when asked', () => {
    const file = encodeAndRead(referenceSessionWithBacking())
    expect(file.tracks.map(trackName)).toEqual(['Infinite Flow', 'Generated notes', 'Backing'])
  })

  it('sets 4/4 once, at time zero, on the first track', () => {
    const file = encodeAndRead(referenceSessionWithoutBacking())
    const signatures = file.tracks.flatMap((track) =>
      track.filter((event) => event.kind === 'meta' && event.type === TIME_SIGNATURE),
    )
    expect(signatures).toHaveLength(1)
    const [signature] = signatures
    expect(signature!.tick).toBe(0)
    expect(signature!.kind === 'meta' && Array.from(signature!.data)).toEqual([4, 2, 24, 8])
  })

  it('ends every track at the end of the last phrase', () => {
    const file = encodeAndRead(referenceSessionWithBacking())
    expect(file.tracks.map(endTick)).toEqual([3 * PHRASE_TICKS, 3 * PHRASE_TICKS, 3 * PHRASE_TICKS])
  })

  it('writes the same bytes for the same session', () => {
    expect(encodeGeneratedNotesMidi(referenceSessionWithBacking())).toEqual(
      encodeGeneratedNotesMidi(referenceSessionWithBacking()),
    )
  })
})

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[req_session_export]]
describe('encodeGeneratedNotesMidi: tempo map and phrase markers', () => {
  it('writes the opening tempo at time zero and a new tempo only where it changes', () => {
    const [conductor] = encodeAndRead(referenceSessionWithoutBacking()).tracks
    expect(tempoMap(conductor!)).toEqual([
      { tick: 0, microsecondsPerQuarter: 666667 },
      { tick: PHRASE_TICKS, microsecondsPerQuarter: 500000 },
    ])
  })

  it('holds the whole tempo map on the first track only', () => {
    const file = encodeAndRead(referenceSessionWithBacking())
    expect(file.tracks.slice(1).flatMap(tempoMap)).toEqual([])
  })

  it('writes one marker per phrase with its number, phrases back to back from time zero', () => {
    const file = encodeAndRead(referenceSessionWithBacking())
    expect(metaTexts(file.tracks[0]!, MARKER)).toEqual([
      { tick: 0, text: 'Phrase 1' },
      { tick: PHRASE_TICKS, text: 'Phrase 2' },
      { tick: 2 * PHRASE_TICKS, text: 'Phrase 3' },
    ])
    expect(file.tracks.slice(1).flatMap((track) => metaTexts(track, MARKER))).toEqual([])
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  it.each([1, 2, 4])(
    "in a Jam, opens with a Doodle marker at time zero and phrase 1 at the doodle's last barline (%i measures)",
    (measureCount) => {
      const origin = measureCount * MEASURE_TICKS
      const file = encodeAndRead({
        ...referenceSessionWithBacking(),
        doodle: doodleSection(measureCount, 100),
      })
      expect(metaTexts(file.tracks[0]!, MARKER)).toEqual([
        { tick: 0, text: 'Doodle' },
        { tick: origin, text: 'Phrase 1' },
        { tick: origin + PHRASE_TICKS, text: 'Phrase 2' },
        { tick: origin + 2 * PHRASE_TICKS, text: 'Phrase 3' },
      ])
      expect(tempoMap(file.tracks[0]!)).toEqual([
        { tick: 0, microsecondsPerQuarter: 600000 },
        { tick: origin, microsecondsPerQuarter: 666667 },
        { tick: origin + PHRASE_TICKS, microsecondsPerQuarter: 500000 },
      ])
      expect(file.tracks.slice(1).flatMap((track) => metaTexts(track, MARKER))).toEqual([])
      expect(file.tracks.map(endTick)).toEqual([
        origin + 3 * PHRASE_TICKS,
        origin + 3 * PHRASE_TICKS,
        origin + 3 * PHRASE_TICKS,
      ])
    },
  )

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  it("in a Jam, writes no tempo at phrase 1 when it plays at the doodle's capture tempo", () => {
    const [conductor] = encodeAndRead({
      ...referenceSessionWithoutBacking(),
      doodle: doodleSection(2, 90),
    }).tracks
    expect(tempoMap(conductor!)).toEqual([
      { tick: 0, microsecondsPerQuarter: 666667 },
      { tick: 2 * MEASURE_TICKS + PHRASE_TICKS, microsecondsPerQuarter: 500000 },
    ])
  })

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  // @test-link [[rule_favorites_only_export]]
  it("in a Jam's favorites-only file, starts the first favorite right after the doodle", () => {
    const [conductor] = encodeAndRead({
      phrases: [midiPhrase(2, plainTimeline(), 120), midiPhrase(5, tiedTimeline(), 120)],
      backing: null,
      doodle: doodleSection(3, 100),
    }).tracks
    const origin = 3 * MEASURE_TICKS
    expect(metaTexts(conductor!, MARKER)).toEqual([
      { tick: 0, text: 'Doodle' },
      { tick: origin, text: 'Phrase 2' },
      { tick: origin + PHRASE_TICKS, text: 'Phrase 5' },
    ])
    expect(tempoMap(conductor!)).toEqual([
      { tick: 0, microsecondsPerQuarter: 600000 },
      { tick: origin, microsecondsPerQuarter: 500000 },
    ])
  })

  it('marks a one-phrase session at time zero with its single tempo', () => {
    const [conductor] = encodeAndRead({
      phrases: [midiPhrase(1, plainTimeline(), 60)],
      backing: null,
    }).tracks
    expect(tempoMap(conductor!)).toEqual([{ tick: 0, microsecondsPerQuarter: 1000000 }])
    expect(metaTexts(conductor!, MARKER)).toEqual([{ tick: 0, text: 'Phrase 1' }])
  })

  it('rounds a tempo with no whole number of microseconds per quarter note to the nearest one', () => {
    const [conductor] = encodeAndRead({
      phrases: [midiPhrase(1, plainTimeline(), 70), midiPhrase(2, plainTimeline(), 240)],
      backing: null,
    }).tracks
    expect(tempoMap(conductor!)).toEqual([
      { tick: 0, microsecondsPerQuarter: 857143 },
      { tick: PHRASE_TICKS, microsecondsPerQuarter: 250000 },
    ])
  })
})

// @test-link [[rule_generated_notes_midi_export]]
describe('encodeGeneratedNotesMidi: the generated line', () => {
  it('writes every phrase at concert pitch, back to back, a tie across a barline as one note', () => {
    const track = encodeAndRead(referenceSessionWithoutBacking()).tracks[1]!
    const notes = notesOf(track).map((note) => [note.pitch, note.startTick, note.endTick])
    expect(notes).toEqual([
      ...shifted(TIED_NOTES, 0),
      ...shifted(PLAIN_NOTES, PHRASE_TICKS),
      ...shifted(TIED_NOTES, 2 * PHRASE_TICKS),
    ])
  })

  it('plays the generated line on channel 1 at velocity 96', () => {
    const track = encodeAndRead(referenceSessionWithoutBacking()).tracks[1]!
    const notes = notesOf(track)
    expect(new Set(notes.map((note) => note.channel))).toEqual(new Set([0]))
    expect(new Set(notes.map((note) => note.velocity))).toEqual(new Set([96]))
  })

  it('releases a note before the next attack at the same time', () => {
    const track = encodeAndRead(referenceSessionWithoutBacking()).tracks[1]!
    const atJoin = track.filter(
      (event) => event.kind === 'channel' && event.tick === 2 * PHRASE_TICKS,
    )
    expect(
      atJoin.map((event) => event.kind === 'channel' && [event.status, ...event.data]),
    ).toEqual([
      [0x80, 60, 64],
      [0x90, 60, 96],
    ])
  })
})

// @test-link [[rule_jam_exports_open_with_doodle]]
// @test-link [[rule_jam_exports_line_up]]
describe("encodeGeneratedNotesMidi: a Jam's doodle section", () => {
  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  it.each([1, 2, 4])(
    "writes the doodle's notes on the generated track from time zero, the phrases after it (%i measures)",
    (measureCount) => {
      const origin = measureCount * MEASURE_TICKS
      const notes = notesOf(
        encodeAndRead({
          ...referenceSessionWithoutBacking(),
          doodle: doodleSection(measureCount, 100),
        }).tracks[1]!,
      )
      expect(notes.map((note) => [note.pitch, note.startTick, note.endTick])).toEqual([
        ...doodleTicks(measureCount),
        ...shifted(TIED_NOTES, origin),
        ...shifted(PLAIN_NOTES, origin + PHRASE_TICKS),
        ...shifted(TIED_NOTES, origin + 2 * PHRASE_TICKS),
      ])
      expect(new Set(notes.map((note) => note.channel))).toEqual(new Set([0]))
      expect(new Set(notes.map((note) => note.velocity))).toEqual(new Set([96]))
    },
  )

  // @test-link [[rule_jam_exports_open_with_doodle]]
  // @test-link [[rule_jam_exports_line_up]]
  it.each([1, 2, 4])(
    'sounds no backing under the doodle, each phrase’s backing from its own start (%i measures)',
    (measureCount) => {
      const origin = measureCount * MEASURE_TICKS
      const input = referenceSessionWithBacking()
      const withDoodle = notesOf(
        encodeAndRead({ ...input, doodle: doodleSection(measureCount, 100) }).tracks[2]!,
      )
      const without = notesOf(encodeAndRead(input).tracks[2]!)
      expect(withDoodle.length).toBeGreaterThan(0)
      expect(withDoodle.every((note) => note.startTick >= origin)).toBe(true)
      expect(withDoodle).toEqual(
        without.map((note) => ({
          ...note,
          startTick: note.startTick + origin,
          endTick: note.endTick + origin,
        })),
      )
    },
  )
})

// @test-link [[rule_generated_notes_midi_export]]
describe('encodeGeneratedNotesMidi: the backing', () => {
  it('writes the backing notes on channel 2 at velocity 72, each phrase from its own start', () => {
    const input = referenceSessionWithBacking()
    const track = encodeAndRead(input).tracks[2]!
    const expected = input.backing!.flatMap((phrase) =>
      phrase.notes.map((note) => {
        const start =
          (phrase.number - 1) * PHRASE_TICKS +
          (note.start.numerator * 3840) / note.start.denominator
        const length = (note.duration.numerator * 3840) / note.duration.denominator
        return [note.pitch, start, start + length]
      }),
    )
    const sortByStartThenPitch = (a: number[], b: number[]): number =>
      a[1]! - b[1]! || a[0]! - b[0]!
    const notes = notesOf(track)
    expect(notes.map((note) => [note.pitch, note.startTick, note.endTick])).toEqual(
      expected.sort(sortByStartThenPitch),
    )
    expect(new Set(notes.map((note) => note.channel))).toEqual(new Set([1]))
    expect(new Set(notes.map((note) => note.velocity))).toEqual(new Set([72]))
  })

  it('leaves the generated line and the tempo map unchanged when the backing is on', () => {
    const on = encodeAndRead(referenceSessionWithBacking())
    const off = encodeAndRead(referenceSessionWithoutBacking())
    expect(on.tracks[0]).toEqual(off.tracks[0])
    expect(on.tracks[1]).toEqual(off.tracks[1])
  })
})

// @test-link [[rule_generated_notes_midi_export]]
// @test-link [[req_session_export]]
describe('encodeGeneratedNotesMidi: reading the file back', () => {
  it('gives back the same notes and the same tempo map as the session', () => {
    const input: GeneratedNotesMidiInput = {
      phrases: [
        midiPhrase(1, plainTimeline(), 60),
        midiPhrase(2, tiedTimeline(), 60),
        midiPhrase(3, tiedTimeline(), 150),
        midiPhrase(4, plainTimeline(), 240),
        midiPhrase(5, plainTimeline(), 75),
      ],
      backing: null,
    }
    const file = encodeAndRead(input)
    const readNotes = notesOf(file.tracks[1]!).map((note) => [
      note.pitch,
      note.startTick,
      note.endTick,
    ])
    const sessionNotes = input.phrases.flatMap((phrase) =>
      soundingNotes(phrase.timeline, (phrase.number - 1) * PHRASE_TICKS),
    )
    expect(readNotes).toEqual(sessionNotes)

    const readTempos = tempoMap(file.tracks[0]!).map(({ tick, microsecondsPerQuarter }) => ({
      phrase: tick / PHRASE_TICKS + 1,
      bpm: Math.round(60_000_000 / microsecondsPerQuarter),
    }))
    expect(readTempos).toEqual([
      { phrase: 1, bpm: 60 },
      { phrase: 3, bpm: 150 },
      { phrase: 4, bpm: 240 },
      { phrase: 5, bpm: 75 },
    ])
  })
})
