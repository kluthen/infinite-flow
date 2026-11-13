/**
 * The seventh chord symbol calibration fixtures and their triad controls: four A major measures,
 * concert, treble, each a full grid of one note value (sixteenths, eighths or quarters) running
 * stepwise up and down the key's scale, every note in the key so none displays an accidental (the
 * signature's three sharps carry them), as a generated phrase in that key looks. Each measure holds
 * two two-beat chords, on beats 1 and 3. The sevenths name the widest symbols the app writes
 * (`m7♭5` on sharp and flat roots, `maj7`); the triads put the triad symbol of the same root in the
 * same places, so the two differ by their symbols alone. In the quarter grid the symbols, not the
 * notes, set a measure's width.
 */
import type {
  NotatedDuration,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenKey,
  WrittenMeasure,
  WrittenPhrase,
} from '@/domain/notation/written-phrase-types'
import {
  CONCERT_TRANSPOSITION,
  EIGHTH,
  FIXTURE_WRITTEN_RANGE,
  QUARTER,
  SIXTEENTH,
  TIME_SIGNATURE,
  gridMeasure,
} from './fixture-parts'

/** Intent: build the three-sharp A major written key. */
function keyAMajor(): WrittenKey {
  const scale: readonly SpelledPitchClass[] = [
    { letter: 'A', alter: 0 },
    { letter: 'B', alter: 0 },
    { letter: 'C', alter: 1 },
    { letter: 'D', alter: 0 },
    { letter: 'E', alter: 0 },
    { letter: 'F', alter: 1 },
    { letter: 'G', alter: 1 },
  ]
  return {
    tonic: { letter: 'A', alter: 0 },
    collection: 'Major',
    label: 'A Major',
    scale,
    signature: {
      accidental: 'sharp',
      count: 3,
      letters: ['F', 'C', 'G'],
      ionianTonic: { letter: 'A', alter: 0 },
    },
  }
}

/**
 * The sixteenth grid's run, one per sixteenth of a measure: A major from E4 (the bottom line) up to
 * F♯5 (the top line) and back down to F♯4.
 */
const SIXTEENTH_RUN: readonly SpelledPitch[] = [
  { letter: 'E', alter: 0, octave: 4 },
  { letter: 'F', alter: 1, octave: 4 },
  { letter: 'G', alter: 1, octave: 4 },
  { letter: 'A', alter: 0, octave: 4 },
  { letter: 'B', alter: 0, octave: 4 },
  { letter: 'C', alter: 1, octave: 5 },
  { letter: 'D', alter: 0, octave: 5 },
  { letter: 'E', alter: 0, octave: 5 },
  { letter: 'F', alter: 1, octave: 5 },
  { letter: 'E', alter: 0, octave: 5 },
  { letter: 'D', alter: 0, octave: 5 },
  { letter: 'C', alter: 1, octave: 5 },
  { letter: 'B', alter: 0, octave: 4 },
  { letter: 'A', alter: 0, octave: 4 },
  { letter: 'G', alter: 1, octave: 4 },
  { letter: 'F', alter: 1, octave: 4 },
]

/** The eighth grid's run, one per eighth of a measure: A major from A4 up to E5 and back to B4. */
const EIGHTH_RUN: readonly SpelledPitch[] = [
  { letter: 'A', alter: 0, octave: 4 },
  { letter: 'B', alter: 0, octave: 4 },
  { letter: 'C', alter: 1, octave: 5 },
  { letter: 'D', alter: 0, octave: 5 },
  { letter: 'E', alter: 0, octave: 5 },
  { letter: 'D', alter: 0, octave: 5 },
  { letter: 'C', alter: 1, octave: 5 },
  { letter: 'B', alter: 0, octave: 4 },
]

/**
 * The quarter grid's run, one per beat: A4 up to C♯5 and back to B4, so the measure's two chord
 * symbols, not its four notes, set its width.
 */
const QUARTER_RUN: readonly SpelledPitch[] = [
  { letter: 'A', alter: 0, octave: 4 },
  { letter: 'B', alter: 0, octave: 4 },
  { letter: 'C', alter: 1, octave: 5 },
  { letter: 'B', alter: 0, octave: 4 },
]

/** The note value a chord-grid fixture fills its measures with. */
export type ChordGridValue = 'sixteenth' | 'eighth' | 'quarter'

