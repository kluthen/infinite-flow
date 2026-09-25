import { describe, expect, it } from 'vitest'

import {
  InstrumentProfileError,
  InstrumentProfileParseError,
  makeInstrumentProfile,
  parseInstrumentProfile,
} from '@/domain/profile/instrument-profile'
import { REGISTER_WINDOW_ALGORITHM_V1 } from '@/domain/profile/register-window-derivation'

const VALID_INPUT = {
  id: 'c-keyboard',
  concertRange: { minMidi: 48, maxMidi: 72 },
  registerWindows: {
    algorithm: REGISTER_WINDOW_ALGORITHM_V1,
    minimumSpan: 12,
    widthNumerator: 1,
    widthDenominator: 2,
  },
} as const

// @test-link [[entity_instrument_profile]]
describe('makeInstrumentProfile', () => {
  it('constructs a valid profile', () => {
    const profile = makeInstrumentProfile(VALID_INPUT)
    expect(profile.id).toBe('c-keyboard')
    expect(profile.concertRange.minMidi).toBe(48)
    expect(profile.concertRange.maxMidi).toBe(72)
    expect(profile.registerWindows.algorithm).toBe(REGISTER_WINDOW_ALGORITHM_V1)
  })

  it('is deep-frozen and cannot be mutated', () => {
    const profile = makeInstrumentProfile(VALID_INPUT)
    expect(() => {
      // @ts-expect-error id is readonly
      profile.id = 'bb-tenor'
    }).toThrow()
  })

  it('rejects an empty identity', () => {
    expect(() => makeInstrumentProfile({ ...VALID_INPUT, id: '' })).toThrow(InstrumentProfileError)
  })

  it('rejects a whitespace-only identity', () => {
    expect(() => makeInstrumentProfile({ ...VALID_INPUT, id: '   ' })).toThrow(
      InstrumentProfileError,
    )
  })

  it('rejects a non-integer range endpoint', () => {
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, concertRange: { minMidi: 48.5, maxMidi: 72 } }),
    ).toThrow()
  })

  it('rejects minMidi >= maxMidi', () => {
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, concertRange: { minMidi: 72, maxMidi: 72 } }),
    ).toThrow()
  })

  it('rejects a span narrower than 24 semitones', () => {
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, concertRange: { minMidi: 48, maxMidi: 70 } }),
    ).toThrow()
  })

  it('rejects an unrecognized algorithm string', () => {
    expect(() =>
      makeInstrumentProfile({
        ...VALID_INPUT,
        registerWindows: { ...VALID_INPUT.registerWindows, algorithm: 'some-other-algorithm' },
      }),
    ).toThrow(InstrumentProfileError)
  })

  it('rejects a profile whose derived window is not contained in the active range', () => {
    // minimumSpan forced larger than the active range half-span, pushing Low/High outside it.
    expect(() =>
      makeInstrumentProfile({
        ...VALID_INPUT,
        registerWindows: { ...VALID_INPUT.registerWindows, minimumSpan: 30 },
      }),
    ).toThrow(InstrumentProfileError)
  })

  it('rejects a profile whose adjacent derived windows do not intersect', () => {
    // A degenerate minimumSpan of 1 makes Low/Middle/High disjoint slivers within a wide range.
    expect(() =>
      makeInstrumentProfile({
        id: 'c-keyboard',
        concertRange: { minMidi: 0, maxMidi: 100 },
        registerWindows: {
          algorithm: REGISTER_WINDOW_ALGORITHM_V1,
          minimumSpan: 1,
          widthNumerator: 1,
          widthDenominator: 100,
        },
      }),
    ).toThrow(InstrumentProfileError)
  })
})

// @test-link [[entity_instrument_profile]]
describe('parseInstrumentProfile', () => {
  it('parses a valid untrusted object', () => {
    const profile = parseInstrumentProfile(VALID_INPUT)
    expect(profile.id).toBe('c-keyboard')
  })

  it('rejects a non-object input', () => {
    expect(() => parseInstrumentProfile('not-an-object')).toThrow(InstrumentProfileParseError)
  })

  it('rejects null', () => {
    expect(() => parseInstrumentProfile(null)).toThrow(InstrumentProfileParseError)
  })

  it('rejects an unknown top-level field', () => {
    expect(() => parseInstrumentProfile({ ...VALID_INPUT, extra: true })).toThrow(
      InstrumentProfileParseError,
    )
  })

  it('rejects an unknown concertRange field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        concertRange: { ...VALID_INPUT.concertRange, extra: true },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects an unknown registerWindows field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        registerWindows: { ...VALID_INPUT.registerWindows, extra: true },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects a non-string id', () => {
    expect(() => parseInstrumentProfile({ ...VALID_INPUT, id: 42 })).toThrow(
      InstrumentProfileParseError,
    )
  })

  it('rejects a non-numeric concertRange field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        concertRange: { minMidi: '48', maxMidi: 72 },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects a non-numeric registerWindows numeric field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        registerWindows: { ...VALID_INPUT.registerWindows, minimumSpan: '12' },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects an invalid profile (delegating to makeInstrumentProfile validation)', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        concertRange: { minMidi: 48, maxMidi: 70 },
      }),
    ).toThrow(InstrumentProfileParseError)
  })
})
