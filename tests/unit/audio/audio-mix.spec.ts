/**
 * The audio mix: its range and defaults come from the design tokens and are checked on read (the
 * click volume's floor is above silence), every volume is validated against that range, and each
 * mix control maps to exactly one gain stage.
 */

import { describe, expect, it } from 'vitest'

import {
  mixGains,
  readAudioMixDesign,
  readMixVolumeStep,
  validateBackingVolume,
  validateClickVolume,
  type AudioMixRange,
} from '@/audio/audio-mix'

/** The design tokens as the stylesheet declares them, with CSS's leading space. */
const TOKENS: Readonly<Record<string, string>> = {
  '--mix-click-volume-min': ' 0.2',
  '--mix-backing-volume-min': ' 0',
  '--mix-volume-max': ' 1',
  '--mix-click-volume-default': ' 0.8',
  '--mix-backing-volume-default': ' 0.8',
}

/** Intent: a computed-style stub answering from `tokens`, with CSS's empty string when missing. */
function styleOf(tokens: Readonly<Record<string, string>>): {
  getPropertyValue(name: string): string
} {
  return { getPropertyValue: (name) => tokens[name] ?? '' }
}

const RANGE: AudioMixRange = { clickVolumeMin: 0.2, backingVolumeMin: 0, volumeMax: 1 }

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_click_volume_never_silent]]
describe('reading the mix design', () => {
  it('reads the range and the defaults, both switches on', () => {
    expect(readAudioMixDesign(styleOf(TOKENS))).toEqual({
      defaults: { clickOn: true, clickVolume: 0.8, backingOn: true, backingVolume: 0.8 },
      range: RANGE,
    })
  })

  it.each(Object.keys(TOKENS))('throws when %s is missing', (name) => {
    const tokens = { ...TOKENS, [name]: '' }
    expect(() => readAudioMixDesign(styleOf(tokens))).toThrow(name)
  })

  it.each(['abc', 'Infinity', 'NaN'])('throws on a non-number token value %s', (value) => {
    const tokens = { ...TOKENS, '--mix-volume-max': value }
    expect(() => readAudioMixDesign(styleOf(tokens))).toThrow('--mix-volume-max')
  })

  it.each(['0', '-0.1'])('throws when the click volume can reach silence (min %s)', (value) => {
    const tokens = { ...TOKENS, '--mix-click-volume-min': value }
    expect(() => readAudioMixDesign(styleOf(tokens))).toThrow(/silence/)
  })

  it.each([
    ['--mix-click-volume-default', '0.1'],
    ['--mix-click-volume-default', '1.2'],
    ['--mix-backing-volume-default', '1.5'],
  ])('throws when %s = %s lies outside its range', (name, value) => {
    const tokens = { ...TOKENS, [name]: value }
    expect(() => readAudioMixDesign(styleOf(tokens))).toThrow(/range/)
  })
})

// @test-link [[req_session_audio_mix]]
describe('reading the volume sliders step', () => {
  it('reads --mix-volume-step', () => {
    expect(readMixVolumeStep(styleOf({ '--mix-volume-step': ' 0.05' }))).toBe(0.05)
  })

  it.each(['', 'abc', '0', '-0.05'])('throws on the step value "%s"', (value) => {
    expect(() => readMixVolumeStep(styleOf({ '--mix-volume-step': value }))).toThrow(
      /--mix-volume-step|step/,
    )
  })
})

// @test-link [[rule_click_volume_never_silent]]
describe('validating volumes', () => {
  it('accepts every click volume in range, both ends included', () => {
    for (const level of [0.2, 0.5, 1]) expect(() => validateClickVolume(level, RANGE)).not.toThrow()
  })

  it.each([0, 0.19, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a click volume of %f',
    (level) => {
      expect(() => validateClickVolume(level, RANGE)).toThrow(RangeError)
    },
  )

  it('lets the backing reach silence but no further', () => {
    expect(() => validateBackingVolume(0, RANGE)).not.toThrow()
    expect(() => validateBackingVolume(1, RANGE)).not.toThrow()
    expect(() => validateBackingVolume(-0.01, RANGE)).toThrow(RangeError)
    expect(() => validateBackingVolume(1.01, RANGE)).toThrow(RangeError)
    expect(() => validateBackingVolume(Number.NaN, RANGE)).toThrow(RangeError)
  })
})

// @test-link [[req_session_audio_mix]]
describe('mix gains', () => {
  it('maps each control to its own gain stage, volumes linearly', () => {
    expect(
      mixGains({ clickOn: true, clickVolume: 0.3, backingOn: false, backingVolume: 0.6 }),
    ).toEqual({
      'click-enable': 1,
      'click-volume': 0.3,
      'backing-enable': 0,
      'backing-volume': 0.6,
    })
    expect(mixGains({ clickOn: false, clickVolume: 1, backingOn: true, backingVolume: 0 })).toEqual(
      {
        'click-enable': 0,
        'click-volume': 1,
        'backing-enable': 1,
        'backing-volume': 0,
      },
    )
  })
})