/** Each grid note value's duration and run. */
const GRID_VALUES: Readonly<
  Record<ChordGridValue, { duration: NotatedDuration; run: readonly SpelledPitch[] }>
> = {
  sixteenth: { duration: SIXTEENTH, run: SIXTEENTH_RUN },
  eighth: { duration: EIGHTH, run: EIGHTH_RUN },
  quarter: { duration: QUARTER, run: QUARTER_RUN },
}

/** Which chord symbols a chord-grid fixture writes: the seventh chords, or their triad controls. */
export type ChordGridSymbols = 'sevenths' | 'triads'

/** One chord of the grid: its root, and its suffix as a seventh chord and as the triad control. */
interface GridChord {
  readonly root: SpelledPitchClass
  readonly seventhSuffix: string
  readonly triadSuffix: string
}

const G_SHARP_HALF_DIMINISHED: GridChord = {
  root: { letter: 'G', alter: 1 },
  seventhSuffix: 'm7♭5',
  triadSuffix: 'dim',
}
const E_FLAT_HALF_DIMINISHED: GridChord = {
  root: { letter: 'E', alter: -1 },
  seventhSuffix: 'm7♭5',
  triadSuffix: '',
}

/** One measure's two chords, on beat 1 then beat 3. */
type MeasureChords = readonly [GridChord, GridChord]

/** Each measure's two chords. */
const GRID_CHORDS: readonly [MeasureChords, MeasureChords, MeasureChords, MeasureChords] = [
  [G_SHARP_HALF_DIMINISHED, E_FLAT_HALF_DIMINISHED],
  [
    { root: { letter: 'C', alter: 0 }, seventhSuffix: 'maj7', triadSuffix: '' },
    { root: { letter: 'D', alter: 0 }, seventhSuffix: 'm7', triadSuffix: 'm' },
  ],
  [
    { root: { letter: 'G', alter: 0 }, seventhSuffix: '7', triadSuffix: '' },
    { root: { letter: 'B', alter: 0 }, seventhSuffix: 'm7♭5', triadSuffix: 'dim' },
  ],
  [E_FLAT_HALF_DIMINISHED, G_SHARP_HALF_DIMINISHED],
]

/** The written sign of a root's alteration in a chord symbol's text. */
const ALTER_SIGN: Readonly<Record<number, string>> = { [-1]: '♭', 0: '', 1: '♯' }

/** Intent: the written chord symbol of one grid chord at a tick, as a seventh chord or a triad. */
function gridChordSymbol(
  chord: GridChord,
  startTick: number,
  symbols: ChordGridSymbols,
): WrittenChordSymbol {
  const suffix = symbols === 'sevenths' ? chord.seventhSuffix : chord.triadSuffix
  const sign = ALTER_SIGN[chord.root.alter]
  if (sign === undefined) throw new Error(`No chord-grid sign for alter ${chord.root.alter}.`)
  return {
    startTick,
    root: chord.root,
    suffix,
    bass: null,
    text: `${chord.root.letter}${sign}${suffix}`,
  }
}

/**
 * Intent: build a chord-grid fixture: every measure a full grid of `value` notes (the A major
 * sixteenth, eighth or quarter run, no displayed accidental), its two chords at beats 1 and 3
 * (ticks 0 and 8), written as `symbols`.
 */
export function buildChordGridPhrase(
  value: ChordGridValue,
  symbols: ChordGridSymbols,
): WrittenPhrase {
  const { duration, run } = GRID_VALUES[value]
  const noAccidentals = run.map(() => null)
  /** Intent: build measure `index` of the grid with its two chords. */
  const measure = (index: 0 | 1 | 2 | 3): WrittenMeasure => {
    const [first, third] = GRID_CHORDS[index]
    return gridMeasure(index, duration, run, noAccidentals, [
      gridChordSymbol(first, 0, symbols),
      gridChordSymbol(third, 8, symbols),
    ])
  }
  const measures = [measure(0), measure(1), measure(2), measure(3)] as const
  return {
    transposition: CONCERT_TRANSPOSITION,
    writtenRange: FIXTURE_WRITTEN_RANGE,
    clef: 'treble',
    timeSignature: TIME_SIGNATURE,
    key: keyAMajor(),
    measures,
  }
}
