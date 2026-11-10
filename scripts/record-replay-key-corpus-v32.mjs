import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * Records the v3.2 baselines, on the code v3.2 shipped, that later versions must keep reproducing
 * at Off. First the replay-key corpus: encodes every corpus case's intent into its `ifk4.` replay
 * key, the only version v3.2 writes, replays the key twice through the generation worker runtime
 * exactly as `npm run replay:phrase` does, crashes unless both replays give the same phrase, and
 * writes each key with the timeline it replays to. Then the backing and file corpus: for each
 * sampled session of that corpus, the backing's rendered notes and the generated-notes MusicXML
 * and MIDI files (backing track out and in), built from the keys just written. Run once, on the
 * code v3.2.0 shipped, or again on a 3.2.x fix that changes a recorded value (spec D521); the
 * fixtures it writes are otherwise a read-only baseline, never re-recorded.
 *
 * usage: node scripts/record-replay-key-corpus-v32.mjs
 */

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))
const CASES_MODULE = fileURLToPath(
  new URL('../tests/unit/generation-worker/replay-key-corpus-v32-cases.ts', import.meta.url),
)
const SESSIONS_MODULE = fileURLToPath(
  new URL('../tests/unit/export/backing-and-files-v32-sessions.ts', import.meta.url),
)
const KEY_MODULE = fileURLToPath(
  new URL('../src/generation-worker/phrase-replay-key.ts', import.meta.url),
)
const REPLAY_MODULE = fileURLToPath(
  new URL('../src/generation-worker/phrase-replay.ts', import.meta.url),
)
const FIXTURE_PATH = fileURLToPath(
  new URL('../tests/fixtures/replay-keys/v3.2-corpus.json', import.meta.url),
)
const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url))

/** The app versions the corpus may be recorded on: v3.2.0 or a 3.2.x fix of it. */
const RECORDED_ON_APP_VERSION = /^3\.2\.\d+$/u

/** The key versions the corpus holds, each of which must appear at least once. */
const KEY_VERSIONS = ['ifk4']

/**
 * The Vite settings every module is loaded with: only the `@` alias the sources use.
 * @type {import('vite').InlineConfig}
 */
const LOAD_CONFIG = { configFile: false, logLevel: 'silent', resolve: { alias: { '@': SRC_DIR } } }

/**
 * Intent: load a TypeScript module through Vite and return the named exports, crashing when one
 * is missing.
 * @template {string} Name
 * @param {string} path
 * @param {readonly Name[]} names
 * @returns {Promise<Record<Name, any>>}
 */
async function loadExports(path, names) {
  const { module } = await runnerImport(path, LOAD_CONFIG)
  /** @type {Record<string, unknown>} */
  const exports = {}
  for (const name of names) {
    const value = Reflect.get(/** @type {object} */ (module), name)
    if (value === undefined) throw new TypeError(`${path} does not export ${name}.`)
    exports[name] = value
  }
  return /** @type {Record<Name, any>} */ (exports)
}

/**
 * Intent: replay one key and return the timeline it gives, or the outcome kind when the key does
 * not replay to a phrase.
 * @param {Function} replayPhraseKey
 * @param {string} key
 * @returns {{ ok: true, timeline: unknown } | { ok: false, kind: string }}
 */
function replayOnce(replayPhraseKey, key) {
  const report = replayPhraseKey(key)
  const raw = report.output.raw
  if (report.output.kind !== 'generation_success' || raw?.kind !== 'generation_success') {
    return { ok: false, kind: `${report.output.kind}${raw?.code ? ` ${raw.code}` : ''}` }
  }
  return { ok: true, timeline: raw.result.timeline }
}

/**
 * Intent: replay one key twice and return its timeline; record a failure when it does not replay
 * to a phrase, and crash at once when the two replays differ (the generator is not deterministic).
 * @param {Function} replayPhraseKey
 * @param {string} label
 * @param {string} key
 * @param {string[]} failures
 * @returns {unknown}
 */
function deterministicTimeline(replayPhraseKey, label, key, failures) {
  const first = replayOnce(replayPhraseKey, key)
  const second = replayOnce(replayPhraseKey, key)
  if (!first.ok || !second.ok) {
    failures.push(
      `${label}: ${first.ok ? 'replayed' : first.kind} / ${second.ok ? 'replayed' : second.kind}`,
    )
    return null
  }
  if (JSON.stringify(first.timeline) !== JSON.stringify(second.timeline)) {
    throw new Error(`Corpus case ${label} replayed to two different timelines: not deterministic.`)
  }
  return first.timeline
}

