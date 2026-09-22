// @test-link [[entity_concert_event_timeline]]
// @test-link [[entity_exact_musical_time]]
import { describe, expect, it } from 'vitest'

import { equalsRational, makeRational, sumRational } from '@/domain/time/rational'
import { WHOLE_NOTE } from '@/domain/time/rational'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeMeasure } from '@/domain/events/measure'
import { TimelineStructureViolation, makeConcertEventTimeline } from '@/domain/events/timeline'
import { parseConcertEventTimeline } from '@/domain/events/timeline-parser'
import { TimelineParseError } from '@/domain/events/timeline-parser'

const quarterNote = makeRational(1, 4)

function fullMeasure(measureIndex: 0 | 1 | 2 | 3) {
  return makeMeasure(measureIndex, [
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(60), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(62), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(64), tieContinuation: false }),
    makeRestEvent({ duration: quarterNote }),
  ])
}

function fourMeasures() {
  return [fullMeasure(0), fullMeasure(1), fullMeasure(2), fullMeasure(3)] as const
}

describe('makeConcertEventTimeline', () => {
  it('accepts exactly four ordered measures', () => {
    const timeline = makeConcertEventTimeline(fourMeasures())

    expect(timeline.measures).toHaveLength(4)
    expect(timeline.measures.map((measure) => measure.measureIndex)).toStrictEqual([0, 1, 2, 3])
  })

  it('the four-measure phrase totals exactly 4 whole notes using exact rational equality', () => {
    const timeline = makeConcertEventTimeline(fourMeasures())

    const measureTotals = timeline.measures.map((measure) =>
      sumRational(measure.events.map((event) => event.duration)),
    )
    const phraseTotal = sumRational(measureTotals)

    expect(equalsRational(phraseTotal, makeRational(4, 1))).toBe(true)
    measureTotals.forEach((total) => expect(equalsRational(total, WHOLE_NOTE)).toBe(true))
  })

  it('rejects fewer than four measures as a typed failure', () => {
    expect(() => makeConcertEventTimeline([fullMeasure(0), fullMeasure(1)])).toThrow(
      TimelineStructureViolation,
    )
  })

  it('rejects more than four measures as a typed failure', () => {
    expect(() =>
      makeConcertEventTimeline([fullMeasure(0), fullMeasure(1), fullMeasure(2), fullMeasure(3), fullMeasure(3)]),
    ).toThrow(TimelineStructureViolation)
  })

  it('rejects measures out of order as a typed failure', () => {
    expect(() =>
      makeConcertEventTimeline([fullMeasure(0), fullMeasure(2), fullMeasure(1), fullMeasure(3)]),
    ).toThrow(TimelineStructureViolation)
  })

  it('returns a timeline whose measures array cannot be mutated', () => {
    const timeline = makeConcertEventTimeline(fourMeasures())

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      timeline.measures.push(fullMeasure(3))
    }).toThrow(TypeError)
  })

  it('returns a timeline whose nested measures remain frozen', () => {
    const timeline = makeConcertEventTimeline(fourMeasures())

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      timeline.measures[0].measureIndex = 9
    }).toThrow(TypeError)
  })
})

describe('parseConcertEventTimeline', () => {
  const validRawMeasure = (measureIndex: number) => ({
    measureIndex,
    events: [
      { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 60, tieContinuation: false },
      { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 62, tieContinuation: false },
      { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 64, tieContinuation: false },
      { kind: 'rest', duration: { numerator: 1, denominator: 4 } },
    ],
  })

  it('parses a well-formed untrusted four-measure timeline', () => {
    const timeline = parseConcertEventTimeline({
      measures: [0, 1, 2, 3].map((index) => validRawMeasure(index)),
    })

    expect(timeline.measures).toHaveLength(4)
  })

  it('rejects a non-tiling measure inside an otherwise well-formed timeline as a typed failure', () => {
    expect(() =>
      parseConcertEventTimeline({
        measures: [
          validRawMeasure(0),
          { measureIndex: 1, events: [{ kind: 'rest', duration: { numerator: 1, denominator: 4 } }] },
          validRawMeasure(2),
          validRawMeasure(3),
        ],
      }),
    ).toThrow(TimelineParseError)
  })

  it('rejects a timeline with the wrong measure count as a typed failure, never producing a partial timeline', () => {
    expect(() =>
      parseConcertEventTimeline({ measures: [validRawMeasure(0), validRawMeasure(1)] }),
    ).toThrow(TimelineParseError)
  })

  it('rejects a non-object input as a typed failure', () => {
    expect(() => parseConcertEventTimeline('not-a-timeline')).toThrow(TimelineParseError)
    expect(() => parseConcertEventTimeline(null)).toThrow(TimelineParseError)
  })
})
