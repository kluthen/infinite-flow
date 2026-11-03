// @vitest-environment node
/**
 * What a doodle's rhythm shows (master spec C5.16.1, C5.9): its note density, the finest grid a
 * quarter of its starts need; its rhythmic variety, by the gaps that are its main value; its
 * syncopation, by the measures holding a note off the grid or across a beat; its rests, each from
 * the first grid tick of the note value at which a whole rest fits to its silence's end; and its
 * silence density, from those rests alone. Each row at its edges.
 */
import { describe, expect, it } from 'vitest'

import {
  doodleMeasureRests,
  doodleNoteDensity,
  doodleNoteValueTicks,
  doodleRestTicks,
  doodleRhythmicVariety,
  doodleSilenceDensity,
  doodleSyncopation,
} from '@/jam/doodle-rhythm-reading'

import { doodleOf, doodleWithSilences, legatoDoodle } from './doodle-builders'

// @test-link [[rule_doodle_note_density_reading]]
describe('the note density read from a doodle', () => {
  // @test-link [[rule_doodle_note_density_reading]]
  it('is Sixteenth when a quarter of the starts lie at an odd position, and not below', () => {
    expect(doodleNoteDensity(legatoDoodle(1, [0, 4, 8, 13]))).toBe('Sixteenth')
    expect(doodleNoteDensity(legatoDoodle(1, [0, 4, 8, 12, 13]))).toBe('Quarter')
  })

  // @test-link [[rule_doodle_note_density_reading]]
  it('is Eighth when a quarter of the starts lie off the quarter grid, and Quarter below', () => {
    expect(doodleNoteDensity(legatoDoodle(1, [0, 4, 8, 14]))).toBe('Eighth')
    expect(doodleNoteDensity(legatoDoodle(1, [0, 4, 8, 12, 14]))).toBe('Quarter')
  })

  // @test-link [[rule_doodle_note_density_reading]]
  it('reads each position from the start of its own measure', () => {
    expect(doodleNoteDensity(legatoDoodle(2, [0, 4, 16, 18]))).toBe('Eighth')
    expect(doodleNoteDensity(legatoDoodle(2, [0, 4, 16, 20]))).toBe('Quarter')
  })

  // @test-link [[rule_doodle_note_density_reading]]
  it("is not shown by one note, whose rests then use Quarter's value", () => {
    const oneNote = doodleOf(1, [[5, 2]])
    expect(doodleNoteDensity(oneNote)).toBeNull()
    expect(doodleNoteValueTicks(oneNote)).toBe(4)
  })
})

// @test-link [[rule_doodle_rhythmic_variety_reading]]
describe('the rhythmic variety read from a doodle', () => {
  // @test-link [[rule_doodle_rhythmic_variety_reading]]
  it('is Strict when every gap is the value, or twice it after a note no longer than the value', () => {
    expect(doodleRhythmicVariety(legatoDoodle(1, [0, 4, 8, 12]))).toBe('Strict')
    expect(
      doodleRhythmicVariety(
        doodleOf(1, [
          [0, 4],
          [8, 4],
          [12, 4],
        ]),
      ),
    ).toBe('Strict')
    expect(
      doodleRhythmicVariety(
        doodleOf(1, [
          [0, 5],
          [8, 4],
          [12, 4],
        ]),
      ),
    ).toBe('Heavily varied')
  })

  // @test-link [[rule_doodle_rhythmic_variety_reading]]
  it('is Slightly varied at three gaps in four, Heavily varied below', () => {
    expect(doodleRhythmicVariety(legatoDoodle(1, [0, 4, 8, 12, 15]))).toBe('Slightly varied')
    expect(
      doodleRhythmicVariety(
        doodleOf(2, [
          [0, 4],
          [4, 8],
          [12, 4],
          [16, 4],
        ]),
      ),
    ).toBe('Heavily varied')
  })

  // @test-link [[rule_doodle_rhythmic_variety_reading]]
  it("counts gaps in the note density's value: two ticks under Eighth", () => {
    const eighths = doodleOf(1, [
      [0, 2],
      [2, 2],
      [6, 2],
      [10, 2],
      [12, 2],
    ])
    expect(doodleNoteDensity(eighths)).toBe('Eighth')
    expect(doodleRhythmicVariety(eighths)).toBe('Strict')
  })

  // @test-link [[rule_doodle_rhythmic_variety_reading]]
  it('is not shown by fewer than three notes', () => {
    expect(doodleRhythmicVariety(legatoDoodle(1, [0, 4]))).toBeNull()
  })
})

