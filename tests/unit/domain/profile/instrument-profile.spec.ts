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
  displayName: 'C MIDI keyboard',
  concertRange: { minMidi: 48, maxMidi: 72 },
  registerWindows: {
    algorithm: REGISTER_WINDOW_ALGORITHM_V1,
    minimumSpan: 12,
    widthNumerator: 1,
    widthDenominator: 2,
  },
  transposition: { chromatic: 0, diatonic: 0 },
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

  it('rejects an empty display name', () => {
    expect(() => makeInstrumentProfile({ ...VALID_INPUT, displayName: '' })).toThrow(
      InstrumentProfileError,
    )
  })

  it('rejects a whitespace-only display name', () => {
    expect(() => makeInstrumentProfile({ ...VALID_INPUT, displayName: '   ' })).toThrow(
      InstrumentProfileError,
    )
  })

  it('carries the display name through construction', () => {
    const profile = makeInstrumentProfile({ ...VALID_INPUT, displayName: 'C MIDI keyboard' })
    expect(profile.displayName).toBe('C MIDI keyboard')
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
        displayName: 'C MIDI keyboard',
        concertRange: { minMidi: 0, maxMidi: 100 },
        registerWindows: {
          algorithm: REGISTER_WINDOW_ALGORITHM_V1,
          minimumSpan: 1,
          widthNumerator: 1,
          widthDenominator: 100,
        },
        transposition: { chromatic: 0, diatonic: 0 },
      }),
    ).toThrow(InstrumentProfileError)
  })
})

// @test-link [[entity_instrument_profile]]
describe('makeInstrumentProfile: transposition validation', () => {
  it.each([
    { chromatic: 0, diatonic: 0 },
    { chromatic: 14, diatonic: 8 },
    { chromatic: 9, diatonic: 5 },
    { chromatic: 2, diatonic: 1 },
    { chromatic: 21, diatonic: 12 },
    { chromatic: -14, diatonic: -8 },
  ])('accepts the consistent pair %o', (transposition) => {
    const profile = makeInstrumentProfile({ ...VALID_INPUT, transposition })
    expect(profile.transposition).toEqual(transposition)
  })

  it('rejects a non-integer chromatic value', () => {
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, transposition: { chromatic: 14.5, diatonic: 8 } }),
    ).toThrow(InstrumentProfileError)
  })

  it('rejects a non-integer diatonic value', () => {
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, transposition: { chromatic: 14, diatonic: 8.5 } }),
    ).toThrow(InstrumentProfileError)
  })

  it('rejects an inconsistent chromatic/diatonic pair', () => {
    // diatonic 1 (a second, natural pc 2) cannot be reconciled with chromatic 14 (a major 9th)
    // without more than a double accidental.
    expect(() =>
      makeInstrumentProfile({ ...VALID_INPUT, transposition: { chromatic: 14, diatonic: 1 } }),
    ).toThrow(InstrumentProfileError)
  })

  it('is deep-frozen and cannot be mutated', () => {
    const profile = makeInstrumentProfile({
      ...VALID_INPUT,
      transposition: { chromatic: 14, diatonic: 8 },
    })
    expect(() => {
      // @ts-expect-error transposition.chromatic is readonly
      profile.transposition.chromatic = 0
    }).toThrow()
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

  it('rejects a non-string displayName', () => {
    expect(() => parseInstrumentProfile({ ...VALID_INPUT, displayName: 42 })).toThrow(
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

  it('rejects an unknown transposition field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        transposition: { ...VALID_INPUT.transposition, extra: true },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects a non-numeric transposition field', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        transposition: { chromatic: '14', diatonic: 8 },
      }),
    ).toThrow(InstrumentProfileParseError)
  })

  it('rejects an inconsistent transposition pair (delegating to makeInstrumentProfile validation)', () => {
    expect(() =>
      parseInstrumentProfile({
        ...VALID_INPUT,
        transposition: { chromatic: 14, diatonic: 1 },
      }),
    ).toThrow(InstrumentProfileParseError)
  })
})
