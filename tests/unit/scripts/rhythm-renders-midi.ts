/**
 * The MIDI files of the rhythm renders (v3.2 H1 and H2): a count-in measure of four soft clicks,
 * then the parts in order (measures of a rhythm, or silent measures), with a soft click on every
 * beat throughout and a marker naming each part. A rhythm is played from its measures' start
 * lists: a note start sounds until the next start or the end of its part, a rest start is
 * silence, and each measure's notes take the pitches of a line, note by note, repeating its last.
 * Written with the app's own Standard MIDI File writer at 960 MIDI ticks per quarter note. Test
 * tooling: the render script loads it through Vite's runnerImport; nothing in the app reads it.
 */

import { MIDI_TICKS_PER_QUARTER_NOTE } from '../../../src/export/midi/midi-time'
import {
  fourFourTimeSignatureEvent,
  markerEvent,
  noteOffEvent,
  noteOnEvent,
  tempoEvent,
  trackChunk,
  trackNameEvent,
  typeOneHeaderChunk,
  type TimedMidiEvent,
} from '../../../src/export/midi/smf-writer'
import type { MeasureStarts } from '../../../src/domain/rhythm/rhythm-bars'
import { TICKS_PER_BAR } from '../../../src/domain/time/ticks'

/** The tempo of every render, in beats (quarter notes) per minute. */
export const RENDER_BPM = 90

/** One MIDI tick count per app tick (a sixteenth note), per beat and per measure. */
export const MIDI_PER_SIXTEENTH = MIDI_TICKS_PER_QUARTER_NOTE / 4
const MIDI_PER_MEASURE = MIDI_PER_SIXTEENTH * TICKS_PER_BAR
const BEATS_PER_MEASURE = 4

/** The melody's channel (General MIDI channel 1) and the click's (channel 10, percussion). */
export const MELODY_CHANNEL = 0
export const CLICK_CHANNEL = 9
/** General MIDI side stick, the click's sound. */
export const CLICK_PITCH = 37
const CLICK_VELOCITY_DOWNBEAT = 56
const CLICK_VELOCITY_BEAT = 40
const CLICK_LENGTH = MIDI_PER_SIXTEENTH / 4
const MELODY_VELOCITY = 96
/** Each note ends this many MIDI ticks before its sounding end, so a repeated pitch re-attacks. */
const RELEASE_GAP = 20

/** The label of the count-in measure's marker. */
export const COUNT_IN_LABEL = 'Count-in'

/** One part of a render: measures of a rhythm with the line their notes take, or silence. */
export type RenderPart =
  | {
      readonly kind: 'rhythm'
      readonly label: string
      readonly measures: readonly MeasureStarts[]
      readonly line: readonly number[]
    }
  | { readonly kind: 'silence'; readonly label: string; readonly measureCount: number }

/** One render file: its name (the conductor track's name) and its parts after the count-in. */
export interface RenderFile {
  readonly name: string
  readonly parts: readonly RenderPart[]
}

/** One melody note to write, in MIDI ticks from the start of the file. */
interface MelodyNote {
  readonly pitch: number
  readonly start: number
  readonly end: number
}

/** Intent: how many measures a part lasts. */
function partMeasures(part: RenderPart): number {
  return part.kind === 'rhythm' ? part.measures.length : part.measureCount
}

/** Intent: the pitch of note `index` of a measure: the line's note at that place, or its last. */
export function linePitch(line: readonly number[], index: number): number {
  if (line.length === 0) throw new Error('A render line needs at least one pitch.')
  return line[Math.min(index, line.length - 1)]!
}

/**
 * Intent: the notes of a rhythm part starting at MIDI tick `offset`: each note start sounds until
 * the next start of the part (in this measure or a later one) or the part's end.
 */
