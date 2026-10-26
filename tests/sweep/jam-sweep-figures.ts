/**
 * The Jam sweep's figures (measurement tooling, v3.2 measurements M1 and M5): what the runs of one
 * configuration (mode, tempo, lock, rhythm domain, steering block present or not) add up to. A
 * Jam's phrase 1 by rung and how often it never came or extended the wait; every attempt's time
 * and the share of it spent ordering candidates; the repeats; the standalone attempts against the
 * standalone reserve; the deadline shortfalls; and, with the lock on, the lock census. The figures
 * keep times, counts and lines only, never a phrase.
 */

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { STANDALONE_RESERVE_SECONDS } from '@/session/session-timing'
import { nearestRank, shareOf, type Share } from './cost-guard-figures'
import type { JamLock, LadderRung, RhythmDomainState } from './jam-sweep-ladder'
import type { JamMode, JamRunRecord } from './jam-sweep'
import { LockCensusTally, type LockCensusFigures } from './lock-census-tally'

/**
 * One attempt of a run, as the figures keep it: the phrase it was for, how it was asked for (a
 * look-ahead phrase's carry-in or standalone step, or a rung of a Jam's phrase-1 ladder), its
 * `generatePhrase` time, what it was charged (that time plus the round trip and engraving), its
 * failure code (null when it generated a phrase), and the time the generator's diagnostics report
 * for building the rhythm orderings (the lock's order and its change draw; the steering rank
 * later), when measured.
 */
export interface AttemptRecord {
  readonly phraseNumber: number
  readonly kind: 'carry-in' | LadderRung
  readonly seconds: number
  readonly chargedSeconds: number
  readonly failureCode: string | null
  readonly orderingSeconds?: number
}

/** What a configuration of the sweep holds fixed across its runs. */
export interface ConfigurationKey {
  readonly mode: JamMode
  readonly tempo: number
  readonly lock: JamLock
  readonly domain: RhythmDomainState
  readonly steering: boolean
}

/** A Jam's phrase 1 over the Jams: by the rung that made it, or never came. */
export interface RungShares {
  readonly joinAndBlock: Share
  readonly block: Share
  readonly standalone: Share
  readonly neverCame: Share
}

/** The times of some attempts, and the share of them spent ordering candidates. */
export interface AttemptTimings {
  readonly count: number
  readonly p95Seconds: number | null
  readonly slowestSeconds: number | null
  /** Sum of ordering seconds over sum of attempt seconds; null when no attempt reports any. */
  readonly orderingsShare: number | null
  readonly orderingsNote?: string
}

/** The standalone attempts' times, and how many were charged past the standalone reserve. */
export interface StandaloneFigures {
  readonly count: number
  readonly p95Seconds: number | null
  readonly slowestSeconds: number | null
  readonly slowestChargedSeconds: number | null
  readonly reserveSeconds: number
  /** Standalone attempts whose charged time (request to phrase ready) exceeds the reserve. */
  readonly overReserve: number
}

/** The lock census's figures, with the two read first: the forced-bend rate and the changes. */
export interface JamLockFigures extends LockCensusFigures {
  readonly forcedBendRate: number | null
  readonly changesShare: number | null
}

/** The figures of one configuration's runs. */
export interface ConfigurationFigures {
  readonly label: string
  readonly mode: JamMode
  readonly tempo: number
  readonly lock: JamLock
  readonly domain: RhythmDomainState
  readonly steering: boolean
  readonly runs: number
  /** Wall time spent playing the configuration's runs, in seconds. */
  readonly durationSeconds: number
  /** A Jam's phrase 1 (null in session mode): rungs, and the Jams whose wait it extended. */
  readonly phraseOne: {
    readonly ladders: readonly string[]
    readonly rungs: RungShares
    readonly extendedWait: Share
    readonly extendedWaitByMeasures: Readonly<Record<string, number>>
  } | null
  readonly attempts: AttemptTimings
  /** Phrases decided as a repeat. */
  readonly repeats: number
  /** Standalone attempts of phrases 2 to n, and a Jam phrase 1's rung-3 attempts. */
  readonly standalone: StandaloneFigures
  readonly shortfalls: { readonly count: number; readonly first: readonly string[] }
  readonly lockCensus: JamLockFigures | null
}

/** The most shortfall lines a configuration keeps; the count covers them all. */
const MAX_SHORTFALL_LINES = 5

/** Why a configuration's orderings share is null. */
export const NO_ORDERINGS_NOTE = 'no attempt reports ordering time'

