/**
 * Hand-built WrittenPhrase fixtures for the notation engraving harness: one dense fixture (a full
 * sixteenth grid with accidentals and a mid-bar chord change), one dense-with-tie variant of it
 * (the same grid with a tie crossing the bar 2 -> bar 3 boundary, for exercising the two-system
 * phone layout's cross-line partial tie), one simple fixture (whole/half/quarter/rests, ties across
 * a barline, a dotted value and a beam group), and two key-signature-heavy fixtures (six sharps,
 * five flats) to exercise legibility-floor width at real key widths.
 */
import type {
  DisplayedAccidental,
  NotatedDuration,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenKey,
  WrittenMeasure,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'

const CONCERT_TRANSPOSITION = { chromatic: 0, diatonic: 0 } as const
const TIME_SIGNATURE = { beats: 4, beatValue: 4 } as const

/** Intent: build the no-accidental C major written key shared by the dense and simple fixtures. */
function keyCMajor(): WrittenKey {
  const scale: readonly SpelledPitchClass[] = [
    { letter: 'C', alter: 0 },
    { letter: 'D', alter: 0 },
    { letter: 'E', alter: 0 },
    { letter: 'F', alter: 0 },
    { letter: 'G', alter: 0 },
    { letter: 'A', alter: 0 },
    { letter: 'B', alter: 0 },
  ]
  return {
    tonic: { letter: 'C', alter: 0 },
    collection: 'Major',
    label: 'C Major',
    scale,
    signature: { accidental: null, count: 0, letters: [], ionianTonic: { letter: 'C', alter: 0 } },
  }
}

/** Intent: build the six-sharp F-sharp major written key. */
function keyFSharpMajor(): WrittenKey {
  const scale: readonly SpelledPitchClass[] = [
    { letter: 'F', alter: 1 },
    { letter: 'G', alter: 1 },
    { letter: 'A', alter: 1 },
    { letter: 'B', alter: 0 },
    { letter: 'C', alter: 1 },
    { letter: 'D', alter: 1 },
    { letter: 'E', alter: 1 },
  ]
  return {
    tonic: { letter: 'F', alter: 1 },
    collection: 'Major',
    label: 'F♯ Major',
    scale,
    signature: {
      accidental: 'sharp',
      count: 6,
      letters: ['F', 'C', 'G', 'D', 'A', 'E'],
      ionianTonic: { letter: 'F', alter: 1 },
    },
  }
}

/** Intent: build the five-flat D-flat major written key. */
function keyDFlatMajor(): WrittenKey {
  const scale: readonly SpelledPitchClass[] = [
    { letter: 'D', alter: -1 },
    { letter: 'E', alter: -1 },
    { letter: 'F', alter: 0 },
    { letter: 'G', alter: -1 },
    { letter: 'A', alter: -1 },
    { letter: 'B', alter: -1 },
    { letter: 'C', alter: 0 },
  ]
  return {
    tonic: { letter: 'D', alter: -1 },
    collection: 'Major',
    label: 'D♭ Major',
    scale,
    signature: {
      accidental: 'flat',
      count: 5,
      letters: ['B', 'E', 'A', 'D', 'G'],
      ionianTonic: { letter: 'D', alter: -1 },
    },
  }
}

const SIXTEENTH: NotatedDuration = { value: 'sixteenth', dots: 0, ticks: 1 }

/** Intent: build one full-sixteenth-grid measure with a few displayed accidentals and two chords. */
function denseMeasure(
  measureIndex: 0 | 1 | 2 | 3,
  pitches: readonly SpelledPitch[],
  accidentals: readonly (DisplayedAccidental | null)[],
): WrittenMeasure {
  const events = pitches.map((pitch, i) => ({
    kind: 'note' as const,
    startTick: i,
    duration: SIXTEENTH,
    pitch,
    accidental: accidentals[i] ?? null,
    tieFromPrevious: false,
    tieToNext: false,
    sourceEventIndex: i,
  }))
  const chordAtStart: WrittenChordSymbol = {
    startTick: 0,
    root: { letter: 'C', alter: 0 },
    suffix: '',
    bass: null,
    text: 'C',
  }
  const chordMid: WrittenChordSymbol = {
    startTick: 8,
    root: { letter: 'G', alter: 0 },
    suffix: '7',
    bass: null,
    text: 'G7',
  }
  return {
    index: measureIndex,
    events,
    beamGroups: [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11],
      [12, 13, 14, 15],
    ],
    chords: [chordAtStart, chordMid],
  }
}

