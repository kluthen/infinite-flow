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
  assertDoodleSpan,
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
 * A Jam's doodle as the played-notes file opens with it: its length in 4/4 measures (1 to 4), the
 * tempo it was captured at, its first barline on the audio clock (the section's time zero), and
 * the raw doodle notes, as played: every played note whose snapped start fell in the doodle's
 * measures, so an onset may lie up to a sixteenth note before the first barline. A Jam on the kept
 * doodle played none: its section is there, empty.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface PlayedNotesDoodleSection {
  readonly measureCount: number
  readonly tempo: number
  readonly startedAt: number
  readonly playedNotes: readonly MidiPlayedNote[]
}

/**
 * The whole encoder input: the phrases the file holds (every phrase that sounded, or the favorites
 * only, laid back to back by ../favorites-selection.ts), in session order, and, in a Jam only, the
 * doodle the file opens with. It has no field for generated notes or the backing, and the run-time
 * check rejects one.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_jam_exports_open_with_doodle]]
export interface PlayedNotesMidiInput {
  readonly phrases: readonly PlayedNotesMidiPhrase[]
  readonly doodle?: PlayedNotesDoodleSection
}

/** Sixteenth notes per quarter note: how far before its first barline a doodle note may start. */
const SIXTEENTHS_PER_QUARTER = 4
const QUARTERS_PER_MEASURE = 4
const SECONDS_PER_MINUTE = 60

/**
 * Intent: the audio-clock time a doodle section ends: its measures of 4/4 at its tempo after its
 * first barline.
 */
// @spec-link [[rule_jam_exports_line_up]]
export function doodleSectionEndsAt(doodle: PlayedNotesDoodleSection): number {
  const quarters = doodle.measureCount * QUARTERS_PER_MEASURE
  return doodle.startedAt + (quarters * SECONDS_PER_MINUTE) / doodle.tempo
}

/**
 * How far apart two phrases' starts may be from exactly back to back, in seconds: the audio clock
 * places them exactly, so anything more is a session the file could not line up.
 */
const CONTIGUITY_TOLERANCE_SECONDS = 0.001
const MIDI_PITCH_MAX = 127
const MIDI_VELOCITY_MAX = 127

const INPUT_KEYS: readonly string[] = ['phrases']
const JAM_INPUT_KEYS: readonly string[] = [...INPUT_KEYS, 'doodle']
const DOODLE_KEYS: readonly string[] = ['measureCount', 'tempo', 'startedAt', 'playedNotes']
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

/**
 * Intent: crash early unless a played note's pitch and velocity fit their MIDI ranges; `owner`
 * names its phrase ("Phrase 3") or the doodle.
 */
// @spec-link [[req_played_notes_export]]
function assertPitchAndVelocity(note: MidiPlayedNote, owner: string): void {
  const pitch: number = note.pitch
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > MIDI_PITCH_MAX) {
    throw new MidiExportError(
      `${owner} has a played pitch ${pitch} outside the MIDI range 0 to 127.`,
    )
  }
  if (!Number.isInteger(note.velocity) || note.velocity < 1 || note.velocity > MIDI_VELOCITY_MAX) {
    throw new MidiExportError(`${owner} has a played velocity ${note.velocity} outside 1 to 127.`)
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
 * Intent: crash early unless a Jam's doodle section has exactly its fields, 1 to 4 measures at a
 * tempo the export accepts, a finite first barline, and raw notes the file can represent, each
 * starting at most a sixteenth note before the first barline and before the section's end, and
 * released at or after its onset.
 */
// @spec-link [[rule_jam_exports_open_with_doodle]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function assertPlayedDoodle(doodle: PlayedNotesDoodleSection): void {
  assertExactKeys(doodle, DOODLE_KEYS, 'The doodle section')
  assertDoodleSpan(doodle)
  if (!Number.isFinite(doodle.startedAt)) {
    throw new MidiExportError(`The doodle starts at ${doodle.startedAt}.`)
  }
  const earliest = doodle.startedAt - SECONDS_PER_MINUTE / doodle.tempo / SIXTEENTHS_PER_QUARTER
  const endsAt = doodleSectionEndsAt(doodle)
  for (const note of doodle.playedNotes) {
    assertExactKeys(note, NOTE_KEYS, 'A played note of the doodle')
    assertPitchAndVelocity(note, 'The doodle')
    const { onsetAt, releaseAt } = note
    if (!Number.isFinite(onsetAt) || !Number.isFinite(releaseAt) || releaseAt < onsetAt) {
      throw new MidiExportError(`The doodle has a played note from ${onsetAt} to ${releaseAt}.`)
    }
    if (onsetAt < earliest || onsetAt >= endsAt) {
      throw new MidiExportError(
        `The doodle holds a played note whose onset ${onsetAt} falls outside it.`,
      )
    }
  }
}

/**
 * Intent: reject a played-notes encoder input that breaks the contract: an extra or missing field
 * anywhere (a timeline or a backing among them), an empty session, phrase numbers that are not
 * whole numbers from 1 up, each above the one before, a tempo outside whole numbers from 60 to 240 BPM, phrases not back to back
 * on the audio clock within 1 ms, a played note the file could not represent or that lies outside
 * its phrase, a Jam's doodle section that breaks its own contract, or a session in which nothing
 * was played, in its phrases or, in a Jam, its doodle.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_export_contents_never_merged]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export function validatePlayedNotesMidiInput(input: PlayedNotesMidiInput): void {
  const inputKeys = Object.hasOwn(input, 'doodle') ? JAM_INPUT_KEYS : INPUT_KEYS
  assertExactKeys(input, inputKeys, 'The played-notes MIDI export input')
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
      assertPitchAndVelocity(note, `Phrase ${phrase.number}`)
      assertNoteTimes(note, phrase, phrases[position + 1])
    }
  })
  if (input.doodle !== undefined) assertPlayedDoodle(input.doodle)
  const doodleNotes = input.doodle?.playedNotes.length ?? 0
  if (doodleNotes === 0 && phrases.every((phrase) => phrase.playedNotes.length === 0)) {
    throw new MidiExportError('A played-notes MIDI export needs at least one played note.')
  }
}
