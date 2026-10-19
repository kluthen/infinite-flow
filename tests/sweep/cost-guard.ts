/**
 * The cost runner's plumbing (v3.1 measurement M2, measurement tooling, run by `npm run
 * measure:cost`): the settings the real-cost look-ahead deadline sweep is measured under, an
 * outcome cache that records the time and failure code of what it measured and handed out, and the
 * measured run of one setting at every sweep tempo, density by density. Each attempt is charged its
 * measured `generatePhrase` time plus the round trip and engraving (deadline-sweep-measured.ts); a
 * missed deadline is counted, never failed on.
 */

import { performance } from 'node:perf_hooks'

import { MUSICAL_PROFILES } from '@/domain/controls/generation-controls'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { OutcomeCache, type SweepCase, type TimedSession } from '../unit/session/deadline-sweep'
import {
  FALLBACK_TEMPO,
  TempoTally,
  attemptTime,
  failuresByCode,
  intentSummaryLine,
  splitTimes,
  tempoSummaryLines,
  type AttemptTime,
  type SplitTimes,
  type TempoFigures,
  type TimedOutcome,
} from './cost-guard-figures'
import { measuredSession, runShortfalls } from './deadline-sweep-measured'

/**
 * One setting the sweep is measured under: a label and the change it makes to each case. The
 * settings today are the two musical profiles; a later setting may also set figure levels.
 */
export interface CostSetting {
  readonly label: string
  readonly apply: (sweepCase: SweepCase) => SweepCase
}

/** The settings of the sweep today: each musical profile, Neutral and Jazz, on every case. */
export const PROFILE_SETTINGS: readonly CostSetting[] = MUSICAL_PROFILES.map((profile) => ({
  label: profile,
  apply: (sweepCase: SweepCase): SweepCase => ({
    ...sweepCase,
    label: `${sweepCase.label} as ${profile}`,
    musicalProfile: profile,
  }),
}))

/**
 * An outcome cache that also records, as times and failure codes only, each distinct outcome it
 * measured and every outcome it handed out since the last run was taken. The base cache returns
 * the very object it stored for an intent already measured, so a new object is a new intent, timed
 * once. The records hold no outcome, so dropping the cache releases every phrase it measured.
 */
export class RecordingOutcomeCache extends OutcomeCache {
  private readonly seen = new WeakSet<TimedOutcome>()
  private readonly measured: AttemptTime[] = []
  private handedOut: AttemptTime[] = []

  /** Intent: the base cache's outcome of an intent, recorded as handed out and, once, measured. */
  override of(intent: GenerationIntent): TimedOutcome {
    const timed = super.of(intent)
    const time = attemptTime(timed)
    if (!this.seen.has(timed)) {
      this.seen.add(timed)
      this.measured.push(time)
    }
    this.handedOut.push(time)
    return timed
  }

  /** Intent: the time and failure code of every distinct outcome measured so far, each once. */
  distinctIntents(): readonly AttemptTime[] {
    return [...this.measured]
  }

  /**
   * Intent: the times of the attempts one finished run requested, in request order, and start
   * afresh for the next run. A run first asks for phrase 1 at Idle (one or more seeds), then one
   * outcome per requested attempt, so its attempts are the last outcomes handed out.
   */
  takeRunAttempts(run: TimedSession): readonly AttemptTime[] {
    const handedOut = this.handedOut
    this.handedOut = []
    const idleCalls = handedOut.length - run.generations.length
    if (idleCalls < 1)
      throw new Error(
        `A run handed out ${handedOut.length} outcomes for ${run.generations.length} attempts; phrase 1 at Idle is missing.`,
      )
    return handedOut.slice(idleCalls)
  }
}

/** Intent: some cases grouped by note density, densities in order of first appearance. */
function byNoteDensity(cases: readonly SweepCase[]): readonly (readonly SweepCase[])[] {
  const groups = new Map<string, SweepCase[]>()
  for (const sweepCase of cases) {
    const density = sweepCase.rhythm.noteDensity
    const group = groups.get(density) ?? []
    group.push(sweepCase)
    groups.set(density, group)
  }
  return [...groups.values()]
}

/**
 * Intent: play one density's cases at every tempo, each attempt at its measured cost, with one
 * outcome cache of their own shared by the tempos (as the density sweep specs share one), add each
 * run to its tempo's tally, and return the time and failure code of every distinct intent measured.
 * The cache, and every phrase it holds, is dropped on return.
 */
async function measureDensity(
  cases: readonly SweepCase[],
  tallies: readonly TempoTally[],
): Promise<readonly AttemptTime[]> {
  const outcomes = new RecordingOutcomeCache()
  for (const tally of tallies)
    for (const sweepCase of cases) {
      const run = await measuredSession(sweepCase, tally.tempo, outcomes)
      tally.add(sweepCase, run, outcomes.takeRunAttempts(run), runShortfalls(sweepCase, run))
    }
  return outcomes.distinctIntents()
}

/** The cost runner's figures for one setting. */
export interface SettingFigures {
  readonly label: string
  readonly durationSeconds: number
  /**
   * The distinct intents the setting generated, each timed once, phrase 1 at Idle included: their
   * failures by code and their `generatePhrase` times.
   */
  readonly distinctIntents: {
    readonly failuresByCode: Readonly<Record<string, number>>
    readonly seconds: SplitTimes
  }
  readonly tempos: readonly TempoFigures[]
  /** The fallback tempo's standalone shares and productions, repeated from its tempo figures. */
  readonly fallbackAtFastestTempo: {
    readonly tempo: number
    readonly standalone: TempoFigures['standalone']
    readonly productions: TempoFigures['productions']
  }
}

/**
 * Intent: play every case under one setting at every tempo, each attempt at its measured cost,
 * density by density with one outcome cache per density shared by its tempos, and add up the
 * setting's figures. Density is part of every intent, so the densities' distinct intents add up to
 * the setting's.
 */
export async function measureSetting(
  setting: CostSetting,
  cases: readonly SweepCase[],
  tempos: readonly number[],
): Promise<SettingFigures> {
  const startedAt = performance.now()
  const tallies = tempos.map((tempo) => new TempoTally(tempo))
  const distinct: AttemptTime[] = []
  for (const densityCases of byNoteDensity(cases.map(setting.apply)))
    distinct.push(...(await measureDensity(densityCases, tallies)))
  const figures: readonly TempoFigures[] = tallies.map((tally) => tally.figures())
  const fallback = figures.find((tempoFigures) => tempoFigures.tempo === FALLBACK_TEMPO)
  if (fallback === undefined) throw new Error(`The sweep tempos lack ${FALLBACK_TEMPO} BPM.`)
  return {
    label: setting.label,
    durationSeconds: (performance.now() - startedAt) / 1000,
    distinctIntents: { failuresByCode: failuresByCode(distinct), seconds: splitTimes(distinct) },
    tempos: figures,
    fallbackAtFastestTempo: {
      tempo: fallback.tempo,
      standalone: fallback.standalone,
      productions: fallback.productions,
    },
  }
}

/** Intent: the readable `COST-GUARD` summary of one setting's figures. */
export function settingSummaryLines(figures: SettingFigures): readonly string[] {
  const failed = Object.values(figures.distinctIntents.failuresByCode).reduce((a, b) => a + b, 0)
  return [
    `COST-GUARD [${figures.label}] measured in ${figures.durationSeconds.toFixed(1)} s`,
    intentSummaryLine(figures.label, figures.distinctIntents.seconds, failed),
    ...figures.tempos.flatMap((tempoFigures) => tempoSummaryLines(figures.label, tempoFigures)),
  ]
}
