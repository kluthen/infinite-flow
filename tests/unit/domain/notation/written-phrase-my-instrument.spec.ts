/**
 * The written phrase for a player-made instrument: whatever transposition the player enters
 * (0 to 11 semitones, 0 or 1 octave, lower or higher), every written note and chord root is the
 * concert one moved by the profile's chromatic count, the written key is the key spelled from the
 * chosen written tonal centre and collection (the transposition never moves it), and the written
 * range is my instrument's own written range. Its clef, treble or bass, changes only the clef the
 * phrase is drawn in and its stem directions.
 */
import { describe, expect, it } from 'vitest'

import {
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure, type MeasureIndex } from '@/domain/events/measure'
import { makeNoteEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { writtenToConcertTonalCenter } from '@/domain/generation/generation-intent'
import { COLLECTION_OFFSETS } from '@/domain/harmony/collection'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { naturalPitchClassOf, spellWrittenKey } from '@/domain/notation/pitch-spelling'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type {
  ConcertChordSymbol,
  SpelledPitch,
  SpelledPitchClass,
  WrittenKey,
  WrittenMeasure,
  WrittenNote,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import { makeMyInstrument, type MyInstrument } from '@/domain/profile/my-instrument'
import type {
  MyInstrumentDirection,
  MyInstrumentTransposition,
} from '@/domain/profile/transposition-interval'
import { makeRational } from '@/domain/time/rational'

/** A written range every transposition below can sound inside MIDI 0 to 127: C3 to C6. */
const WRITTEN_RANGE = { minMidi: 48, maxMidi: 84 } as const

/** Intent: build my instrument on the C MIDI keyboard template with one transposition and clef. */
function myInstrumentWith(
  transposition: MyInstrumentTransposition,
  clef: InstrumentClef = 'treble',
): MyInstrument {
  return makeMyInstrument({
    template: 'c-keyboard',
    name: 'Test instrument',
    clef,
    writtenRange: WRITTEN_RANGE,
    transposition,
  })
}

/** Every well-formed transposition of 0 or 1 octave and 0 to 11 semitones, lower and higher. */
function everyTransposition(): readonly MyInstrumentTransposition[] {
  const all: MyInstrumentTransposition[] = [{ octaves: 0, semitones: 0, direction: 'same' }]
  const directions: readonly MyInstrumentDirection[] = ['lower', 'higher']
  for (const octaves of [0, 1]) {
    for (let semitones = 0; semitones < 12; semitones += 1) {
      if (octaves === 0 && semitones === 0) continue
      for (const direction of directions) all.push({ octaves, semitones, direction })
    }
  }
  return all
}

/** Intent: the pitch class of a pitch-class name. */
function pcOf(name: PitchClass): PitchClassNumber {
  return PITCH_CLASSES.indexOf(name) as PitchClassNumber
}

/** Intent: the MIDI note a spelled written pitch stands for (B♯3 and C4 are both 60). */
function midiOf(pitch: SpelledPitch): number {
  return (pitch.octave + 1) * 12 + naturalPitchClassOf(pitch.letter) + pitch.alter
}

/** Intent: the pitch class a spelled pitch class stands for. */
function spelledPc(pitch: SpelledPitchClass): number {
  return (((naturalPitchClassOf(pitch.letter) + pitch.alter) % 12) + 12) % 12
}

/** Intent: one concert note of `sixteenths` sixteenth notes, never a tie continuation. */
function concertNote(pitch: number, sixteenths: number): MeasureEvent {
  return makeNoteEvent({
    duration: makeRational(sixteenths, 16),
    pitch: makeConcertPitch(pitch),
    tieContinuation: false,
  })
}

/**
 * Intent: a concert timeline in the concert key: measure 0 climbs the collection from the concert
 * tonic in eighth notes (eight notes, the tonic an octave up last), measures 1 to 3 hold the
 * tonic, its fourth degree and its fifth degree as whole notes.
 */
function concertScaleTimeline(concertTonicMidi: number, collection: Collection) {
  const offsets = COLLECTION_OFFSETS[collection]
  const climb = [...offsets, 12].map((offset) => concertNote(concertTonicMidi + offset, 2))
  return makeConcertEventTimeline([
    makeMeasure(0, climb),
    makeMeasure(1, [concertNote(concertTonicMidi, 16)]),
    makeMeasure(2, [concertNote(concertTonicMidi + offsets[3]!, 16)]),
    makeMeasure(3, [concertNote(concertTonicMidi + offsets[4]!, 16)]),
  ])
}

/** Intent: chord symbols on the concert I, IV, V and VI degrees, one per measure's downbeat. */
function concertChords(concertTonic: PitchClassNumber, collection: Collection) {
  const offsets = COLLECTION_OFFSETS[collection]
  return [0, 3, 4, 5].map((degree, measureIndex): ConcertChordSymbol => ({
    measureIndex: measureIndex as MeasureIndex,
    startTick: 0,
    root: ((concertTonic + offsets[degree]!) % 12) as PitchClassNumber,
    suffix: '',
    bass: null,
  }))
}

/** Intent: the written phrase of a concert phrase for my instrument, in a chosen written key. */
function writtenFor(
  myInstrument: MyInstrument,
  writtenTonalCenter: PitchClass,
  collection: Collection,
): { phrase: WrittenPhrase; timeline: ConcertEventTimeline; chords: ConcertChordSymbol[] } {
  const profile = myInstrument.profile
  const concertTonalCenter = writtenToConcertTonalCenter(writtenTonalCenter, profile)
  // The concert tonic in the octave from concert C4, so every note stays well inside MIDI.
  const concertTonicMidi = 60 + pcOf(concertTonalCenter)
  const timeline = concertScaleTimeline(concertTonicMidi, collection)
  const chords = concertChords(pcOf(concertTonalCenter), collection)
  const phrase = transformToWrittenPhrase({
    timeline,
    tonalContext: { tonalCenter: writtenTonalCenter, collection },
    chords,
    transposition: profile.transposition,
    concertRange: profile.concertRange,
    clef: myInstrument.clef,
  })
  return { phrase, timeline, chords }
}

/**
 * Intent: check one written measure against its concert source: every note at its concert pitch
 * plus the chromatic count, spelled as one of the written key's seven degrees (the concert notes
 * are all in the concert key), and every chord root moved by the same count, a degree of the key.
 */
function expectMeasureWritten(
  measure: WrittenMeasure,
  concertEvents: readonly MeasureEvent[],
  concertChords: readonly ConcertChordSymbol[],
  key: WrittenKey,
  chromatic: number,
): void {
  for (const glyph of measure.events) {
    if (glyph.kind !== 'note') continue
    const source = concertEvents[glyph.sourceEventIndex]!
    if (source.kind !== 'note') throw new Error('A written note must come from a note.')
    expect(midiOf(glyph.pitch)).toBe(source.pitch + chromatic)
    expect(key.scale).toContainEqual({ letter: glyph.pitch.letter, alter: glyph.pitch.alter })
  }
  expect(measure.chords).toHaveLength(concertChords.length)
  measure.chords.forEach((chord, index) => {
    const concertRoot = concertChords[index]!.root
    expect(spelledPc(chord.root)).toBe((((concertRoot + chromatic) % 12) + 12) % 12)
    expect(key.scale).toContainEqual(chord.root)
  })
}

/** The written keys the property is checked in: no accidentals, six sharps, five flats, a mode. */
const WRITTEN_KEYS: readonly (readonly [PitchClass, Collection])[] = [
  ['C', 'Major'],
  ['F#', 'Major'],
  ['C#', 'Major'],
  ['D', 'Dorian'],
  ['A#', 'Minor'],
]

// @test-link [[module_notation_display_convention]]
// @test-link [[req_my_instrument]]
describe('transformToWrittenPhrase for my instrument: any player-made transposition', () => {
  it('builds every transposition of 0 or 1 octave and 0 to 11 semitones, lower and higher', () => {
    const transpositions = everyTransposition()
    expect(transpositions).toHaveLength(1 + 2 * 23)
    for (const transposition of transpositions) {
      const { chromatic } = myInstrumentWith(transposition).profile.transposition
      const size = 12 * transposition.octaves + transposition.semitones
      const sign = transposition.direction === 'lower' ? 1 : -1
      expect(chromatic).toBe(transposition.direction === 'same' ? 0 : sign * size)
    }
  })

  it('writes every note and chord root at concert + chromatic, in the chosen written key', () => {
    for (const transposition of everyTransposition()) {
      const myInstrument = myInstrumentWith(transposition)
      const chromatic = myInstrument.profile.transposition.chromatic
      for (const [writtenTonalCenter, collection] of WRITTEN_KEYS) {
        const { phrase, timeline, chords } = writtenFor(
          myInstrument,
          writtenTonalCenter,
          collection,
        )
        const key = spellWrittenKey(pcOf(writtenTonalCenter), collection)

        // The transposition never moves the written key: it is the chosen centre's, spelled.
        expect(phrase.key).toEqual(key)

        for (const measure of phrase.measures) {
          expectMeasureWritten(
            measure,
            timeline.measures[measure.index].events,
            chords.filter((chord) => chord.measureIndex === measure.index),
            key,
            chromatic,
          )
        }

        // The written range is the concert range moved by the chromatic count: my instrument's.
        expect(phrase.writtenRange).toEqual({
          minMidi: myInstrument.profile.concertRange.minMidi + chromatic,
          maxMidi: myInstrument.profile.concertRange.maxMidi + chromatic,
        })
        expect(phrase.writtenRange).toEqual(myInstrument.writtenRange)
      }
    }
  })
})

// @test-link [[module_notation_display_convention]]
// @test-link [[req_my_instrument]]
describe('transformToWrittenPhrase for my instrument: 6 semitones higher, written in F♯', () => {
  const myInstrument = myInstrumentWith({ octaves: 0, semitones: 6, direction: 'higher' })

  it('derives a concert C major phrase from the written tonal centre F♯', () => {
    expect(myInstrument.profile.transposition.chromatic).toBe(-6)
    expect(writtenToConcertTonalCenter('F#', myInstrument.profile)).toBe('C')
  })

  it('writes the key as F♯ major, six sharps, never G♭ major', () => {
    const { phrase } = writtenFor(myInstrument, 'F#', 'Major')
    expect(phrase.key.label).toBe('F♯ Major')
    expect(phrase.key.signature).toMatchObject({
      accidental: 'sharp',
      count: 6,
      letters: ['F', 'C', 'G', 'D', 'A', 'E'],
    })
  })

  it('spells the notes and chord roots with sharps: written F as E♯', () => {
    const { phrase } = writtenFor(myInstrument, 'F#', 'Major')
    const climb = (phrase.measures[0].events as readonly WrittenNote[]).map((note) => note.pitch)
    // Concert C4 D4 E4 F4 G4 A4 B4 C5, written a tritone lower.
    expect(climb).toEqual([
      { letter: 'F', alter: 1, octave: 3 },
      { letter: 'G', alter: 1, octave: 3 },
      { letter: 'A', alter: 1, octave: 3 },
      { letter: 'B', alter: 0, octave: 3 },
      { letter: 'C', alter: 1, octave: 4 },
      { letter: 'D', alter: 1, octave: 4 },
      { letter: 'E', alter: 1, octave: 4 },
      { letter: 'F', alter: 1, octave: 4 },
    ])
    // Concert B4 (71) is written MIDI 65, spelled E♯4, not F4.
    expect(midiOf(climb[6]!)).toBe(65)
    // No written note carries a flat, and the key signature already holds every sharp.
    expect(climb.every((pitch) => pitch.alter >= 0)).toBe(true)
    expect(
      phrase.measures[0].events.every(
        (event) => event.kind !== 'note' || event.accidental === null,
      ),
    ).toBe(true)
    // Concert chord roots C, F, G, A: written F♯, B, C♯, D♯.
    expect(phrase.measures.map((measure) => measure.chords[0]!.text)).toEqual([
      'F♯',
      'B',
      'C♯',
      'D♯',
    ])
  })
})

/** Intent: a written phrase with its clef and stem directions blanked, the only parts a clef moves. */
function withoutClefAndStems(phrase: WrittenPhrase) {
  return {
    ...phrase,
    clef: null,
    measures: phrase.measures.map((measure) => ({
      ...measure,
      events: measure.events.map((event) =>
        event.kind === 'note' ? { ...event, stemDirection: null } : event,
      ),
    })),
  }
}

/** Intent: every glyph's stem direction across the phrase, null for a rest. */
function stemsOf(phrase: WrittenPhrase): readonly (string | null)[] {
  return phrase.measures.flatMap((measure) =>
    measure.events.map((event) => (event.kind === 'note' ? event.stemDirection : null)),
  )
}

// @test-link [[module_notation_display_convention]]
// @test-link [[rule_notation_display_preserves_phrase]]
// @test-link [[entity_my_instrument]]
describe('transformToWrittenPhrase for my instrument: treble or bass clef', () => {
  const transpositions: readonly MyInstrumentTransposition[] = [
    { octaves: 0, semitones: 0, direction: 'same' },
    { octaves: 0, semitones: 2, direction: 'higher' },
    { octaves: 1, semitones: 0, direction: 'lower' },
    { octaves: 0, semitones: 6, direction: 'higher' },
  ]

  it('writes the same pitches, durations, ties, accidentals, key, chords and range in both', () => {
    for (const transposition of transpositions) {
      const treble = myInstrumentWith(transposition, 'treble')
      const bass = myInstrumentWith(transposition, 'bass')
      for (const [writtenTonalCenter, collection] of WRITTEN_KEYS) {
        const inTreble = writtenFor(treble, writtenTonalCenter, collection).phrase
        const inBass = writtenFor(bass, writtenTonalCenter, collection).phrase
        expect(inTreble.clef).toBe('treble')
        expect(inBass.clef).toBe('bass')
        expect(inBass.transposition).toEqual(inTreble.transposition)
        expect(inBass.writtenRange).toEqual(inTreble.writtenRange)
        expect(withoutClefAndStems(inBass)).toEqual(withoutClefAndStems(inTreble))
      }
    }
  })

  it('measures stem directions from the clef’s own middle line', () => {
    const same = { octaves: 0, semitones: 0, direction: 'same' } as const
    const inTreble = writtenFor(myInstrumentWith(same, 'treble'), 'C', 'Major').phrase
    const inBass = writtenFor(myInstrumentWith(same, 'bass'), 'C', 'Major').phrase
    // Measure 1 holds written C4: below B4 (stem up) in treble, above D3 (stem down) in bass.
    expect((inTreble.measures[1].events[0] as WrittenNote).stemDirection).toBe('up')
    expect((inBass.measures[1].events[0] as WrittenNote).stemDirection).toBe('down')
    expect(stemsOf(inBass)).not.toEqual(stemsOf(inTreble))
  })

  it('leaves the concert timeline and chords untouched in bass clef', () => {
    const bass = myInstrumentWith({ octaves: 1, semitones: 0, direction: 'lower' }, 'bass')
    const profile = bass.profile
    const timeline = concertScaleTimeline(60, 'Major')
    const chords = concertChords(0, 'Major')
    const before = structuredClone({ timeline, chords })
    transformToWrittenPhrase({
      timeline,
      tonalContext: { tonalCenter: 'C', collection: 'Major' },
      chords,
      transposition: profile.transposition,
      concertRange: profile.concertRange,
      clef: bass.clef,
    })
    expect(structuredClone({ timeline, chords })).toEqual(before)
  })
})
