// @vitest-environment node
/**
 * The figure census sweep (v3.1 measurement M1), manual only, never in `npm run quality`: run via
 * `npm run measure:figures`. Every case of the look-ahead deadline sweep (each supported rhythm
 * setting with seeds 7 and 13) under each of the nine collections gives one standalone phrase per
 * setting (today each musical profile, Neutral and Jazz), at 120 BPM with the case's tension arc
 * and seed. Each phrase's figures are counted by the figure census; per setting, the sweep prints
 * each figure's share of phrases and mean count per phrase as `FIGURE-CENSUS` lines.
 *
 * Env: `FIGURES_OUT` writes the full aggregate JSON (with the machine, the date and the run
 * duration) to that path; `FIGURES_LIMIT` keeps only the first N sweep cases, for a quick run.
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { sweepCases } from '../unit/session/deadline-sweep'
import {
  CensusTally,
  PROFILE_SETTINGS,
  censusPopulation,
  machineBlock,
  runCensusCase,
  tableLines,
  type CensusCase,
  type CensusSetting,
  type SettingAggregate,
} from './figure-census-sweep'

/** Intent: the case limit `FIGURES_LIMIT` sets, or none; anything but a positive integer fails. */
function caseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0)
    throw new Error(`FIGURES_LIMIT must be a positive integer, got "${raw}".`)
  return limit
}

/** Intent: take the census of every case of a population under one setting. */
function measureSetting(
  setting: CensusSetting,
  population: readonly CensusCase[],
): SettingAggregate {
  const tally = new CensusTally(setting.label)
  for (const censusCase of population) {
    const applied = setting.apply(censusCase)
    tally.add(applied, runCensusCase(applied))
  }
  return tally.aggregate()
}

describe('figure census sweep (M1)', () => {
  it('reports, per setting, the share of phrases holding each figure and its count per phrase', () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const limit = caseLimit(process.env.FIGURES_LIMIT)
    const cases = sweepCases().slice(0, limit)
    const population = censusPopulation(cases)
    const settings = PROFILE_SETTINGS.map((setting) => measureSetting(setting, population))
    for (const aggregate of settings) console.log(tableLines(aggregate).join('\n'))

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: { sweepCases: cases.length, censusCases: population.length },
      settings,
    }
    const outPath = process.env.FIGURES_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    expect(settings.map((aggregate) => aggregate.cases)).toEqual(
      settings.map(() => population.length),
    )
  })
})
