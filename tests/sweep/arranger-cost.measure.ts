// @vitest-environment node
/**
 * The arranger's cost runner (v4.0 measurement M4), manual only, never in `npm run quality`: run
 * via `npm run measure:arranger`. Regenerates every phrase of the four replay-key corpora, then
 * times the arranger on each (`ARRANGER_REPEATS` passes, 5 by default, the first cold) and prints
 * one `ARRANGER-COST` line with the machine. The 50 ms rule is reported, never failed on: the
 * figure that decides is the reference phone's (the same harness in its browser, see
 * docs/testing.md). The result depends on the machine: run it idle.
 */

import { readFileSync } from 'node:fs'
import { cpus, platform, release, totalmem } from 'node:os'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  REPLAY_KEY_CORPUS_FILES,
  corpusArrangerPhrase,
  corpusCaseKeys,
} from '../unit/domain/backing/accompaniment-corpus'
import { arrangerCostLine, measureArrangerCost } from './arranger-cost'

/** The repeat count `ARRANGER_REPEATS` sets, 5 by default; anything but a positive integer fails. */
function repeatCount(raw: string | undefined): number {
  if (raw === undefined) return 5
  const repeats = Number(raw)
  if (!Number.isInteger(repeats) || repeats < 1) {
    throw new Error(`ARRANGER_REPEATS=${raw} is not a positive integer.`)
  }
  return repeats
}

describe('the arranger cost (M4)', () => {
  it('times the arranger on every corpus phrase', () => {
    const phrases = REPLAY_KEY_CORPUS_FILES.flatMap((file) => {
      const path = fileURLToPath(new URL(`../fixtures/replay-keys/${file}`, import.meta.url))
      return corpusCaseKeys(JSON.parse(readFileSync(path, 'utf8'))).map(corpusArrangerPhrase)
    })
    const summary = measureArrangerCost(
      phrases,
      () => performance.now(),
      repeatCount(process.env['ARRANGER_REPEATS']),
    )
    const machine = `${cpus()[0]?.model ?? 'unknown CPU'}, ${cpus().length} threads, ${Math.round(totalmem() / 2 ** 30)} GiB, ${platform()} ${release()}, Node ${process.version}`
    console.log(
      `${arrangerCostLine(summary)} machine="${machine}" date=${new Date().toISOString()}`,
    )
    expect(summary.phrases).toBe(phrases.length)
  }, 600_000)
})
