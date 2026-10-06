/**
 * The full look-ahead deadline sweep's timing, run by `npm run test:sweep` (vitest.sweep.config.ts)
 * and never by `npm run test:unit`: each attempt is charged what it really costs on the machine
 * running the sweep, and each swept session is checked against the look-ahead deadline.
 *
 * The result depends on the machine and on its load: run the sweep on an idle machine, like the
 * `measure:*` scripts. The serial single-worker model of deadline-sweep.ts still holds: an attempt
 * the engine dropped at its deadline keeps the generator busy until it finishes.
 */

import {
  phraseSlots,
  runTimedSession,
  sessionBreaks,
  type AttemptCost,
  type AttemptScript,
  type OutcomeCache,
  type SweepCase,
} from '../unit/session/deadline-sweep'

/**
 * What an attempt costs on top of its `generatePhrase` time, in seconds: the generation worker's
 * round trip and the engraving of the phrase. On 2026-10-06 in Chromium, the click-to-ready cycle
 * of the densest setting took at most 61.5 ms, its generation included, and the longest
 * main-thread engraving block was 52.8 ms (docs/generation-latency.md, "2026-10-06 run (v2.0
 * gate)"; HARDWARE-CHECKLIST.md part E). 100 ms covers both with room to spare. It is charged to
 * failed attempts too, which are not engraved, so a failure is over-counted by that much at most.
 */
const ROUND_TRIP_AND_ENGRAVING_SECONDS = 0.1

/** Intent: the sweep injects nothing: the real generator answers every attempt. */
const generateEveryAttempt: AttemptScript = () => 'generate'

/**
 * Intent: an attempt's real cost: the wall time `generatePhrase` took for its intent on this
 * machine, measured once per intent, plus the round trip and the engraving.
 */
const measuredAttemptCost: AttemptCost = (generated) => {
  if (generated === undefined)
    throw new Error('The measured sweep injects no failure, so every attempt has a measured time.')
  return generated.seconds + ROUND_TRIP_AND_ENGRAVING_SECONDS
}

/**
 * Intent: play one case's session at a tempo with every attempt at its measured cost, and return
 * every way it missed the look-ahead deadline, as readable lines (none when it held): an error, a
 * phrase after the first not ready strictly before its deadline, a phrase off the measure grid, a
 * session short of its planned end, and every repeat. A standalone phrase counts as generated.
 */
export async function deadlineShortfalls(
  sweepCase: SweepCase,
  tempo: number,
  outcomes: OutcomeCache,
): Promise<readonly string[]> {
  const run = await runTimedSession(
    sweepCase,
    tempo,
    outcomes,
    generateEveryAttempt,
    measuredAttemptCost,
  )
  const where = `${sweepCase.label} at ${tempo} BPM`
  const shortfalls = [...sessionBreaks(sweepCase, run)]
  for (const slot of phraseSlots(run))
    if (slot.decided?.origin === 'repeat')
      shortfalls.push(
        `${where}: phrase ${slot.phraseNumber} repeated at ${slot.decided.at} s, its deadline ${slot.deadline} s, after ${slot.attempts} attempts`,
      )
  return shortfalls
}
