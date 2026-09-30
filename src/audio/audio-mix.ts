/**
 * The session's audio mix: four independent controls (click on/off, click volume, backing on/off,
 * backing volume), their range and first-load levels read from the design tokens, and the gain
 * each control sets. The mix only ever sets gains; it never touches timing or generated material.
 */

import type { MixGain } from './audio-ports'

/** The four mix controls' current state. Volumes are levels between the range's min and max. */
// @spec-link [[req_session_audio_mix]]
export interface AudioMix {
  readonly clickOn: boolean
  readonly clickVolume: number
  readonly backingOn: boolean
  readonly backingVolume: number
}

/**
 * The volume range. The click's minimum is above zero, so the click volume never reaches
 * silence; the backing's minimum may be zero.
 */
// @spec-link [[rule_click_volume_never_silent]]
export interface AudioMixRange {
  readonly clickVolumeMin: number
  readonly backingVolumeMin: number
  readonly volumeMax: number
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

/**
 * Intent: check the design's range and defaults. Throws when the click minimum is not above
 * silence, when the backing minimum is below silence, or when a default lies outside its range.
 */
function checkDesign(design: AudioMixDesign): void {
  const { range, defaults } = design
  if (range.clickVolumeMin <= 0) {
    throw new Error(
      `audio mix: the click volume minimum ${range.clickVolumeMin} would reach silence; it must be above 0`,
    )
  }
  if (range.backingVolumeMin < 0) {
    throw new Error(`audio mix: the backing volume minimum ${range.backingVolumeMin} is below 0`)
  }
  if (!inRange(defaults.clickVolume, range.clickVolumeMin, range.volumeMax)) {
    throw new Error(`audio mix: the default click volume ${defaults.clickVolume} is out of range`)
  }
  if (!inRange(defaults.backingVolume, range.backingVolumeMin, range.volumeMax)) {
    throw new Error(
      `audio mix: the default backing volume ${defaults.backingVolume} is out of range`,
    )
  }
}

/**
 * Intent: read the mix design from the `--mix-*` design tokens of the loaded stylesheet (pass
 * `getComputedStyle(document.documentElement)`). Both switches start on. The levels are
 * placeholders until the listening tests (ux Q31); a bad token throws rather than defaulting.
 */
// @spec-link [[req_session_audio_mix]]
// @spec-link [[rule_click_volume_never_silent]]
export function readAudioMixDesign(style: DesignTokenSource): AudioMixDesign {
  const design: AudioMixDesign = {
    defaults: {
      clickOn: true,
      clickVolume: readToken(style, '--mix-click-volume-default'),
      backingOn: true,
      backingVolume: readToken(style, '--mix-backing-volume-default'),
    },
    range: {
      clickVolumeMin: readToken(style, '--mix-click-volume-min'),
      backingVolumeMin: readToken(style, '--mix-backing-volume-min'),
      volumeMax: readToken(style, '--mix-volume-max'),
    },
  }
  checkDesign(design)
  return design
}

/** Intent: reject a click volume outside [clickVolumeMin, volumeMax], so it never reaches silence. */
// @spec-link [[rule_click_volume_never_silent]]
export function validateClickVolume(level: number, range: AudioMixRange): void {
  if (!inRange(level, range.clickVolumeMin, range.volumeMax)) {
    throw new RangeError(
      `audio mix: click volume ${level} is outside [${range.clickVolumeMin}, ${range.volumeMax}]`,
    )
  }
}

/** Intent: reject a backing volume outside [backingVolumeMin, volumeMax]. */
// @spec-link [[req_session_audio_mix]]
export function validateBackingVolume(level: number, range: AudioMixRange): void {
  if (!inRange(level, range.backingVolumeMin, range.volumeMax)) {
    throw new RangeError(
      `audio mix: backing volume ${level} is outside [${range.backingVolumeMin}, ${range.volumeMax}]`,
    )
  }
}

/**
 * Intent: the value of every gain stage for a mix: each switch sets its enable gain to 1 or 0,
 * and each volume sets its volume gain. The gain equals the level, linearly: a placeholder
 * mapping until the listening tests settle a loudness curve.
 */
// @spec-link [[req_session_audio_mix]]
export function mixGains(mix: AudioMix): Readonly<Record<MixGain, number>> {
  return {
    'click-enable': mix.clickOn ? 1 : 0,
    'click-volume': mix.clickVolume,
    'backing-enable': mix.backingOn ? 1 : 0,
    'backing-volume': mix.backingVolume,
  }
}
