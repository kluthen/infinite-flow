// @vitest-environment node
/**
 * Building the steering block from the doodle (master spec C5.9, C8): the doodle's measures laid
 * over a phrase's four; each doodle measure as its starts as heard, a note start where each note
 * starts and a rest start where each rest starts (a whole rest of the note density's value on its
 * grid), never two rest starts in a row; the drift's band and strength; the doodle's moves in
 * order, read as the generator reads them; no pitch; whole numbers only.
 */
import { describe, expect, it } from 'vitest'

import { parseSteeringBlock, type SteeringStart } from '@/domain/generation/steering-block'
import {
  buildSteeringBlock,
  doodleMeasureStarts,
  doodleMoves,
  doodleOverlay,
  driftSteering,
  JAM_DRIFTS,
} from '@/jam/steering-block-builder'

import { doodleOf, doodleWithSilences, legatoDoodle, nonIntegerOperations } from './doodle-builders'
import { loadDoodleSet } from './doodle-set'

const DOODLES = loadDoodleSet()

/** Intent: a start list as compact text, e.g. `n0 n2 r6 n8`. */
function startsText(starts: readonly SteeringStart[]): string {
  return starts.map(({ tick, kind }) => `${kind === 'note' ? 'n' : 'r'}${tick}`).join(' ')
}

/** Intent: one measure of a doodle of the set, as its starts in compact text. */
function setMeasure(name: string, measureIndex: number): string {
  const doodle = DOODLES.find((each) => each.name === name)!.quantized
  return startsText(doodleMeasureStarts(doodle, measureIndex))
}

// @test-link [[rule_jam_rhythm_ordered_by_doodle]]
describe("the doodle's measures over a phrase", () => {
  // @test-link [[rule_jam_rhythm_ordered_by_doodle]]
  it('lays one measure four times, two twice, three as 1, 2, 3, 1 and four as they are', () => {
    expect(doodleOverlay(1)).toEqual([0, 0, 0, 0])
    expect(doodleOverlay(2)).toEqual([0, 1, 0, 1])
    expect(doodleOverlay(3)).toEqual([0, 1, 2, 0])
    expect(doodleOverlay(4)).toEqual([0, 1, 2, 3])
  })

  // @test-link [[rule_jam_rhythm_ordered_by_doodle]]
  // @test-link [[rule_jam_steering_block]]
  it('writes each overlaid measure as that doodle measure’s starts', () => {
    const doodle = DOODLES.find((each) => each.name === 'sparse-calls')!.quantized
    const block = buildSteeringBlock(doodle, 'Near')
    const measures = [0, 1, 2].map((index) => doodleMeasureStarts(doodle, index))
    expect(block.targetRhythm.measures).toEqual([
      measures[0],
      measures[1],
      measures[2],
      measures[0],
    ])
  })
})

// @test-link [[rule_jam_steering_block]]
describe("a doodle measure's starts (C5.9)", () => {
  // @test-link [[rule_jam_steering_block]]
  it.each([
    ['Quarter', 4, [5, 12], 'n0 n4 r8 n12'],
    ['Eighth', 2, [5, 10], 'n0 n2 n4 r6 n10 n12 n14'],
    ['Sixteenth', 1, [5, 6], 'n0 n1 n2 n3 n4 r5 n6 n7 n8 n9 n10 n11 n12 n13 n14 n15'],
  ] as const)(
    'puts a rest start at the first grid tick of a silence holding a whole rest, under %s',
    (_, step, silence, expected) => {
      const doodle = doodleWithSilences(1, step, [silence])
      expect(startsText(doodleMeasureStarts(doodle, 0))).toBe(expected)
    },
  )

  // @test-link [[rule_jam_steering_block]]
  it('puts none in a shorter silence: four quarters, and the 3 + 3 + 2 rhythm', () => {
    expect(setMeasure('quarter-steps', 0)).toBe('n0 n4 n8 n12')
    expect(setMeasure('tresillo-leaps', 0)).toBe('n0 n6 n12')
    expect(setMeasure('tresillo-leaps', 1)).toBe('n0 n6 n12')
  })

  // @test-link [[rule_jam_steering_block]]
  it('puts one at tick 0 when the measure opens in a silence holding a rest there', () => {
    expect(setMeasure('late-start-high-ending', 0)).toBe('r0 n4 n8 n12')
    const crossing = doodleOf(2, [
      [0, 4],
      [4, 4],
      [8, 4],
      [20, 4],
      [24, 8],
    ])
    expect(startsText(doodleMeasureStarts(crossing, 0))).toBe('n0 n4 n8 r12')
    expect(startsText(doodleMeasureStarts(crossing, 1))).toBe('r0 n4 n8')
  })

  // @test-link [[rule_jam_steering_block]]
  it('puts none at tick 0 for a measure opening in a silence too short for a rest', () => {
    const doodle = doodleOf(2, [
      [0, 4],
      [4, 4],
      [8, 4],
      [12, 2],
      [19, 5],
      [24, 8],
    ])
    expect(startsText(doodleMeasureStarts(doodle, 1))).toBe('n3 n8')
  })

  // @test-link [[rule_jam_steering_block]]
  it('starts nothing for a note held across the barline, so a measure may hold no start', () => {
    const held = doodleOf(3, [
      [0, 4],
      [4, 28],
      [32, 4],
    ])
    expect(startsText(doodleMeasureStarts(held, 1))).toBe('')
    expect(startsText(doodleMeasureStarts(held, 2))).toBe('n0 r4')
  })

  // @test-link [[rule_jam_steering_block]]
  it('never holds two rest starts in a row, over the doodle set and built doodles', () => {
    const built = [
      doodleWithSilences(4, 2, [
        [8, 16],
        [24, 32],
        [40, 47],
      ]),
      doodleWithSilences(2, 4, [
        [5, 12],
        [21, 23],
        [28, 32],
      ]),
      doodleOf(2, [[0, 1]]),
    ]
    for (const doodle of [...DOODLES.map((each) => each.quantized), ...built]) {
      for (const measure of buildSteeringBlock(doodle, 'Close').targetRhythm.measures) {
        expect(startsText(measure)).not.toMatch(/r\d+ r\d+/)
      }
    }
  })
})

