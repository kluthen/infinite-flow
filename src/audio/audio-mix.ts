/**
 * The session's audio mix: an on/off switch and a volume for each of its channels, the click, the
 * backing, the melody guide and the rhythm guide, all independent; their range and first-load
 * levels read from the design tokens, and the gain each control sets. Each channel's controls are
 * looked up by channel, so a channel added later joins without reshaping the mix. The mix only
 * ever sets gains; it never touches timing or generated material.
 */

import { MIX_CHANNELS, type MixChannel, type MixGain } from './audio-ports'

/** The mix controls' current state. Volumes are levels between the range's min and max. */
// @spec-link [[req_session_audio_mix]]
export interface AudioMix {
  readonly clickOn: boolean
  readonly clickVolume: number
  readonly backingOn: boolean
  readonly backingVolume: number
  readonly melodyGuideOn: boolean
  readonly melodyGuideVolume: number
  readonly rhythmGuideOn: boolean
  readonly rhythmGuideVolume: number
}

/**
 * The volume range, a minimum per channel and one shared maximum. The click's minimum is above
 * zero, so the click volume never reaches silence; the backing's and each guide's may be zero.
 */
// @spec-link [[rule_click_volume_never_silent]]
export interface AudioMixRange {
  readonly clickVolumeMin: number
  readonly backingVolumeMin: number
  readonly melodyGuideVolumeMin: number
  readonly rhythmGuideVolumeMin: number
  readonly volumeMax: number
}

/** The `AudioMix` and `AudioMixRange` fields of one channel's controls. */
interface ChannelFields {
  readonly on: 'clickOn' | 'backingOn' | 'melodyGuideOn' | 'rhythmGuideOn'
  readonly volume: 'clickVolume' | 'backingVolume' | 'melodyGuideVolume' | 'rhythmGuideVolume'
  readonly volumeMin:
    'clickVolumeMin' | 'backingVolumeMin' | 'melodyGuideVolumeMin' | 'rhythmGuideVolumeMin'
}

/** Each channel's fields, the one place the mix names a channel's controls. */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[module_guide_playback_layers]]
const CHANNEL_FIELDS: Readonly<Record<MixChannel, ChannelFields>> = {
  click: { on: 'clickOn', volume: 'clickVolume', volumeMin: 'clickVolumeMin' },
  backing: { on: 'backingOn', volume: 'backingVolume', volumeMin: 'backingVolumeMin' },
  'melody-guide': {
    on: 'melodyGuideOn',
    volume: 'melodyGuideVolume',
    volumeMin: 'melodyGuideVolumeMin',
  },
  'rhythm-guide': {
    on: 'rhythmGuideOn',
    volume: 'rhythmGuideVolume',
    volumeMin: 'rhythmGuideVolumeMin',
  },
}

/** Intent: whether `channel` is switched on in `mix`. */
// @spec-link [[req_session_audio_mix]]
export function channelOn(mix: AudioMix, channel: MixChannel): boolean {
  return mix[CHANNEL_FIELDS[channel].on]
}

/** Intent: `mix` with `channel` switched on or off. */
// @spec-link [[req_session_audio_mix]]
export function withChannelOn(mix: AudioMix, channel: MixChannel, on: boolean): AudioMix {
  return { ...mix, [CHANNEL_FIELDS[channel].on]: on }
}

/** Intent: `mix` with `channel`'s volume at `level`, unchecked: validate it first. */
// @spec-link [[req_session_audio_mix]]
export function withChannelVolume(mix: AudioMix, channel: MixChannel, level: number): AudioMix {
  return { ...mix, [CHANNEL_FIELDS[channel].volume]: level }
}

/**
 * The mix as the interface design sets it: the first-load levels and the volume range. The
 * numbers are placeholders until the listening tests (ux Q31) settle them.
 */
// @spec-link [[req_session_audio_mix]]
export interface AudioMixDesign {
  readonly defaults: AudioMix
  readonly range: AudioMixRange
}

/** The computed-style lookup the design tokens are read through. */
// @spec-link [[req_session_audio_mix]]
export interface DesignTokenSource {
  getPropertyValue(name: string): string
}

/**
 * Intent: read one numeric design token. Throws when it is missing, empty or not a finite
 * number: a mix read without its tokens would silently guess levels.
 */
function readToken(style: DesignTokenSource, name: string): number {
  const text = style.getPropertyValue(name).trim()
  if (text === '') throw new Error(`audio mix: design token ${name} is missing or empty`)
  const value = Number(text)
  if (!Number.isFinite(value)) {
    throw new Error(`audio mix: design token ${name} is not a finite number: "${text}"`)
  }
  return value
}

/** Intent: whether a level is a finite number in [min, max]. */
function inRange(level: number, min: number, max: number): boolean {
  return Number.isFinite(level) && level >= min && level <= max
}

/** A channel's name in messages: its channel string, spaced (`melody guide`). */
function channelName(channel: MixChannel): string {
  return channel.replace('-', ' ')
}

