import { describe, expect, it } from 'vitest'

import {
  MyInstrumentError,
  findMyInstrumentRefusal,
  makeMyInstrument,
  myInstrumentDraftFromTemplate,
  type MyInstrumentInput,
  type MyInstrumentRefusalReason,
} from '@/domain/profile/my-instrument'
import {
  BUILT_IN_REGISTER_WINDOW_POLICY,
  MY_INSTRUMENT_ID,
} from '@/domain/profile/instrument-profiles'

/** A valid my instrument: two octaves at concert pitch, made from the keyboard. */
const VALID: MyInstrumentInput = {
  template: 'c-keyboard',
  name: 'My keyboard',
  clef: 'treble',
  writtenRange: { minMidi: 48, maxMidi: 72 },
  transposition: { octaves: 0, semitones: 0, direction: 'same' },
}

/** Intent: the valid input with some fields replaced. */
function withInput(changes: Partial<MyInstrumentInput>): MyInstrumentInput {
  return { ...VALID, ...changes }
}

/** Intent: the reason makeMyInstrument throws for this input, or a failure when it does not throw. */
function thrownReason(input: MyInstrumentInput): MyInstrumentRefusalReason {
  try {
    makeMyInstrument(input)
  } catch (error) {
    expect(error).toBeInstanceOf(MyInstrumentError)
    return (error as MyInstrumentError).reason
  }
  throw new Error('makeMyInstrument accepted an input it should refuse.')
}

/** Inputs refused for one reason each, with the reason expected. */
const REFUSALS: readonly (readonly [string, MyInstrumentInput, MyInstrumentRefusalReason])[] = [
  ['a blank name', withInput({ name: '   ' }), 'name-empty'],
  ['an empty name', withInput({ name: '' }), 'name-empty'],
  ['an unknown template', withInput({ template: 'tuba' }), 'unknown-template'],
  [
    'my instrument as its own template',
    withInput({ template: 'my-instrument' }),
    'unknown-template',
  ],
  [
    'negative octaves',
    withInput({ transposition: { octaves: -1, semitones: 0, direction: 'lower' } }),
    'transposition-invalid',
  ],
  [
    '12 semitones',
    withInput({ transposition: { octaves: 0, semitones: 12, direction: 'lower' } }),
    'transposition-invalid',
  ],
  [
    'same with a size',
    withInput({ transposition: { octaves: 0, semitones: 3, direction: 'same' } }),
    'transposition-invalid',
  ],
  [
    'lower with no size',
    withInput({ transposition: { octaves: 0, semitones: 0, direction: 'lower' } }),
    'transposition-invalid',
  ],
  [
    'a fractional lowest note',
    withInput({ writtenRange: { minMidi: 48.5, maxMidi: 80 } }),
    'range-not-whole',
  ],
  [
    'a fractional highest note',
    withInput({ writtenRange: { minMidi: 40, maxMidi: 72.2 } }),
    'range-not-whole',
  ],
  [
    'a NaN endpoint',
    withInput({ writtenRange: { minMidi: Number.NaN, maxMidi: 72 } }),
    'range-not-whole',
  ],
  [
    'the lowest note above the highest',
    withInput({ writtenRange: { minMidi: 72, maxMidi: 48 } }),
    'lowest-not-below-highest',
  ],
  [
    'the lowest note equal to the highest',
    withInput({ writtenRange: { minMidi: 60, maxMidi: 60 } }),
    'lowest-not-below-highest',
  ],
  [
    'a span of 23 semitones',
    withInput({ writtenRange: { minMidi: 48, maxMidi: 71 } }),
    'range-under-two-octaves',
  ],
  [
    'a concert end below MIDI 0',
    withInput({
      writtenRange: { minMidi: 0, maxMidi: 30 },
      transposition: { octaves: 0, semitones: 2, direction: 'lower' },
    }),
    'sounds-outside-midi',
  ],
  [
    'a concert end above MIDI 127',
    withInput({
      writtenRange: { minMidi: 100, maxMidi: 127 },
      transposition: { octaves: 0, semitones: 1, direction: 'higher' },
    }),
    'sounds-outside-midi',
  ],
  [
    'octaves whose only bound is MIDI',
    withInput({
      writtenRange: { minMidi: 48, maxMidi: 72 },
      transposition: { octaves: 5, semitones: 0, direction: 'lower' },
    }),
    'sounds-outside-midi',
  ],
]

