import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import type { MeasureEvent } from '@/domain/events/measure-event'
import { makeMeasure } from '@/domain/events/measure'
import type { Measure } from '@/domain/events/measure'
import {
  NOTATED_DURATIONS,
  beamGroupsFor,
  segmentMeasure,
  type RhythmSegment,
} from '@/domain/notation/rhythm-notation'
import { NotationInputError } from '@/domain/notation/written-phrase-types'
import type { NoteValue } from '@/domain/notation/written-phrase-types'

const PITCH = makeConcertPitch(60)
const OTHER_PITCH = makeConcertPitch(62)

function note(ticks: number, tieContinuation = false, pitch = PITCH): MeasureEvent {
  return makeNoteEvent({ duration: makeRational(ticks, 16), pitch, tieContinuation })
}

function rest(ticks: number): MeasureEvent {
  return makeRestEvent({ duration: makeRational(ticks, 16) })
}

function measureOf(events: readonly MeasureEvent[]): Measure {
  return makeMeasure(0, events)
}

function segmentsFor(sourceEventIndex: number, segments: readonly RhythmSegment[]) {
  return segments.filter((segment) => segment.sourceEventIndex === sourceEventIndex)
}

// @test-link [[module_notation_display_convention]]
describe('segmentMeasure basic tiling', () => {
  it('leaves four quarter notes unsplit', () => {
    const measure = measureOf([note(4), note(4), note(4), note(4)])
    const segments = segmentMeasure(measure, [], false)

    expect(segments).toHaveLength(4)
    segments.forEach((segment, index) => {
      expect(segment.startTick).toBe(index * 4)
      expect(segment.duration).toEqual({ value: 'quarter', dots: 0, ticks: 4 })
      expect(segment.tieFromPrevious).toBe(false)
    })
    expect(segments[3]!.tieToNext).toBe(false)
  })

  it('leaves a whole note unsplit', () => {
    const measure = measureOf([note(16)])
    const segments = segmentMeasure(measure, [], false)

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 0,
        startTick: 0,
        duration: { value: 'whole', dots: 0, ticks: 16 },
        tieFromPrevious: false,
        tieToNext: false,
      },
    ])
  })

  it('leaves a dotted half plus a quarter unsplit', () => {
    const measure = measureOf([note(12), note(4)])
    const segments = segmentMeasure(measure, [], false)

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 0,
        startTick: 0,
        duration: { value: 'half', dots: 1, ticks: 12 },
        tieFromPrevious: false,
        tieToNext: false,
      },
      {
        kind: 'note',
        sourceEventIndex: 1,
        startTick: 12,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        tieFromPrevious: false,
        tieToNext: false,
      },
    ])
  })

  it('splits a syncopated quarter starting at tick 2 into tied eighths', () => {
    const measure = measureOf([rest(2), note(4), rest(10)])
    const segments = segmentsFor(1, segmentMeasure(measure, [], false))

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 1,
        startTick: 2,
        duration: { value: 'eighth', dots: 0, ticks: 2 },
        tieFromPrevious: false,
        tieToNext: true,
      },
      {
        kind: 'note',
        sourceEventIndex: 1,
        startTick: 4,
        duration: { value: 'eighth', dots: 0, ticks: 2 },
        tieFromPrevious: true,
        tieToNext: false,
      },
    ])
  })

  it('splits a half note starting at tick 4 into tied quarters', () => {
    const measure = measureOf([rest(4), note(8), rest(4)])
    const segments = segmentsFor(1, segmentMeasure(measure, [], false))

    expect(segments.map((segment) => segment.duration)).toEqual([
      { value: 'quarter', dots: 0, ticks: 4 },
      { value: 'quarter', dots: 0, ticks: 4 },
    ])
    expect(segments.map((segment) => segment.startTick)).toEqual([4, 8])
    expect(segments.map((segment) => segment.tieToNext)).toEqual([true, false])
  })

  it('splits a 5-tick note starting at tick 0 into a tied quarter and sixteenth', () => {
    const measure = measureOf([note(5), rest(11)])
    const segments = segmentsFor(0, segmentMeasure(measure, [], false))

    expect(segments.map((segment) => segment.duration)).toEqual([
      { value: 'quarter', dots: 0, ticks: 4 },
      { value: 'sixteenth', dots: 0, ticks: 1 },
    ])
    expect(segments.map((segment) => segment.startTick)).toEqual([0, 4])
  })

  it('splits a 3-tick note starting at tick 1 into a tied sixteenth and eighth', () => {
    const measure = measureOf([rest(1), note(3), rest(12)])
    const segments = segmentsFor(1, segmentMeasure(measure, [], false))

    expect(segments.map((segment) => segment.duration)).toEqual([
      { value: 'sixteenth', dots: 0, ticks: 1 },
      { value: 'eighth', dots: 0, ticks: 2 },
    ])
    expect(segments.map((segment) => segment.startTick)).toEqual([1, 2])
  })

  it('leaves a dotted quarter starting at tick 8 unsplit', () => {
    const measure = measureOf([rest(8), note(6), rest(2)])
    const segments = segmentsFor(1, segmentMeasure(measure, [], false))

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 1,
        startTick: 8,
        duration: { value: 'quarter', dots: 1, ticks: 6 },
        tieFromPrevious: false,
        tieToNext: false,
      },
    ])
  })
})

