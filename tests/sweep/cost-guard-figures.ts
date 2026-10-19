/**
 * The cost runner's figures (measurement tooling, run by `npm run measure:cost`): what one tempo's
 * measured runs of one setting add up to (the share of phrases generated, the attempts and their
 * `generatePhrase` times, how the look-ahead phrases were produced, the deadline shortfalls), the
 * time statistics of a set of measured attempts, and the readable `COST-GUARD` summary lines. The
 * figures keep counts, times and failure codes only, never a session or a generation outcome, so a
 * sweep of thousands of phrases holds no phrase once its runs are added up.
 */

import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import type { OutcomeCache, SweepCase, TimedSession } from '../unit/session/deadline-sweep'
import {
  PHRASE_PRODUCTIONS,
  phraseProductions,
  type PhraseProduction,
} from '../unit/session/deadline-sweep-productions'
import { settingKey } from '../unit/domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'

/** One measured outcome: what `generatePhrase` gave an intent, and the wall time it took. */
export type TimedOutcome = ReturnType<OutcomeCache['of']>

/**
 * What the figures keep of one measured outcome: the wall time `generatePhrase` took, and its
 * failure code, or null for a generated phrase.
 */
export interface AttemptTime {
  readonly seconds: number
  readonly failureCode: GenerationFailureCode | null
}

/** Intent: what the figures keep of a measured outcome: its time and failure code, not the phrase. */
export function attemptTime({ outcome, seconds }: TimedOutcome): AttemptTime {
  return { seconds, failureCode: outcome.kind === 'generation_failure' ? outcome.code : null }
}

/** The most shortfall lines a tempo keeps in the report; the count covers them all. */
const MAX_SHORTFALL_LINES = 10

/** The tempo whose fallback share the summary prints: the fastest one swept. */
export const FALLBACK_TEMPO = 240

/** A count over a total, with its share (null when the total is zero). */
export interface Share {
  readonly count: number
  readonly total: number
  readonly share: number | null
}

/** The slowest and 95th-percentile `generatePhrase` time of some outcomes, in seconds. */
export interface TimeStats {
  readonly count: number
  readonly slowestSeconds: number | null
  readonly p95Seconds: number | null
}

/** The time statistics of some outcomes: all of them, the successes, the failures. */
export interface SplitTimes {
  readonly all: TimeStats
  readonly successes: TimeStats
  readonly failures: TimeStats
}

/** Intent: a count over a total as a share, null when the total is zero. */
export function shareOf(count: number, total: number): Share {
  return { count, total, share: total === 0 ? null : count / total }
}

/**
 * Intent: the nearest-rank percentile of some values: the smallest value at or above which at
 * least `percent` % of the values lie, i.e. the value of rank ceil(percent / 100 * n) in
 * ascending order; null with no value.
 */
export function nearestRank(values: readonly number[], percent: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil((percent / 100) * sorted.length))
  return sorted[rank - 1]!
}

/** Intent: the slowest and nearest-rank 95th-percentile time of some attempts. */
function timeStats(attempts: readonly AttemptTime[]): TimeStats {
  const seconds = attempts.map((attempt) => attempt.seconds)
  return {
    count: seconds.length,
    slowestSeconds: seconds.length === 0 ? null : Math.max(...seconds),
    p95Seconds: nearestRank(seconds, 95),
  }
}

/** Intent: whether a measured attempt generated a phrase. */
function succeeded(attempt: AttemptTime): boolean {
  return attempt.failureCode === null
}

/** Intent: the time statistics of some attempts, all of them and split by success and failure. */
export function splitTimes(attempts: readonly AttemptTime[]): SplitTimes {
  return {
    all: timeStats(attempts),
    successes: timeStats(attempts.filter(succeeded)),
    failures: timeStats(attempts.filter((attempt) => !succeeded(attempt))),
  }
}

/** Intent: the failures among some attempts, counted by failure code. */
export function failuresByCode(attempts: readonly AttemptTime[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { failureCode } of attempts)
    if (failureCode !== null) counts[failureCode] = (counts[failureCode] ?? 0) + 1
  return counts
}

/** Intent: whether a phrase production generated the phrase: carry-in or any standalone kind. */
function isGenerated(production: PhraseProduction): boolean {
  return production !== 'repeat' && production !== 'undecided'
}

/** Intent: whether a phrase production generated the phrase without the join (standalone). */
function isStandalone(production: PhraseProduction): boolean {
  return isGenerated(production) && production !== 'carry-in'
}

/** Generated phrases over phrases, as plain counts. */
interface Counts {
  generated: number
  phrases: number
}

/** The figures of one tempo's measured runs of one setting. */
export interface TempoFigures {
  readonly tempo: number
  readonly cases: number
  /** Phrases 2-6 generated (carry-in or standalone) over phrases 2-6. */
  readonly generated: Share
  readonly generatedByDensity: Readonly<Record<string, Share>>
  /** Per rhythm setting (its `settingKey`), the plain counts of phrases 2-6. */
  readonly generatedByRhythmSetting: Readonly<Record<string, Counts>>
  /** Phrases produced without the join (any standalone production). */
  readonly standalone: { readonly phrases2to6: Share; readonly phrases3to6: Share }
  /** Per phrase production, its count for phrases 2 to 6. */
  readonly productions: Readonly<Record<PhraseProduction, readonly number[]>>
  /** Every attempt the runs requested, each with the outcome and time of its intent. */
  readonly attempts: {
    readonly successes: Share
    readonly failuresByCode: Readonly<Record<string, number>>
    readonly seconds: SplitTimes
  }
  readonly shortfalls: { readonly count: number; readonly first: readonly string[] }
}

