/**
 * The seams of the audio transport: the audio clock, the audio output the transport schedules sound
 * on, and the wake-up timer that drives the look-ahead scheduler. Production implements them with
 * the one `AudioContext` and a Web Worker timer; tests implement them with a clock advanced by
 * hand and an output that records what was scheduled and when. Time is audio time, plain seconds
 * on the audio clock. The mix's channels, the sound roles and the notes scheduled in them are in
 * ./sound-roles.ts.
 */

import type { AudioTime } from '../session/session-types'
import type { MixChannel, ScheduledBackingNote, ScheduledGuideNote } from './sound-roles'

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

/**
 * The mix's gain stages, two per channel. The `*-enable` gains are the on/off switches (1 or 0);
 * the `*-volume` gains are the volume levels. Muting is always one of these gains set to zero,
 * never a suspended clock.
 */
// @spec-link [[req_session_audio_mix]]
export type MixGain = `${MixChannel}-enable` | `${MixChannel}-volume`

/**
 * The sound of one session, its clicks, its backing and its guides. Every voice a session
 * schedules goes through its own bus, so fading the bus out on stop silences everything it
 * scheduled, including sound planned past the fade and guide notes still ringing, without
 * touching a later session.
 */
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[req_session_backing_track]]
// @spec-link [[req_guide_playback]]
export interface SessionBus {
  /** Schedule one click on this session's bus. */
  readonly scheduleClick: (click: ScheduledClick) => void
  /** Schedule one backing note on this session's bus. */
  readonly scheduleBackingNote: (note: ScheduledBackingNote) => void
  /**
   * Schedule one guide note on this session's bus. A note starting on the pitch of that guide's
   * note still ringing fades the ringing one out quickly from the new start.
   */
  readonly scheduleGuideNote: (note: ScheduledGuideNote) => void
  /** Fade this session's bus out, from `at`, to silence over `durationSeconds`. */
  readonly fadeOut: (at: AudioTime, durationSeconds: number) => void
  /**
   * Force the click on until `until`, the count-in's bypass of the click on/off gate extended: a
   * click-track click scheduled from now on at a time before `until` goes around the gate, as a
   * count-in click does. `Number.POSITIVE_INFINITY` forces it with no end yet; a later call sets
   * the end. A bus never asked forces nothing.
   */
  readonly forceClickUntil: (until: AudioTime) => void
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

/**
 * A wake-up timer its owner lets go of for good: `dispose`, while stopped, frees what backs it
 * (production's Web Worker); the timer cannot start or be disposed again after it.
 */
// @spec-link [[rule_playhead_follows_audio_clock]]
export interface DisposableWakeTimer extends WakeTimer {
  readonly dispose: () => void
}
