// @test-link [[entity_concert_event_timeline]]
import { describe, expect, it } from 'vitest'

import { MeasureEventParseError } from '@/domain/events/measure-event-parser'
import { parseMeasureEvent } from '@/domain/events/measure-event-parser'

describe('parseMeasureEvent', () => {
  it('parses a well-formed untrusted note event', () => {
    const parsed = parseMeasureEvent({
      kind: 'note',
      duration: { numerator: 1, denominator: 4 },
      pitch: 60,
      tieContinuation: false,
    })

    expect(parsed).toStrictEqual({
      kind: 'note',
      duration: { numerator: 1, denominator: 4 },
      pitch: 60,
      tieContinuation: false,
    })
  })

  it('parses a well-formed untrusted rest event', () => {
    const parsed = parseMeasureEvent({
      kind: 'rest',
      duration: { numerator: 1, denominator: 8 },
    })

    expect(parsed).toStrictEqual({ kind: 'rest', duration: { numerator: 1, denominator: 8 } })
  })

  it('round-trips tie-continuation intent through parsing', () => {
    const parsed = parseMeasureEvent({
      kind: 'note',
      duration: { numerator: 1, denominator: 4 },
      pitch: 60,
      tieContinuation: true,
    })

    expect(parsed.kind).toBe('note')
    expect(parsed).toMatchObject({ tieContinuation: true })
  })

  it('parses optional annotations on an untrusted note event', () => {
    const parsed = parseMeasureEvent({
      kind: 'note',
      duration: { numerator: 1, denominator: 4 },
      pitch: 60,
      tieContinuation: false,
      annotations: { musical: 'passing-tone' },
    })

    expect(parsed).toMatchObject({ annotations: { musical: 'passing-tone' } })
  })

  it('rejects a non-object input as a typed failure', () => {
    expect(() => parseMeasureEvent('not-an-event')).toThrow(MeasureEventParseError)
    expect(() => parseMeasureEvent(null)).toThrow(MeasureEventParseError)
  })

  it('rejects an unknown discriminant kind as a typed failure', () => {
    expect(() =>
      parseMeasureEvent({ kind: 'chord', duration: { numerator: 1, denominator: 4 } }),
    ).toThrow(MeasureEventParseError)
  })

  it('rejects a note event missing pitch as a typed failure', () => {
    expect(() =>
      parseMeasureEvent({
        kind: 'note',
        duration: { numerator: 1, denominator: 4 },
        tieContinuation: false,
      }),
    ).toThrow(MeasureEventParseError)
  })

  it('rejects a note event with a non-integer pitch as a typed failure', () => {
    expect(() =>
      parseMeasureEvent({
        kind: 'note',
        duration: { numerator: 1, denominator: 4 },
        pitch: 60.5,
        tieContinuation: false,
      }),
    ).toThrow(MeasureEventParseError)
  })

  it('rejects a malformed duration as a typed failure', () => {
    expect(() =>
      parseMeasureEvent({
        kind: 'rest',
        duration: { numerator: '1', denominator: 8 },
      }),
    ).toThrow(MeasureEventParseError)
  })

  it('rejects a duration that violates the sixteenth-note grid policy as a typed failure', () => {
    expect(() =>
      parseMeasureEvent({
        kind: 'rest',
        duration: { numerator: 1, denominator: 24 },
      }),
    ).toThrow(MeasureEventParseError)
  })

  it('rejects unknown extra fields rather than silently ignoring them', () => {
    expect(() =>
      parseMeasureEvent({
        kind: 'rest',
        duration: { numerator: 1, denominator: 8 },
        unknownField: 'nope',
      }),
    ).toThrow(MeasureEventParseError)
  })

  it('never produces a partial event on failure', () => {
    try {
      parseMeasureEvent({ kind: 'note', duration: { numerator: 1, denominator: 4 } })
      expect.unreachable('parseMeasureEvent should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(MeasureEventParseError)
    }
  })
})
