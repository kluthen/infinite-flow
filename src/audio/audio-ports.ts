/**
 * The seams of the audio transport: the audio clock, the audio output the transport schedules sound
 * on, and the wake-up timer that drives the look-ahead scheduler. Production implements them with
 * the one `AudioContext` and a Web Worker timer; tests implement them with a clock advanced by
 * hand and an output that records what was scheduled and when. Time is audio time, plain seconds
 * on the audio clock.
 */

import type { AudioTime } from '../session/session-types'

export type { AudioTime }

/**
 * One simultaneous reading of the audio clock and the performance.now() timeline: an audio time on
 * the scheduling timeline, in seconds, and the performance.now() time it corresponds to, in
 * milliseconds. It gives the offset that maps a MIDI event timestamp onto the audio clock.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[rule_played_onset_latency_compensation]]
export interface ClockAnchor {
  readonly audioTime: AudioTime
  readonly performanceTimeMs: number
}

/** The audio clock: the one master clock every sound and the playhead are scheduled against. */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface AudioClock {
  /** The audio clock's current time, in seconds. */
  readonly now: () => AudioTime
  /**
   * Seconds between a sound's scheduled time and the moment it leaves the speakers, so a playhead
   * can show what is heard rather than what is scheduled.
   */
  readonly outputLatency: () => number
  /**
   * The audio time on the scheduling timeline that corresponds to a performance.now() time, read
   * together, so a MIDI timestamp (on the performance.now() timeline) can be mapped onto the audio
   * clock.
   */
  readonly anchor: () => ClockAnchor
}

/**
 * Which path a click takes to the speakers. A `count-in` click bypasses the click on/off gate but
 * still goes through the click volume; a `click` click goes through both.
 */
// @spec-link [[rule_count_in_always_clicks]]
export type ClickRoute = 'count-in' | 'click'

/** One click to sound: when, whether it is a beat 1, and which route it takes. */
// @spec-link [[rule_click_track]]
export interface ScheduledClick {
  readonly at: AudioTime
  readonly accent: boolean
  readonly route: ClickRoute
}

/** Which backing voice a note belongs to: the bass line or one note of a block chord. */
// @spec-link [[req_session_backing_track]]
export type BackingVoice = 'bass' | 'chord'

/**
 * One backing note to sound: its voice, its concert MIDI pitch, and when it starts and ends on
 * the audio clock. It goes through the backing on/off gain and the backing volume.
 */
// @spec-link [[req_session_backing_track]]
export interface ScheduledBackingNote {
  readonly voice: BackingVoice
  readonly pitch: number
  readonly at: AudioTime
  readonly until: AudioTime
}

/**
 * The mix's gain stages. The `*-enable` gains are the on/off switches (1 or 0); the `*-volume`
 * gains are the volume levels. Muting is always one of these gains set to zero, never a
 * suspended clock.
 */
// @spec-link [[req_session_audio_mix]]
export type MixGain = 'click-enable' | 'click-volume' | 'backing-enable' | 'backing-volume'

/**
 * The sound of one session, its clicks and its backing. Every voice a session schedules goes
 * through its own bus, so fading
 * the bus out on stop silences everything it scheduled, including sound planned past the fade,
 * without touching a later session.
 */
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_session_backing_track]]
export interface SessionBus {
  /** Schedule one click on this session's bus. */
  readonly scheduleClick: (click: ScheduledClick) => void
  /** Schedule one backing note on this session's bus. */
  readonly scheduleBackingNote: (note: ScheduledBackingNote) => void
  /** Fade this session's bus out, from `at`, to silence over `durationSeconds`. */
  readonly fadeOut: (at: AudioTime, durationSeconds: number) => void
}

/**
 * The audio output: the audio clock plus the mix gains and the per-session buses. It has no
 * suspend or pause operation on purpose: the clock never stops while the app runs.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
// @spec-link [[req_session_audio_mix]]
export interface AudioOutput extends AudioClock {
  /** Set one mix gain to `value` from audio time `at` on. */
  readonly setGain: (gain: MixGain, value: number, at: AudioTime) => void
  /** Open a fresh bus for one session's sound. */
  readonly openSessionBus: () => SessionBus
  /**
   * Register the listener called when the browser stops the audio clock on its own (a device
   * change, an OS interruption). The app never stops it itself.
   */
  readonly onInterrupted: (listener: () => void) => void
}

/**
 * How often the wake-up timer fires, in seconds: well inside the look-ahead window, so a wake-up
 * delayed by a busy main thread still plans sound before it is due.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export const WAKE_INTERVAL_SECONDS = 0.025

/**
 * The scheduler's wake-up timer. It calls `onWake` every `WAKE_INTERVAL_SECONDS` while started. Production
 * runs it in a Web Worker so a busy main thread's timer throttling can't delay it.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface WakeTimer {
  readonly start: (onWake: () => void) => void
  readonly stop: () => void
}
