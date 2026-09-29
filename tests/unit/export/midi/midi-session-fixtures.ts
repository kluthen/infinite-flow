/**
 * Hand-built sessions for the MIDI encoder specs, from literal concert timelines and literal
 * backing notes, so every expected value in the specs can be worked out by hand.
 *
 * - Phrase shape "tied": quarter, eighth and sixteenth notes, a rest, and concert E4 (64) tied
 *   across the barline between measures 3 and 4. Chords: C | F G | Am | Bdim C.
 * - Phrase shape "plain": half and whole notes, one chord per measure. Chords: C | G | F | C.
 *
 * The backing of each shape follows the rule the backing renderer is built to: the bass plays the
 * chord's root at every chord change and on every beat 1, and the fifth on beat 3 of a chord that
 * lasts the whole measure; the chords are a close-position triad held until the next change.
 */
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeMeasure } from '@/domain/events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '@/domain/events/measure-event'
import { makeConcertEventTimeline, type ConcertEventTimeline } from '@/domain/events/timeline'
import { makeRational } from '@/domain/time/rational'
import type {
  GeneratedNotesMidiInput,
  MidiBackingNote,
  MidiBackingPhrase,
  MidiSessionPhrase,
} from '@/export/midi/midi-export-input'

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

/** The "tied" shape, concert C major around middle C. */
export function tiedTimeline(): ConcertEventTimeline {
  return timelineOf([
    [note(60, 4), note(64, 4), note(67, 2), note(69, 2), note(67, 4)],
    [note(69, 8), note(71, 1), note(69, 1), note(67, 1), note(66, 1), note(67, 4)],
    [rest(4), note(64, 12)],
    [note(64, 4, true), note(62, 4), note(60, 8)],
  ])
}

/** The "plain" shape, concert C major around middle C. */
export function plainTimeline(): ConcertEventTimeline {
  return timelineOf([
    [note(67, 8), note(64, 8)],
    [note(62, 16)],
    [note(65, 8), note(69, 8)],
    [note(60, 16)],
  ])
}

/** One chord of a backing: where it sits, the bass root (and fifth), and its triad. */
interface BackingChord {
  readonly measure: number
  readonly beat: 0 | 2
  readonly beats: 2 | 4
  readonly bassRoot: number
  readonly bassFifth: number | null
  readonly triad: readonly [number, number, number]
}

/** A backing note from a start and a length, both in quarter notes from the phrase start. */
function backingNote(pitch: number, startQuarters: number, quarters: number): MidiBackingNote {
  return {
    pitch: makeConcertPitch(pitch),
    start: makeRational(startQuarters, 4),
    duration: makeRational(quarters, 4),
  }
}

/** Intent: render a chord list to backing notes, bass first, then the triad, in time order. */
function backingOf(chords: readonly BackingChord[]): MidiBackingNote[] {
  return chords.flatMap((chord) => {
    const start = chord.measure * 4 + chord.beat
    const bass =
      chord.bassFifth === null
        ? [backingNote(chord.bassRoot, start, chord.beats)]
        : [backingNote(chord.bassRoot, start, 2), backingNote(chord.bassFifth, start + 2, 2)]
    return [...bass, ...chord.triad.map((pitch) => backingNote(pitch, start, chord.beats))]
  })
}

/** The backing of the "tied" shape: C | F G | Am | Bdim C. */
export function tiedBacking(): MidiBackingNote[] {
  return backingOf([
    { measure: 0, beat: 0, beats: 4, bassRoot: 36, bassFifth: 43, triad: [60, 64, 67] },
    { measure: 1, beat: 0, beats: 2, bassRoot: 41, bassFifth: null, triad: [60, 65, 69] },
    { measure: 1, beat: 2, beats: 2, bassRoot: 43, bassFifth: null, triad: [59, 62, 67] },
    { measure: 2, beat: 0, beats: 4, bassRoot: 45, bassFifth: 52, triad: [60, 64, 69] },
    { measure: 3, beat: 0, beats: 2, bassRoot: 47, bassFifth: null, triad: [59, 62, 65] },
    { measure: 3, beat: 2, beats: 2, bassRoot: 36, bassFifth: null, triad: [60, 64, 67] },
  ])
}

/** The backing of the "plain" shape: C | G | F | C. */
export function plainBacking(): MidiBackingNote[] {
  return backingOf([
    { measure: 0, beat: 0, beats: 4, bassRoot: 36, bassFifth: 43, triad: [60, 64, 67] },
    { measure: 1, beat: 0, beats: 4, bassRoot: 43, bassFifth: 50, triad: [59, 62, 67] },
    { measure: 2, beat: 0, beats: 4, bassRoot: 41, bassFifth: 48, triad: [60, 65, 69] },
    { measure: 3, beat: 0, beats: 4, bassRoot: 36, bassFifth: 43, triad: [60, 64, 67] },
  ])
}

/** Intent: one session phrase record. */
export function midiPhrase(
  number: number,
  timeline: ConcertEventTimeline,
  tempo: number,
): MidiSessionPhrase {
  return { number, timeline, tempo }
}

/** The three phrases of the reference session: "tied" at 90, "plain" at 120, "tied" at 120. */
function referencePhrases(): MidiSessionPhrase[] {
  return [
    midiPhrase(1, tiedTimeline(), 90),
    midiPhrase(2, plainTimeline(), 120),
    midiPhrase(3, tiedTimeline(), 120),
  ]
}

/** The backing of the reference session, one entry per phrase. */
function referenceBacking(): MidiBackingPhrase[] {
  return [
    { number: 1, notes: tiedBacking() },
    { number: 2, notes: plainBacking() },
    { number: 3, notes: tiedBacking() },
  ]
}

/**
 * The reference session with the backing off: three phrases, a tempo change from 90 to 120 BPM at
 * phrase 2 and none at phrase 3, a tie across a barline in phrases 1 and 3, and a note that ends
 * phrase 2 on the pitch that starts phrase 3.
 */
// @test-link [[rule_generated_notes_midi_export]]
export function referenceSessionWithoutBacking(): GeneratedNotesMidiInput {
  return { phrases: referencePhrases(), backing: null }
}

/** The same reference session with the backing on. */
export function referenceSessionWithBacking(): GeneratedNotesMidiInput {
  return { phrases: referencePhrases(), backing: referenceBacking() }
}