/**
 * Intent: check the design's range and defaults. Throws when the click minimum is not above
 * silence, when another channel's minimum is below silence, or when a default lies outside its
 * range.
 */
function checkDesign(design: AudioMixDesign): void {
  const { range, defaults } = design
  if (range.clickVolumeMin <= 0) {
    throw new Error(
      `audio mix: the click volume minimum ${range.clickVolumeMin} would reach silence; it must be above 0`,
    )
  }
  for (const channel of MIX_CHANNELS) {
    const fields = CHANNEL_FIELDS[channel]
    const min = range[fields.volumeMin]
    if (min < 0) {
      throw new Error(`audio mix: the ${channelName(channel)} volume minimum ${min} is below 0`)
    }
    if (!inRange(defaults[fields.volume], min, range.volumeMax)) {
      throw new Error(
        `audio mix: the default ${channelName(channel)} volume ${defaults[fields.volume]} is out of range`,
      )
    }
  }
}

/**
 * Intent: read the mix design from the `--mix-*` design tokens of the loaded stylesheet (pass
 * `getComputedStyle(document.documentElement)`), by channel string: each channel's first-load
 * volume `--mix-<channel>-volume-default` and minimum `--mix-<channel>-volume-min`, and the shared
 * `--mix-volume-max`. The click's and the backing's switches start on; both guides' switches start
 * off, a default rather than a token. The levels are placeholders until the listening tests (ux
 * Q31, and v3.2 HG for the guides); a bad token throws rather than defaulting.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_click_volume_never_silent]]
// @spec-link [[req_guide_playback]]
export function readAudioMixDesign(style: DesignTokenSource): AudioMixDesign {
  const level = (channel: MixChannel, which: 'default' | 'min') =>
    readToken(style, `--mix-${channel}-volume-${which}`)
  const design: AudioMixDesign = {
    defaults: {
      clickOn: true,
      clickVolume: level('click', 'default'),
      backingOn: true,
      backingVolume: level('backing', 'default'),
      melodyGuideOn: false,
      melodyGuideVolume: level('melody-guide', 'default'),
      rhythmGuideOn: false,
      rhythmGuideVolume: level('rhythm-guide', 'default'),
    },
    range: {
      clickVolumeMin: level('click', 'min'),
      backingVolumeMin: level('backing', 'min'),
      melodyGuideVolumeMin: level('melody-guide', 'min'),
      rhythmGuideVolumeMin: level('rhythm-guide', 'min'),
      volumeMax: readToken(style, '--mix-volume-max'),
    },
  }
  checkDesign(design)
  return design
}

/**
 * Intent: read the volume sliders' step from the `--mix-volume-step` design token. Throws when it
 * is missing, not a number, or not above zero: a slider without a real step would guess one.
 */
// @spec-link [[req_session_audio_mix]]
export function readMixVolumeStep(style: DesignTokenSource): number {
  const step = readToken(style, '--mix-volume-step')
  if (step <= 0) throw new Error(`audio mix: the volume step ${step} must be above 0`)
  return step
}

/**
 * Intent: reject a volume for `channel` outside [its minimum, volumeMax], with a RangeError; the
 * click's minimum is above zero, so the click volume never reaches silence.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_click_volume_never_silent]]
export function validateChannelVolume(
  channel: MixChannel,
  level: number,
  range: AudioMixRange,
): void {
  const min = range[CHANNEL_FIELDS[channel].volumeMin]
  if (!inRange(level, min, range.volumeMax)) {
    throw new RangeError(
      `audio mix: ${channelName(channel)} volume ${level} is outside [${min}, ${range.volumeMax}]`,
    )
  }
}

/** Intent: reject a click volume outside [clickVolumeMin, volumeMax], so it never reaches silence. */
// @spec-link [[rule_click_volume_never_silent]]
export function validateClickVolume(level: number, range: AudioMixRange): void {
  validateChannelVolume('click', level, range)
}

/** Intent: reject a backing volume outside [backingVolumeMin, volumeMax]. */
// @spec-link [[req_session_audio_mix]]
export function validateBackingVolume(level: number, range: AudioMixRange): void {
  validateChannelVolume('backing', level, range)
}

/**
 * Intent: the value of every gain stage for a mix, channel by channel in `MIX_CHANNELS` order:
 * each switch sets its channel's enable gain to 1 or 0, and each volume its volume gain. The gain
 * equals the level, linearly, as accepted by ear for v2.0.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[module_guide_playback_layers]]
export function mixGains(mix: AudioMix): Readonly<Record<MixGain, number>> {
  return Object.fromEntries(
    MIX_CHANNELS.flatMap((channel) => [
      [`${channel}-enable`, channelOn(mix, channel) ? 1 : 0],
      [`${channel}-volume`, mix[CHANNEL_FIELDS[channel].volume]],
    ]),
  ) as Readonly<Record<MixGain, number>>
}
