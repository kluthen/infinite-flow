// @test-link [[entity_concert_event_timeline]]
// @test-link [[entity_exact_musical_time]]
import { describe, expect, it } from 'vitest'

import { makeRational } from '@/domain/time/rational'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  MeasureEventConstructionError,
  makeNoteEvent,
  makeRestEvent,
} from '@/domain/events/measure-event'

describe('makeNoteEvent', () => {
  it('constructs a note event with pitch and tie-continuation intent', () => {
    const note = makeNoteEvent({
      duration: makeRational(1, 4),
      pitch: makeConcertPitch(60),
      tieContinuation: false,
    })

    expect(note).toStrictEqual({
      kind: 'note',
      duration: { numerator: 1, denominator: 4 },
      pitch: 60,
      tieContinuation: false,
    })
  })

  it('round-trips tie-continuation intent set to true', () => {
    const note = makeNoteEvent({
      duration: makeRational(1, 4),
      pitch: makeConcertPitch(62),
      tieContinuation: true,
    })

    expect(note.tieContinuation).toBe(true)
  })

  it('accepts an optional musical/validation annotation', () => {
    const note = makeNoteEvent({
      duration: makeRational(1, 4),
      pitch: makeConcertPitch(60),
      tieContinuation: false,
      annotations: { musical: 'approach-tone', validation: 'range-checked' },
    })

    expect(note.annotations).toStrictEqual({
      musical: 'approach-tone',
      validation: 'range-checked',
    })
  })

  it('omitting the optional annotation leaves the property absent, not undefined', () => {
    const note = makeNoteEvent({
      duration: makeRational(1, 4),
      pitch: makeConcertPitch(60),
      tieContinuation: false,
    })

    expect('annotations' in note).toBe(false)
  })

  it('rejects a zero duration as a typed failure', () => {
    expect(() =>
      makeNoteEvent({
        duration: makeRational(0, 1),
        pitch: makeConcertPitch(60),
        tieContinuation: false,
      }),
    ).toThrow(MeasureEventConstructionError)
  })

  it('rejects a negative duration as a typed failure', () => {
    expect(() =>
      makeNoteEvent({
        duration: makeRational(-1, 4),
        pitch: makeConcertPitch(60),
        tieContinuation: false,
      }),
    ).toThrow(MeasureEventConstructionError)
  })

  it('returns a note event that cannot be mutated', () => {
    const note = makeNoteEvent({
      duration: makeRational(1, 4),
      pitch: makeConcertPitch(60),
      tieContinuation: false,
    })

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      note.pitch = 61
    }).toThrow(TypeError)
  })
})

describe('makeRestEvent', () => {
  it('constructs a rest event', () => {
    const rest = makeRestEvent({ duration: makeRational(1, 8) })

    expect(rest).toStrictEqual({ kind: 'rest', duration: { numerator: 1, denominator: 8 } })
  })

  it('rejects a zero duration as a typed failure', () => {
    expect(() => makeRestEvent({ duration: makeRational(0, 1) })).toThrow(
      MeasureEventConstructionError,
    )
  })

  it('returns a rest event that cannot be mutated', () => {
    const rest = makeRestEvent({ duration: makeRational(1, 8) })

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      rest.duration = { numerator: 1, denominator: 4 }
    }).toThrow(TypeError)
  })
})
