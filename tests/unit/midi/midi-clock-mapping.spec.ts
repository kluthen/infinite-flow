/**
 * Mapping a Web MIDI event timestamp (milliseconds on the performance.now() timeline) onto the
 * audio clock (seconds), through one simultaneous reading of both clocks.
 */
import { describe, expect, it } from 'vitest'

import {
  MidiClockMappingError,
  midiTimestampToAudioTime,
  type ClockAnchor,
} from '@/midi/midi-clock-mapping'

const anchor: ClockAnchor = { audioTime: 2.5, performanceTimeMs: 10_000 }

// @test-link [[rule_played_onset_latency_compensation]]
describe('midiTimestampToAudioTime', () => {
  it('maps the anchor reading itself onto the anchor audio time', () => {
    expect(midiTimestampToAudioTime(10_000, anchor)).toBe(2.5)
  })

  it('maps a timestamp after the anchor onto a later audio time', () => {
    expect(midiTimestampToAudioTime(10_250, anchor)).toBeCloseTo(2.75, 12)
  })

  it('maps a timestamp before the anchor onto an earlier audio time', () => {
    expect(midiTimestampToAudioTime(9_900, anchor)).toBeCloseTo(2.4, 12)
  })

  it('follows the offset of the anchor it is given', () => {
    const later: ClockAnchor = { audioTime: 40, performanceTimeMs: 55_500 }
    expect(midiTimestampToAudioTime(56_000, later)).toBeCloseTo(40.5, 12)
    expect(midiTimestampToAudioTime(56_000, anchor)).toBeCloseTo(48.5, 12)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'throws for a timestamp of %s',
    (timestampMs) => {
      expect(() => midiTimestampToAudioTime(timestampMs, anchor)).toThrow(MidiClockMappingError)
    },
  )

  it.each([
    ['audio time', { audioTime: Number.NaN, performanceTimeMs: 10_000 }],
    ['performance time', { audioTime: 2.5, performanceTimeMs: Number.POSITIVE_INFINITY }],
  ])('throws for an anchor whose %s is not finite', (_name, badAnchor) => {
    expect(() => midiTimestampToAudioTime(10_000, badAnchor)).toThrow(MidiClockMappingError)
  })
})