/** Intent: build the dense fixture -- 16 sixteenths per measure, accidentals, a mid-bar chord change. */
function buildDensePhrase(): WrittenPhrase {
  const pitchCycle: readonly SpelledPitch[] = [
    { letter: 'C', alter: 0, octave: 5 },
    { letter: 'D', alter: 0, octave: 5 },
    { letter: 'E', alter: -1, octave: 5 },
    { letter: 'F', alter: 1, octave: 5 },
    { letter: 'G', alter: 0, octave: 5 },
    { letter: 'A', alter: 0, octave: 5 },
    { letter: 'B', alter: -1, octave: 5 },
    { letter: 'C', alter: 0, octave: 6 },
    { letter: 'B', alter: 0, octave: 5 },
    { letter: 'A', alter: 0, octave: 5 },
    { letter: 'G', alter: 1, octave: 5 },
    { letter: 'F', alter: 0, octave: 5 },
    { letter: 'E', alter: 0, octave: 5 },
    { letter: 'D', alter: -1, octave: 5 },
    { letter: 'C', alter: 0, octave: 5 },
    { letter: 'D', alter: 0, octave: 5 },
  ]
  const accidentalCycle: readonly (DisplayedAccidental | null)[] = [
    null,
    null,
    'flat',
    'sharp',
    null,
    null,
    'flat',
    null,
    'natural',
    null,
    'sharp',
    null,
    null,
    'flat',
    null,
    null,
  ]

  const measures: readonly [WrittenMeasure, WrittenMeasure, WrittenMeasure, WrittenMeasure] = [
    denseMeasure(0, pitchCycle, accidentalCycle),
    denseMeasure(1, pitchCycle, accidentalCycle),
    denseMeasure(2, pitchCycle, accidentalCycle),
    denseMeasure(3, pitchCycle, accidentalCycle),
  ]

  return {
    mode: 'Concert',
    transposition: CONCERT_TRANSPOSITION,
    clef: 'treble',
    timeSignature: TIME_SIGNATURE,
    key: keyCMajor(),
    measures,
  }
}