/** Intent: add one phrase's production to a count. */
function countPhrase(counts: Counts, production: PhraseProduction): void {
  counts.phrases += 1
  if (isGenerated(production)) counts.generated += 1
}

/** The running figures of one tempo's runs of one setting, fed one run at a time. */
export class TempoTally {
  private cases = 0
  private readonly overall: Counts = { generated: 0, phrases: 0 }
  private readonly byDensity: Record<string, Counts> = {}
  private readonly byRhythmSetting: Record<string, Counts> = {}
  private readonly standalone = { phrases2to6: 0, phrases3to6: 0 }
  private readonly productions = Object.fromEntries(
    PHRASE_PRODUCTIONS.map((production) => [production, [0, 0, 0, 0, 0]]),
  ) as Record<PhraseProduction, number[]>
  private readonly attempts: AttemptTime[] = []
  private readonly shortfalls: string[] = []

  /** Intent: start the tally of one tempo. */
  constructor(readonly tempo: number) {}

  /**
   * Intent: add one case's run, the times of the attempts it requested, and its shortfalls,
   * keeping counts, times and lines only, so the run can be dropped afterwards.
   */
  add(
    sweepCase: SweepCase,
    run: TimedSession,
    attempts: readonly AttemptTime[],
    shortfalls: readonly string[],
  ): void {
    if (run.tempo !== this.tempo)
      throw new Error(`A ${run.tempo} BPM run was added to the ${this.tempo} BPM tally.`)
    this.cases += 1
    const density = (this.byDensity[sweepCase.rhythm.noteDensity] ??= { generated: 0, phrases: 0 })
    const key = settingKey(sweepCase.rhythm)
    const rhythm = (this.byRhythmSetting[key] ??= { generated: 0, phrases: 0 })
    phraseProductions(run).forEach((production, offset) => {
      for (const counts of [this.overall, density, rhythm]) countPhrase(counts, production)
      this.productions[production][offset]! += 1
      if (!isStandalone(production)) return
      this.standalone.phrases2to6 += 1
      if (offset > 0) this.standalone.phrases3to6 += 1
    })
    this.attempts.push(...attempts)
    this.shortfalls.push(...shortfalls)
  }

  /** Intent: the tempo's figures so far. */
  figures(): TempoFigures {
    const phrases = this.overall.phrases
    const successes = this.attempts.filter(succeeded)
    return {
      tempo: this.tempo,
      cases: this.cases,
      generated: shareOf(this.overall.generated, phrases),
      generatedByDensity: Object.fromEntries(
        Object.entries(this.byDensity).map(([density, c]) => [
          density,
          shareOf(c.generated, c.phrases),
        ]),
      ),
      generatedByRhythmSetting: structuredClone(this.byRhythmSetting),
      standalone: {
        phrases2to6: shareOf(this.standalone.phrases2to6, phrases),
        phrases3to6: shareOf(this.standalone.phrases3to6, phrases - this.cases),
      },
      productions: structuredClone(this.productions),
      attempts: {
        successes: shareOf(successes.length, this.attempts.length),
        failuresByCode: failuresByCode(this.attempts),
        seconds: splitTimes(this.attempts),
      },
      shortfalls: {
        count: this.shortfalls.length,
        first: this.shortfalls.slice(0, MAX_SHORTFALL_LINES),
      },
    }
  }
}

/** Intent: a share as a percentage with one decimal and its counts, or a dash with no total. */
function percent(share: Share): string {
  const value = share.share === null ? '-' : `${(share.share * 100).toFixed(1)} %`
  return `${value} (${share.count}/${share.total})`
}

/** Intent: a time in seconds with three decimals, or a dash when there is none. */
function seconds(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(3)} s`
}

/**
 * Intent: the readable summary of one tempo, then the fallback shares when it is the fallback
 * tempo, each line prefixed `COST-GUARD [label]`.
 */
export function tempoSummaryLines(label: string, figures: TempoFigures): readonly string[] {
  const prefix = `COST-GUARD [${label}] ${figures.tempo} BPM`
  const times = figures.attempts.seconds.all
  const lines = [
    `${prefix}: generated ${percent(figures.generated)}, attempts succeeded ${percent(figures.attempts.successes)}, attempt time slowest ${seconds(times.slowestSeconds)} p95 ${seconds(times.p95Seconds)}, shortfalls ${figures.shortfalls.count}`,
  ]
  if (figures.tempo === FALLBACK_TEMPO)
    lines.push(
      `${prefix} fallback (standalone): phrases 2-6 ${percent(figures.standalone.phrases2to6)}, phrases 3-6 ${percent(figures.standalone.phrases3to6)}`,
    )
  return lines
}

/** Intent: the readable line of a setting's distinct intents, prefixed `COST-GUARD [label]`. */
export function intentSummaryLine(label: string, times: SplitTimes, failed: number): string {
  return `COST-GUARD [${label}] ${times.all.count} distinct intents, ${failed} failed: slowest ${seconds(times.all.slowestSeconds)} p95 ${seconds(times.all.p95Seconds)} (successes p95 ${seconds(times.successes.p95Seconds)}, failures p95 ${seconds(times.failures.p95Seconds)})`
}
