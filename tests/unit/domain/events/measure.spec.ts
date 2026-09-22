// @test-link [[entity_concert_event_timeline]]
// @test-link [[entity_exact_musical_time]]
import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { MeasureTilingViolation, makeMeasure } from '@/domain/events/measure'
import { parseMeasure } from '@/domain/events/measure-parser'
import { MeasureParseError } from '@/domain/events/measure-parser'

const quarterNote = makeRational(1, 4)

function fourQuarterNotes() {
  return [
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(60), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(62), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(64), tieContinuation: false }),
    makeRestEvent({ duration: quarterNote }),
  ]
}

describe('makeMeasure', () => {
  it('accepts events that exactly tile the measure with no gap and no overlap', () => {
    const measure = makeMeasure(0, fourQuarterNotes())

    expect(measure.measureIndex).toBe(0)
    expect(measure.events).toHaveLength(4)
  })

  it('rejects a measure whose events sum to less than one whole note (a gap)', () => {
    const events = [
      makeNoteEvent({
        duration: quarterNote,
        pitch: makeConcertPitch(60),
        tieContinuation: false,
      }),
      makeRestEvent({ duration: quarterNote }),
    ]

    expect(() => makeMeasure(0, events)).toThrow(MeasureTilingViolation)
  })

  it('rejects a measure whose events sum to more than one whole note (an overlap)', () => {
    const events = [...fourQuarterNotes(), makeRestEvent({ duration: quarterNote })]

    expect(() => makeMeasure(0, events)).toThrow(MeasureTilingViolation)
  })

  it('rejects an empty measure as a typed failure', () => {
    expect(() => makeMeasure(0, [])).toThrow(MeasureTilingViolation)
  })

  it('rejects a measure index outside 0-3 as a typed failure', () => {
    expect(() => makeMeasure(4, fourQuarterNotes())).toThrow(MeasureTilingViolation)
  })

  it('returns a measure whose events array cannot be mutated', () => {
    const measure = makeMeasure(0, fourQuarterNotes())

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      measure.events.push(makeRestEvent({ duration: quarterNote }))
    }).toThrow(TypeError)
  })

  it('returns a measure whose events array elements cannot be mutated', () => {
    const measure = makeMeasure(0, fourQuarterNotes())
    const firstEvent = measure.events[0]

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      firstEvent.duration = { numerator: 1, denominator: 2 }
    }).toThrow(TypeError)
  })
})

describe('parseMeasure', () => {
  it('parses a well-formed untrusted measure that tiles exactly', () => {
    const measure = parseMeasure({
      measureIndex: 1,
      events: [
        { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 60, tieContinuation: false },
        { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 62, tieContinuation: false },
        { kind: 'note', duration: { numerator: 1, denominator: 4 }, pitch: 64, tieContinuation: false },
        { kind: 'rest', duration: { numerator: 1, denominator: 4 } },
      ],
    })

    expect(measure.measureIndex).toBe(1)
    expect(measure.events).toHaveLength(4)
  })

  it('rejects a deliberately non-tiling measure with a typed failure', () => {
    expect(() =>
      parseMeasure({
        measureIndex: 0,
        events: [{ kind: 'rest', duration: { numerator: 1, denominator: 4 } }],
      }),
    ).toThrow(MeasureParseError)
  })

  it('rejects a non-object input as a typed failure', () => {
    expect(() => parseMeasure('not-a-measure')).toThrow(MeasureParseError)
  })

  it('rejects an unknown extra field rather than silently ignoring it', () => {
    expect(() =>
      parseMeasure({
        measureIndex: 0,
        events: [{ kind: 'rest', duration: { numerator: 1, denominator: 1 } }],
        harmonicRole: 'tonic',
      }),
    ).toThrow(MeasureParseError)
  })
})
