// @vitest-environment node
/**
 * The cost runner (v3.1 measurement M2), manual only, never in `npm run quality`: run via `npm run
 * measure:cost`. The real-cost look-ahead deadline sweep (every supported rhythm setting with seeds
 * 7 and 13, a six-phrase session at 60, 120 and 240 BPM, each attempt charged its measured
 * `generatePhrase` time plus the round trip and engraving), played once per setting (by default
 * each musical profile, Neutral and Jazz, on every case; or the settings `COST_SETTINGS` names: the
 * figure settings of master spec B5.6 and the built-in presets). Per setting it reports the share of phrases
 * generated, the slowest and 95th-percentile generation times, the 240 BPM fallback share and the
 * deadline shortfalls, and prints a summary as `COST-GUARD` lines. A missed deadline is reported,
 * never failed on. The result depends on the machine: run it idle.
 *
 * Env: `COST_OUT` writes the full figures JSON (with the machine, the date and the run duration)
 * to that path; `COST_LIMIT` keeps only the first N sweep cases, for a quick run;
 * `COST_SETTINGS` names the settings to measure, comma-separated (`all` for every one, in
 * `COST_SETTINGS`' run order; unset, the two profiles).
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { SEEDS } from '../unit/domain/generation/carry-in/carry-in-matrix'
import { SWEEP_PHRASE_COUNT, SWEEP_TEMPOS, sweepCases } from '../unit/session/deadline-sweep'
import { measureSetting, selectedSettings, settingSummaryLines } from './cost-guard'
import { machineBlock } from './figure-census-sweep'

/** Intent: the case limit `COST_LIMIT` sets, or none; anything but a positive integer fails. */
function caseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit <= 0)
    throw new Error(`COST_LIMIT must be a positive integer, got "${raw}".`)
  return limit
}

describe('cost runner (M2)', () => {
  it('reports, per setting, the share generated, the generation times and the 240 BPM fallback', async () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const cases = sweepCases().slice(0, caseLimit(process.env.COST_LIMIT))
    const settings = []
    for (const setting of selectedSettings(process.env.COST_SETTINGS)) {
      const figures = await measureSetting(setting, cases, SWEEP_TEMPOS)
      console.log(settingSummaryLines(figures).join('\n'))
      settings.push(figures)
    }

    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: {
        description:
          'every supported rhythm setting with each seed, a six-phrase session per case and tempo, each attempt charged its measured generatePhrase time plus 0.1 s',
        sweepCases: cases.length,
        tempos: SWEEP_TEMPOS,
        seeds: SEEDS,
        phrasesPerSession: SWEEP_PHRASE_COUNT,
      },
      settings,
    }
    const outPath = process.env.COST_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    expect(settings.flatMap((figures) => figures.tempos.map((tempo) => tempo.cases))).toEqual(
      settings.flatMap(() => SWEEP_TEMPOS.map(() => cases.length)),
    )
  })
})