// @test-link [[module_notation_display_convention]]
describe('segmentMeasure forced boundaries', () => {
  it('splits a whole note at a forced boundary into tied halves', () => {
    const measure = measureOf([note(16)])
    const segments = segmentMeasure(measure, [8], false)

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 0,
        startTick: 0,
        duration: { value: 'half', dots: 0, ticks: 8 },
        tieFromPrevious: false,
        tieToNext: true,
      },
      {
        kind: 'note',
        sourceEventIndex: 0,
        startTick: 8,
        duration: { value: 'half', dots: 0, ticks: 8 },
        tieFromPrevious: true,
        tieToNext: false,
      },
    ])
  })

  it('splits a rest at a forced boundary with no tie flags set', () => {
    const measure = measureOf([rest(16)])
    const segments = segmentMeasure(measure, [8], false)

    expect(segments).toEqual([
      {
        kind: 'rest',
        sourceEventIndex: 0,
        startTick: 0,
        duration: { value: 'half', dots: 0, ticks: 8 },
        tieFromPrevious: false,
        tieToNext: false,
      },
      {
        kind: 'rest',
        sourceEventIndex: 0,
        startTick: 8,
        duration: { value: 'half', dots: 0, ticks: 8 },
        tieFromPrevious: false,
        tieToNext: false,
      },
    ])
  })
})

// @test-link [[module_notation_display_convention]]
describe('segmentMeasure tie propagation', () => {
  it('ties within an event, across events, and into the next measure', () => {
    const measure = measureOf([note(4, false), note(4, true), note(8, false)])
    const segments = segmentMeasure(measure, [], true)

    expect(segments).toEqual([
      {
        kind: 'note',
        sourceEventIndex: 0,
        startTick: 0,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        tieFromPrevious: false,
        tieToNext: true,
      },
      {
        kind: 'note',
        sourceEventIndex: 1,
        startTick: 4,
        duration: { value: 'quarter', dots: 0, ticks: 4 },
        tieFromPrevious: true,
        tieToNext: false,
      },
      {
        kind: 'note',
        sourceEventIndex: 2,
        startTick: 8,
        duration: { value: 'half', dots: 0, ticks: 8 },
        tieFromPrevious: false,
        tieToNext: true,
      },
    ])
  })

  it('accepts a tie continuation as the measure first event without a preceding note', () => {
    const measure = measureOf([note(16, true)])

    expect(() => segmentMeasure(measure, [], false)).not.toThrow()
    expect(segmentMeasure(measure, [], false)[0]!.tieFromPrevious).toBe(true)
  })
})

// @test-link [[module_notation_display_convention]]
describe('segmentMeasure rejections', () => {
  it('rejects a non-integer forced boundary tick', () => {
    const measure = measureOf([note(16)])
    expect(() => segmentMeasure(measure, [1.5], false)).toThrow(NotationInputError)
  })

  it('rejects a negative forced boundary tick', () => {
    const measure = measureOf([note(16)])
    expect(() => segmentMeasure(measure, [-1], false)).toThrow(NotationInputError)
  })

  it('rejects a forced boundary tick outside the bar', () => {
    const measure = measureOf([note(16)])
    expect(() => segmentMeasure(measure, [16], false)).toThrow(NotationInputError)
  })

  it('rejects a tie continuation that follows a rest within the measure', () => {
    const measure = measureOf([rest(4), note(12, true)])
    expect(() => segmentMeasure(measure, [], false)).toThrow(NotationInputError)
  })

  it('rejects a tie continuation whose pitch differs from the preceding note', () => {
    const measure = measureOf([note(4, false, PITCH), note(12, true, OTHER_PITCH)])
    expect(() => segmentMeasure(measure, [], false)).toThrow(NotationInputError)
  })
})

