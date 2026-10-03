/**
 * Hand-built played sessions for the played-notes MIDI specs: phrases placed back to back on the
 * audio clock from their tempos, and played notes given as offsets in seconds from their phrase's
 * start, so every expected MIDI tick can be worked out by hand. At 90 BPM one second is 1440 MIDI
 * ticks; at 120 BPM, 1920.
 */
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import type {
  MidiPlayedNote,
  PlayedNotesMidiInput,
  PlayedNotesMidiPhrase,
} from '@/export/midi/played-notes-midi-input'

/** Intent: how long a four-measure phrase lasts in seconds at `tempo` BPM: 16 quarter notes. */
export function phraseLength(tempo: number): number {
  return (16 * 60) / tempo
}

/** A played note as offsets in seconds from its phrase's start. */
export interface PlayedOffsets {
  readonly pitch: number
  readonly velocity: number
  readonly onset: number
  readonly release: number
}

/** Intent: a played note at absolute audio-clock times, the pitch unchecked (cast from a number). */
export function playedNote(
  pitch: number,
  velocity: number,
  onsetAt: number,
  releaseAt: number,
): MidiPlayedNote {
  return { pitch: pitch as ConcertPitch, velocity, onsetAt, releaseAt }
}

/** Intent: the audio-clock start of every phrase, back to back from `firstStart`. */
export function phraseStarts(firstStart: number, tempos: readonly number[]): number[] {
  const starts: number[] = [firstStart]
  for (const tempo of tempos.slice(0, -1)) starts.push(starts.at(-1)! + phraseLength(tempo))
  return starts.slice(0, tempos.length)
}

/**
 * Intent: a session of back-to-back phrases from `firstStart` at the given tempos, each holding
 * the notes given as offsets from its own start (an offset may reach into a later phrase).
 */
export function playedSession(
  firstStart: number,
  tempos: readonly number[],
  notes: readonly (readonly PlayedOffsets[])[],
): PlayedNotesMidiInput {
  const starts = phraseStarts(firstStart, tempos)
  const phrases: PlayedNotesMidiPhrase[] = tempos.map((tempo, index) => ({
    number: index + 1,
    tempo,
    startedAt: starts[index]!,
    playedNotes: (notes[index] ?? []).map((note) =>
      playedNote(
        note.pitch,
        note.velocity,
        starts[index]! + note.onset,
        starts[index]! + note.release,
      ),
    ),
  }))
  return { phrases }
}

/**
 * The reference played session: the reference session's numbers and tempos (90, then 120 twice)
 * from 2 s on the audio clock. Phrase 1: notes on the downbeat and off any grid, a two-note chord,
 * and a note held into phrase 2 across the tempo change. Phrase 2: a zero-length note, two
 * overlapping attacks of the same pitch, and the softest velocity. Phrase 3: a short note, a note
 * still held at the session's end, and two onsets at and after the session's end, which belong to
 * no phrase of the file.
 */
// @test-link [[req_played_notes_export]]
export function referencePlayedSession(): PlayedNotesMidiInput {
  const starts = phraseStarts(2, [90, 120, 120])
  const intoPhraseTwo = starts[1]! + 0.5 - starts[0]!
  return playedSession(
    2,
    [90, 120, 120],
    [
      [
        { pitch: 60, velocity: 80, onset: 0, release: 0.5 },
        { pitch: 64, velocity: 92, onset: 0.7, release: 1.25 },
        { pitch: 67, velocity: 64, onset: 1.333, release: 2 },
        { pitch: 71, velocity: 70, onset: 1.333, release: 2 },
        { pitch: 72, velocity: 100, onset: 10, release: intoPhraseTwo },
      ],
      [
        { pitch: 74, velocity: 50, onset: 0.25, release: 0.25 },
        { pitch: 62, velocity: 77, onset: 1, release: 2 },
        { pitch: 62, velocity: 88, onset: 1.5, release: 2.5 },
        { pitch: 60, velocity: 1, onset: 3.01, release: 3.2 },
      ],
      [
        { pitch: 65, velocity: 127, onset: 0.1, release: 0.3 },
        { pitch: 67, velocity: 60, onset: 7.5, release: 12 },
        { pitch: 69, velocity: 99, onset: 8, release: 8.5 },
        { pitch: 71, velocity: 99, onset: 9, release: 9.5 },
      ],
    ],
  )
}

/**
 * The reference played session's notes as the file must hold them, worked by hand:
 * [channel, pitch, velocity, start tick, end tick], by start tick then pitch.
 */
export const REFERENCE_PLAYED_NOTES: readonly (readonly [
  number,
  number,
  number,
  number,
  number,
])[] = [
  [0, 60, 80, 0, 720],
  [0, 64, 92, 1008, 1800],
  [0, 67, 64, 1920, 2880],
  [0, 71, 70, 1920, 2880],
  [0, 72, 100, 14400, 16320],
  [0, 74, 50, 15840, 15841],
  [0, 62, 77, 17280, 19200],
  [1, 62, 88, 18240, 20160],
  [0, 60, 1, 21139, 21504],
  [0, 65, 127, 30912, 31296],
  [0, 67, 60, 45120, 46080],
]
