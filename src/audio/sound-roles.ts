/**
 * The mix's channels and the sound roles a session's notes are played in: the backing's bass and
 * chord, and the two guides, each role's voice as data (oscillators and gains only), and the
 * backing and guide notes the audio transport schedules on a session's bus (./audio-ports.ts).
 * Time is audio time, plain seconds on the audio clock.
 */
import type { AudioTime } from '../session/session-types'

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
