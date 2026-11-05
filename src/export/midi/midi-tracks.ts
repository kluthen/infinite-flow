/**
 * The tracks of the exported MIDI files, as timed events. The first track, the conductor track,
 * holds what every MIDI file of a session shares: the 4/4 time signature, the full tempo map and
 * one marker per phrase, with the file's first phrase at time zero and the phrases back to back.
 * The note tracks hold sounding notes: the generated line, read from each phrase's concert
 * timeline, and the backing, read from the backing notes. The phrase at zero-based position p of
 * the file starts at p × 15360 MIDI ticks, whatever its session number: a whole session's phrase n
 * at (n − 1) × 15360, a favorites-only file's phrases one after the other from zero. A Jam's files
 * open with its doodle instead: a "Doodle" marker at time zero, at the doodle's capture tempo, its
 * measures (3840 ticks each) before the first phrase, which starts at the next barline, every
 * phrase moved later by the doodle's length.
 */
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import {
  MidiExportError,
  type MidiBackingNote,
  type MidiBackingPhrase,
  type MidiDoodleSection,
} from './midi-export-input'
import {
  MIDI_TICKS_PER_PHRASE,
  MIDI_TICKS_PER_WHOLE_NOTE,
  microsecondsPerQuarterNote,
  midiTicksOfWholeNotes,
} from './midi-time'
import {
  fourFourTimeSignatureEvent,
  markerEvent,
  noteOffEvent,
  noteOnEvent,
  tempoEvent,
  trackNameEvent,
  type TimedMidiEvent,
} from './smf-writer'

/** A phrase as the conductor track needs it: its session number, for its marker, and its tempo. */
export interface ConductorPhrase {
  readonly number: number
  readonly tempo: number
}

/** One sounding note in MIDI ticks from the start of the file. */
export interface SoundingNote {
  readonly pitch: number
  readonly startTick: number
  readonly endTick: number
}

/** A sounding note with its own zero-based MIDI channel and note-on velocity. */
// @spec-link [[req_played_notes_export]]
export interface VoicedNote extends SoundingNote {
  readonly channel: number
  readonly velocity: number
}

/**
 * The name the conductor track of every MIDI file of a session carries, so the files of one
 * session share their first track byte for byte.
 */
// @spec-link [[rule_played_notes_export_aligns_with_generated_midi]]
export const MIDI_FILE_NAME = 'Infinite Flow'

/** A Jam's doodle as the conductor track needs it: its length in measures and its tempo. */
// @spec-link [[rule_jam_exports_open_with_doodle]]
export interface ConductorDoodle {
  readonly measureCount: number
  readonly tempo: number
}

/** The marker that opens a Jam's doodle section in both MIDI files. */
// @spec-link [[rule_jam_exports_open_with_doodle]]
export const DOODLE_MARKER = 'Doodle'

