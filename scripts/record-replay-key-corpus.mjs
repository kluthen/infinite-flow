import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * Records the `ifk1.` replay-key corpus: encodes every corpus case's intent into its replay key,
 * replays the key through the generation worker runtime exactly as `npm run replay:phrase` does,
 * and writes each key with the timeline it replays to. Run once, on the code v2.0.0 shipped; the
 * fixture it writes is then a read-only baseline that later changes must keep reproducing.
 *
 * usage: node scripts/record-replay-key-corpus.mjs
 */

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))
const CASES_MODULE = fileURLToPath(
  new URL('../tests/unit/generation-worker/replay-key-corpus-cases.ts', import.meta.url),
)
const KEY_MODULE = fileURLToPath(
  new URL('../src/generation-worker/phrase-replay-key.ts', import.meta.url),
)
const REPLAY_MODULE = fileURLToPath(
  new URL('../src/generation-worker/phrase-replay.ts', import.meta.url),
)
const FIXTURE_PATH = fileURLToPath(
  new URL('../tests/fixtures/replay-keys/ifk1-v2.0.json', import.meta.url),
)
const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url))

/**
 * The Vite settings every module is loaded with: only the `@` alias the sources use.
 * @type {import('vite').InlineConfig}
 */
const LOAD_CONFIG = { configFile: false, logLevel: 'silent', resolve: { alias: { '@': SRC_DIR } } }

/**
 * Intent: load a TypeScript module through Vite and return the named functions, crashing when one
 * is missing.
 * @template {string} Name
 * @param {string} path
 * @param {readonly Name[]} names
 * @returns {Promise<Record<Name, Function>>}
 */
async function loadFunctions(path, names) {
  const { module } = await runnerImport(path, LOAD_CONFIG)
  /** @type {Record<string, Function>} */
  const functions = {}
  for (const name of names) {
    const value = Reflect.get(/** @type {object} */ (module), name)
    if (typeof value !== 'function') throw new TypeError(`${path} does not export ${name}().`)
    functions[name] = value
  }
  return /** @type {Record<Name, Function>} */ (functions)
}

/**
 * Intent: replay one key and return the timeline it gives, crashing on anything but a successful
 * phrase: the corpus only records phrases that generate.
 * @param {Function} replayPhraseKey
 * @param {string} label
 * @param {string} key
 * @returns {unknown}
 */
function replayedTimeline(replayPhraseKey, label, key) {
  const report = replayPhraseKey(key)
  const raw = report.output.raw
  if (report.output.kind !== 'generation_success' || raw?.kind !== 'generation_success') {
    throw new Error(`Corpus case ${label} did not replay to a phrase (${report.output.kind}).`)
  }
  return raw.result.timeline
}

/**
 * Intent: build every case, encode and replay it, and write the fixture with the package version
 * the corpus was recorded on.
 */
async function main() {
  const { replayKeyCorpusCases } = await loadFunctions(CASES_MODULE, ['replayKeyCorpusCases'])
  const { encodePhraseReplayKey } = await loadFunctions(KEY_MODULE, ['encodePhraseReplayKey'])
  const { replayPhraseKey } = await loadFunctions(REPLAY_MODULE, ['replayPhraseKey'])
  const cases = replayKeyCorpusCases().map(
    /** @param {{ label: string, intent: unknown, phraseNumber: number }} corpusCase */
    (corpusCase) => {
      const key = encodePhraseReplayKey(corpusCase.intent, corpusCase.phraseNumber)
      const timeline = replayedTimeline(replayPhraseKey, corpusCase.label, key)
      process.stderr.write(`recorded ${corpusCase.label}\n`)
      return { label: corpusCase.label, key, timeline }
    },
  )
  const { version } = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'))
  const fixture = { keyVersion: 'ifk1', recordedOnAppVersion: version, cases }
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`)
  process.stderr.write(`wrote ${cases.length} cases to ${FIXTURE_PATH}\n`)
}

await main()