/** Intent: a configuration's readable label, e.g. `jam 120 BPM lock off warm no block`. */
export function configurationLabel(key: ConfigurationKey): string {
  const lock = key.lock.on
    ? `lock on (${key.lock.allowedChanges.length === RHYTHM_CHANGE_KINDS.length ? 'all changes' : key.lock.allowedChanges.join('+') || 'no change'})`
    : 'lock off'
  return `${key.mode} ${key.tempo} BPM ${lock} ${key.domain} ${key.steering ? 'with block' : 'no block'}`
}

/** Intent: a Jam's phrase 1 over the Jams, by the rung that made it (null: it never came). */
export function rungShares(rungs: readonly (LadderRung | null)[]): RungShares {
  /** Intent: the Jams whose phrase 1 came from one rung (null: never came), as a share. */
  const count = (rung: LadderRung | null): Share =>
    shareOf(rungs.filter((each) => each === rung).length, rungs.length)
  return {
    joinAndBlock: count('join-and-block'),
    block: count('block'),
    standalone: count('standalone'),
    neverCame: count(null),
  }
}

/** Intent: the slowest and nearest-rank 95th-percentile of some times, null with none. */
function slowestAndP95(values: readonly number[]): {
  p95Seconds: number | null
  slowestSeconds: number | null
} {
  return {
    p95Seconds: nearestRank(values, 95),
    slowestSeconds: values.length === 0 ? null : Math.max(...values),
  }
}

/**
 * Intent: the `generatePhrase` times of some attempts and the share spent ordering candidates:
 * the sum of the ordering times over the sum of every attempt's time, null (with a note) when no
 * attempt reports an ordering time.
 */
export function attemptTimings(attempts: readonly AttemptRecord[]): AttemptTimings {
  const seconds = attempts.map((attempt) => attempt.seconds)
  const ordering = attempts.flatMap((attempt) =>
    attempt.orderingSeconds === undefined ? [] : [attempt.orderingSeconds],
  )
  const total = seconds.reduce((sum, value) => sum + value, 0)
  const base = { count: attempts.length, ...slowestAndP95(seconds) }
  if (ordering.length === 0)
    return { ...base, orderingsShare: null, orderingsNote: NO_ORDERINGS_NOTE }
  return {
    ...base,
    orderingsShare: total === 0 ? null : ordering.reduce((a, b) => a + b, 0) / total,
  }
}

/**
 * Intent: the standalone attempts among some (a look-ahead phrase's standalone step, a Jam phrase
 * 1's rung 3): their times, and how many were charged more than the standalone reserve.
 */
export function standaloneFigures(attempts: readonly AttemptRecord[]): StandaloneFigures {
  const standalone = attempts.filter((attempt) => attempt.kind === 'standalone')
  const charged = standalone.map((attempt) => attempt.chargedSeconds)
  return {
    count: standalone.length,
    ...slowestAndP95(standalone.map((attempt) => attempt.seconds)),
    slowestChargedSeconds: charged.length === 0 ? null : Math.max(...charged),
    reserveSeconds: STANDALONE_RESERVE_SECONDS,
    overReserve: charged.filter((value) => value > STANDALONE_RESERVE_SECONDS).length,
  }
}

/** The running figures of one configuration, fed one run record at a time. */
export class ConfigurationTally {
  private runs = 0
  private durationSeconds = 0
  private readonly ladders = new Set<string>()
  private readonly rungs: (LadderRung | null)[] = []
  private readonly waits: number[] = []
  private readonly attempts: AttemptRecord[] = []
  private repeats = 0
  private shortfallCount = 0
  private readonly shortfalls: string[] = []
  private readonly census = new LockCensusTally()

  /** Intent: start the tally of one configuration. */
  constructor(readonly key: ConfigurationKey) {}

  /** Intent: add one run of this configuration, and the wall time it took to play. */
  add(record: JamRunRecord, seconds: number): void {
    if (record.mode !== this.key.mode || record.tempo !== this.key.tempo)
      throw new Error(`A ${record.mode} ${record.tempo} BPM run was added to ${this.label()}.`)
    if (this.key.lock.on !== (record.lockCensus !== null))
      throw new Error(`A run's lock census does not match ${this.label()}.`)
    this.runs += 1
    this.durationSeconds += seconds
    if (record.phraseOne !== null) {
      this.ladders.add(record.phraseOne.ladder)
      this.rungs.push(record.phraseOne.rung)
      if (record.phraseOne.extendedWaitMeasures !== null)
        this.waits.push(record.phraseOne.extendedWaitMeasures)
    }
    this.attempts.push(...record.attempts)
    this.repeats += record.repeats
    this.shortfallCount += record.shortfalls.length
    this.shortfalls.push(
      ...record.shortfalls.slice(0, MAX_SHORTFALL_LINES - this.shortfalls.length),
    )
    if (record.lockCensus !== null) this.census.addSession(record.lockCensus)
  }