/**
 * Intent: the MIDI tick at which the file's first phrase starts: zero, or, in a Jam's files, the
 * doodle's last barline, its measures of 4/4 counted from zero.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_jam_exports_line_up]]
export function phrasesOrigin(doodle: ConductorDoodle | null | undefined): number {
  return doodle == null ? 0 : doodle.measureCount * MIDI_TICKS_PER_WHOLE_NOTE
}

/**
 * Intent: the MIDI tick at which the phrase at zero-based `position` of the file starts: the first
 * at `origin` (zero, or a Jam's doodle's end), the phrases back to back. `phraseStartTick(count)`
 * is where the file's last phrase ends.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[rule_played_notes_export_aligns_with_generated_midi]]
// @spec-link [[rule_favorites_only_export]]
export function phraseStartTick(position: number, origin = 0): number {
  return origin + position * MIDI_TICKS_PER_PHRASE
}

/**
 * Intent: the conductor track's events: the file's name and the 4/4 time signature at time zero,
 * then, at each phrase's start, a tempo event when the tempo is the first or differs from the
 * phrase before, and a marker "Phrase n" with its session number. In a Jam's files the doodle
 * comes first: its capture tempo and a marker "Doodle" at time zero, the doodle's tempo then
 * counting as the one before phrase 1's. The played-notes file of the same session is built from
 * the same events, so the two files share their tempo map and markers exactly.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
// @spec-link [[rule_played_notes_export_aligns_with_generated_midi]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_jam_exports_line_up]]
export function conductorTrackEvents(
  phrases: readonly ConductorPhrase[],
  fileName: string,
  doodle: ConductorDoodle | null = null,
): TimedMidiEvent[] {
  const events: TimedMidiEvent[] = [
    { tick: 0, bytes: trackNameEvent(fileName) },
    { tick: 0, bytes: fourFourTimeSignatureEvent() },
  ]
  if (doodle !== null) {
    events.push({ tick: 0, bytes: tempoEvent(microsecondsPerQuarterNote(doodle.tempo)) })
    events.push({ tick: 0, bytes: markerEvent(DOODLE_MARKER) })
  }
  const origin = phrasesOrigin(doodle)
  phrases.forEach((phrase, position) => {
    const tick = phraseStartTick(position, origin)
    const tempoBefore = position === 0 ? (doodle?.tempo ?? null) : phrases[position - 1]!.tempo
    if (tempoBefore !== phrase.tempo) {
      events.push({ tick, bytes: tempoEvent(microsecondsPerQuarterNote(phrase.tempo)) })
    }
    events.push({ tick, bytes: markerEvent(`Phrase ${phrase.number}`) })
  })
  return events
}

/**
 * Intent: a phrase's concert timeline as sounding notes, shifted to the start of the phrase at
 * zero-based `position` of the file, the phrases starting at `origin`; `phraseNumber` names it in
 * a failure. A fresh
 * note opens a note; a tie continuation lengthens the open note, which must be of the same pitch
 * and end right where the continuation starts; a rest closes the open note. Crashes when a tie
 * continuation has nothing to continue, or when the timeline does not fill exactly four measures.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function generatedLineNotes(
  timeline: ConcertEventTimeline,
  phraseNumber: number,
  position: number,
  origin = 0,
): SoundingNote[] {
  const offset = phraseStartTick(position, origin)
  const notes: SoundingNote[] = []
  let holding = false
  let tick = offset
  for (const event of timeline.measures.flatMap((measure) => measure.events)) {
    const length = midiTicksOfWholeNotes(event.duration)
    const last = notes[notes.length - 1]
    if (event.kind === 'note' && event.tieContinuation) {
      if (!holding || last === undefined || last.pitch !== event.pitch) {
        throw new MidiExportError(
          `Phrase ${phraseNumber} has a tie continuation with no note to hold.`,
        )
      }
      notes[notes.length - 1] = { ...last, endTick: tick + length }
    } else if (event.kind === 'note') {
      notes.push({ pitch: event.pitch, startTick: tick, endTick: tick + length })
    }
    holding = event.kind === 'note'
    tick += length
  }
  if (tick !== offset + MIDI_TICKS_PER_PHRASE) {
    throw new MidiExportError(`Phrase ${phraseNumber} does not fill exactly four 4/4 measures.`)
  }
  return notes
}

/**
 * Intent: timed notes (whole notes from their span's start) as sounding notes from `offset`.
 */
function soundingFrom(notes: readonly MidiBackingNote[], offset: number): SoundingNote[] {
  return notes.map((note) => {
    const startTick = offset + midiTicksOfWholeNotes(note.start)
    return {
      pitch: note.pitch,
      startTick,
      endTick: startTick + midiTicksOfWholeNotes(note.duration),
    }
  })
}

/**
 * Intent: one phrase's backing notes as sounding notes, shifted to the start of the phrase at
 * zero-based `position` of the file, the phrases starting at `origin`.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function backingNotes(
  phrase: MidiBackingPhrase,
  position: number,
  origin = 0,
): SoundingNote[] {
  return soundingFrom(phrase.notes, phraseStartTick(position, origin))
}

/**
 * Intent: a Jam's quantized doodle as sounding notes from time zero, where its section opens the
 * file.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
export function doodleNotes(doodle: MidiDoodleSection): SoundingNote[] {
  return soundingFrom(doodle.notes, 0)
}

/**
 * Intent: a note track's events: its name at time zero, then every note's note-on and note-off in
 * time order, each on its own channel and the note-on at its own velocity. At the same tick every
 * release comes before every attack, so a pitch that ends one note and starts the next is released
 * before it sounds again; ties among releases or among attacks go by channel, then by pitch, lowest
 * first, so the same notes always give the same bytes.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_generated_notes_midi_export]]
export function voicedNoteTrackEvents(
  name: string,
  notes: readonly VoicedNote[],
): TimedMidiEvent[] {
  const changes = notes.flatMap((note) => [
    { tick: note.startTick, release: false, note },
    { tick: note.endTick, release: true, note },
  ])
  changes.sort(
    (a, b) =>
      a.tick - b.tick ||
      Number(b.release) - Number(a.release) ||
      a.note.channel - b.note.channel ||
      a.note.pitch - b.note.pitch,
  )
  return [
    { tick: 0, bytes: trackNameEvent(name) },
    ...changes.map(({ tick, release, note }) => ({
      tick,
      bytes: release
        ? noteOffEvent(note.channel, note.pitch)
        : noteOnEvent(note.channel, note.pitch, note.velocity),
    })),
  ]
}

/**
 * Intent: a note track whose notes all share one channel and one velocity, as the generated line
 * and the backing are written: the same events as voicedNoteTrackEvents gives those notes.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function noteTrackEvents(
  name: string,
  notes: readonly SoundingNote[],
  channel: number,
  velocity: number,
): TimedMidiEvent[] {
  return voicedNoteTrackEvents(
    name,
    notes.map((note) => ({ ...note, channel, velocity })),
  )
}
