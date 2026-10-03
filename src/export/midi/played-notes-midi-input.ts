/**
 * The input of the played-notes MIDI encoder, and its boundary check. A session reaches the
 * encoder as its phrases in session order, each carrying only its session number, the tempo it
 * played at, when it started on the audio clock, and the notes the player played whose onsets fall
 * in it, each with its concert pitch, its note-on velocity and its onset and release on the audio
 * clock, in seconds. Nothing else can travel with it: no timeline, no generated note and no
 * backing. The played-notes file never holds generated material, and the check below rejects any
 * extra field at run time, so the type and the value agree on that.
 */
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import {
  assertExactKeys,
  assertNumberedInOrder,
  assertTempo,
  MidiExportError,
} from './midi-export-input'
import { phraseSeconds } from './midi-time'

/**
 * One note the player played: its concert pitch exactly as received, its original note-on
 * velocity, and its onset and release on the audio clock, in seconds.
 */
// @spec-link [[req_played_notes_export]]
export interface MidiPlayedNote {
  readonly pitch: ConcertPitch
  readonly velocity: number
  readonly onsetAt: number
  readonly releaseAt: number
}

/**
 * One phrase of the session as the played-notes export sees it: its session phrase number, its
 * tempo in quarter notes per minute, the audio-clock time it started sounding, and the played
 * notes whose onsets fall in it. The last phrase may also hold later onsets, which the encoder
 * leaves out.
 */
// @spec-link [[req_played_notes_export]]
export interface PlayedNotesMidiPhrase {
  readonly number: number
  readonly tempo: number
  readonly startedAt: number
  readonly playedNotes: readonly MidiPlayedNote[]
}

/**
 * The whole encoder input: every phrase that sounded, in session order. It has no field for
 * generated notes or the backing, and the run-time check rejects one.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
export interface PlayedNotesMidiInput {
  readonly phrases: readonly PlayedNotesMidiPhrase[]
}

/**
 * How far apart two phrases' starts may be from exactly back to back, in seconds: the audio clock
 * places them exactly, so anything more is a session the file could not line up.
 */
const CONTIGUITY_TOLERANCE_SECONDS = 0.001
const MIDI_PITCH_MAX = 127
const MIDI_VELOCITY_MAX = 127

const INPUT_KEYS: readonly string[] = ['phrases']
const PHRASE_KEYS: readonly string[] = ['number', 'tempo', 'startedAt', 'playedNotes']
const NOTE_KEYS: readonly string[] = ['pitch', 'velocity', 'onsetAt', 'releaseAt']

/**
 * Intent: crash early unless each phrase starts on a finite time, and the next one starts where it
 * ends (16 quarter notes at its own tempo later) within 1 ms.
 */
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function assertBackToBack(phrases: readonly PlayedNotesMidiPhrase[]): void {
  phrases.forEach((phrase, position) => {
    if (!Number.isFinite(phrase.startedAt)) {
      throw new MidiExportError(`Phrase ${phrase.number} starts at ${phrase.startedAt}.`)
    }
    const next = phrases[position + 1]
    if (next === undefined) return
    const endsAt = phrase.startedAt + phraseSeconds(phrase.tempo)
    if (!(Math.abs(next.startedAt - endsAt) <= CONTIGUITY_TOLERANCE_SECONDS)) {
      throw new MidiExportError(
        `Phrase ${next.number} starts at ${next.startedAt}; phrase ${phrase.number} ends at ` +
          `${endsAt}.`,
      )
    }
  })
}

/** Intent: crash early unless a played note's pitch and velocity fit their MIDI ranges. */
// @spec-link [[req_played_notes_export]]
function assertPitchAndVelocity(note: MidiPlayedNote, phraseNumber: number): void {
  const pitch: number = note.pitch
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > MIDI_PITCH_MAX) {
    throw new MidiExportError(
      `Phrase ${phraseNumber} has a played pitch ${pitch} outside the MIDI range 0 to 127.`,
    )
  }
  if (!Number.isInteger(note.velocity) || note.velocity < 1 || note.velocity > MIDI_VELOCITY_MAX) {
    throw new MidiExportError(
      `Phrase ${phraseNumber} has a played velocity ${note.velocity} outside 1 to 127.`,
    )
  }
}

/**
 * Intent: crash early unless a played note's onset and release are finite, it releases at or
 * after its onset, and its onset falls in its phrase: at or after the phrase's start and, unless
 * the phrase is the last, before the next phrase's start.
 */
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function assertNoteTimes(
  note: MidiPlayedNote,
  phrase: PlayedNotesMidiPhrase,
  next: PlayedNotesMidiPhrase | undefined,
): void {
  const { onsetAt, releaseAt } = note
  if (!Number.isFinite(onsetAt) || !Number.isFinite(releaseAt) || releaseAt < onsetAt) {
    throw new MidiExportError(
      `Phrase ${phrase.number} has a played note from ${onsetAt} to ${releaseAt}.`,
    )
  }
  if (onsetAt < phrase.startedAt || (next !== undefined && onsetAt >= next.startedAt)) {
    throw new MidiExportError(
      `Phrase ${phrase.number} holds a played note whose onset ${onsetAt} falls outside it.`,
    )
  }
}

/**
 * Intent: reject a played-notes encoder input that breaks the contract: an extra or missing field
 * anywhere (a timeline or a backing among them), an empty session, phrase numbers that do not run
 * 1, 2, 3 … in order, a tempo outside whole numbers from 60 to 240 BPM, phrases not back to back
 * on the audio clock within 1 ms, a played note the file could not represent or that lies outside
 * its phrase, or a session in which nothing was played.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
export function validatePlayedNotesMidiInput(input: PlayedNotesMidiInput): void {
  assertExactKeys(input, INPUT_KEYS, 'The played-notes MIDI export input')
  const { phrases } = input
  if (phrases.length === 0) {
    throw new MidiExportError('A played-notes MIDI export needs at least one phrase.')
  }
  phrases.forEach((phrase, position) =>
    assertExactKeys(phrase, PHRASE_KEYS, `Phrase at position ${position}`),
  )
  assertNumberedInOrder(phrases, 'Phrases')
  phrases.forEach(assertTempo)
  assertBackToBack(phrases)
  phrases.forEach((phrase, position) => {
    for (const note of phrase.playedNotes) {
      assertExactKeys(note, NOTE_KEYS, `A played note of phrase ${phrase.number}`)
      assertPitchAndVelocity(note, phrase.number)
      assertNoteTimes(note, phrase, phrases[position + 1])
    }
  })
  if (phrases.every((phrase) => phrase.playedNotes.length === 0)) {
    throw new MidiExportError('A played-notes MIDI export needs at least one played note.')
  }
}
