/**
 * Hand-built sessions for the MusicXML encoder specs. Each written phrase is produced by the real
 * display transform from a literal concert timeline and literal concert chord symbols, so the
 * encoder is fed exactly what the staff would show.
 *
 * - Phrase shape "rich": quarter, eighth and sixteenth notes with beams, a displayed sharp, a rest,
 *   a note tied across the barline between measures 3 and 4, a triad of each quality, and two
 *   measures with two chords each (measures 2 and 4, the second chord on beat 3).
 * - Phrase shape "plain": half and whole notes, one chord per measure.
 *
 * Both shapes are written in concert C major and moved by a semitone offset, so one shape serves
 * every instrument and key.
 */
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure, type MeasureIndex } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import type { PitchClassNumber } from '@/domain/harmony/harmony-types'
import { transformToWrittenPhrase } from '@/domain/notation/written-phrase'
import type { ConcertChordSymbol, WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import { makeRational } from '@/domain/time/rational'
import type {
  GeneratedNotesMusicXmlInput,
  MusicXmlSessionPhrase,
} from '@/export/musicxml/musicxml-export-input'

/** A note of `ticks` sixteenths at concert MIDI `pitch`, optionally a tie continuation. */
function note(pitch: number, ticks: number, tieContinuation = false): MeasureEvent {
  return makeNoteEvent({
    duration: makeRational(ticks, 16),
    pitch: makeConcertPitch(pitch),
    tieContinuation,
  })
}

/** A rest of `ticks` sixteenths. */
function rest(ticks: number): MeasureEvent {
  return makeRestEvent({ duration: makeRational(ticks, 16) })
}

/** A four-measure concert timeline from four event lists. */
function timelineOf(measures: readonly (readonly MeasureEvent[])[]): ConcertEventTimeline {
  return makeConcertEventTimeline(measures.map((events, index) => makeMeasure(index, events)))
}

/** One concert chord symbol, root moved by `offset` semitones. */
function chord(
  measureIndex: MeasureIndex,
  startTick: number,
  root: number,
  suffix: string,
  offset: number,
): ConcertChordSymbol {
  return {
    measureIndex,
    startTick,
    root: ((((root + offset) % 12) + 12) % 12) as PitchClassNumber,
    suffix,
    bass: null,
  }
}

/** The "rich" shape, concert C major around middle C, moved by `offset` semitones. */
function richShape(offset: number): {
  timeline: ConcertEventTimeline
  chords: readonly ConcertChordSymbol[]
} {
  const p = (midi: number): number => midi + offset
  const timeline = timelineOf([
    [note(p(60), 4), note(p(64), 4), note(p(67), 2), note(p(69), 2), note(p(67), 4)],
    [
      note(p(69), 8),
      note(p(71), 1),
      note(p(69), 1),
      note(p(67), 1),
      note(p(66), 1),
      note(p(67), 4),
    ],
    [rest(4), note(p(64), 12)],
    [note(p(64), 4, true), note(p(62), 4), note(p(60), 8)],
  ])
  const chords = [
    chord(0, 0, 0, '', offset),
    chord(1, 0, 5, '', offset),
    chord(1, 8, 7, '', offset),
    chord(2, 0, 9, 'm', offset),
    chord(3, 0, 11, 'dim', offset),
    chord(3, 8, 0, '', offset),
  ]
  return { timeline, chords }
}

/** The "plain" shape, concert C major around middle C, moved by `offset` semitones. */
function plainShape(offset: number): {
  timeline: ConcertEventTimeline
  chords: readonly ConcertChordSymbol[]
} {
  const p = (midi: number): number => midi + offset
  const timeline = timelineOf([
    [note(p(67), 8), note(p(64), 8)],
    [note(p(62), 16)],
    [note(p(65), 8), note(p(69), 8)],
    [note(p(60), 16)],
  ])
  const chords = [
    chord(0, 0, 0, '', offset),
    chord(1, 0, 7, '', offset),
    chord(2, 0, 5, '', offset),
    chord(3, 0, 0, '', offset),
  ]
  return { timeline, chords }
}

/** Intent: run one shape through the real display transform for an instrument and written key. */
function written(
  shape: { timeline: ConcertEventTimeline; chords: readonly ConcertChordSymbol[] },
  instrument: InstrumentProfile,
  writtenTonalCenter: PitchClass,
  collection: Collection = 'Ionian',
): WrittenPhrase {
  return transformToWrittenPhrase({
    timeline: shape.timeline,
    tonalContext: { tonalCenter: writtenTonalCenter, collection },
    chords: shape.chords,
    transposition: instrument.transposition,
    concertRange: instrument.concertRange,
  })
}

/** Intent: one session phrase record. */
function phrase(
  number: number,
  writtenPhrase: WrittenPhrase,
  tempo: number,
): MusicXmlSessionPhrase {
  return { number, writtenPhrase, tempo }
}

/**
 * C MIDI keyboard, written C Ionian (concert C major): phrase 1 "rich", phrase 2 "plain", both at
 * 90 BPM. No transposition, one metronome mark.
 */
export function cKeyboardSession(): GeneratedNotesMusicXmlInput {
  return {
    instrument: C_KEYBOARD_PROFILE,
    phrases: [
      phrase(1, written(richShape(0), C_KEYBOARD_PROFILE, 'C'), 90),
      phrase(2, written(plainShape(0), C_KEYBOARD_PROFILE, 'C'), 90),
    ],
  }
}

/**
 * B-flat tenor saxophone, written D Ionian (concert C major, an octave lower than the keyboard
 * session): phrase 1 "rich" at 90 BPM, phrase 2 "plain" at 120 BPM — the tempo change.
 */
export function bbTenorTempoChangeSession(): GeneratedNotesMusicXmlInput {
  return {
    instrument: BB_TENOR_PROFILE,
    phrases: [
      phrase(1, written(richShape(-12), BB_TENOR_PROFILE, 'D'), 90),
      phrase(2, written(plainShape(-12), BB_TENOR_PROFILE, 'D'), 120),
    ],
  }
}

/**
 * E-flat alto saxophone: phrase 1 "rich" written A Ionian (concert C major), phrase 2 "plain"
 * written D Ionian (concert F major) — a key change at the phrase boundary — both at 120 BPM.
 */
export function ebAltoKeyChangeSession(): GeneratedNotesMusicXmlInput {
  return {
    instrument: EB_ALTO_PROFILE,
    phrases: [
      phrase(1, written(richShape(0), EB_ALTO_PROFILE, 'A'), 120),
      phrase(2, written(plainShape(5), EB_ALTO_PROFILE, 'D'), 120),
    ],
  }
}

/** Intent: a session of `count` "plain" C-keyboard phrases at the given tempos (one per phrase). */
export function cKeyboardPlainSession(tempos: readonly number[]): GeneratedNotesMusicXmlInput {
  return {
    instrument: C_KEYBOARD_PROFILE,
    phrases: tempos.map((tempo, index) =>
      phrase(index + 1, written(plainShape(0), C_KEYBOARD_PROFILE, 'C'), tempo),
    ),
  }
}

/** Intent: a written phrase for a given instrument, for input-contract tests. */
export function plainPhraseFor(instrument: InstrumentProfile): WrittenPhrase {
  const offset = instrument.transposition.chromatic === 0 ? 0 : -12
  return written(plainShape(offset), instrument, 'C')
}