// @test-link [[rule_jam_drift_positions]]
describe("the drift's band and strength", () => {
  // @test-link [[rule_jam_drift_positions]]
  it('gives Close the close band with size and direction, Near the near band with direction, Free nothing', () => {
    expect(JAM_DRIFTS).toEqual(['Close', 'Near', 'Free'])
    expect(driftSteering('Close')).toEqual({ band: 'close', strength: 'size-and-direction' })
    expect(driftSteering('Near')).toEqual({ band: 'near', strength: 'direction' })
    expect(driftSteering('Free')).toEqual({ band: 'unbounded', strength: 'none' })
  })

  // @test-link [[rule_jam_drift_positions]]
  it.each(JAM_DRIFTS)('reaches the block at %s', (drift) => {
    const block = buildSteeringBlock(DOODLES[0]!.quantized, drift)
    expect({ band: block.targetRhythm.band, strength: block.strength }).toEqual(
      driftSteering(drift),
    )
  })
})

// @test-link [[rule_jam_melody_follows_doodle_moves]]
describe("the doodle's moves", () => {
  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it('follow the doodle’s order: the same note, a step of 1–2, a skip of 3–4, a leap of 5 or more', () => {
    const doodle = legatoDoodle(
      1,
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
      [60, 60, 61, 63, 60, 64, 59, 64, 64],
    )
    expect(doodleMoves(doodle)).toEqual([
      { direction: 'same' },
      { direction: 'up', size: 'step' },
      { direction: 'up', size: 'step' },
      { direction: 'down', size: 'skip' },
      { direction: 'up', size: 'skip' },
      { direction: 'down', size: 'leap' },
      { direction: 'up', size: 'leap' },
      { direction: 'same' },
    ])
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it('are none for a one-note doodle', () => {
    expect(doodleMoves(doodleOf(1, [[0, 4, 72]]))).toEqual([])
  })
})

// @test-link [[entity_steering_block]]
describe('the steering block built', () => {
  // @test-link [[entity_steering_block]]
  // @test-link [[rule_jam_steering_block]]
  it('passes the generation worker’s checks for every doodle of the set at every drift', () => {
    for (const { name, quantized } of DOODLES) {
      for (const drift of JAM_DRIFTS) {
        const block = buildSteeringBlock(quantized, drift)
        expect(parseSteeringBlock(structuredClone(block)), name).toEqual(block)
        expect(block.moves, name).toHaveLength(quantized.notes.length - 1)
      }
    }
  })

  // @test-link [[rule_jam_steering_block]]
  it('holds no pitch and nothing else of the doodle', () => {
    const doodle = DOODLES.find((each) => each.name === 'tresillo-leaps')!.quantized
    const block = buildSteeringBlock(doodle, 'Close')
    expect(Object.keys(block).sort()).toEqual(['moves', 'strength', 'targetRhythm'])
    const text = JSON.stringify(block)
    expect(text).not.toMatch(/pitch|startTick|lengthTicks|measureCount/)
    for (const pitch of new Set(doodle.notes.map((note) => note.pitch))) {
      expect(text).not.toContain(`:${pitch}`)
    }
  })

  // @test-link [[module_steering_block_builder]]
  it('is built in whole numbers only', () => {
    expect(
      nonIntegerOperations(new URL('../../../src/jam/steering-block-builder.ts', import.meta.url)),
    ).toEqual({ divisions: [], decimalLiterals: [], mathCalls: [] })
  })
})