// @test-link [[module_notation_display_convention]]
describe('beamGroupsFor', () => {
  it('groups four sixteenths sharing a beat', () => {
    const measure = measureOf([note(1), note(1), note(1), note(1), rest(12)])
    const groups = beamGroupsFor(segmentMeasure(measure, [], false))

    expect(groups).toEqual([[0, 1, 2, 3]])
  })

  it('groups two consecutive eighths', () => {
    const measure = measureOf([note(2), note(2), rest(12)])
    const groups = beamGroupsFor(segmentMeasure(measure, [], false))

    expect(groups).toEqual([[0, 1]])
  })

  it('does not group two eighths separated by a rest', () => {
    const measure = measureOf([note(2), rest(1), note(1), rest(12)])
    const groups = beamGroupsFor(segmentMeasure(measure, [], false))

    expect(groups).toEqual([])
  })

  it('groups a dotted eighth plus a sixteenth in the same beat', () => {
    const measure = measureOf([note(3), note(1), rest(12)])
    const groups = beamGroupsFor(segmentMeasure(measure, [], false))

    expect(groups).toEqual([[0, 1]])
  })

  it('splits a beam run across a beat boundary into two groups', () => {
    const measure = measureOf([note(2), note(2), note(2), note(2), rest(8)])
    const groups = beamGroupsFor(segmentMeasure(measure, [], false))

    expect(groups).toEqual([
      [0, 1],
      [2, 3],
    ])
  })
})

/** Intent: a tiny deterministic PRNG (mulberry32) so the property test is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let result = Math.imul(state ^ (state >>> 15), 1 | state)
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

/** Intent: build a measure whose events are arbitrary (not necessarily glyph-aligned) tick spans. */
function randomMeasure(rand: () => number): Measure {
  const interiorCutCount = Math.floor(rand() * 5)
  const cuts = new Set<number>()
  while (cuts.size < interiorCutCount) {
    cuts.add(1 + Math.floor(rand() * 15))
  }
  const boundaries = [0, ...[...cuts].sort((a, b) => a - b), 16]

  const events: MeasureEvent[] = []
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const ticks = boundaries[index + 1]! - boundaries[index]!
    events.push(rand() < 0.5 ? note(ticks) : rest(ticks))
  }
  return measureOf(events)
}

/** Intent: reproduce the brief's alignment table independently of the implementation under test. */
function satisfiesAlignmentTable(ticksValue: number, startTick: number): boolean {
  switch (ticksValue) {
    case 16:
    case 12:
      return startTick === 0
    case 8:
    case 6:
      return startTick % 8 === 0
    case 4:
    case 3:
      return startTick % 4 === 0
    case 2:
      return startTick % 2 === 0
    default:
      return true
  }
}

// @test-link [[module_notation_display_convention]]
describe('segmentMeasure property: many random valid tilings', () => {
  it('always sums to 16 ticks, stays aligned, and keeps contiguous starts', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const rand = mulberry32(seed)
      const measure = randomMeasure(rand)
      const segments = segmentMeasure(measure, [], false)

      const totalTicks = segments.reduce((sum, segment) => sum + segment.duration.ticks, 0)
      expect(totalTicks).toBe(16)

      let cursor = 0
      for (const segment of segments) {
        expect(segment.startTick).toBe(cursor)
        expect(satisfiesAlignmentTable(segment.duration.ticks, segment.startTick)).toBe(true)
        cursor += segment.duration.ticks
      }
    }
  })
})

// @test-link [[module_notation_display_convention]]
describe('NOTATED_DURATIONS', () => {
  it('lists every notatable glyph in strictly descending tick order', () => {
    const values: NoteValue[] = NOTATED_DURATIONS.map((entry) => entry.value)
    expect(values).toEqual([
      'whole',
      'half',
      'half',
      'quarter',
      'quarter',
      'eighth',
      'eighth',
      'sixteenth',
    ])
    const ticks = NOTATED_DURATIONS.map((entry) => entry.ticks)
    expect(ticks).toEqual([...ticks].sort((a, b) => b - a))
  })
})