// @test-link [[rule_doodle_syncopation_reading]]
describe('the syncopation read from a doodle', () => {
  // @test-link [[rule_doodle_syncopation_reading]]
  it('marks a measure holding a note off the quarter grid under Quarter', () => {
    const doodle = legatoDoodle(2, [0, 4, 8, 10, 12, 16, 20, 24, 28])
    expect(doodleNoteDensity(doodle)).toBe('Quarter')
    expect(doodleSyncopation(doodle)).toBe('Occasional offbeats')
  })

  // @test-link [[rule_doodle_syncopation_reading]]
  it('marks a note off a beat still sounding at the next beat, not one ending on it', () => {
    const crossing = doodleOf(2, [
      [0, 2],
      [2, 3],
      [6, 2],
      [16, 2],
      [18, 2],
      [22, 2],
    ])
    const ending = doodleOf(2, [
      [0, 2],
      [2, 2],
      [6, 2],
      [16, 2],
      [18, 2],
      [22, 2],
    ])
    expect(doodleNoteDensity(crossing)).toBe('Eighth')
    expect(doodleSyncopation(crossing)).toBe('Occasional offbeats')
    expect(doodleSyncopation(ending)).toBe('Straight')
  })

  // @test-link [[rule_doodle_syncopation_reading]]
  it('never marks a start off the grid under Sixteenth, only a note across a beat', () => {
    const offGrid = legatoDoodle(1, [0, 1, 2, 3, 4, 5, 6, 7])
    expect(doodleNoteDensity(offGrid)).toBe('Sixteenth')
    expect(
      doodleSyncopation(
        doodleOf(1, [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
        ]),
      ),
    ).toBe('Straight')
    expect(
      doodleSyncopation(
        doodleOf(1, [
          [0, 1],
          [1, 4],
        ]),
      ),
    ).toBe('Active displacement')
  })

  // @test-link [[rule_doodle_syncopation_reading]]
  it('is Occasional offbeats while 2 × syncopated measures ≤ M, Active displacement above', () => {
    /** Intent: an Eighth doodle of `measureCount` measures, the first `syncopated` pushing beat 2. */
    const pushed = (measureCount: 2 | 3 | 4, syncopated: number) =>
      doodleOf(
        measureCount,
        Array.from({ length: measureCount }, (_, measure) => {
          const from = measure * 16
          return measure < syncopated
            ? ([
                [from, 2],
                [from + 2, 4],
                [from + 6, 2],
              ] as const)
            : ([
                [from, 2],
                [from + 2, 2],
                [from + 6, 2],
              ] as const)
        }).flat(),
      )
    expect(doodleSyncopation(pushed(2, 1))).toBe('Occasional offbeats')
    expect(doodleSyncopation(pushed(3, 2))).toBe('Active displacement')
    expect(doodleSyncopation(pushed(4, 2))).toBe('Occasional offbeats')
    expect(doodleSyncopation(pushed(4, 3))).toBe('Active displacement')
    expect(doodleSyncopation(pushed(4, 0))).toBe('Straight')
  })

  // @test-link [[rule_doodle_syncopation_reading]]
  it('is not shown by one note', () => {
    expect(doodleSyncopation(doodleOf(1, [[2, 4]]))).toBeNull()
  })
})