export function rhythmNotes(
  measures: readonly MeasureStarts[],
  line: readonly number[],
  offset: number,
): readonly MelodyNote[] {
  const starts = measures.flatMap((measure, measureIndex) => {
    let noteIndex = 0
    return measure.map((entry) => ({
      at: offset + measureIndex * MIDI_PER_MEASURE + entry.tick * MIDI_PER_SIXTEENTH,
      pitch: entry.kind === 'note' ? linePitch(line, noteIndex++) : undefined,
    }))
  })
  const partEnd = offset + measures.length * MIDI_PER_MEASURE
  return starts.flatMap((entry, index) =>
    entry.pitch === undefined
      ? []
      : [
          {
            pitch: entry.pitch,
            start: entry.at,
            end: (starts[index + 1]?.at ?? partEnd) - RELEASE_GAP,
          },
        ],
  )
}

/** Intent: note-on and note-off events of notes, offs before ons at one tick, in time order. */
function noteEvents(
  notes: readonly MelodyNote[],
  channel: number,
  velocity: (note: MelodyNote) => number,
): TimedMidiEvent[] {
  const events = notes.flatMap((note) => [
    { tick: note.start, order: 1, bytes: noteOnEvent(channel, note.pitch, velocity(note)) },
    { tick: note.end, order: 0, bytes: noteOffEvent(channel, note.pitch) },
  ])
  events.sort((a, b) => a.tick - b.tick || a.order - b.order)
  return events.map(({ tick, bytes }) => ({ tick, bytes }))
}

/** Intent: a click on every beat of `measureCount` measures, the first beat of each a little louder. */
function clickNotes(measureCount: number): readonly MelodyNote[] {
  return Array.from({ length: measureCount * BEATS_PER_MEASURE }, (_, beat) => ({
    pitch: CLICK_PITCH,
    start: beat * MIDI_TICKS_PER_QUARTER_NOTE,
    end: beat * MIDI_TICKS_PER_QUARTER_NOTE + CLICK_LENGTH,
  }))
}

/** Intent: a click's velocity: a little louder on beat 1 of a measure. */
function clickVelocity(note: MelodyNote): number {
  return note.start % MIDI_PER_MEASURE === 0 ? CLICK_VELOCITY_DOWNBEAT : CLICK_VELOCITY_BEAT
}

/** Intent: the microseconds per quarter note of the render tempo. */
function renderTempo(): number {
  return Math.round(60_000_000 / RENDER_BPM)
}

/**
 * Intent: the bytes of one render file: a type 1 file with a conductor track (name, tempo, 4/4,
 * a marker per part), the melody track and the click track. Crashes on an empty file.
 */
export function renderMidi(file: RenderFile): Uint8Array {
  if (file.parts.length === 0) throw new Error(`Render ${file.name} has no part.`)
  const conductor: TimedMidiEvent[] = [
    { tick: 0, bytes: trackNameEvent(file.name) },
    { tick: 0, bytes: tempoEvent(renderTempo()) },
    { tick: 0, bytes: fourFourTimeSignatureEvent() },
    { tick: 0, bytes: markerEvent(COUNT_IN_LABEL) },
  ]
  const melody: MelodyNote[] = []
  let measure = 1
  for (const part of file.parts) {
    const offset = measure * MIDI_PER_MEASURE
    conductor.push({ tick: offset, bytes: markerEvent(part.label) })
    if (part.kind === 'rhythm') melody.push(...rhythmNotes(part.measures, part.line, offset))
    measure += partMeasures(part)
  }
  const end = measure * MIDI_PER_MEASURE
  const tracks = [
    trackChunk(conductor, end),
    trackChunk(
      [
        { tick: 0, bytes: trackNameEvent('Melody') },
        ...noteEvents(melody, MELODY_CHANNEL, () => MELODY_VELOCITY),
      ],
      end,
    ),
    trackChunk(
      [
        { tick: 0, bytes: trackNameEvent('Click') },
        ...noteEvents(clickNotes(measure), CLICK_CHANNEL, clickVelocity),
      ],
      end,
    ),
  ]
  return Uint8Array.from([
    ...typeOneHeaderChunk(tracks.length, MIDI_TICKS_PER_QUARTER_NOTE),
    ...tracks.flat(),
  ])
}
