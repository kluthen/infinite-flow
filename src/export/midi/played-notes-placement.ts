/**
 * Where the played notes go in the played-notes MIDI file. A played note belongs to the phrase its
 * onset falls in, on the audio clock; its onset keeps its exact time from that phrase's start,
 * converted to MIDI ticks at that phrase's tempo and rounded to the nearest tick, with no other
 * quantization. Its release is converted the same way in the phrase it falls in, and stops at the
 * file's end. Every note lasts at least one tick, and each note goes on the first channel where no
 * note of its pitch is still sounding, so overlapping attacks of one pitch all survive.
 */
import { MidiExportError } from './midi-export-input'
import { midiTicksOfSeconds, phraseSeconds } from './midi-time'
import { phraseStartTick, type VoicedNote } from './midi-tracks'
import type { MidiPlayedNote, PlayedNotesMidiPhrase } from './played-notes-midi-input'

/** A played note placed in MIDI ticks, before it is given a channel. */
interface PlacedNote {
  readonly pitch: number
  readonly velocity: number
  readonly startTick: number
  readonly endTick: number
}

/** The zero-based channel General MIDI keeps for percussion (channel 10), which no note uses. */
const PERCUSSION_CHANNEL = 9
const CHANNEL_COUNT = 16

/**
 * Intent: an audio-clock time in MIDI ticks from the file's start, counted from the start of the
 * phrase at zero-based `position` of the file, at its tempo, rounded to the nearest tick.
 */
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function tickInPhrase(
  phrases: readonly PlayedNotesMidiPhrase[],
  position: number,
  at: number,
): number {
  const phrase = phrases[position]!
  return phraseStartTick(position) + midiTicksOfSeconds(at - phrase.startedAt, phrase.tempo)
}

/**
 * Intent: the position of the phrase whose span holds audio-clock time `at`, which is at or after
 * the start of the phrase at `from`: the last phrase that started at or before it, the last phrase
 * taking every later time.
 */
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function positionHolding(
  phrases: readonly PlayedNotesMidiPhrase[],
  from: number,
  at: number,
): number {
  let index = from
  while (index + 1 < phrases.length && phrases[index + 1]!.startedAt <= at) index += 1
  return index
}

/**
 * Intent: one played note of the phrase at `position` in MIDI ticks: its onset in its own phrase;
 * its release in the phrase that holds it, stopped at `fileEnd`; and at least one tick long, so a
 * note released at its onset still sounds.
 */
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function placedNote(
  phrases: readonly PlayedNotesMidiPhrase[],
  position: number,
  note: MidiPlayedNote,
  fileEnd: number,
): PlacedNote {
  const startTick = tickInPhrase(phrases, position, note.onsetAt)
  const releasePosition = positionHolding(phrases, position, note.releaseAt)
  const releaseTick = tickInPhrase(phrases, releasePosition, note.releaseAt)
  return {
    pitch: note.pitch,
    velocity: note.velocity,
    startTick,
    endTick: Math.max(Math.min(releaseTick, fileEnd), startTick + 1),
  }
}

/**
 * Intent: every played note whose onset falls in a phrase of the session, placed in MIDI ticks, in
 * session order. Membership is decided on the audio clock. A phrase other than the last keeps
 * every note it holds, since validation already bounds its onsets by the next phrase's start, which
 * may lie up to 1 ms after its nominal end. Only the last phrase is cut at its end, 16 quarter
 * notes at its tempo after its start: a note with a later onset is left out.
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
function placedNotes(phrases: readonly PlayedNotesMidiPhrase[], fileEnd: number): PlacedNote[] {
  const lastPosition = phrases.length - 1
  return phrases.flatMap((phrase, position) => {
    const endsAt = phrase.startedAt + phraseSeconds(phrase.tempo)
    return phrase.playedNotes
      .filter((note) => position < lastPosition || note.onsetAt < endsAt)
      .map((note) => placedNote(phrases, position, note, fileEnd))
  })
}

/**
 * Intent: give each note a channel: the lowest one, never the percussion channel, on which no note
 * of the same pitch still sounds at its start (a note may start exactly where another ends). Notes
 * are taken by start, ties in input order. Crashes when all fifteen channels sound that pitch.
 */
// @spec-link [[req_played_notes_export]]
function voiced(notes: readonly PlacedNote[]): VoicedNote[] {
  const order = notes.map((note, index) => ({ note, index }))
  order.sort((a, b) => a.note.startTick - b.note.startTick || a.index - b.index)
  // Per channel, the end tick of the latest note of each pitch it was given.
  const soundingUntil = Array.from({ length: CHANNEL_COUNT }, () => new Map<number, number>())
  const result: VoicedNote[] = []
  for (const { note } of order) {
    const channel = soundingUntil.findIndex(
      (ends, index) =>
        index !== PERCUSSION_CHANNEL && (ends.get(note.pitch) ?? -1) <= note.startTick,
    )
    if (channel === -1) {
      throw new MidiExportError(
        `More than ${CHANNEL_COUNT - 1} notes of pitch ${note.pitch} sound at tick ${note.startTick}.`,
      )
    }
    soundingUntil[channel]!.set(note.pitch, note.endTick)
    result.push({ ...note, channel })
  }
  return result
}

/**
 * Intent: the played notes of a valid session as the played track's notes, each with its tick span,
 * its channel and its original velocity, stopped at `fileEnd` (the end of the last phrase).
 */
// @spec-link [[req_played_notes_export]]
// @spec-link [[rule_played_notes_export_unquantized_timing]]
export function playedTrackNotes(
  phrases: readonly PlayedNotesMidiPhrase[],
  fileEnd: number,
): VoicedNote[] {
  return voiced(placedNotes(phrases, fileEnd))
}
