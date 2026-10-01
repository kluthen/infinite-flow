// @vitest-environment node
/**
 * The `replay:phrase` command line: run as a real Node process from the repository root, it
 * prints the full JSON report for a key given as its argument, on stdin or inside a whole copied
 * console line, and rejects a malformed or unsupported key with exit code 1, a stderr message and
 * nothing on stdout.
 */

import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { encodePhraseReplayKey } from '@/generation-worker/phrase-replay-key'

/** The repository root the script runs from. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Generous per-test timeout: each run starts Node and loads the TypeScript through Vite. */
const TIMEOUT_MS = 60_000

/** The generation-intent fields the printed input must hold. */
const INTENT_FIELDS = [
  'requestId',
  'seed',
  'measureCount',
  'meter',
  'controls',
  'writtenTonalCenter',
  'musicalProfile',
  'instrumentProfile',
  'registerIntent',
  'carryIn',
]

/** A real key: a transposing profile, seed 42, workspace phrase. */
const KEY = encodePhraseReplayKey(
  createGenerationIntent({
    requestId: makeRequestId('script-42'),
    seed: makeSeed(42),
    controls: makeGenerationControls({
      tempo: 90,
      tonalCenter: 'F',
      collection: 'Major',
      harmonicMotion: 'Gentle diatonic',
      tension: 'Settled',
      noteDensity: 'Quarter',
      rhythmicVariety: 'Slightly varied',
      syncopation: 'Straight',
      silenceDensity: 'Sparse',
      contour: 'Wandering',
      register: 'Middle',
      leapiness: 'Leaping',
      arpeggioChaos: 'Predictable',
      instrumentProfileId: 'bb-tenor',
    }),
    musicalProfile: { musicalProfile: 'Neutral', isCustom: true },
  }),
  1,
)

/** Intent: run the script with the given arguments and stdin, capturing its output. */
function runScript(args: readonly string[], input?: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ['scripts/replay-phrase.mjs', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    input: input ?? '',
    timeout: TIMEOUT_MS,
  })
}

/** Intent: assert a run exited 0 and printed a complete report for KEY; return its stdout. */
function expectCompleteReport(run: SpawnSyncReturns<string>): string {
  expect(run.stderr).toBe('')
  expect(run.status).toBe(0)
  const report = JSON.parse(run.stdout) as Record<string, Record<string, unknown>>
  expect(Object.keys(report)).toEqual(['key', 'keyVersion', 'phraseNumber', 'input', 'output'])
  expect(report.key).toBe(KEY)
  for (const field of INTENT_FIELDS) expect(report.input).toHaveProperty(field)
  expect(report.input!.workerRequest).toMatchObject({ type: 'generate', id: 1 })
  expect(report.output!.kind).toBe('generation_success')
  const bars = report.output!.bars as readonly { readonly bar: number }[]
  expect(bars.map((bar) => bar.bar)).toEqual([1, 2, 3, 4])
  for (const section of ['request', 'harmony', 'ending', 'carryOut', 'provenance', 'raw'])
    expect(report.output).toHaveProperty(section)
  return run.stdout
}

describe('npm run replay:phrase', () => {
  // @test-link [[service_headless_phrase_replay]]
  it(
    'prints the same complete report for a key as argument, on stdin or in a console line',
    () => {
      const fromArgument = expectCompleteReport(runScript([KEY]))
      expect(expectCompleteReport(runScript([], `${KEY}\n`))).toBe(fromArgument)
      const line = `[Infinite Flow] phrase replay key · workspace phrase · seed1-0000002a · ${KEY}`
      expect(expectCompleteReport(runScript([], `${line}\n`))).toBe(fromArgument)
    },
    TIMEOUT_MS,
  )

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it(
    'rejects a malformed key with exit 1, a stderr message and nothing on stdout',
    () => {
      const run = runScript(['ifk1.zzz'])
      expect(run.status).toBe(1)
      expect(run.stdout).toBe('')
      expect(run.stderr).toMatch(/^replay-phrase: PhraseReplayKeyError: /u)
      expect(run.stderr).not.toMatch(/\n\s+at /u)
    },
    TIMEOUT_MS,
  )

  // @test-link [[service_headless_phrase_replay]]
  // @test-link [[module_phrase_replay_key]]
  it(
    'rejects an unsupported key version with exit 1',
    () => {
      const run = runScript(['ifk2.xxx'])
      expect(run.status).toBe(1)
      expect(run.stdout).toBe('')
      expect(run.stderr).toMatch(/unsupported key version "ifk2"/u)
    },
    TIMEOUT_MS,
  )

  // @test-link [[service_headless_phrase_replay]]
  it(
    'rejects empty input with exit 1 and nothing on stdout',
    () => {
      const run = runScript([], '')
      expect(run.status).toBe(1)
      expect(run.stdout).toBe('')
      expect(run.stderr).toMatch(/^replay-phrase: PhraseReplayKeyError: No phrase replay key/u)
    },
    TIMEOUT_MS,
  )
})