// @test-link [[rule_doodle_silence_density_reading]]
describe("a doodle's rests (C5.9)", () => {
  // @test-link [[rule_doodle_silence_density_reading]]
  it("start at the first grid tick where a whole rest of the note value fits, to the silence's end", () => {
    const quarter = doodleWithSilences(1, 4, [[5, 12]])
    expect(doodleNoteDensity(quarter)).toBe('Quarter')
    expect(doodleMeasureRests(quarter, 0)).toEqual([{ startTick: 8, endTick: 12 }])
    const eighth = doodleWithSilences(1, 2, [[5, 10]])
    expect(doodleNoteDensity(eighth)).toBe('Eighth')
    expect(doodleMeasureRests(eighth, 0)).toEqual([{ startTick: 6, endTick: 10 }])
    const sixteenth = doodleWithSilences(1, 1, [[5, 6]])
    expect(doodleNoteDensity(sixteenth)).toBe('Sixteenth')
    expect(doodleMeasureRests(sixteenth, 0)).toEqual([{ startTick: 5, endTick: 6 }])
  })

  // @test-link [[rule_doodle_silence_density_reading]]
  it('are none in a silence too short for a whole rest on the grid', () => {
    expect(doodleMeasureRests(doodleWithSilences(2, 4, [[6, 11]]), 0)).toEqual([])
    expect(doodleMeasureRests(doodleWithSilences(1, 2, [[5, 7]]), 0)).toEqual([])
  })

  // @test-link [[rule_doodle_silence_density_reading]]
  it('start again at tick 0 of the next measure, as a rest is never tied', () => {
    const doodle = doodleOf(2, [
      [0, 4],
      [4, 4],
      [8, 4],
      [20, 4],
      [24, 8],
    ])
    expect(doodleMeasureRests(doodle, 0)).toEqual([{ startTick: 12, endTick: 16 }])
    expect(doodleMeasureRests(doodle, 1)).toEqual([{ startTick: 0, endTick: 4 }])
  })
})

/** The silences, in a four-measure doodle, of rests totalling R ticks under Quarter and Eighth. */
const QUARTER_SILENCES: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  10: [
    [8, 12],
    [20, 26],
  ],
  11: [
    [8, 12],
    [20, 27],
  ],
  22: [
    [8, 12],
    [20, 26],
    [32, 44],
  ],
  23: [
    [8, 12],
    [20, 27],
    [32, 44],
  ],
}
const EIGHTH_SILENCES: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  10: [
    [8, 16],
    [40, 42],
  ],
  11: [
    [8, 16],
    [40, 43],
  ],
  22: [
    [8, 16],
    [24, 32],
    [40, 46],
  ],
  23: [
    [8, 16],
    [24, 32],
    [40, 47],
  ],
}

// @test-link [[rule_doodle_silence_density_reading]]
describe('the silence density read from a doodle', () => {
  describe.each([
    ['Quarter', 4, QUARTER_SILENCES],
    ['Eighth', 2, EIGHTH_SILENCES],
  ] as const)('under %s', (density, step, silences) => {
    /** Intent: the four-measure doodle whose rests total `rest` ticks under this density. */
    const withRest = (rest: number) => doodleWithSilences(4, step, silences[rest]!)

    // @test-link [[rule_doodle_silence_density_reading]]
    it.each([
      [10, 'Sparse'],
      [11, 'Conversational'],
      [22, 'Conversational'],
      [23, 'Breath-heavy'],
    ] as const)('reads R = %i ticks over four measures as %s', (rest, expected) => {
      const doodle = withRest(rest)
      expect(doodleNoteDensity(doodle)).toBe(density)
      expect(doodleRestTicks(doodle)).toBe(rest)
      expect(doodleSilenceDensity(doodle)).toBe(expected)
    })
  })

  // @test-link [[rule_doodle_silence_density_reading]]
  it('counts each rest from its start, and nothing of a silence holding no rest', () => {
    const doodle = doodleWithSilences(2, 4, [
      [5, 12],
      [21, 23],
      [28, 32],
    ])
    expect(doodleNoteDensity(doodle)).toBe('Quarter')
    expect(doodleRestTicks(doodle)).toBe(4 + 0 + 4)
  })

  // @test-link [[rule_doodle_silence_density_reading]]
  it('scales R to four measures: the same rests read sparser over more measures', () => {
    expect(doodleSilenceDensity(doodleWithSilences(1, 2, [[12, 16]]))).toBe('Conversational')
    expect(doodleSilenceDensity(doodleWithSilences(2, 2, [[12, 16]]))).toBe('Sparse')
  })

  // @test-link [[rule_doodle_silence_density_reading]]
  it('is not shown by one note', () => {
    expect(doodleSilenceDensity(doodleOf(1, [[0, 2]]))).toBeNull()
  })
})
