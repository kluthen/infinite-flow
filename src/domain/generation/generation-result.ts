/**
 * The GenerationResult: carries the originating request identity, the seed that produced it, and
 * the immutable concert-pitch timeline (../events/timeline.ts). Rendered staff symbols, written
 * pitches, MIDI device messages, audio scheduling timestamps, and scoring state are structurally
 * excluded — those are downstream consumers of the timeline, not part of the result itself.
 */

import { type Seed } from '../random/seed'
import { type ConcertEventTimeline } from '../events/timeline'
import { deepFreeze } from '../events/deep-freeze'
import { type RequestId } from './generation-request'

/** The immutable result of one successful phrase generation. */
// @spec-link [[entity_concert_event_timeline]]
export interface GenerationResult {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly timeline: ConcertEventTimeline
}

/**
 * Intent: construct an immutable, deep-frozen GenerationResult from an already-validated request
 * identity, seed, and already-constructed ConcertEventTimeline. The timeline itself was already
 * deep-frozen by makeConcertEventTimeline; this freezes the enclosing result envelope.
 */
// @spec-link [[entity_concert_event_timeline]]
export function makeGenerationResult(input: GenerationResult): GenerationResult {
  return deepFreeze({
    requestId: input.requestId,
    seed: input.seed,
    timeline: input.timeline,
  })
}
