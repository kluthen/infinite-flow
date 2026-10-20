// @vitest-environment node
/**
 * The figure census sweep (v3.1 measurement M1), manual only, never in `npm run quality`: run via
 * `npm run measure:figures`. Every case of the look-ahead deadline sweep (each supported rhythm
 * setting with seeds 7 and 13) under each of the nine collections gives one standalone phrase per
 * setting, at 120 BPM with the case's tension arc and seed. The settings are each musical profile
 * (Neutral and Jazz), every figure as today (the base), each of the seven figures off in turn with
 * the others as today, every figure off, and each of the seven figures Favored and then Strongly
 * favored in turn with the others as today. Each phrase's figures are counted by the figure
 * census; per setting, the sweep prints each figure's share of phrases and mean count per phrase,
 * and per tension arc how many phrases hold Tension's scheduled figure, as `FIGURE-CENSUS` lines,
 * then how many Settled and Lift cases holding one under Neutral hold none with every figure off,
 * then one `FIGURE-CENSUS ladder` line per figure: its share of phrases off, as today (every
 * figure as today), Favored and Strongly favored.
 *
 * It asserts, in every setting, that no attack is unexplained and that no generation failed its
 * result validation (only search outcomes may fail a generation); that a figure turned off has no
 * free instance; that with every figure off no free figure appears while every Edge and Build
 * phrase still holds Tension's scheduled figure; that each figure's share never falls from off to
 * as today to Favored to Strongly favored, and rises strictly from as today to Strongly favored
 * for all seven figures; and that the free appoggiatura's and the diatonic enclosure's shares also
 * rise strictly from as today to Favored.
 *
 * Env: `FIGURES_OUT` writes the full aggregate JSON (with the machine, the date and the run
 * duration) to that path; `FIGURES_LIMIT` keeps only the first N sweep cases, for a quick run.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import type { FigureId } from '@/domain/figures/figure-levels'
import { sweepCases } from '../unit/session/deadline-sweep'
import { FREE_FIGURES, type FreeFigure } from './figure-census'
import {
  ALL_AS_TODAY,
  CensusTally,
  FIGURE_FAVORED_SETTINGS,
  FIGURE_OFF_SETTINGS,
  PROFILE_SETTINGS,
  censusPopulation,
  machineBlock,
  runCensusCase,
  tableLines,
  type CensusCase,
  type CensusSetting,
  type SettingAggregate,
} from './figure-census-sweep'

/** The generation failure codes a search outcome gives; a failed result validation is not one. */
const SEARCH_OUTCOME_CODES: readonly string[] = [
  'no_legal_harmony_plan',
  'no_legal_rhythm_plan',
  'no_legal_pitch_plan',
  'no_eligible_register_window',
  'search_limit_exceeded',
]

/** The census label of each figure's free instances. */
const FREE_LABEL: Readonly<Record<FigureId, FreeFigure>> = {
  passingTone: 'passing_tone',
  accentedPassingTone: 'accented_passing_tone',
  neighborTone: 'neighbor_tone',
  appoggiatura: 'appoggiatura',
  diatonicEnclosure: 'diatonic_enclosure',
  chromaticApproach: 'chromatic_approach',
  chromaticEnclosure: 'chromatic_enclosure',
}

/** The figures whose share must also rise strictly from as today to Favored. */
const FAVORED_RISE_FIGURES: readonly FigureId[] = ['appoggiatura', 'diatonicEnclosure']

/** The tension arcs whose scheduled figure is optional, and those that always schedule one. */
const OPTIONAL_ARCS = ['Settled', 'Lift'] as const
const REQUIRED_ARCS = ['Build', 'Edge'] as const

/** Intent: the case limit `FIGURES_LIMIT` sets, or none; anything but a positive integer fails. */
function caseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0)
    throw new Error(`FIGURES_LIMIT must be a positive integer, got "${raw}".`)
  return limit
}

/** Intent: take the census of every case of a population under one setting. */
function measureSetting(setting: CensusSetting, population: readonly CensusCase[]): CensusTally {
  const tally = new CensusTally(setting.label)
  for (const censusCase of population) {
    const applied = setting.apply(censusCase)
    tally.add(applied, runCensusCase(applied))
  }
  return tally
}

/**
 * Intent: per optional tension arc, how many cases hold Tension's scheduled figure in the `from`
 * tally but not in the `to` tally, pairing cases by label.
 */
function scheduledLost(
  population: readonly CensusCase[],
  from: CensusTally,
  to: CensusTally,
): Readonly<Record<(typeof OPTIONAL_ARCS)[number], number>> {
  const [held, kept] = [from.casesHoldingScheduled(), to.casesHoldingScheduled()]
  const lost = population.filter(
    (censusCase) => held.has(censusCase.label) && !kept.has(censusCase.label),
  )
  return Object.fromEntries(
    OPTIONAL_ARCS.map((arc) => [
      arc,
      lost.filter((censusCase) => censusCase.controls.tension === arc).length,
    ]),
  ) as Record<(typeof OPTIONAL_ARCS)[number], number>
}

/** Intent: the tally of the setting labelled `label`, which the sweep must have measured. */
function tallyNamed(tallies: ReadonlyMap<string, CensusTally>, label: string): CensusTally {
  const found = tallies.get(label)
  if (found === undefined) throw new Error(`No setting labelled "${label}" was measured.`)
  return found
}

