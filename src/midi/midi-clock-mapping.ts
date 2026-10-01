/**
 * Mapping a Web MIDI event timestamp onto the audio clock. A MIDI event carries a
 * DOMHighResTimeStamp: milliseconds on the performance.now() timeline. The session runs on the
 * audio clock, in seconds. One simultaneous reading of both clocks (an anchor) gives the offset
 * between them. This is only the clock mapping; latency compensation is applied later, on the
 * mapped time. Pure: no clock is read here.
 */

import type { ClockAnchor } from '../audio/audio-ports'
import type { AudioTime } from '../session/session-types'

export type { ClockAnchor }

const MILLISECONDS_PER_SECOND = 1000

/** Typed failure for a timestamp or an anchor that is not a finite time. */
// @spec-link [[rule_played_onset_latency_compensation]]
export class MidiClockMappingError extends Error {
  readonly kind = 'MidiClockMappingError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MidiClockMappingError'
  }
}

/**
 * Intent: place a MIDI event timestamp on the audio clock by shifting it by the anchor's offset
 * between the two clocks and converting milliseconds to seconds. A timestamp before the anchor
 * maps to an earlier audio time. Rejects any input that is not a finite number.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
export function midiTimestampToAudioTime(timestampMs: number, anchor: ClockAnchor): AudioTime {
  assertFinite('MIDI timestamp', timestampMs)
  assertFinite('anchor audio time', anchor.audioTime)
  assertFinite('anchor performance time', anchor.performanceTimeMs)
  return anchor.audioTime + (timestampMs - anchor.performanceTimeMs) / MILLISECONDS_PER_SECOND
}

/** Intent: reject a clock reading that is not a finite number. */
function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new MidiClockMappingError(`The ${name} must be a finite number, got ${value}.`)
  }
}
