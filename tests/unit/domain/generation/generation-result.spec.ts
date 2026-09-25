import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeNoteEvent, makeRestEvent } from '@/domain/events/measure-event'
import { makeMeasure } from '@/domain/events/measure'
import { makeConcertEventTimeline } from '@/domain/events/timeline'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeGenerationResult } from '@/domain/generation/generation-result'
import { makeRational } from '@/domain/time/rational'

const quarterNote = makeRational(1, 4)

function fullMeasure(measureIndex: 0 | 1 | 2 | 3) {
  return makeMeasure(measureIndex, [
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(60), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(62), tieContinuation: false }),
    makeNoteEvent({ duration: quarterNote, pitch: makeConcertPitch(64), tieContinuation: false }),
    makeRestEvent({ duration: quarterNote }),
  ])
}

// @test-link [[entity_concert_event_timeline]]
describe('makeGenerationResult', () => {
  it('constructs an immutable result carrying request identity, seed, and the timeline', () => {
    const requestId = makeRequestId('11111111-1111-4111-8111-111111111111')
    const seed = makeSeed(7)
    const timeline = makeConcertEventTimeline([
      fullMeasure(0),
      fullMeasure(1),
      fullMeasure(2),
      fullMeasure(3),
    ])

    const result = makeGenerationResult({ requestId, seed, timeline })

    expect(result.requestId).toBe(requestId)
    expect(result.seed).toBe(seed)
    expect(result.timeline).toBe(timeline)
  })

  it('returns a result that cannot be mutated', () => {
    const requestId = makeRequestId('11111111-1111-4111-8111-111111111111')
    const seed = makeSeed(7)
    const timeline = makeConcertEventTimeline([
      fullMeasure(0),
      fullMeasure(1),
      fullMeasure(2),
      fullMeasure(3),
    ])

    const result = makeGenerationResult({ requestId, seed, timeline })

    expect(() => {
      // @ts-expect-error mutation must be rejected at the type level too
      result.seed = makeSeed(1)
    }).toThrow(TypeError)
  })
})