/** Intent: build the simple fixture's four measures: half+rest, dotted+beamed-eighths+tie, tie-in/tie-out, whole. */
function buildSimplePhrase(): WrittenPhrase {
  const chordAt = (root: SpelledPitchClass, text: string): readonly WrittenChordSymbol[] => [
    { startTick: 0, root, suffix: '', bass: null, text },
  ]

  const m0: WrittenMeasure = {
    index: 0,
    events: [
      {
        kind: 'note',
        startTick: 0,
        duration: { value: 'half', dots: 0, ticks: 8 },
        pitch: { letter: 'C', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 0,
      },
      {
        kind: 'rest',
        startTick: 8,
        duration: { value: 'half', dots: 0, ticks: 8 },
        sourceEventIndex: 1,
      },
    ],
    beamGroups: [],
    chords: chordAt({ letter: 'C', alter: 0 }, 'C'),
  }

  const m1: WrittenMeasure = {
    index: 1,
    events: [
      {
        kind: 'note',
        startTick: 0,
        duration: { value: 'quarter', dots: 1, ticks: 6 },
        pitch: { letter: 'D', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 0,
      },
      {
        kind: 'note',
        startTick: 6,
        duration: { value: 'eighth', dots: 0, ticks: 2 },
        pitch: { letter: 'D', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 1,
      },
      {
        kind: 'note',
        startTick: 8,
        duration: { value: 'eighth', dots: 0, ticks: 2 },
        pitch: { letter: 'E', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 2,
      },
      {
        kind: 'note',
        startTick: 10,
        duration: { value: 'eighth', dots: 0, ticks: 2 },
        pitch: { letter: 'F', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 3,
      },
      {
        kind: 'note',
        startTick: 12,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        pitch: { letter: 'G', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: true,
        sourceEventIndex: 4,
      },
    ],
    beamGroups: [[2, 3]],
    chords: chordAt({ letter: 'D', alter: 0 }, 'Dm'),
  }

  const m2: WrittenMeasure = {
    index: 2,
    events: [
      {
        kind: 'note',
        startTick: 0,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        pitch: { letter: 'G', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: true,
        tieToNext: false,
        sourceEventIndex: 0,
      },
      {
        kind: 'rest',
        startTick: 4,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        sourceEventIndex: 1,
      },
      {
        kind: 'note',
        startTick: 8,
        duration: { value: 'half', dots: 0, ticks: 8 },
        pitch: { letter: 'B', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: true,
        sourceEventIndex: 2,
      },
    ],
    beamGroups: [],
    chords: chordAt({ letter: 'G', alter: 0 }, 'G'),
  }

  const m3: WrittenMeasure = {
    index: 3,
    events: [
      {
        kind: 'note',
        startTick: 0,
        duration: { value: 'whole', dots: 0, ticks: 16 },
        pitch: { letter: 'B', alter: 0, octave: 5 },
        accidental: null,
        tieFromPrevious: true,
        tieToNext: false,
        sourceEventIndex: 0,
      },
    ],
    beamGroups: [],
    chords: chordAt({ letter: 'C', alter: 0 }, 'C'),
  }

  return {
    mode: 'Concert',
    transposition: CONCERT_TRANSPOSITION,
    clef: 'treble',
    timeSignature: TIME_SIGNATURE,
    key: keyCMajor(),
    measures: [m0, m1, m2, m3],
  }
}

/**
 * Intent: build the dense fixture again but with a tie crossing from the last sixteenth of measure
 * 1 into the first sixteenth of measure 2 -- the exact boundary the two-system phone layout breaks
 * its line at (bars 1-2 then bars 3-4), so a two-system engrave must draw it as two partial ties.
 */
function buildDensePhraseWithCrossLineTie(): WrittenPhrase {
  const base = buildDensePhrase()
  const [m0, m1, m2, m3] = base.measures

  const m1LastIndex = m1.events.length - 1
  const patchedM1: WrittenMeasure = {
    ...m1,
    events: m1.events.map((event, index) =>
      index === m1LastIndex && event.kind === 'note' ? { ...event, tieToNext: true } : event,
    ),
  }
  const patchedM2: WrittenMeasure = {
    ...m2,
    events: m2.events.map((event, index) =>
      index === 0 && event.kind === 'note' ? { ...event, tieFromPrevious: true } : event,
    ),
  }

  return { ...base, measures: [m0, patchedM1, patchedM2, m3] }
}

/** Intent: build one whole-note-on-tonic measure for a key-signature-heavy fixture. */
function keySignatureMeasure(index: 0 | 1 | 2 | 3, key: WrittenKey): WrittenMeasure {
  return {
    index,
    events: [
      {
        kind: 'note',
        startTick: 0,
        duration: { value: 'whole', dots: 0, ticks: 16 },
        pitch: { ...key.tonic, octave: 5 },
        accidental: null,
        tieFromPrevious: false,
        tieToNext: false,
        sourceEventIndex: 0,
      },
    ],
    beamGroups: [],
    chords: [{ startTick: 0, root: key.tonic, suffix: '', bass: null, text: key.label }],
  }
}

/** Intent: build a minimal single-whole-note-per-measure phrase for a given written key. */
function buildKeySignaturePhrase(key: WrittenKey): WrittenPhrase {
  const measures: readonly [WrittenMeasure, WrittenMeasure, WrittenMeasure, WrittenMeasure] = [
    keySignatureMeasure(0, key),
    keySignatureMeasure(1, key),
    keySignatureMeasure(2, key),
    keySignatureMeasure(3, key),
  ]

  return {
    mode: 'Concert',
    transposition: CONCERT_TRANSPOSITION,
    clef: 'treble',
    timeSignature: TIME_SIGNATURE,
    key,
    measures,
  }
}

/** The closed set of harness fixture names, selected via the page's `fixture` URL parameter. */
export type FixtureName = 'dense' | 'denseTie' | 'simple' | 'sharps6' | 'flats5'

/** Intent: resolve a harness fixture name to its WrittenPhrase, crashing on an unknown name. */
// @test-link [[module_notation_layout_preflight]]
export function resolveFixture(name: string): WrittenPhrase {
  switch (name) {
    case 'dense':
      return buildDensePhrase()
    case 'denseTie':
      return buildDensePhraseWithCrossLineTie()
    case 'simple':
      return buildSimplePhrase()
    case 'sharps6':
      return buildKeySignaturePhrase(keyFSharpMajor())
    case 'flats5':
      return buildKeySignaturePhrase(keyDFlatMajor())
    default:
      throw new Error(`Unknown notation harness fixture: ${name}`)
  }
}
