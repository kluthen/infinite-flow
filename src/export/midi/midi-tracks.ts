/**
 * The tracks of the exported MIDI files, as timed events. The first track, the conductor track,
 * holds what every MIDI file of a session shares: the 4/4 time signature, the full tempo map and
 * one marker per phrase, with phrase 1 at time zero and the phrases back to back. The note tracks
 * hold sounding notes: the generated line, read from each phrase's concert timeline, and the
 * backing, read from the backing notes. Phrase n starts at (n − 1) × 15360 MIDI ticks.
 */
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import { MidiExportError, type MidiBackingPhrase } from './midi-export-input'
import {
  MIDI_TICKS_PER_PHRASE,
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

/** A phrase as the conductor track needs it: its session number and tempo in BPM. */
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

/** Intent: the MIDI tick at which a phrase starts: phrase 1 at zero, phrases back to back. */
export function phraseStartTick(phraseNumber: number): number {
  return (phraseNumber - 1) * MIDI_TICKS_PER_PHRASE
}

/**
 * Intent: the conductor track's events: the file's name and the 4/4 time signature at time zero,
 * then, at each phrase's start, a tempo event when the tempo is the first or differs from the
 * phrase before, and a marker "Phrase n". The played-notes file of the same session is built from
 * the same events, so the two files share their tempo map and markers exactly.
 */
// @spec-link [[rule_generated_notes_midi_export]]
// @spec-link [[req_session_export]]
export function conductorTrackEvents(
  phrases: readonly ConductorPhrase[],
  fileName: string,
): TimedMidiEvent[] {
  const events: TimedMidiEvent[] = [
    { tick: 0, bytes: trackNameEvent(fileName) },
    { tick: 0, bytes: fourFourTimeSignatureEvent() },
  ]
  phrases.forEach((phrase, position) => {
    const tick = phraseStartTick(phrase.number)
    if (position === 0 || phrases[position - 1]!.tempo !== phrase.tempo) {
      events.push({ tick, bytes: tempoEvent(microsecondsPerQuarterNote(phrase.tempo)) })
    }
    events.push({ tick, bytes: markerEvent(`Phrase ${phrase.number}`) })
  })
  return events
}

/**
 * Intent: a phrase's concert timeline as sounding notes, shifted to the phrase's start. A fresh
 * note opens a note; a tie continuation lengthens the open note, which must be of the same pitch
 * and end right where the continuation starts; a rest closes the open note. Crashes when a tie
 * continuation has nothing to continue, or when the timeline does not fill exactly four measures.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function generatedLineNotes(
  timeline: ConcertEventTimeline,
  phraseNumber: number,
): SoundingNote[] {
  const offset = phraseStartTick(phraseNumber)
  const notes: SoundingNote[] = []
  let holding = false
  let position = offset
  for (const event of timeline.measures.flatMap((measure) => measure.events)) {
    const length = midiTicksOfWholeNotes(event.duration)
    const last = notes[notes.length - 1]
    if (event.kind === 'note' && event.tieContinuation) {
      if (!holding || last === undefined || last.pitch !== event.pitch) {
        throw new MidiExportError(
          `Phrase ${phraseNumber} has a tie continuation with no note to hold.`,
        )
      }
      notes[notes.length - 1] = { ...last, endTick: position + length }
    } else if (event.kind === 'note') {
      notes.push({ pitch: event.pitch, startTick: position, endTick: position + length })
    }
    holding = event.kind === 'note'
    position += length
  }
  if (position !== offset + MIDI_TICKS_PER_PHRASE) {
    throw new MidiExportError(`Phrase ${phraseNumber} does not fill exactly four 4/4 measures.`)
  }
  return notes
}

/** Intent: one phrase's backing notes as sounding notes, shifted to the phrase's start. */
// @spec-link [[rule_generated_notes_midi_export]]
export function backingNotes(phrase: MidiBackingPhrase): SoundingNote[] {
  const offset = phraseStartTick(phrase.number)
  return phrase.notes.map((note) => {
    const startTick = offset + midiTicksOfWholeNotes(note.start)
    return {
      pitch: note.pitch,
      startTick,
      endTick: startTick + midiTicksOfWholeNotes(note.duration),
    }
  })
}

/**
 * Intent: a note track's events: its name at time zero, then every note's note-on and note-off in
 * time order. At the same tick every release comes before every attack, so a pitch that ends one
 * note and starts the next is released before it sounds again; ties among releases or among
 * attacks go by pitch, lowest first, so the same notes always give the same bytes.
 */
// @spec-link [[rule_generated_notes_midi_export]]
export function noteTrackEvents(
  name: string,
  notes: readonly SoundingNote[],
  channel: number,
  velocity: number,
): TimedMidiEvent[] {
  const changes = notes.flatMap((note) => [
    { tick: note.startTick, release: false, pitch: note.pitch },
    { tick: note.endTick, release: true, pitch: note.pitch },
  ])
  changes.sort(
    (a, b) => a.tick - b.tick || Number(b.release) - Number(a.release) || a.pitch - b.pitch,
  )
  return [
    { tick: 0, bytes: trackNameEvent(name) },
    ...changes.map((change) => ({
      tick: change.tick,
      bytes: change.release
        ? noteOffEvent(channel, change.pitch)
        : noteOnEvent(channel, change.pitch, velocity),
    })),
  ]
}
