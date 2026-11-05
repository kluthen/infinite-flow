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

/**
 * The mix's channels. Each has an on/off gain (`<channel>-enable`) and a volume gain
 * (`<channel>-volume`), looked up by channel, so a channel added later joins without reshaping
 * the mix.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[module_guide_playback_layers]]
export const MIX_CHANNELS = ['click', 'backing', 'melody-guide', 'rhythm-guide'] as const

/** One of the mix's channels: the click, the backing, or one of the two guides. */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[module_guide_playback_layers]]
export type MixChannel = (typeof MIX_CHANNELS)[number]

/**
 * The sound roles a session's notes are played in: the backing's bass and chord, and the two
 * guides. Each role's sound is one data entry of `SOUND_ROLE_VOICES`, and each role plays into one
 * mix channel.
 */
// @spec-link [[module_guide_playback_layers]]
// @spec-link [[rule_guide_fixed_voices]]
export type SoundRole = 'bass' | 'chord' | 'melody-guide' | 'rhythm-guide'

/** Which backing voice a note belongs to: the bass line or one note of a block chord. */
// @spec-link [[req_session_backing_track]]
export type BackingVoice = Extract<SoundRole, 'bass' | 'chord'>

/** Which guide a note belongs to: the melody guide or the rhythm guide. */
// @spec-link [[req_guide_playback]]
export type GuideRole = Extract<SoundRole, 'melody-guide' | 'rhythm-guide'>

/** The two guides, melody first. */
// @spec-link [[req_guide_playback]]
export const GUIDE_ROLES: readonly GuideRole[] = ['melody-guide', 'rhythm-guide']

/**
 * One sound role's voice, as data: its oscillator waveform, its peak gain, its attack, its
 * release (an exponential fall to `releaseEndGain`), where that release sits, and the mix channel
 * the role plays into. A release that `'ends-at-note-end'` falls over the note's last
 * `releaseSeconds`, the oscillator stopping at the note's end, so a note must last at least the
 * attack plus the release. A release that `'starts-at-note-end'` starts at the note's end, the
 * oscillator stopping once it is over, so the note rings on after its end; its attack is at most
 * half the note, and any length plays.
 */
// @spec-link [[module_guide_playback_layers]]
// @spec-link [[rule_guide_note_rings_out]]
export interface SoundRoleVoice {
  readonly waveform: 'sine' | 'triangle'
  readonly peak: number
  readonly attackSeconds: number
  readonly releaseSeconds: number
  readonly releaseEndGain: number
  readonly release: 'ends-at-note-end' | 'starts-at-note-end'
  readonly channel: MixChannel
}

/**
 * Every sound role's voice, made from oscillators and gains only, no sample, in placeholder
 * timbres set by ear. The backing's bass is a triangle and each chord note a quieter sine; both
 * rise in 5 ms and fall over the 40 ms before the note's end, as they always have. The guides
 * imitate no instrument and are told apart by waveform and release: the melody guide a sine
 * ringing out over 600 ms after the note's end, the rhythm guide a triangle with a short, plucked
 * 300 ms release; both rise in at most 5 ms.
 */
// @spec-link [[req_session_backing_track]]
// @spec-link [[rule_guide_fixed_voices]]
// @spec-link [[rule_guide_sound_from_oscillators]]
// @spec-link [[rule_guide_note_rings_out]]
export const SOUND_ROLE_VOICES: Readonly<Record<SoundRole, SoundRoleVoice>> = {
  bass: {
    waveform: 'triangle',
    peak: 0.35,
    attackSeconds: 0.005,
    releaseSeconds: 0.04,
    releaseEndGain: 0.0001,
    release: 'ends-at-note-end',
    channel: 'backing',
  },
  chord: {
    waveform: 'sine',
    peak: 0.12,
    attackSeconds: 0.005,
    releaseSeconds: 0.04,
    releaseEndGain: 0.0001,
    release: 'ends-at-note-end',
    channel: 'backing',
  },
  'melody-guide': {
    waveform: 'sine',
    peak: 0.3,
    attackSeconds: 0.005,
    releaseSeconds: 0.6,
    releaseEndGain: 0.0001,
    release: 'starts-at-note-end',
    channel: 'melody-guide',
  },
  'rhythm-guide': {
    waveform: 'triangle',
    peak: 0.25,
    attackSeconds: 0.003,
    releaseSeconds: 0.3,
    releaseEndGain: 0.0001,
    release: 'starts-at-note-end',
    channel: 'rhythm-guide',
  },
}

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
 * One guide note to sound: its guide, its concert MIDI pitch, and when it starts and when its
 * written length ends on the audio clock; it rings on after that end, through its release. It goes
 * through its guide's on/off gain and volume.
 */
// @spec-link [[req_guide_playback]]
// @spec-link [[rule_guide_notes_placed_exactly]]
export interface ScheduledGuideNote {
  readonly role: GuideRole
  readonly pitch: number
  readonly at: AudioTime
  readonly until: AudioTime
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
