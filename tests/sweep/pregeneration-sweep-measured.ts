/**
 * Measurement M4's plumbing, run by `npm run test:sweep` only: the Idle phase played before a
 * measured sweep session (deadline-sweep-measured.ts), and the tally of what it changed for
 * phrase 2.
 *
 * The Idle phase runs the pre-generation plan to completion, as the workspace's background queue
 * does when nothing interrupts it: every attempt answered by the real `generatePhrase`, its
 * successful phrase checked with the fit check the sweep's session uses for its own attempts, with
 * no deadline and at no cost on the session's clock. The session then starts with the phrases it
 * made ready and runs as the sweep runs it, each attempt at its measured cost.
 */

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { createPregenerationPlan, type PregenerationResult } from '@/session/session-pregeneration'
import { MAX_READY_PHRASES, type ReadyPhrase } from '@/session/session-ready-phrases'
import {
  phraseSlots,
  writtenPhraseFits,
  type IdlePhase,
  type OutcomeCache,
  type SweepCase,
} from '../unit/session/deadline-sweep'
import { measuredSession, runShortfalls } from './deadline-sweep-measured'

/** The tempo M4 runs every case at: the fastest, where v2's phrase 2 is always standalone. */
export const M4_TEMPO = 240

/**
 * Intent: an Idle attempt's result: its real outcome, cached per intent, and, for a success, the
 * sweep session's fit check.
 */
async function idleResult(
  outcomes: OutcomeCache,
  intent: GenerationIntent,
): Promise<PregenerationResult> {
  const { outcome } = outcomes.of(intent)
  if (outcome.kind !== 'generation_success')
    return { kind: 'generation-failure', code: outcome.code }
  return (await writtenPhraseFits({ outcome, intent }))
    ? { kind: 'fits', outcome }
    : { kind: 'not-fitting' }
}

/**
 * Intent: the Idle phase: a fresh pre-generation plan stepped until it stops; `made` is told the
 * phrases it made ready.
 */
function idlePhaseOf(
  outcomes: OutcomeCache,
  made: (ready: readonly ReadyPhrase[]) => void,
): IdlePhase {
  return async (seams, start) => {
    let plan = createPregenerationPlan(seams, start, [])
    while (plan.attempt !== undefined)
      plan = plan.after(await idleResult(outcomes, plan.attempt.intent))
    made(plan.readyPhrases)
    return plan.readyPhrases
  }
}

/**
 * One case of M4: how many phrases the Idle phase made ready, phrase 2's origin in the session
 * (undefined when it was never decided), how many ready phrases the session refused and requested
 * instead, and every way the session missed the look-ahead deadline.
 */
export interface PregenerationCase {
  readonly readyCount: number
  readonly phraseTwoOrigin: string | undefined
  readonly refused: number
  readonly shortfalls: readonly string[]
}

/**
 * Intent: play one case at M4's tempo: the Idle phase, then the measured session started with its
 * ready phrases.
 */
export async function pregeneratedCase(
  sweepCase: SweepCase,
  outcomes: OutcomeCache,
): Promise<PregenerationCase> {
  let readyCount = 0
  const idlePhase = idlePhaseOf(outcomes, (ready) => (readyCount = ready.length))
  const run = await measuredSession(sweepCase, M4_TEMPO, outcomes, idlePhase)
  const slots = phraseSlots(run)
  return {
    readyCount,
    phraseTwoOrigin: slots[0]?.decided?.origin,
    refused: slots.slice(0, readyCount).filter((slot) => slot.attempts > 0).length,
    shortfalls: runShortfalls(sweepCase, run),
  }
}

/** Intent: a share as a percentage with one decimal. */
function percent(count: number, of: number): string {
  return of === 0 ? '-' : `${((100 * count) / of).toFixed(1)} %`
}

/**
 * M4's counts over a set of cases: the cases, those whose phrase 2 is a carry-in phrase, the cases
 * per number of ready phrases (0 to 4), the ready phrases the session refused and the shortfalls.
 */
export class PregenerationTally {
  private cases = 0
  private phraseTwoCarryIn = 0
  private readonly readyCounts = Array.from({ length: MAX_READY_PHRASES + 1 }, () => 0)
  private refused = 0
  private shortfalls = 0

  /** Intent: count one case. */
  add(result: PregenerationCase): void {
    this.cases++
    if (result.phraseTwoOrigin === 'carry-in') this.phraseTwoCarryIn++
    this.readyCounts[result.readyCount] = this.readyCounts[result.readyCount]! + 1
    this.refused += result.refused
    this.shortfalls += result.shortfalls.length
  }

  /** Intent: the counts as one `SWEEP-M4` line under a label, with v2's 0 % beside the share. */
  line(label: string): string {
    const held = this.shortfalls === 0 ? 'every deadline met, no repeat' : 'DEADLINE MISSED'
    return (
      `SWEEP-M4 ${label} at ${M4_TEMPO} BPM: cases ${this.cases}, ` +
      `phrase 2 carry-in ${this.phraseTwoCarryIn} (${percent(this.phraseTwoCarryIn, this.cases)}; v2 0 %), ` +
      `cases by ready phrases 0/1/2/3/4: ${this.readyCounts.join('/')}, ` +
      `ready phrases refused ${this.refused}, shortfalls ${this.shortfalls} (${held})`
    )
  }
}
