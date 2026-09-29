/**
 * The played onset acknowledgement judges a note by: the moment the player actually played it. A
 * note-on arrives stamped on the audio clock; the player, though, plays along with what they hear,
 * which reaches the speakers later than it was scheduled, and a wireless controller delivers its
 * notes later than a wired one. Both delays are taken off the note's audio-clock time.
 */

import { type ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'

/** How the controller is connected to the computer. */
// @spec-link [[rule_played_onset_latency_compensation]]
export type ControllerConnection = 'usb' | 'bluetooth-le'

/**
 * The delay between scheduling a sound on the audio clock and hearing it from the speakers.
 * Provisional value: zero, which applies no correction. No measurement exists yet to set it from;
 * it is measured and fixed on the reference hardware (a breath controller over USB and a USB
 * keyboard) once acknowledgement runs in a live session. It is a hard-coded constant, because the
 * product ships no calibration step for the player.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export const OUTPUT_LATENCY_SECONDS = 0

/**
 * The extra delay each connection type adds before a note-on reaches the app. USB: zero, since
 * a wired USB connection adds a negligible delay. Bluetooth LE: 12.5 ms, the middle of the 10 to
 * 15 ms that Bluetooth LE MIDI typically adds, before its jitter. Both are starting points, tuned
 * on the reference hardware alongside the output latency above.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export const CONNECTION_LATENCY_SECONDS: Readonly<Record<ControllerConnection, number>> =
  deepFreeze({
    usb: 0,
    'bluetooth-le': 0.0125,
  })

/** The two delays taken off a played note's audio-clock time, in seconds. */
// @spec-link [[rule_played_onset_latency_compensation]]
export interface LatencyCorrection {
  readonly outputLatencySeconds: number
  readonly connectionLatencySeconds: number
}

/** A note-on as the controller reading delivers it: a concert pitch and its audio-clock time. */
// @spec-link [[rule_played_onset_latency_compensation]]
export interface NoteOnOnAudioClock {
  readonly pitch: ConcertPitch
  readonly audioClockSeconds: number
}

declare const compensatedOnsetBrand: unique symbol

/** A played onset with the latency correction already applied. Only compensatePlayedNote makes one. */
// @spec-link [[rule_played_onset_latency_compensation]]
export type CompensatedOnsetSeconds = number & {
  readonly [compensatedOnsetBrand]: 'CompensatedOnsetSeconds'
}

/** A played note, ready for matching: its concert pitch and its latency-corrected onset. */
// @spec-link [[rule_played_onset_latency_compensation]]
export interface PlayedNote {
  readonly pitch: ConcertPitch
  readonly onsetSeconds: CompensatedOnsetSeconds
}

/** Typed failure for a played note or correction that is not a usable time. */
// @spec-link [[rule_played_onset_latency_compensation]]
export class PlayedOnsetError extends Error {
  readonly kind = 'PlayedOnsetError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PlayedOnsetError'
  }
}

/** Intent: the shipped latency correction for a controller connection, from the constants above. */
// @spec-link [[rule_played_onset_latency_compensation]]
export function latencyCorrectionFor(connection: ControllerConnection): LatencyCorrection {
  return deepFreeze({
    outputLatencySeconds: OUTPUT_LATENCY_SECONDS,
    connectionLatencySeconds: CONNECTION_LATENCY_SECONDS[connection],
  })
}

/**
 * Intent: turn a note-on stamped on the audio clock into a played note for matching: its onset is
 * the audio-clock time minus the output latency and minus the connection's delay. Rejects a time
 * or a correction that is not a finite number, and a negative correction.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export function compensatePlayedNote(
  noteOn: NoteOnOnAudioClock,
  correction: LatencyCorrection,
): PlayedNote {
  if (!Number.isFinite(noteOn.audioClockSeconds)) {
    throw new PlayedOnsetError(
      `A played note's audio-clock time must be a finite number, got ${noteOn.audioClockSeconds}.`,
    )
  }
  assertDelay('output latency', correction.outputLatencySeconds)
  assertDelay('connection delay', correction.connectionLatencySeconds)
  const onsetSeconds =
    noteOn.audioClockSeconds - correction.outputLatencySeconds - correction.connectionLatencySeconds
  return deepFreeze({ pitch: noteOn.pitch, onsetSeconds: onsetSeconds as CompensatedOnsetSeconds })
}

/** Intent: reject a delay that is negative or not a finite number of seconds. */
function assertDelay(name: string, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new PlayedOnsetError(
      `The ${name} must be a finite, non-negative number of seconds, got ${seconds}.`,
    )
  }
}
