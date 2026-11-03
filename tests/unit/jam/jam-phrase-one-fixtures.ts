/**
 * What the Jam's phrase 1 specs share (jam-phrase-one*.spec.ts): the one-measure doodle, the
 * hand-over the ladder made and phrase 1's attempts, read from a run of jam-phrase-one-rig.ts.
 */
import { expect } from 'vitest'

import { phraseOneRequests, type BeatNote, type JamRun } from './jam-phrase-one-rig'

/** A one-measure doodle: C, D, E, F, a quarter note each, from the count-in's end. */
export const ONE_MEASURE: readonly BeatNote[] = [
  [60, 0, 1],
  [62, 1, 1],
  [64, 2, 1],
  [65, 3, 1],
]

/** Intent: the hand-over the ladder made, failing when none was made. */
export function handover(run: JamRun) {
  const events = run.ladder.flatMap((output) =>
    output.kind === 'session-event' && output.event.kind === 'phrase-one' ? [output.event] : [],
  )
  expect(events).toHaveLength(1)
  return events[0]!
}

/** Intent: phrase 1's attempts as their seed-plan index (the request's retry) and start time. */
export function attemptsOf(run: JamRun): [number, number][] {
  return phraseOneRequests(run).map(({ at, request }) => [request.retry, at])
}
