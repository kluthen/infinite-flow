/**
 * The quantized doodle: one to four measures holding one line of notes, each a start and a length
 * in whole ticks (sixteenth notes) from the start of the doodle's first measure and a concert
 * pitch, sorted, never overlapping, inside the doodle's measures, so at most 64 notes. The
 * validating constructor refuses anything else; the parser reads the same shape from untrusted
 * input, round-trips every valid doodle and refuses what the constructor refuses, extra fields and
 * coerced values included. A quantized doodle never holds a tempo.
 */
import { describe, expect, it } from 'vitest'

import {
  DOODLE_MAX_MEASURES,
  DOODLE_MAX_NOTES,
  QuantizedDoodleParseError,
  QuantizedDoodleViolation,
  makeQuantizedDoodle,
  parseQuantizedDoodle,
  type QuantizedDoodle,
  type QuantizedDoodleInput,
} from '@/domain/doodle/quantized-doodle'

/** Intent: a doodle input from `[startTick, lengthTicks, pitch]` triples. */
function input(
  measureCount: number,
  notes: readonly (readonly [number, number, number])[],
): QuantizedDoodleInput {
  return {
    measureCount,
    notes: notes.map(([startTick, lengthTicks, pitch]) => ({ startTick, lengthTicks, pitch })),
  }
}

/** Intent: the full line of 64 sixteenth notes over four measures, a rising and falling pitch. */
function fullLine(): QuantizedDoodleInput {
  return input(
    4,
    Array.from({ length: DOODLE_MAX_NOTES }, (_, tick) => [tick, 1, 60 + (tick % 12)] as const),
  )
}

/**
 * Intent: a small deterministic pseudo-random sequence (the Park-Miller generator, whose products
 * stay exact integers); `seed` must be at least 1.
 */
function sequence(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 48271) % 2147483647
    return state
  }
}

/**
 * Intent: a deterministic set of valid doodles: for each seed, a measure count of 1 to 4, a first
 * note somewhere in the first measure, then notes of 1 to 6 ticks with gaps of 0 to 3 ticks until
 * the last barline, pitches across the MIDI range; plus the single-note doodle and the full line.
 */
function validDoodleInputs(): QuantizedDoodleInput[] {
  const generated = Array.from({ length: 120 }, (_, seed) => {
    const next = sequence(seed + 1)
    const measureCount = 1 + (seed % DOODLE_MAX_MEASURES)
    const endTick = measureCount * 16
    const notes: [number, number, number][] = []
    let tick = next() % 16
    while (tick < endTick) {
      const lengthTicks = Math.min(1 + (next() % 6), endTick - tick)
      notes.push([tick, lengthTicks, next() % 128])
      tick += lengthTicks + (next() % 4)
    }
    return input(measureCount, notes)
  })
  return [...generated, input(1, [[0, 1, 0]]), input(4, [[15, 49, 127]]), fullLine()]
}

/** Every input the constructor refuses, named, as the parser must refuse it too. */
const refusedInputs: readonly (readonly [string, QuantizedDoodleInput])[] = [
  ['zero measures', input(0, [[0, 1, 60]])],
  ['five measures', input(5, [[0, 1, 60]])],
  ['a fractional measure count', input(1.5, [[0, 1, 60]])],
  [
    'an overlap',
    input(1, [
      [0, 4, 60],
      [3, 2, 62],
    ]),
  ],
  ['a note ending past the last barline', input(1, [[12, 5, 60]])],
  [
    'a note starting past the last barline',
    input(2, [
      [0, 1, 60],
      [32, 1, 62],
    ]),
  ],
  [
    '65 notes',
    input(
      4,
      Array.from({ length: DOODLE_MAX_NOTES + 1 }, (_, tick) => [tick, 1, 60] as const),
    ),
  ],
  ['zero notes', input(1, [])],
  ['a first note outside the first measure', input(2, [[16, 1, 60]])],
  [
    'unsorted notes',
    input(1, [
      [4, 1, 60],
      [0, 1, 62],
    ]),
  ],
  [
    'two notes on one tick',
    input(1, [
      [0, 1, 60],
      [0, 1, 62],
    ]),
  ],
  ['a fractional start', input(1, [[0.5, 1, 60]])],
  ['a fractional length', input(1, [[0, 1.5, 60]])],
  ['a zero length', input(1, [[0, 0, 60]])],
  ['a negative start', input(1, [[-1, 2, 60]])],
  ['a pitch outside MIDI', input(1, [[0, 1, 128]])],
  ['a fractional pitch', input(1, [[0, 1, 60.5]])],
]