/** Intent: the aggregate of the setting labelled `label`, which the sweep must have measured. */
function settingNamed(settings: readonly SettingAggregate[], label: string): SettingAggregate {
  const found = settings.find((aggregate) => aggregate.label === label)
  if (found === undefined) throw new Error(`No setting labelled "${label}" was measured.`)
  return found
}

/** One figure's share of phrases at each rung of its ladder. */
interface FigureLadder {
  readonly figure: FigureId
  readonly off: number
  readonly asToday: number
  readonly favored: number
  readonly stronglyFavored: number
}

/** Intent: the share of a setting's phrases holding the figure's free instances; fails with none. */
function shareIn(settings: readonly SettingAggregate[], label: string, figure: FigureId): number {
  const share = settingNamed(settings, label).figures[FREE_LABEL[figure]].share
  if (share === null) throw new Error(`Setting "${label}" generated no phrase.`)
  return share
}

/** Intent: each figure's ladder: off, as today (every figure as today), Favored, Strongly favored. */
function figureLadders(settings: readonly SettingAggregate[]): readonly FigureLadder[] {
  return (Object.keys(FREE_LABEL) as FigureId[]).map((figure) => ({
    figure,
    off: shareIn(settings, `${figure} off`, figure),
    asToday: shareIn(settings, ALL_AS_TODAY.label, figure),
    favored: shareIn(settings, `${figure} favored`, figure),
    stronglyFavored: shareIn(settings, `${figure} strongly favored`, figure),
  }))
}

/** Intent: a share as a percentage with one decimal. */
function percent(share: number): string {
  return `${(share * 100).toFixed(1)} %`
}

describe('figure census sweep (M1)', () => {
  it('reports, per setting, the share of phrases holding each figure and its count per phrase', () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const limit = caseLimit(process.env.FIGURES_LIMIT)
    const cases = sweepCases().slice(0, limit)
    const population = censusPopulation(cases)
    const measured = [
      ...PROFILE_SETTINGS,
      ALL_AS_TODAY,
      ...FIGURE_OFF_SETTINGS,
      ...FIGURE_FAVORED_SETTINGS,
    ]
    const tallies = new Map(
      measured.map((setting) => [setting.label, measureSetting(setting, population)]),
    )
    const settings = [...tallies.values()].map((tally) => tally.aggregate())
    for (const aggregate of settings) console.log(tableLines(aggregate).join('\n'))
    const lostWithEveryFigureOff = scheduledLost(
      population,
      tallyNamed(tallies, 'Neutral'),
      tallyNamed(tallies, 'every figure off'),
    )
    console.log(
      `FIGURE-CENSUS cases holding a scheduled figure under Neutral but none with every figure off: ${OPTIONAL_ARCS.map((arc) => `${arc} ${lostWithEveryFigureOff[arc]}`).join(', ')}`,
    )

    const ladders = figureLadders(settings)
    for (const ladder of ladders)
      console.log(
        `FIGURE-CENSUS ladder ${ladder.figure}: off ${percent(ladder.off)} / as today ${percent(ladder.asToday)} / favored ${percent(ladder.favored)} / strongly favored ${percent(ladder.stronglyFavored)}`,
      )

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: { sweepCases: cases.length, censusCases: population.length },
      settings,
      scheduledLostWithEveryFigureOff: lostWithEveryFigureOff,
    }
    const outPath = process.env.FIGURES_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    expect(settings.map((aggregate) => aggregate.cases)).toEqual(
      settings.map(() => population.length),
    )
    expect(
      settings.map((aggregate) => [aggregate.label, aggregate.figures.unexplained.totalInstances]),
    ).toEqual(settings.map((aggregate) => [aggregate.label, 0]))
    const validationFailures = settings.map((aggregate) => [
      aggregate.label,
      Object.keys(aggregate.failedGenerations.byCode).filter(
        (code) => !SEARCH_OUTCOME_CODES.includes(code),
      ),
    ])
    expect(validationFailures).toEqual(settings.map((aggregate) => [aggregate.label, []]))
    const offFigures = (Object.keys(FREE_LABEL) as FigureId[]).map((figure) => {
      const label = FREE_LABEL[figure]
      return [label, settingNamed(settings, `${figure} off`).figures[label].totalInstances]
    })
    expect(offFigures).toEqual(offFigures.map(([label]) => [label, 0]))
    const everyOff = settingNamed(settings, 'every figure off')
    expect(FREE_FIGURES.map((label) => [label, everyOff.figures[label].totalInstances])).toEqual(
      FREE_FIGURES.map((label) => [label, 0]),
    )
    for (const arc of REQUIRED_ARCS) {
      const tally = everyOff.scheduledByArc[arc]
      expect(tally.holdingScheduled, `${arc} phrases holding a scheduled figure`).toBe(
        tally.phrases,
      )
    }
    for (const ladder of ladders) {
      const rungs = [ladder.off, ladder.asToday, ladder.favored, ladder.stronglyFavored]
      expect(
        rungs.every((share, index) => index === 0 || rungs[index - 1]! <= share),
        `${ladder.figure} ladder never falls: ${rungs.map(percent).join(' / ')}`,
      ).toBe(true)
    }
    for (const ladder of ladders)
      expect(
        ladder.stronglyFavored,
        `${ladder.figure} rises from as today to strongly favored`,
      ).toBeGreaterThan(ladder.asToday)
    for (const ladder of ladders.filter(({ figure }) => FAVORED_RISE_FIGURES.includes(figure)))
      expect(ladder.favored, `${ladder.figure} rises from as today to favored`).toBeGreaterThan(
        ladder.asToday,
      )
  })
})
