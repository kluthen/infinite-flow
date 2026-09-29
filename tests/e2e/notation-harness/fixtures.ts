/**
 * Hand-built WrittenPhrase fixtures for the notation engraving harness: one dense fixture (a full
 * sixteenth grid with accidentals and a mid-bar chord change), one dense-with-tie variant of it
 * (the same grid with a tie crossing the bar 2 -> bar 3 boundary, for exercising the two-system
 * phone layout's cross-line partial tie), one simple fixture (whole/half/quarter/rests, ties across
 * a barline, a dotted value and a beam group), and two key-signature-heavy fixtures (six sharps,
 * five flats) to exercise legibility-floor width at real key widths.
 *
 * The `testProfile*` and `writtenSpelling*` fixtures below are not hand-built: they run the real
 * `transformToWrittenPhrase` display transform (Open transposition / spelling-risk coverage) over
 * an explicit concert timeline, so the harness engraves whatever that transform actually produces
 * for a test-only instrument transposition or a written/concert spelling-divergent key, with no
 * production code change.
 */
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure, type Measure, type MeasureIndex } from '@/domain/events/measure'
import { makeNoteEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import { BB_TENOR_PROFILE, EB_ALTO_PROFILE } from '@/domain/profile/instrument-profiles'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type {
  ConcertChordSymbol,
  DisplayedAccidental,
  NotatedDuration,
  NotationPhraseInput,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenKey,
  WrittenMeasure,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'

const CONCERT_TRANSPOSITION = { chromatic: 0, diatonic: 0 } as const
/**
 * The written range every hand-built phrase is placed for: the saxophones' (written C4 to C6),
 * which holds all their notes, up to the dense phrases' written C6.
 */
const FIXTURE_WRITTEN_RANGE = { minMidi: 60, maxMidi: 84 } as const
/** The C MIDI keyboard's active concert range, for the test-only transpositions' phrases. */
const KEYBOARD_CONCERT_RANGE = { minMidi: 48, maxMidi: 72 } as const
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
    transposition: CONCERT_TRANSPOSITION,
    writtenRange: FIXTURE_WRITTEN_RANGE,
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
    transposition: CONCERT_TRANSPOSITION,
    writtenRange: FIXTURE_WRITTEN_RANGE,
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
    transposition: CONCERT_TRANSPOSITION,
    writtenRange: FIXTURE_WRITTEN_RANGE,
    clef: 'treble',
    timeSignature: TIME_SIGNATURE,
    key,
    measures,
  }
}

/** A four-measure whole-note-tonic concert timeline, driven through the real display transform. */
function wholeNoteTimeline(concertPitch: number): Measure[] {
  return [0, 1, 2, 3].map((index) =>
    makeMeasure(index as MeasureIndex, [
      makeNoteEvent({
        duration: makeRational(16, 16),
        pitch: makeConcertPitch(concertPitch),
        tieContinuation: false,
      }),
    ]),
  )
}

/** One root-position, no-suffix chord symbol at every measure's downbeat. */
function tonicChordEachMeasure(): readonly ConcertChordSymbol[] {
  return [0, 1, 2, 3].map((measureIndex) => ({
    measureIndex: measureIndex as MeasureIndex,
    startTick: 0,
    root: 0,
    suffix: '',
    bass: null,
  }))
}

/**
 * Intent: engrave a real, explicit written phrase (via `transformToWrittenPhrase`, not a hand-built
 * WrittenPhrase) for one written tonal center/collection and instrument transposition, over a
 * whole-note-tonic concert timeline.
 */
function buildTransformedPhrase(
  concertPitch: number,
  tonalCenter: PitchClass,
  collection: Collection,
  instrument: Pick<NotationPhraseInput, 'transposition' | 'concertRange'>,
): WrittenPhrase {
  const input: NotationPhraseInput = {
    timeline: makeConcertEventTimeline(wholeNoteTimeline(concertPitch)),
    tonalContext: { tonalCenter, collection },
    chords: tonicChordEachMeasure(),
    transposition: instrument.transposition,
    concertRange: instrument.concertRange,
  }
  return transformToWrittenPhrase(input)
}

/**
 * Open transposition (Definition of Done): a test-only instrument profile whose transposition no
 * first-release profile uses, engraved end to end from a written C Ionian selection.
 */
function buildTestProfilePlus2Plus1Phrase(): WrittenPhrase {
  return buildTransformedPhrase(60, 'C', 'Ionian', {
    transposition: { chromatic: 2, diatonic: 1 },
    concertRange: KEYBOARD_CONCERT_RANGE,
  })
}

/** A second open, fabricated test-only instrument transposition, engraved the same way. */
function buildTestProfilePlus21Plus12Phrase(): WrittenPhrase {
  return buildTransformedPhrase(60, 'C', 'Ionian', {
    transposition: { chromatic: 21, diatonic: 12 },
    concertRange: KEYBOARD_CONCERT_RANGE,
  })
}

/**
 * Gate report §5 (spelling risk): written F# Ionian on the B-flat tenor engraves as F# major (six
 * sharps), spelled from the written selection, even though its concert counterpart (E) would
 * otherwise spell with zero accidentals.
 */
function buildWrittenSharpSideBbTenorPhrase(): WrittenPhrase {
  return buildTransformedPhrase(64, 'F#', 'Ionian', BB_TENOR_PROFILE)
}

/**
 * Gate report §5 (spelling risk): the written flat-side pitch class C# on the E-flat alto engraves
 * as D-flat major (five flats), the lowest-accidental spelling, from the written selection.
 */
function buildWrittenFlatSideEbAltoPhrase(): WrittenPhrase {
  return buildTransformedPhrase(64, 'C#', 'Major', EB_ALTO_PROFILE)
}

/** The closed set of harness fixture names, selected via the page's `fixture` URL parameter. */
export type FixtureName =
  | 'dense'
  | 'denseTie'
  | 'simple'
  | 'sharps6'
  | 'flats5'
  | 'testProfilePlus2Plus1'
  | 'testProfilePlus21Plus12'
  | 'writtenSharpSideBbTenor'
  | 'writtenFlatSideEbAlto'

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
    case 'testProfilePlus2Plus1':
      return buildTestProfilePlus2Plus1Phrase()
    case 'testProfilePlus21Plus12':
      return buildTestProfilePlus21Plus12Phrase()
    case 'writtenSharpSideBbTenor':
      return buildWrittenSharpSideBbTenorPhrase()
    case 'writtenFlatSideEbAlto':
      return buildWrittenFlatSideEbAltoPhrase()
    default:
      throw new Error(`Unknown notation harness fixture: ${name}`)
  }
}
