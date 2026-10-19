/**
 * The figure census sweep's plumbing (measurement tooling, run by `npm run measure:figures`): the
 * census population, the settings a population is measured under, one census per case, and the
 * per-setting aggregate the sweep prints and writes.
 */

import { cpus, loadavg, release } from 'node:os'

import {
  COLLECTIONS,
  MUSICAL_PROFILES,
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { buildIntent } from '../unit/domain/generation/carry-in/carry-in-fixture'
import type { SweepCase } from '../unit/session/deadline-sweep'
import {
  CENSUS_FIGURES,
  censusOfOutcome,
  type CensusFigure,
  type FailedCensus,
  type FigureInstance,
  type PhraseCensus,
} from './figure-census'

/** The tempo every census phrase is generated at; tempo never reaches the pitch search. */
const CENSUS_TEMPO = 120

/** The most unexplained instances an aggregate keeps as examples to replay. */
const MAX_UNEXPLAINED_EXAMPLES = 20

/** One phrase to take the census of: the controls, profile and seed it is generated with. */
export interface CensusCase {
  readonly label: string
  readonly seed: number
  readonly controls: GenerationControls
  readonly musicalProfile: MusicalProfile
}

/**
 * One setting a population is measured under: a label and the change it makes to each case. The
 * settings today are the two musical profiles; a later setting may also set figure levels.
 */
export interface CensusSetting {
  readonly label: string
  readonly apply: (censusCase: CensusCase) => CensusCase
}

/** The settings of the sweep today: each musical profile, Neutral and Jazz. */
export const PROFILE_SETTINGS: readonly CensusSetting[] = MUSICAL_PROFILES.map((profile) => ({
  label: profile,
  apply: (censusCase: CensusCase): CensusCase => ({ ...censusCase, musicalProfile: profile }),
}))

/**
 * Intent: the census population of some sweep cases: each case under each of the nine
 * collections, at the census tempo, with the case's own tension arc, seed and profile.
 */
export function censusPopulation(cases: readonly SweepCase[]): readonly CensusCase[] {
  return cases.flatMap((sweepCase) =>
    COLLECTIONS.map((collection): CensusCase => ({
      label: `#${sweepCase.index} seed ${sweepCase.seed} ${collection}`,
      seed: sweepCase.seed,
      controls: makeGenerationControls({
        ...sweepCase.controls,
        collection,
        tempo: CENSUS_TEMPO,
      }),
      musicalProfile: sweepCase.musicalProfile,
    })),
  )
}

/** Intent: generate the standalone phrase of one case and take its census. */
export function runCensusCase(censusCase: CensusCase): PhraseCensus | FailedCensus {
  const intent = buildIntent({
    controls: censusCase.controls,
    musicalProfile: censusCase.musicalProfile,
    seed: censusCase.seed,
    label: 'figure-census',
  })
  return censusOfOutcome(intent, generatePhrase(intent))
}

/** One label's statistics over a setting's generated phrases. */
export interface FigureStats {
  readonly phrasesContaining: number
  /** Share of the generated phrases holding at least one instance; null with no phrase. */
  readonly share: number | null
  readonly totalInstances: number
  /** Mean instances per generated phrase; null with no phrase. */
  readonly meanPerPhrase: number | null
  /** Mean instances per phrase holding the label; null when no phrase holds it. */
  readonly meanPerPhraseContaining: number | null
}

/** One unexplained instance kept for replay, with the case that produced it. */
export interface UnexplainedExample {
  readonly censusCase: CensusCase
  readonly instance: FigureInstance
}

/** The census aggregate of one setting. */
export interface SettingAggregate {
  readonly label: string
  readonly cases: number
  readonly phrases: number
  readonly failedGenerations: {
    readonly total: number
    readonly byCode: Readonly<Record<string, number>>
  }
  readonly figures: Readonly<Record<CensusFigure, FigureStats>>
  readonly scheduledByKind: Readonly<Record<string, number>>
  readonly unexplainedExamples: readonly UnexplainedExample[]
}

/** Intent: a ratio, or null when its denominator is zero. */
function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

/** Intent: increment one key of a count record. */
function bump(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1
}

/** The running census of one setting, fed one case at a time. */
export class CensusTally {
  private cases = 0
  private readonly censuses: PhraseCensus[] = []
  private readonly failures: Record<string, number> = {}
  private readonly scheduled: Record<string, number> = {}
  private readonly examples: UnexplainedExample[] = []

  /** Intent: start the tally of the setting named `label`. */
  constructor(private readonly label: string) {}

  /** Intent: add one case's census, or its failed generation. */
  add(censusCase: CensusCase, census: PhraseCensus | FailedCensus): void {
    this.cases += 1
    if ('kind' in census) {
      bump(this.failures, census.code)
      return
    }
    this.censuses.push(census)
    for (const instance of census.instances) {
      if (instance.figureKind !== undefined) bump(this.scheduled, instance.figureKind)
      if (instance.figure === 'unexplained' && this.examples.length < MAX_UNEXPLAINED_EXAMPLES)
        this.examples.push({ censusCase, instance })
    }
  }

  /** Intent: the statistics of one label over the generated phrases. */
  private stats(figure: CensusFigure): FigureStats {
    const phrases = this.censuses.length
    const counts = this.censuses.map((census) => census.counts[figure])
    const totalInstances = counts.reduce((sum, count) => sum + count, 0)
    const phrasesContaining = counts.filter((count) => count > 0).length
    return {
      phrasesContaining,
      share: ratio(phrasesContaining, phrases),
      totalInstances,
      meanPerPhrase: ratio(totalInstances, phrases),
      meanPerPhraseContaining: ratio(totalInstances, phrasesContaining),
    }
  }

  /** Intent: the setting's aggregate so far. */
  aggregate(): SettingAggregate {
    const failedTotal = Object.values(this.failures).reduce((sum, count) => sum + count, 0)
    return {
      label: this.label,
      cases: this.cases,
      phrases: this.censuses.length,
      failedGenerations: { total: failedTotal, byCode: { ...this.failures } },
      figures: Object.fromEntries(
        CENSUS_FIGURES.map((figure) => [figure, this.stats(figure)]),
      ) as Record<CensusFigure, FigureStats>,
      scheduledByKind: { ...this.scheduled },
      unexplainedExamples: [...this.examples],
    }
  }
}

/** Intent: a number to a fixed number of decimals, or a dash when it is null. */
function fixed(value: number | null, digits: number): string {
  return value === null ? '-' : value.toFixed(digits)
}

/** Intent: the readable table of one setting's aggregate, every line prefixed `FIGURE-CENSUS`. */
export function tableLines(aggregate: SettingAggregate): readonly string[] {
  const prefix = `FIGURE-CENSUS [${aggregate.label}]`
  const failed = aggregate.failedGenerations
  const header = `${'figure'.padEnd(24)}${'phrases with'.padStart(14)}${'share %'.padStart(10)}${'mean/phrase'.padStart(13)}`
  const rows = CENSUS_FIGURES.map((figure) => {
    const stats = aggregate.figures[figure]
    const share = stats.share === null ? null : stats.share * 100
    return `${figure.padEnd(24)}${String(stats.phrasesContaining).padStart(14)}${fixed(share, 1).padStart(10)}${fixed(stats.meanPerPhrase, 3).padStart(13)}`
  })
  const scheduled = Object.entries(aggregate.scheduledByKind)
    .map(([kind, count]) => `${kind} ${count}`)
    .join(', ')
  return [
    `${aggregate.phrases} phrases of ${aggregate.cases} cases, ${failed.total} failed generations ${JSON.stringify(failed.byCode)}`,
    header,
    ...rows,
    `scheduled figures by kind: ${scheduled === '' ? 'none' : scheduled}`,
  ].map((line) => `${prefix} ${line}`)
}

/** The machine a sweep ran on, for its JSON report. */
export interface MachineBlock {
  readonly cpuModel: string
  readonly cpuCount: number
  readonly loadAverage: readonly number[]
  readonly node: string
  readonly platform: string
  readonly release: string
}

/** Intent: describe this machine and its load right now. */
export function machineBlock(): MachineBlock {
  const processors = cpus()
  const first = processors[0]
  if (first === undefined) throw new Error('os.cpus() reports no processor.')
  return {
    cpuModel: first.model,
    cpuCount: processors.length,
    loadAverage: loadavg(),
    node: process.version,
    platform: process.platform,
    release: release(),
  }
}
