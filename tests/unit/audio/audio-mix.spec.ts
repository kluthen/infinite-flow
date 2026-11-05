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
  validateChannelVolume,
  validateClickVolume,
  type AudioMix,
  type AudioMixRange,
} from '@/audio/audio-mix'
import { GUIDE_ROLES } from '@/audio/audio-ports'

/** The design tokens as the stylesheet declares them, with CSS's leading space. */
const TOKENS: Readonly<Record<string, string>> = {
  '--mix-click-volume-min': ' 0.2',
  '--mix-backing-volume-min': ' 0',
  '--mix-volume-max': ' 1',
  '--mix-click-volume-default': ' 0.8',
  '--mix-backing-volume-default': ' 0.8',
  '--mix-melody-guide-volume-min': ' 0',
  '--mix-rhythm-guide-volume-min': ' 0',
  '--mix-melody-guide-volume-default': ' 0.8',
  '--mix-rhythm-guide-volume-default': ' 0.6',
}

/** Intent: a computed-style stub answering from `tokens`, with CSS's empty string when missing. */
function styleOf(tokens: Readonly<Record<string, string>>): {
  getPropertyValue(name: string): string
} {
  return { getPropertyValue: (name) => tokens[name] ?? '' }
}

const RANGE: AudioMixRange = {
  clickVolumeMin: 0.2,
  backingVolumeMin: 0,
  melodyGuideVolumeMin: 0,
  rhythmGuideVolumeMin: 0,
  volumeMax: 1,
}

/** Both guides off at their first-load levels, for the mixes that only vary the click and backing. */
const GUIDES_OFF = {
  melodyGuideOn: false,
  melodyGuideVolume: 0.8,
  rhythmGuideOn: false,
  rhythmGuideVolume: 0.6,
} as const

/** The gains of `GUIDES_OFF`. */
const GUIDES_OFF_GAINS = {
  'melody-guide-enable': 0,
  'melody-guide-volume': 0.8,
  'rhythm-guide-enable': 0,
  'rhythm-guide-volume': 0.6,
} as const

/** Each guide's minimum field in the range. */
const GUIDE_MIN_FIELD = {
  'melody-guide': 'melodyGuideVolumeMin',
  'rhythm-guide': 'rhythmGuideVolumeMin',
} as const

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_click_volume_never_silent]]
describe('reading the mix design', () => {
  it('reads the range and the defaults, both switches on', () => {
    expect(readAudioMixDesign(styleOf(TOKENS))).toEqual({
      defaults: {
        clickOn: true,
        clickVolume: 0.8,
        backingOn: true,
        backingVolume: 0.8,
        ...GUIDES_OFF,
      },
      range: RANGE,
    })
  })

  // @test-link [[req_session_audio_mix]]
  // @test-link [[req_guide_playback]]
  it("reads each guide's minimum and first-load volume from its own tokens, both guides off", () => {
    const tokens = {
      ...TOKENS,
      '--mix-melody-guide-volume-min': ' 0.1',
      '--mix-rhythm-guide-volume-min': ' 0.05',
      '--mix-melody-guide-volume-default': ' 0.7',
      '--mix-rhythm-guide-volume-default': ' 0.4',
    }
    const design = readAudioMixDesign(styleOf(tokens))
    expect(design.defaults).toMatchObject({
      melodyGuideOn: false,
      melodyGuideVolume: 0.7,
      rhythmGuideOn: false,
      rhythmGuideVolume: 0.4,
    })
    expect(design.range).toMatchObject({ melodyGuideVolumeMin: 0.1, rhythmGuideVolumeMin: 0.05 })
  })

  // @test-link [[req_session_audio_mix]]
  it.each(['--mix-melody-guide-volume-min', '--mix-rhythm-guide-volume-min'])(
    'throws when the guide minimum %s is below silence',
    (name) => {
      const tokens = { ...TOKENS, [name]: '-0.1' }
      expect(() => readAudioMixDesign(styleOf(tokens))).toThrow(/below 0/)
    },
  )

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
    ['--mix-melody-guide-volume-default', '1.5'],
    ['--mix-rhythm-guide-volume-default', '-0.1'],
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

  // @test-link [[req_session_audio_mix]]
  it.each(GUIDE_ROLES)(
    'lets the %s volume reach its minimum and the maximum, no further',
    (guide) => {
      const range: AudioMixRange = { ...RANGE, [GUIDE_MIN_FIELD[guide]]: 0.1 }
      for (const level of [0.1, 0.5, 1]) {
        expect(() => validateChannelVolume(guide, level, range)).not.toThrow()
      }
      for (const level of [0.09, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() => validateChannelVolume(guide, level, range)).toThrow(RangeError)
      }
      expect(() => validateChannelVolume(guide, 0.05, RANGE)).not.toThrow()
    },
  )
})

// @test-link [[req_session_audio_mix]]
describe('mix gains', () => {
  it('maps each control to its own gain stage, volumes linearly', () => {
    expect(
      mixGains({
        clickOn: true,
        clickVolume: 0.3,
        backingOn: false,
        backingVolume: 0.6,
        ...GUIDES_OFF,
      }),
    ).toEqual({
      'click-enable': 1,
      'click-volume': 0.3,
      'backing-enable': 0,
      'backing-volume': 0.6,
      ...GUIDES_OFF_GAINS,
    })
    expect(
      mixGains({
        clickOn: false,
        clickVolume: 1,
        backingOn: true,
        backingVolume: 0,
        ...GUIDES_OFF,
      }),
    ).toEqual({
      'click-enable': 0,
      'click-volume': 1,
      'backing-enable': 1,
      'backing-volume': 0,
      ...GUIDES_OFF_GAINS,
    })
  })

  // @test-link [[req_session_audio_mix]]
  // @test-link [[req_guide_playback]]
  it('gives all eight gains, two per channel, each guide its own enable and volume', () => {
    const mix: AudioMix = {
      clickOn: true,
      clickVolume: 0.3,
      backingOn: false,
      backingVolume: 0.6,
      melodyGuideOn: true,
      melodyGuideVolume: 0.45,
      rhythmGuideOn: false,
      rhythmGuideVolume: 0.25,
    }
    const gains = mixGains(mix)
    expect(gains).toEqual({
      'click-enable': 1,
      'click-volume': 0.3,
      'backing-enable': 0,
      'backing-volume': 0.6,
      'melody-guide-enable': 1,
      'melody-guide-volume': 0.45,
      'rhythm-guide-enable': 0,
      'rhythm-guide-volume': 0.25,
    })
    expect(Object.keys(gains)).toEqual([
      'click-enable',
      'click-volume',
      'backing-enable',
      'backing-volume',
      'melody-guide-enable',
      'melody-guide-volume',
      'rhythm-guide-enable',
      'rhythm-guide-volume',
    ])
    expect(mixGains({ ...mix, melodyGuideOn: false, rhythmGuideOn: true })).toMatchObject({
      'melody-guide-enable': 0,
      'rhythm-guide-enable': 1,
    })
  })
})
