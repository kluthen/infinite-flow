/**
 * The full look-ahead deadline sweep's timing, run by `npm run test:sweep` (vitest.sweep.config.ts)
 * and never by `npm run test:unit`: each attempt is charged what it really costs on the machine
 * running the sweep, and each swept session is checked against the look-ahead deadline.
 *
 * The result depends on the machine and on its load: run the sweep on an idle machine, like the
 * `measure:*` scripts. The serial single-worker model of deadline-sweep.ts still holds: an attempt
 * the engine cancels while it runs is charged the time it ran plus the worker's restart cost.
 *
 * Each density's sweep also counts, per tempo, how its look-ahead phrases (2 to 6) were produced,
 * and prints the counts as `SWEEP-SKIPS` lines, so how often the ladder's time rule gave up carry-in
 * can be read from the sweep's log. Measurement M4 plays the same measured sessions after an Idle
 * phase (pregeneration-sweep-measured.ts).
 */

import {
  phraseSlots,
  runTimedSession,
  sessionBreaks,
  type AttemptCost,
  type AttemptScript,
  type IdlePhase,
  type OutcomeCache,
  type SweepCase,
  type TimedSession,
  type TimedSessionOptions,
} from '../unit/session/deadline-sweep'
import {
  PHRASE_PRODUCTIONS,
  TIME_RULE_PRODUCTIONS,
  phraseProductions,
  type PhraseProduction,
} from '../unit/session/deadline-sweep-productions'

/**
 * What an attempt costs on top of its `generatePhrase` time, in seconds: the generation worker's
 * round trip and the engraving of the phrase. On 2026-10-06 in Chromium, the click-to-ready cycle
 * of the densest setting took at most 61.5 ms, its generation included, and the longest
 * main-thread engraving block was 52.8 ms (docs/generation-latency.md, "2026-10-06 run (v2.0
 * gate)"; HARDWARE-CHECKLIST.md part E). 100 ms covers both with room to spare. It is charged to
 * failed attempts too, which are not engraved, so a failure is over-counted by that much at most.
 */
export const ROUND_TRIP_AND_ENGRAVING_SECONDS = 0.1

/** Intent: the sweep injects nothing: the real generator answers every attempt. */
export const generateEveryAttempt: AttemptScript = () => 'generate'

/**
 * Intent: an attempt's real cost: the wall time `generatePhrase` took for its intent on this
 * machine, measured once per intent, plus the round trip and the engraving.
 */
export const measuredAttemptCost: AttemptCost = (generated) => {
  if (generated === undefined)
    throw new Error('The measured sweep injects no failure, so every attempt has a measured time.')
  return generated.seconds + ROUND_TRIP_AND_ENGRAVING_SECONDS
}

/**
 * How the look-ahead phrases of the runs of one density at one tempo were produced: per production,
 * a count per phrase number; and how many cases lost carry-in to the ladder's time rule on at least
 * one phrase, and on at least one phrase after phrase 2.
 */
export class ProductionTally {
  private readonly counts = new Map<PhraseProduction, number[]>(
    PHRASE_PRODUCTIONS.map((production) => [production, [0, 0, 0, 0, 0]]),
  )
  private cases = 0
  private casesLosingCarryIn = 0
  private casesLosingCarryInAfterPhraseTwo = 0

  /** Intent: count the productions of one run's phrases 2 to 6. */
  add(run: TimedSession): void {
    const productions = phraseProductions(run)
    productions.forEach((production, offset) => {
      const counts = this.counts.get(production)!
      counts[offset] = counts[offset]! + 1
    })
    const lost = productions.map((production) => TIME_RULE_PRODUCTIONS.has(production))
    this.cases++
    if (lost.includes(true)) this.casesLosingCarryIn++
    if (lost.slice(1).includes(true)) this.casesLosingCarryInAfterPhraseTwo++
  }

  /**
   * Intent: the counts as `SWEEP-SKIPS` lines under a label: one per production with its count
   * for phrases 2 to 6 and its total, then the case counts.
   */
  lines(label: string): readonly string[] {
    const prefix = `SWEEP-SKIPS ${label}`
    const rows = PHRASE_PRODUCTIONS.map((production) => {
      const counts = this.counts.get(production)!
      const total = counts.reduce((sum, count) => sum + count, 0)
      return `${prefix} ${production.padEnd(37)} p2-p6 ${counts.map((c) => String(c).padStart(4)).join(' ')} total ${total}`
    })
    return [
      ...rows,
      `${prefix} cases ${this.cases}, losing carry-in to the time rule ${this.casesLosingCarryIn}, after phrase 2 ${this.casesLosingCarryInAfterPhraseTwo}`,
    ]
  }
}

/**
 * Intent: play one case's session at a tempo with every attempt at its measured cost, after the
 * Idle phase when one is given, with the run's options (phrase count, phrase 1, settings).
 */
export function measuredSession(
  sweepCase: SweepCase,
  tempo: number,
  outcomes: OutcomeCache,
  idlePhase?: IdlePhase,
  options?: TimedSessionOptions,
): Promise<TimedSession> {
  return runTimedSession(
    sweepCase,
    tempo,
    outcomes,
    generateEveryAttempt,
    measuredAttemptCost,
    idlePhase,
    options,
  )
}

/**
 * Intent: every way a measured run missed the look-ahead deadline, as readable lines (none when it
 * held): an error, a phrase after the first not ready strictly before its deadline, a phrase off
 * the measure grid, a session short of its planned end, and every repeat. A standalone phrase
 * counts as generated.
 */
export function runShortfalls(sweepCase: SweepCase, run: TimedSession): string[] {
  const where = `${sweepCase.label} at ${run.tempo} BPM`
  const shortfalls = [...sessionBreaks(sweepCase, run)]
  for (const slot of phraseSlots(run))
    if (slot.decided?.origin === 'repeat')
      shortfalls.push(
        `${where}: phrase ${slot.phraseNumber} repeated at ${slot.decided.at} s, its deadline ${slot.deadline} s, after ${slot.attempts} attempts`,
      )
  return shortfalls
}

/**
 * Intent: play one case's session at a tempo with every attempt at its measured cost, count how
 * its look-ahead phrases were produced in `tally`, and return every way it missed the look-ahead
 * deadline (`runShortfalls`).
 */
export async function deadlineShortfalls(
  sweepCase: SweepCase,
  tempo: number,
  outcomes: OutcomeCache,
  tally: ProductionTally,
): Promise<readonly string[]> {
  const run = await measuredSession(sweepCase, tempo, outcomes)
  tally.add(run)
  return runShortfalls(sweepCase, run)
}