  /** Intent: the configuration's label. */
  label(): string {
    return configurationLabel(this.key)
  }

  /** Intent: a Jam's phrase-1 figures so far, null in session mode. */
  private phraseOne(): ConfigurationFigures['phraseOne'] {
    if (this.key.mode !== 'jam') return null
    const byMeasures: Record<string, number> = {}
    for (const wait of this.waits) byMeasures[String(wait)] = (byMeasures[String(wait)] ?? 0) + 1
    return {
      ladders: [...this.ladders],
      rungs: rungShares(this.rungs),
      extendedWait: shareOf(this.waits.filter((wait) => wait > 0).length, this.rungs.length),
      extendedWaitByMeasures: byMeasures,
    }
  }

  /** Intent: the lock census's figures so far, null with the lock off. */
  private lockCensus(): JamLockFigures | null {
    if (!this.key.lock.on) return null
    const figures = this.census.figures()
    return { ...figures, forcedBendRate: figures.shares.bent, changesShare: figures.shares.changed }
  }

  /** Intent: the configuration's figures so far. */
  figures(): ConfigurationFigures {
    return {
      label: this.label(),
      ...this.key,
      runs: this.runs,
      durationSeconds: this.durationSeconds,
      phraseOne: this.phraseOne(),
      attempts: attemptTimings(this.attempts),
      repeats: this.repeats,
      standalone: standaloneFigures(this.attempts),
      shortfalls: { count: this.shortfallCount, first: [...this.shortfalls] },
      lockCensus: this.lockCensus(),
    }
  }
}

/** Intent: a share as a percentage with one decimal and its counts, or a dash with no total. */
function percent(share: Share): string {
  const value = share.share === null ? '-' : `${(share.share * 100).toFixed(1)} %`
  return `${value} (${share.count}/${share.total})`
}

/** Intent: a time in seconds with three decimals, or a dash when there is none. */
function secondsText(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(3)} s`
}

/** Intent: a ratio as a percentage with one decimal, or a dash when it is null. */
function ratioText(value: number | null): string {
  return value === null ? '-' : `${(value * 100).toFixed(1)} %`
}

/** Intent: the readable summary of one configuration, every line prefixed `JAM-SWEEP [label]`. */
export function configurationSummaryLines(figures: ConfigurationFigures): readonly string[] {
  const prefix = `JAM-SWEEP [${figures.label}]`
  const { attempts, standalone } = figures
  const lines = [
    `${prefix} ${figures.runs} runs in ${figures.durationSeconds.toFixed(1)} s, repeats ${figures.repeats}, shortfalls ${figures.shortfalls.count}`,
    `${prefix} attempts ${attempts.count}: p95 ${secondsText(attempts.p95Seconds)}, slowest ${secondsText(attempts.slowestSeconds)}, orderings ${ratioText(attempts.orderingsShare)}`,
    `${prefix} standalone ${standalone.count}: p95 ${secondsText(standalone.p95Seconds)}, slowest ${secondsText(standalone.slowestSeconds)} (charged ${secondsText(standalone.slowestChargedSeconds)}), over the ${standalone.reserveSeconds} s reserve ${standalone.overReserve}`,
  ]
  const one = figures.phraseOne
  if (one !== null)
    lines.push(
      `${prefix} phrase 1: join+block ${percent(one.rungs.joinAndBlock)}, block ${percent(one.rungs.block)}, standalone ${percent(one.rungs.standalone)}, never came ${percent(one.rungs.neverCame)}, extended wait ${percent(one.extendedWait)}`,
    )
  const lock = figures.lockCensus
  if (lock !== null)
    lines.push(
      `${prefix} lock: ${lock.classifiedPhrases} phrases classified, forced bends ${ratioText(lock.forcedBendRate)}, changes ${ratioText(lock.changesShare)}, kept ${ratioText(lock.shares.kept)}, drew ${ratioText(lock.drawn.share)} of ${lock.drawn.eligible} eligible (normal ${ratioText(lock.drawn.normal.share)}, tenser ${ratioText(lock.drawn.tenser.share)}), bends one allowed change away ${ratioText(lock.bentOneAllowedChangeAway)}, mismatches ${lock.mismatches.count}`,
    )
  for (const shortfall of figures.shortfalls.first) lines.push(`${prefix} shortfall: ${shortfall}`)
  return lines
}
