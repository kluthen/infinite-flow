// @vitest-environment node
/**
 * The Jam sweep runner (v3.2 measurements M1 and M5), manual only, never in `npm run quality`: run
 * via `npm run measure:jam`. Every supported rhythm setting with seeds 7 and 13, played as a Jam
 * (phrase 1 through the baseline ladder before its three-measure deadline, warm and cold rhythm
 * domains, then phrases 2 to 8) and as a session (v3.1's six phrases from phrase 1 at Idle), with
 * the rhythm lock off or on, each attempt charged its measured `generatePhrase` time plus the
 * round trip and engraving. Per configuration it reports a Jam's phrase 1 by rung, the attempt
 * times and the orderings' share, the repeats, the standalone attempts against the standalone
 * reserve, the deadline shortfalls and, with the lock on, the lock census, and prints a summary as
 * `JAM-SWEEP` lines. A figure is reported, never failed on: only the runs' completion, and the lock
 * census's record and bars agreeing, are checked.
 * The result depends on the machine: run it idle.
 *
 * Env: `JAM_OUT` writes the full figures JSON (with the machine, the date and the run duration)
 * to that path; the other choices are read by jam-sweep-population.ts (`JAM_LIMIT`, `JAM_MODE`,
 * `JAM_TEMPOS`, `JAM_DOMAIN`, `JAM_LOCK`, `JAM_DOODLES`).
 */

import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'

import { SEEDS } from '../unit/domain/generation/carry-in/carry-in-matrix'
import { sweepCases } from '../unit/session/deadline-sweep'
import { machineBlock } from './figure-census-sweep'
import { configurationSummaryLines } from './jam-sweep-figures'
import {
  configurations,
  doodlesOf,
  evenlySpaced,
  jamSweepChoices,
  playConfigurations,
} from './jam-sweep-population'
import { JAM_PHRASE_COUNT, SESSION_PHRASE_COUNT } from './jam-sweep'

describe('Jam sweep runner (M1, M5)', () => {
  it('reports, per configuration, phrase 1 by rung, the attempt times, repeats and the lock census', async () => {
    const startedAt = performance.now()
    const date = new Date().toISOString()
    const machine = machineBlock()
    const choices = jamSweepChoices()
    const cases = evenlySpaced(sweepCases(), choices.limit)
    const doodles = doodlesOf(choices.doodles)
    const keys = configurations(choices)
    const tallies = await playConfigurations(keys, cases, doodles, (density, count) =>
      console.log(`JAM-SWEEP density ${density}: ${count} cases played`),
    )
    const figures = tallies.map((tally) => tally.figures())
    for (const configuration of figures)
      console.log(configurationSummaryLines(configuration).join('\n'))

    const doodleNames = doodles.flatMap((doodle) => (doodle === undefined ? [] : [doodle.name]))
    const report = {
      date,
      durationSeconds: (performance.now() - startedAt) / 1000,
      machine,
      population: {
        sweepCases: cases.length,
        tempos: choices.tempos,
        seeds: SEEDS,
        phraseCount: { jam: JAM_PHRASE_COUNT, session: SESSION_PHRASE_COUNT },
        doodles: doodleNames,
        note: 'every supported rhythm setting with each seed (or JAM_LIMIT evenly spaced cases); a Jam plays phrase 1 through the baseline ladder (rung 3 only, no steering block: v3.1 has none) then phrases 2 to 8, a session plays v3.1 six phrases from phrase 1 at Idle; each attempt charged its measured generatePhrase time plus 0.1 s; with the lock on, the generator plays the lock and each phrase is classed from its provenance lock record, its bars cross-checking it; doodles are recorded, not yet read',
      },
      configurations: figures,
    }
    const outPath = process.env.JAM_OUT
    if (outPath !== undefined) writeFileSync(outPath, JSON.stringify(report, null, 2))
    /** Intent: how many runs a case makes in a mode: a Jam once per doodle, a session once. */
    const doodleRuns = (mode: string): number => (mode === 'jam' ? doodles.length : 1)
    expect(figures.map((configuration) => configuration.runs)).toEqual(
      keys.map((key) => cases.length * doodleRuns(key.mode)),
    )
    expect(
      figures.flatMap(({ label, lockCensus }) =>
        lockCensus === null || lockCensus.mismatches.count === 0
          ? []
          : [`${label}: ${lockCensus.mismatches.count} lock census mismatches`],
      ),
    ).toEqual([])
  })
})