// @test-link [[rule_my_instrument_range_limits]]
describe('makeMyInstrument: refusals with a reason, never clamped', () => {
  // @test-link [[rule_my_instrument_range_limits]]
  it.each(REFUSALS)('refuses %s', (_label, input, reason) => {
    const refusal = findMyInstrumentRefusal(input)
    expect(refusal?.reason).toBe(reason)
    expect(refusal?.message).toEqual(expect.stringMatching(/\S/))
    expect(thrownReason(input)).toBe(reason)
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('refuses a written range of 23 semitones and accepts one of 24', () => {
    expect(
      findMyInstrumentRefusal(withInput({ writtenRange: { minMidi: 50, maxMidi: 73 } })),
    ).toEqual({ reason: 'range-under-two-octaves', message: expect.any(String) })
    const accepted = withInput({ writtenRange: { minMidi: 50, maxMidi: 74 } })
    expect(findMyInstrumentRefusal(accepted)).toBe(undefined)
    expect(makeMyInstrument(accepted).profile.concertRange).toMatchObject({
      minMidi: 50,
      maxMidi: 74,
    })
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('bounds the concert ends only: written notes outside MIDI 0–127 are accepted', () => {
    const highWritten = withInput({
      writtenRange: { minMidi: 130, maxMidi: 160 },
      transposition: { octaves: 3, semitones: 0, direction: 'lower' },
    })
    expect(findMyInstrumentRefusal(highWritten)).toBe(undefined)
    expect(makeMyInstrument(highWritten).profile.concertRange).toMatchObject({
      minMidi: 94,
      maxMidi: 124,
    })
    const extremes = withInput({ writtenRange: { minMidi: 0, maxMidi: 127 } })
    expect(makeMyInstrument(extremes).profile.concertRange).toMatchObject({
      minMidi: 0,
      maxMidi: 127,
    })
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it('reports the first failing reason in a fixed order', () => {
    const allWrong = {
      template: 'tuba',
      name: ' ',
      clef: 'treble',
      writtenRange: { minMidi: 70.5, maxMidi: 60 },
      transposition: { octaves: -1, semitones: 0, direction: 'same' },
    } as const
    expect(findMyInstrumentRefusal(allWrong)?.reason).toBe('name-empty')
    expect(findMyInstrumentRefusal({ ...allWrong, name: 'x' })?.reason).toBe('unknown-template')
    expect(findMyInstrumentRefusal({ ...allWrong, name: 'x', template: 'bb-tenor' })?.reason).toBe(
      'transposition-invalid',
    )
    expect(
      findMyInstrumentRefusal({
        ...allWrong,
        name: 'x',
        template: 'bb-tenor',
        transposition: VALID.transposition,
      })?.reason,
    ).toBe('range-not-whole')
    expect(
      findMyInstrumentRefusal({ ...VALID, writtenRange: { minMidi: 200, maxMidi: 190 } })?.reason,
    ).toBe('lowest-not-below-highest')
    expect(
      findMyInstrumentRefusal({ ...VALID, writtenRange: { minMidi: 200, maxMidi: 210 } })?.reason,
    ).toBe('range-under-two-octaves')
  })

  it('throws a typed error carrying its reason and message', () => {
    const input = withInput({ writtenRange: { minMidi: 48, maxMidi: 71 } })
    expect(() => makeMyInstrument(input)).toThrow(MyInstrumentError)
    try {
      makeMyInstrument(input)
    } catch (error) {
      expect(error).toMatchObject({
        kind: 'MyInstrumentError',
        name: 'MyInstrumentError',
        reason: 'range-under-two-octaves',
        message: findMyInstrumentRefusal(input)?.message,
      })
    }
  })
})

// @test-link [[entity_my_instrument]]
describe('makeMyInstrument: the record and its profile', () => {
  const tenorLike = makeMyInstrument({
    template: 'bb-tenor',
    name: 'My tenor',
    clef: 'treble',
    writtenRange: { minMidi: 58, maxMidi: 90 },
    transposition: { octaves: 1, semitones: 2, direction: 'lower' },
  })

  // @test-link [[entity_my_instrument]]
  it('holds the fixed id, the template, the name, the clef, the written range, the transposition and the input kind', () => {
    expect(tenorLike).toMatchObject({
      kind: 'MyInstrument',
      id: 'my-instrument',
      template: 'bb-tenor',
      name: 'My tenor',
      clef: 'treble',
      writtenRange: { minMidi: 58, maxMidi: 90 },
      transposition: { octaves: 1, semitones: 2, direction: 'lower' },
      inputKind: 'midi-controller',
      interval: { name: 'major ninth', letterSteps: 8, semitones: 14 },
    })
  })

  // @test-link [[entity_my_instrument]]
  it('derives a profile with the concert range, the built-in window policy and the transposition pair', () => {
    expect(tenorLike.profile).toMatchObject({
      kind: 'InstrumentProfile',
      id: MY_INSTRUMENT_ID,
      displayName: 'My tenor',
      concertRange: { minMidi: 44, maxMidi: 76 },
      registerWindows: BUILT_IN_REGISTER_WINDOW_POLICY,
      transposition: { chromatic: 14, diatonic: 8 },
    })
  })

  // @test-link [[entity_my_instrument]]
  it('has the id my-instrument whatever its display name', () => {
    for (const name of [
      'B-flat tenor saxophone',
      'c-keyboard',
      'my-instrument 2',
      'Ünïcode horn',
    ]) {
      const instrument = makeMyInstrument(withInput({ name }))
      expect(instrument.id).toBe('my-instrument')
      expect(instrument.profile.id).toBe('my-instrument')
      expect(instrument.profile.displayName).toBe(name)
    }
  })

  // @test-link [[entity_my_instrument]]
  it('keeps the written range and moves the concert range when the transposition changes', () => {
    const writtenRange = { minMidi: 60, maxMidi: 90 }
    const same = makeMyInstrument(withInput({ writtenRange }))
    const higher = makeMyInstrument(
      withInput({ writtenRange, transposition: { octaves: 1, semitones: 0, direction: 'higher' } }),
    )
    expect(same.writtenRange).toEqual(writtenRange)
    expect(higher.writtenRange).toEqual(writtenRange)
    expect(same.profile.concertRange).toMatchObject({ minMidi: 60, maxMidi: 90 })
    expect(higher.profile.concertRange).toMatchObject({ minMidi: 72, maxMidi: 102 })
    expect(higher.profile.transposition).toEqual({ chromatic: -12, diatonic: -7 })
  })

  it('is deep-frozen', () => {
    expect(Object.isFrozen(tenorLike)).toBe(true)
    expect(Object.isFrozen(tenorLike.writtenRange)).toBe(true)
    expect(Object.isFrozen(tenorLike.transposition)).toBe(true)
    expect(Object.isFrozen(tenorLike.interval)).toBe(true)
    expect(Object.isFrozen(tenorLike.profile)).toBe(true)
  })
})

// @test-link [[entity_my_instrument]]
describe('makeMyInstrument: the clef, display only', () => {
  const inTreble = makeMyInstrument(withInput({ clef: 'treble' }))
  const inBass = makeMyInstrument(withInput({ clef: 'bass' }))

  // @test-link [[entity_my_instrument]]
  it('keeps the chosen clef on the value, treble or bass', () => {
    expect(inTreble.clef).toBe('treble')
    expect(inBass.clef).toBe('bass')
  })

  // @test-link [[entity_my_instrument]]
  it('leaves the clef out of the generator-facing profile', () => {
    expect(inBass.profile).toEqual(inTreble.profile)
    expect(Object.keys(inBass.profile)).not.toContain('clef')
    expect(JSON.stringify(inBass.profile)).not.toContain('bass')
  })

  // @test-link [[entity_my_instrument]]
  it('differs from the same instrument in the other clef by its clef only', () => {
    expect({ ...inBass, clef: 'treble' }).toEqual(inTreble)
  })

  // @test-link [[rule_my_instrument_range_limits]]
  it.each(REFUSALS)(
    'refuses %s the same way in bass clef as in treble',
    (_label, input, reason) => {
      const inBassClef = { ...input, clef: 'bass' } as const
      expect(findMyInstrumentRefusal(inBassClef)).toEqual(
        findMyInstrumentRefusal({ ...input, clef: 'treble' }),
      )
      expect(thrownReason(inBassClef)).toBe(reason)
    },
  )

  // @test-link [[rule_my_instrument_range_limits]]
  it('accepts the same inputs in bass clef as in treble', () => {
    for (const writtenRange of [
      { minMidi: 50, maxMidi: 74 },
      { minMidi: 0, maxMidi: 127 },
      { minMidi: 16, maxMidi: 76 },
      { minMidi: 36, maxMidi: 96 },
    ]) {
      expect(findMyInstrumentRefusal(withInput({ clef: 'bass', writtenRange }))).toBe(undefined)
      expect(findMyInstrumentRefusal(withInput({ clef: 'treble', writtenRange }))).toBe(undefined)
    }
  })
})

// @test-link [[entity_my_instrument]]
describe('myInstrumentDraftFromTemplate: a built-in as the starting point', () => {
  it.each([
    ['c-keyboard', { minMidi: 48, maxMidi: 72 }, { octaves: 0, semitones: 0, direction: 'same' }],
    ['bb-tenor', { minMidi: 60, maxMidi: 84 }, { octaves: 1, semitones: 2, direction: 'lower' }],
    ['eb-alto', { minMidi: 60, maxMidi: 84 }, { octaves: 0, semitones: 9, direction: 'lower' }],
  ] as const)(
    '%s gives its written range and its transposition in octaves and semitones',
    (template, writtenRange, transposition) => {
      expect(myInstrumentDraftFromTemplate(template)).toEqual({
        template,
        writtenRange,
        transposition,
      })
    },
  )

  it('refuses an id that is not a built-in', () => {
    expect(() => myInstrumentDraftFromTemplate('my-instrument')).toThrow(MyInstrumentError)
    expect(() => myInstrumentDraftFromTemplate('tuba')).toThrow(MyInstrumentError)
  })
})
