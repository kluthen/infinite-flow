/**
 * The cost runner's plumbing (v3.1 measurement M2, measurement tooling, run by `npm run
 * measure:cost`): the settings the real-cost look-ahead deadline sweep is measured under, an
 * outcome cache that records the time and failure code of what it measured and handed out, and the
 * measured run of one setting at every sweep tempo, density by density (a large density in parts).
 * Each attempt is charged its measured `generatePhrase` time plus the round trip and engraving
 * (deadline-sweep-measured.ts); a missed deadline is counted, never failed on.
 */

import { performance } from 'node:perf_hooks'

import { MUSICAL_PROFILES, type Collection } from '@/domain/controls/generation-controls'
import {
  FIGURE_IDS,
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { BUILT_IN_PRESETS } from '@/domain/presets/built-in-presets'
import { isAnyKeyAndMode } from '@/domain/presets/key-and-mode-restriction'
import type { Preset } from '@/domain/presets/preset-selection'
import { OutcomeCache, type SweepCase, type TimedSession } from '../unit/session/deadline-sweep'
import { withoutTempo } from '../unit/session/session-harness'
import {
  FALLBACK_TEMPO,
  TempoTally,
  attemptTime,
  failuresByCode,
  failuresByTension,
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
 * One setting the sweep is measured under: a label and the change it makes to each case: a musical
 * profile, figure levels in place of the profile's, or a built-in preset.
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

/** Intent: a profile's B5.3 levels with some figures at another level. */
function levelsWith(
  base: FigureLevels,
  level: FigureLevel,
  figures: readonly FigureId[],
): FigureLevels {
  return Object.fromEntries(
    FIGURE_IDS.map((figure) => [figure, figures.includes(figure) ? level : base[figure]]),
  ) as FigureLevels
}

/** The five diatonic figures of master spec B5.1 (1 to 5). */
const DIATONIC_FIGURES: readonly FigureId[] = [
  'passingTone',
  'accentedPassingTone',
  'neighborTone',
  'appoggiatura',
  'diatonicEnclosure',
]

/**
 * Intent: the setting giving every case the levels `figureLevels`, keeping its controls and its
 * profile's selection (Custom based on the preset of the profile's name).
 */
function levelsSetting(label: string, figureLevels: FigureLevels): CostSetting {
  return {
    label,
    apply: (sweepCase: SweepCase): SweepCase => ({
      ...sweepCase,
      label: `${sweepCase.label} at ${label}`,
      figureLevels,
    }),
  }
}

/**
 * The figure settings of master spec B5.6 beyond the baseline (the profiles' own levels): every
 * figure Strongly favored; every diatonic figure (1 to 5) Off, the chromatic figures as today
 * (Jazz's levels with figures 1 to 5 Off); and, stricter, every figure Off (Neutral's levels with
 * figures 1 to 5 Off), the setting of the v3.1 chunk 5 census.
 */
export const FIGURE_LEVEL_SETTINGS: readonly CostSetting[] = [
  levelsSetting(
    'every figure strongly favored',
    levelsWith(NEUTRAL_FIGURE_LEVELS, 'stronglyFavored', FIGURE_IDS),
  ),
  levelsSetting(
    'every diatonic figure off',
    levelsWith(JAZZ_FIGURE_LEVELS, 'off', DIATONIC_FIGURES),
  ),
  levelsSetting('every figure off', levelsWith(NEUTRAL_FIGURE_LEVELS, 'off', DIATONIC_FIGURES)),
]

/**
 * Intent: the collection a case runs in under a preset: the case's own when the preset allows
 * every mode, otherwise the allowed modes taken in turn over the case index, so each allowed mode
 * gets an even share of the sweep.
 */
function presetCollection(preset: Preset, sweepCase: SweepCase): Collection {
  const modes = preset.restriction.modes
  return modes === 'any' ? sweepCase.controls.collection : modes[sweepCase.index % modes.length]!
}

/**
 * Intent: a built-in preset chosen on every case, as the player gets it: its ten controls (so its
 * rhythm setting) and seven levels, the selection that preset, the case's mode moved into the
 * preset's modes (`presetCollection`), and its restriction in force for the session (none when it
 * allows every key and mode). The case keeps its seeds, key, instrument and session flags.
 */
function builtInSetting(preset: Preset): CostSetting {
  return {
    label: `built-in ${preset.name}`,
    apply: (sweepCase: SweepCase): SweepCase => {
      const { tension, noteDensity, rhythmicVariety, syncopation, silenceDensity } = preset.controls
      return {
        ...sweepCase,
        label: `${sweepCase.label} as ${preset.name}`,
        rhythm: { noteDensity, rhythmicVariety, syncopation, silenceDensity, tensionArc: tension },
        controls: {
          ...sweepCase.controls,
          ...preset.controls,
          collection: presetCollection(preset, sweepCase),
        },
        figureLevels: preset.levels,
        selection: { kind: 'preset', presetId: preset.id },
        ...(isAnyKeyAndMode(preset.restriction) ? {} : { restriction: preset.restriction }),
      }
    },
  }
}

/**
 * Intent: a built-in preset's levels and restriction on every case, keeping the case's own rhythm
 * setting and other controls: the preset's levels across the whole sweep, the case's mode moved
 * into the preset's modes.
 */
function builtInLevelsSetting(preset: Preset): CostSetting {
  const label = `${preset.name} levels`
  return {
    label,
    apply: (sweepCase: SweepCase): SweepCase => ({
      ...sweepCase,
      label: `${sweepCase.label} at ${label}`,
      controls: { ...sweepCase.controls, collection: presetCollection(preset, sweepCase) },
      figureLevels: preset.levels,
      ...(isAnyKeyAndMode(preset.restriction) ? {} : { restriction: preset.restriction }),
    }),
  }
}

/** Each built-in preset as the player gets it (`builtInSetting`), in the built-ins' order. */
export const BUILT_IN_SETTINGS: readonly CostSetting[] = BUILT_IN_PRESETS.map(builtInSetting)

/**
 * The levels of each built-in other than Neutral and Jazz across the whole sweep
 * (`builtInLevelsSetting`); Neutral's and Jazz's are the baseline.
 */
export const BUILT_IN_LEVELS_SETTINGS: readonly CostSetting[] = BUILT_IN_PRESETS.filter(
  (preset) => preset.id !== 'neutral' && preset.id !== 'jazz',
).map(builtInLevelsSetting)

/**
 * Every setting the cost runner knows, in run order: Speed drill first (master spec B6.5: the most
 * expensive setting found), the baseline, the other figure settings, the other built-ins, then the
 * built-ins' levels across the sweep.
 */
export const COST_SETTINGS: readonly CostSetting[] = [
  ...BUILT_IN_SETTINGS.filter((setting) => setting.label === 'built-in Speed drill'),
  ...PROFILE_SETTINGS,
  ...FIGURE_LEVEL_SETTINGS,
  ...BUILT_IN_SETTINGS.filter((setting) => setting.label !== 'built-in Speed drill'),
  ...BUILT_IN_LEVELS_SETTINGS,
]

/**
 * Intent: the settings a run measures, from a comma-separated list of labels (any case); none
 * given, the two profiles, as the runner measured first. An unknown label fails, naming the known
 * ones.
 */
export function selectedSettings(raw: string | undefined): readonly CostSetting[] {
  if (raw === undefined || raw.trim() === '') return PROFILE_SETTINGS
  if (raw.trim().toLowerCase() === 'all') return COST_SETTINGS
  return raw.split(',').map((name) => {
    const wanted = name.trim().toLowerCase()
    const found = COST_SETTINGS.find((setting) => setting.label.toLowerCase() === wanted)
    if (found === undefined)
      throw new Error(
        `COST_SETTINGS names an unknown setting "${name.trim()}"; known: all, ${COST_SETTINGS.map((setting) => setting.label).join(', ')}.`,
      )
    return found
  })
}

/**
 * An outcome cache that also records, as times and failure codes only, each distinct outcome it
 * measured and every outcome it handed out since the last run was taken. The base cache returns
 * the very object it stored for an intent already measured, so a new object is a new intent, timed
 * once. The records hold no outcome, so dropping the cache releases every phrase it measured.
 * Caches of one setting share `measuredKeys`, the intents already measured by any of them, so an
 * intent a later cache measures again is not counted as distinct twice.
 */
export class RecordingOutcomeCache extends OutcomeCache {
  private readonly seen = new WeakSet<TimedOutcome>()
  private readonly measured: AttemptTime[] = []
  private handedOut: AttemptTime[] = []

  /** Intent: a recording cache, sharing the measured intents' keys of its setting's caches. */
  constructor(private readonly measuredKeys: Set<string> = new Set()) {
    super()
  }

  /** Intent: the base cache's outcome of an intent, recorded as handed out and, once, measured. */
  override of(intent: GenerationIntent): TimedOutcome {
    const timed = super.of(intent)
    const time = attemptTime(timed, intent)
    if (!this.seen.has(timed)) {
      this.seen.add(timed)
      const key = JSON.stringify(withoutTempo(intent))
      if (!this.measuredKeys.has(key)) {
        this.measuredKeys.add(key)
        this.measured.push(time)
      }
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

/**
 * The most cases one outcome cache serves: the sweep's largest note-density group (216 Eighth
 * cases), so the sweep's own settings keep one cache per density. A built-in preset puts every case
 * at its own density; one cache for all 568 would hold every phrase of them at once, past Node's
 * default heap.
 */
const MAX_CASES_PER_CACHE = 216

/**
 * Intent: some cases grouped by note density, densities in order of first appearance, each group
 * split, in order, into the fewest even parts of at most `MAX_CASES_PER_CACHE` cases.
 */
export function byNoteDensity(cases: readonly SweepCase[]): readonly (readonly SweepCase[])[] {
  const groups = new Map<string, SweepCase[]>()
  for (const sweepCase of cases) {
    const density = sweepCase.rhythm.noteDensity
    const group = groups.get(density) ?? []
    group.push(sweepCase)
    groups.set(density, group)
  }
  return [...groups.values()].flatMap((group) => {
    const parts = Math.ceil(group.length / MAX_CASES_PER_CACHE)
    const size = Math.ceil(group.length / parts)
    return Array.from({ length: parts }, (_, part) => group.slice(part * size, (part + 1) * size))
  })
}

/**
 * Intent: play one density's cases (or a part of them) at every tempo, each attempt at its
 * measured cost, with one outcome cache of their own shared by the tempos (as the density sweep
 * specs share one), add each run to its tempo's tally, and return the time and failure code of
 * every distinct intent measured, not counting one already in `measuredKeys`. The cache, and every
 * phrase it holds, is dropped on return.
 */
async function measureDensity(
  cases: readonly SweepCase[],
  tallies: readonly TempoTally[],
  measuredKeys: Set<string>,
): Promise<readonly AttemptTime[]> {
  const outcomes = new RecordingOutcomeCache(measuredKeys)
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
    /** Their failures per Tension value the intent asked for, then per code. */
    readonly failuresByTension: Readonly<Record<string, Readonly<Record<string, number>>>>
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
  const measuredKeys = new Set<string>()
  for (const densityCases of byNoteDensity(cases.map(setting.apply)))
    distinct.push(...(await measureDensity(densityCases, tallies, measuredKeys)))
  const figures: readonly TempoFigures[] = tallies.map((tally) => tally.figures())
  const fallback = figures.find((tempoFigures) => tempoFigures.tempo === FALLBACK_TEMPO)
  if (fallback === undefined) throw new Error(`The sweep tempos lack ${FALLBACK_TEMPO} BPM.`)
  return {
    label: setting.label,
    durationSeconds: (performance.now() - startedAt) / 1000,
    distinctIntents: {
      failuresByCode: failuresByCode(distinct),
      failuresByTension: failuresByTension(distinct),
      seconds: splitTimes(distinct),
    },
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
    `COST-GUARD [${figures.label}] distinct intents failed by Tension: ${JSON.stringify(figures.distinctIntents.failuresByTension)}`,
    ...figures.tempos.flatMap((tempoFigures) => tempoSummaryLines(figures.label, tempoFigures)),
  ]
}