// @test-link [[entity_quantized_doodle]]
describe('the quantized doodle constructor', () => {
  // @test-link [[entity_quantized_doodle]]
  it('holds at most four measures of sixteen ticks, so at most 64 notes', () => {
    expect(DOODLE_MAX_MEASURES).toBe(4)
    expect(DOODLE_MAX_NOTES).toBe(64)
  })

  // @test-link [[entity_quantized_doodle]]
  it('accepts a doodle of one measure and of four measures', () => {
    expect(makeQuantizedDoodle(input(1, [[3, 2, 60]]))).toEqual({
      measureCount: 1,
      notes: [{ startTick: 3, lengthTicks: 2, pitch: 60 }],
    })
    const fourMeasures = makeQuantizedDoodle(
      input(4, [
        [0, 4, 60],
        [8, 16, 62],
        [40, 24, 64],
      ]),
    )
    expect(fourMeasures.measureCount).toBe(4)
    expect(fourMeasures.notes.map((note) => note.startTick)).toEqual([0, 8, 40])
  })

  // @test-link [[entity_quantized_doodle]]
  // @test-link [[rule_doodle_is_one_line]]
  it('accepts the full line of 64 sixteenth notes', () => {
    expect(makeQuantizedDoodle(fullLine()).notes).toHaveLength(64)
  })

  // @test-link [[entity_quantized_doodle]]
  // @test-link [[rule_doodle_is_one_line]]
  it.each(refusedInputs)('refuses %s', (_name, refused) => {
    expect(() => makeQuantizedDoodle(refused)).toThrow(QuantizedDoodleViolation)
  })

  // @test-link [[entity_quantized_doodle]]
  it('names the count when refusing a 65th note', () => {
    const tooMany = input(
      4,
      Array.from({ length: DOODLE_MAX_NOTES + 1 }, (_, tick) => [tick, 1, 60] as const),
    )
    expect(() => makeQuantizedDoodle(tooMany)).toThrow(/65 notes/)
  })

  // @test-link [[entity_quantized_doodle]]
  it("returns a deep-frozen doodle of fresh objects, never the caller's", () => {
    const source = { measureCount: 1, notes: [{ startTick: 0, lengthTicks: 2, pitch: 60 }] }
    const doodle = makeQuantizedDoodle(source)

    expect(Object.isFrozen(doodle)).toBe(true)
    expect(Object.isFrozen(doodle.notes)).toBe(true)
    expect(Object.isFrozen(doodle.notes[0])).toBe(true)
    expect(doodle.notes).not.toBe(source.notes)
    expect(doodle.notes[0]).not.toBe(source.notes[0])
    expect(Object.isFrozen(source.notes[0])).toBe(false)
  })

  // @test-link [[entity_quantized_doodle]]
  // @test-link [[rule_quantized_doodle_is_generation_input]]
  it('holds no tempo, even when its input carries one', () => {
    const withTempo = { ...input(1, [[0, 4, 60]]), tempoBpm: 120 }
    const doodle = makeQuantizedDoodle(withTempo)

    expect(Object.keys(doodle).sort()).toEqual(['measureCount', 'notes'])
    expect(Object.keys(doodle.notes[0] ?? {}).sort()).toEqual(['lengthTicks', 'pitch', 'startTick'])
  })
})

// @test-link [[entity_quantized_doodle]]
describe('the quantized doodle parser', () => {
  // @test-link [[entity_quantized_doodle]]
  it('round-trips every valid doodle through JSON', () => {
    const doodles: QuantizedDoodle[] = validDoodleInputs().map(makeQuantizedDoodle)

    expect(doodles.length).toBeGreaterThan(100)
    expect(doodles.some((doodle) => doodle.measureCount === 1)).toBe(true)
    expect(doodles.some((doodle) => doodle.notes.length === DOODLE_MAX_NOTES)).toBe(true)
    for (const doodle of doodles) {
      const parsed = parseQuantizedDoodle(JSON.parse(JSON.stringify(doodle)))
      expect(parsed).toEqual(doodle)
      expect(Object.isFrozen(parsed.notes)).toBe(true)
    }
  })

  // @test-link [[entity_quantized_doodle]]
  // @test-link [[rule_doodle_is_one_line]]
  it.each(refusedInputs)('refuses %s', (_name, refused) => {
    expect(() => parseQuantizedDoodle(JSON.parse(JSON.stringify(refused)))).toThrow(
      QuantizedDoodleParseError,
    )
  })

  // @test-link [[entity_quantized_doodle]]
  // @test-link [[rule_quantized_doodle_is_generation_input]]
  it('refuses a tempo, or any other extra field, on the doodle or on a note', () => {
    const valid = { measureCount: 1, notes: [{ startTick: 0, lengthTicks: 1, pitch: 60 }] }

    expect(() => parseQuantizedDoodle({ ...valid, tempoBpm: 120 })).toThrow(
      QuantizedDoodleParseError,
    )
    expect(() =>
      parseQuantizedDoodle({ ...valid, notes: [{ ...valid.notes[0], velocity: 90 }] }),
    ).toThrow(QuantizedDoodleParseError)
  })

  // @test-link [[entity_quantized_doodle]]
  it.each([
    ['null', null],
    ['an array', [1, [{ startTick: 0, lengthTicks: 1, pitch: 60 }]]],
    ['a string', '{"measureCount":1}'],
    ['a string measure count', { measureCount: '1', notes: [] }],
    ['notes that are not an array', { measureCount: 1, notes: { 0: {} } }],
    ['a null note', { measureCount: 1, notes: [null] }],
    ['a note that is an array', { measureCount: 1, notes: [[0, 1, 60]] }],
    ['a string start', { measureCount: 1, notes: [{ startTick: '0', lengthTicks: 1, pitch: 60 }] }],
    ['a null length', { measureCount: 1, notes: [{ startTick: 0, lengthTicks: null, pitch: 60 }] }],
    ['a string pitch', { measureCount: 1, notes: [{ startTick: 0, lengthTicks: 1, pitch: '60' }] }],
    ['a missing measure count', { notes: [{ startTick: 0, lengthTicks: 1, pitch: 60 }] }],
    ['missing notes', { measureCount: 1 }],
    ['a note missing its pitch', { measureCount: 1, notes: [{ startTick: 0, lengthTicks: 1 }] }],
    ['a note missing its start', { measureCount: 1, notes: [{ lengthTicks: 1, pitch: 60 }] }],
  ])('refuses %s, never coercing it', (_name, untrusted) => {
    expect(() => parseQuantizedDoodle(untrusted)).toThrow(QuantizedDoodleParseError)
  })
})