/**
 * Intent: the fixture text: the top level readable, each case compact on one line, valid JSON
 * ending with a newline. Crashes if the text does not parse back to the fixture.
 * @param {{ keyVersions: string[], recordedOnAppVersion: string, cases: unknown[] }} fixture
 * @returns {string}
 */
function fixtureText(fixture) {
  const caseLines = fixture.cases.map((corpusCase) => `    ${JSON.stringify(corpusCase)}`)
  const text = [
    '{',
    `  "keyVersions": ${JSON.stringify(fixture.keyVersions)},`,
    `  "recordedOnAppVersion": ${JSON.stringify(fixture.recordedOnAppVersion)},`,
    '  "cases": [',
    caseLines.join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n')
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(fixture)) {
    throw new Error('The fixture text does not parse back to the recorded corpus.')
  }
  return text
}

/**
 * Intent: build every case, encode it and replay it twice, crash on any case that fails to
 * generate, any repeated label or any key version missing, and write the fixture with the version
 * it was recorded on.
 * @param {string} version
 */
async function recordPhraseCorpus(version) {
  const { replayKeyCorpusV32Cases } = await loadExports(CASES_MODULE, ['replayKeyCorpusV32Cases'])
  const { encodePhraseReplayKey } = await loadExports(KEY_MODULE, ['encodePhraseReplayKey'])
  const { replayPhraseKey } = await loadExports(REPLAY_MODULE, ['replayPhraseKey'])
  /** @type {string[]} */
  const failures = []
  /** @type {{ label: string, key: string, timeline: unknown }[]} */
  const cases = replayKeyCorpusV32Cases().map(
    /** @param {{ label: string, intent: unknown, phraseNumber: number }} corpusCase */
    (corpusCase) => {
      const key = encodePhraseReplayKey(corpusCase.intent, corpusCase.phraseNumber)
      const timeline = deterministicTimeline(replayPhraseKey, corpusCase.label, key, failures)
      process.stderr.write(`recorded ${corpusCase.label}\n`)
      return { label: corpusCase.label, key, timeline }
    },
  )
  if (failures.length > 0) {
    throw new Error(`${failures.length} corpus cases failed to generate:\n${failures.join('\n')}`)
  }
  if (new Set(cases.map((corpusCase) => corpusCase.label)).size !== cases.length) {
    throw new Error('Two corpus cases share a label.')
  }
  for (const keyVersion of KEY_VERSIONS) {
    if (!cases.some((corpusCase) => corpusCase.key.startsWith(`${keyVersion}.`))) {
      throw new Error(`The corpus holds no ${keyVersion} key.`)
    }
  }
  const fixture = { keyVersions: KEY_VERSIONS, recordedOnAppVersion: version, cases }
  writeFileSync(FIXTURE_PATH, fixtureText(fixture))
  process.stderr.write(`wrote ${cases.length} cases to ${FIXTURE_PATH}\n`)
}

/** Intent: render and encode every sampled session's files and write them to the corpus folder. */
async function recordSessionFiles() {
  const { CORPUS_SESSIONS, SESSION_FILES_DIR, corpusSessionFiles } = await loadExports(
    SESSIONS_MODULE,
    ['CORPUS_SESSIONS', 'SESSION_FILES_DIR', 'corpusSessionFiles'],
  )
  mkdirSync(SESSION_FILES_DIR, { recursive: true })
  for (const session of CORPUS_SESSIONS) {
    for (const file of corpusSessionFiles(session)) {
      writeFileSync(`${SESSION_FILES_DIR}${file.name}`, file.bytes)
      process.stderr.write(`wrote ${file.name}\n`)
    }
  }
}

/** Intent: check the app version, then record the phrase corpus and the session files from it. */
async function main() {
  const { version } = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'))
  if (!RECORDED_ON_APP_VERSION.test(version)) {
    throw new Error(`The v3.2 corpus is recorded on 3.2.0 or a 3.2.x fix, not ${version}.`)
  }
  await recordPhraseCorpus(version)
  await recordSessionFiles()
}

await main()
