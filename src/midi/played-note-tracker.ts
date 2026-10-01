/**
 * The played-note tracker: the pure state machine between parsed MIDI messages and the notes a
 * session records. It is keyed by concert pitch only (input is omni, the channel is never used).
 * A note-on starts a held note and reports it as played; a note-off ends it; a new note-on for a
 * pitch still held ends the earlier note at the new onset. Ended notes have the session history's
 * recorded played-note shape. Times are audio-clock seconds, already mapped from MIDI timestamps.
 */

import type { NoteOnOnAudioClock } from '../domain/acknowledgement/played-onset-latency'
import type { ConcertPitch } from '../domain/events/concert-pitch'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { RecordedPlayedNote } from '../session/session-history'
import type { AudioTime } from '../session/session-types'

const VELOCITY_MIN = 1
const VELOCITY_MAX = 127

/** A note-on that counts as a played note: its concert pitch, velocity and audio-clock onset. */
// @spec-link [[rule_only_note_on_counts_as_played]]
export interface PlayedNoteOn {
  readonly pitch: ConcertPitch
  readonly velocity: number
  readonly onsetAt: AudioTime
}

/** What the tracker reports: a note that was played, or a note that ended with its full span. */
// @spec-link [[rule_only_note_on_counts_as_played]]
export type PlayedNoteEvent =
  | { readonly kind: 'played'; readonly note: PlayedNoteOn }
  | { readonly kind: 'ended'; readonly note: RecordedPlayedNote }

/** The events one tracker call produced, in the order they happened. */
// @spec-link [[rule_only_note_on_counts_as_played]]
export type PlayedNoteEvents = readonly PlayedNoteEvent[]

/** The tracker's operations; see createPlayedNoteTracker. */
// @spec-link [[rule_only_note_on_counts_as_played]]
export interface PlayedNoteTracker {
  noteOn(pitch: ConcertPitch, velocity: number, at: AudioTime): PlayedNoteEvents
  noteOff(pitch: ConcertPitch, at: AudioTime): PlayedNoteEvents
  releaseAll(at: AudioTime): PlayedNoteEvents
  held(): readonly PlayedNoteOn[]
}

/** Typed failure for a call that breaks the tracker's contract (bad velocity, time or order). */
// @spec-link [[rule_only_note_on_counts_as_played]]
export class PlayedNoteTrackerError extends Error {
  readonly kind = 'PlayedNoteTrackerError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PlayedNoteTrackerError'
  }
}

/**
 * Intent: create an empty tracker.
 * - noteOn: if the pitch is already held, ends that note at `at` first; then holds the new note.
 *   Returns the optional `ended` event, then the `played` event.
 * - noteOff: ends the held note of that pitch. A note-off for a pitch not held returns no event:
 *   that is normal, e.g. a key already held when the controller was connected, not an error.
 * - releaseAll: ends every held note at `at`, in onset order (session end, controller lost).
 * - held: the currently held notes, in onset order.
 * A velocity outside 1-127, a non-finite time, or a release before its note's onset throws.
 */
// @spec-link [[rule_only_note_on_counts_as_played]]
export function createPlayedNoteTracker(): PlayedNoteTracker {
  const heldByPitch = new Map<ConcertPitch, PlayedNoteOn>()

  return {
    noteOn(pitch, velocity, at) {
      assertTime(at)
      assertVelocity(velocity)
      const earlier = heldByPitch.get(pitch)
      const events: PlayedNoteEvent[] = []
      if (earlier !== undefined) {
        events.push(endNote(earlier, at))
        heldByPitch.delete(pitch)
      }
      const note: PlayedNoteOn = deepFreeze({ pitch, velocity, onsetAt: at })
      heldByPitch.set(pitch, note)
      events.push(deepFreeze({ kind: 'played', note }))
      return Object.freeze(events)
    },
    noteOff(pitch, at) {
      assertTime(at)
      const note = heldByPitch.get(pitch)
      if (note === undefined) {
        return Object.freeze([])
      }
      const ended = endNote(note, at)
      heldByPitch.delete(pitch)
      return Object.freeze([ended])
    },
    releaseAll(at) {
      assertTime(at)
      const ended = inOnsetOrder(heldByPitch).map((note) => endNote(note, at))
      heldByPitch.clear()
      return Object.freeze(ended)
    },
    held() {
      return Object.freeze(inOnsetOrder(heldByPitch))
    },
  }
}

/**
 * Intent: hand a played note to latency compensation as a note-on on the audio clock. The onset
 * is passed through unchanged; the correction itself is applied by compensatePlayedNote.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export function toNoteOnOnAudioClock(note: PlayedNoteOn): NoteOnOnAudioClock {
  return deepFreeze({ pitch: note.pitch, audioClockSeconds: note.onsetAt })
}

/** Intent: end a held note at `at`, rejecting a release earlier than its onset. */
function endNote(note: PlayedNoteOn, at: AudioTime): PlayedNoteEvent {
  if (at < note.onsetAt) {
    throw new PlayedNoteTrackerError(
      `A note of pitch ${note.pitch} cannot end at ${at}, before its onset at ${note.onsetAt}.`,
    )
  }
  return deepFreeze({ kind: 'ended', note: { ...note, releaseAt: at } })
}

/** Intent: the held notes sorted by onset (stable, so equal onsets keep their arrival order). */
function inOnsetOrder(heldByPitch: ReadonlyMap<ConcertPitch, PlayedNoteOn>): PlayedNoteOn[] {
  return [...heldByPitch.values()].sort((a, b) => a.onsetAt - b.onsetAt)
}

/** Intent: reject a time that is not a finite number of audio-clock seconds. */
function assertTime(at: AudioTime): void {
  if (!Number.isFinite(at)) {
    throw new PlayedNoteTrackerError(`A played-note time must be a finite number, got ${at}.`)
  }
}

/** Intent: reject a note-on velocity that is not an integer in 1-127. */
function assertVelocity(velocity: number): void {
  if (!Number.isInteger(velocity) || velocity < VELOCITY_MIN || velocity > VELOCITY_MAX) {
    throw new PlayedNoteTrackerError(
      `A played note's velocity must be an integer in [${VELOCITY_MIN}, ${VELOCITY_MAX}], got ${velocity}.`,
    )
  }
}
