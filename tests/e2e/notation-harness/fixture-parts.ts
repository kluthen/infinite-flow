/**
 * The parts the hand-built notation harness fixtures share: the concert transposition, written
 * range, 4/4 time signature and C major key they are placed in, the stem directions their notes get
 * from the real domain rule (`assignStemDirections`), and the full one-value grid measure (every
 * slot of a measure filled by one note value, beamed by quarter beat when shorter than a quarter)
 * with the dense fixture's pitch and accidental cycle.
 */
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { assignStemDirections, type UnstemmedWrittenNote } from '@/domain/notation/stem-direction'
import type {
  DisplayedAccidental,
  NotatedDuration,
  SpelledPitch,
  SpelledPitchClass,
  WrittenChordSymbol,
  WrittenKey,
  WrittenMeasure,
  WrittenRest,
} from '@/domain/notation/written-phrase-types'

export const CONCERT_TRANSPOSITION = { chromatic: 0, diatonic: 0 } as const
/**
 * The written range every hand-built phrase is placed for: the saxophones' (written C4 to C6),
 * which holds all their notes, up to the dense phrases' written C6.
 */
export const FIXTURE_WRITTEN_RANGE = { minMidi: 60, maxMidi: 84 } as const
export const TIME_SIGNATURE = { beats: 4, beatValue: 4 } as const

/** Intent: build the no-accidental C major written key shared by the dense and simple fixtures. */
export function keyCMajor(): WrittenKey {
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

/** A hand-built measure whose notes carry no stem direction yet. */
export type UnstemmedMeasure = Omit<WrittenMeasure, 'events'> & {
  readonly events: readonly (UnstemmedWrittenNote | WrittenRest)[]
}

/**
 * Intent: complete a hand-built measure with the stem directions the real domain rule gives its
 * notes (beam groups included), so no fixture hard-codes a direction.
 */
export function stemmedMeasure(measure: UnstemmedMeasure): WrittenMeasure {
  return {
    ...measure,
    events: assignStemDirections(measure.events, measure.beamGroups, BUILT_IN_INSTRUMENT_CLEF),
  }
}

export const SIXTEENTH: NotatedDuration = { value: 'sixteenth', dots: 0, ticks: 1 }
export const EIGHTH: NotatedDuration = { value: 'eighth', dots: 0, ticks: 2 }
export const QUARTER: NotatedDuration = { value: 'quarter', dots: 0, ticks: 4 }

/** Ticks in one quarter beat: a beam group never crosses one. */
const BEAT_TICKS = 4

/** The dense fixture's sixteen written pitches, one per sixteenth of a measure. */
export const DENSE_PITCH_CYCLE: readonly SpelledPitch[] = [
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

/** The accidental each of the dense fixture's sixteen pitches displays. */
export const DENSE_ACCIDENTAL_CYCLE: readonly (DisplayedAccidental | null)[] = [
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

/**
 * Intent: build one measure filled by notes of one value (`duration`), one per pitch from tick 0,
 * each displaying its accidental, beamed by quarter beat (quarters stand unbeamed: a beam group
 * holds two notes or more), carrying the given chord symbols. The pitches must fill the 4/4
 * measure exactly.
 */
export function gridMeasure(
  measureIndex: 0 | 1 | 2 | 3,
  duration: NotatedDuration,
  pitches: readonly SpelledPitch[],
  accidentals: readonly (DisplayedAccidental | null)[],
  chords: readonly WrittenChordSymbol[],
): WrittenMeasure {
  if (pitches.length * duration.ticks !== TIME_SIGNATURE.beats * BEAT_TICKS) {
    throw new Error(`A grid measure of ${duration.value}s needs a full 4/4 measure of pitches.`)
  }
  const events = pitches.map((pitch, i) => ({
    kind: 'note' as const,
    startTick: i * duration.ticks,
    duration,
    pitch,
    accidental: accidentals[i] ?? null,
    tieFromPrevious: false,
    tieToNext: false,
    sourceEventIndex: i,
  }))
  const perBeat = BEAT_TICKS / duration.ticks
  const beamGroups =
    perBeat < 2
      ? []
      : Array.from({ length: TIME_SIGNATURE.beats }, (_, beat) =>
          Array.from({ length: perBeat }, (_, slot) => beat * perBeat + slot),
        )
  return stemmedMeasure({ index: measureIndex, events, beamGroups, chords })
}
