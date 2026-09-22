// @test-link [[entity_concert_event_timeline]]
import { describe, expect, it } from 'vitest'

import {
  ConcertPitchError,
  makeConcertPitch,
  parseConcertPitch,
} from '@/domain/events/concert-pitch'

describe('makeConcertPitch', () => {
  it('accepts the full 46-75 span covering all three first-release profiles', () => {
    // C keyboard 48-72, B-flat tenor 46-70, E-flat alto 51-75: the union spans 46-75.
    expect(makeConcertPitch(46)).toBe(46)
    expect(makeConcertPitch(48)).toBe(48)
    expect(makeConcertPitch(51)).toBe(51)
    expect(makeConcertPitch(60)).toBe(60)
    expect(makeConcertPitch(70)).toBe(70)
    expect(makeConcertPitch(72)).toBe(72)
    expect(makeConcertPitch(75)).toBe(75)
  })

  it('does not impose any single profile narrower bound: values outside every profile but still plausible MIDI are accepted', () => {
    // The schema validates only a plausible MIDI integer; per-profile range validation is Step 3's job.
    expect(makeConcertPitch(0)).toBe(0)
    expect(makeConcertPitch(21)).toBe(21)
    expect(makeConcertPitch(108)).toBe(108)
    expect(makeConcertPitch(127)).toBe(127)
  })

  it('rejects a non-integer pitch as a typed failure', () => {
    expect(() => makeConcertPitch(60.5)).toThrow(ConcertPitchError)
  })

  it('rejects a pitch below the plausible MIDI range as a typed failure', () => {
    expect(() => makeConcertPitch(-1)).toThrow(ConcertPitchError)
  })

  it('rejects a pitch above the plausible MIDI range as a typed failure', () => {
    expect(() => makeConcertPitch(128)).toThrow(ConcertPitchError)
  })
})

describe('parseConcertPitch', () => {
  it('parses a plausible number into a ConcertPitch', () => {
    expect(parseConcertPitch(60)).toBe(60)
  })

  it('rejects a non-number as a typed failure rather than coercing', () => {
    expect(() => parseConcertPitch('60')).toThrow(ConcertPitchError)
  })

  it('rejects null/undefined as a typed failure', () => {
    expect(() => parseConcertPitch(null)).toThrow(ConcertPitchError)
    expect(() => parseConcertPitch(undefined)).toThrow(ConcertPitchError)
  })
})
