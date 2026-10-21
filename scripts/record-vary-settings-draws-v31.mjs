import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * Records the v3.1 Vary settings draws corpus: runs every corpus session (each built-in preset's
 * start, under every mutation context, for every session seed) through the session's mutation
 * step phrase after phrase, crashes unless a second run gives the same rows, and writes each
 * landing with the start settings and the mutation seeds the sessions used. Run once, on the code
 * v3.1.0 shipped; the fixture it writes is then a read-only baseline that later changes must keep
 * reproducing, never re-recorded.
 *
 * usage: node scripts/record-vary-settings-draws-v31.mjs
 */

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))
const CASES_MODULE = fileURLToPath(
  new URL('../tests/unit/session/vary-settings-draws-v31-cases.ts', import.meta.url),
)
const FIXTURE_PATH = fileURLToPath(
  new URL('../tests/fixtures/vary-settings/v3.1-mutation-draws.json', import.meta.url),
)
const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url))

/** The app version the corpus must be recorded on. */
const RECORDED_ON_APP_VERSION = '3.1.0'

/** What the fixture says about itself, one line per entry. */
const ABOUT = [
  'Vary settings draws of v3.1.0, recorded once by scripts/record-vary-settings-draws-v31.mjs.',
  'One session per start, context and session seed, with Vary settings on.',
  'A start is the built-in preset chosen at Idle from C Ionian with Neutral, through choosePreset,',
  'its restriction frozen in by withRestrictionAtStart against the built-in presets.',
  "A session's mutation seed is settingsMutationSeed(session seed).",
  'Phrase after phrase from 2 to lastPhrase, landingMutation lands the scheduled mutation under',
  "the context on that phrase, and the landing's settings are the next phrase's settings.",
  'A context steps the session down from steppedDownFromPhrase on (null: never).',
  'draws: how many draws mutateSettings took for the landing, the first included.',
  "selection: the landing's selection, preset:<id> or custom:<base id>.",
  "settingsHash: the first 16 hex digits of the SHA-256 of the landing's settings as canonical",
  'JSON (object keys sorted, undefined keys left out).',
]

/**
 * The Vite settings every module is loaded with: only the `@` alias the sources use.
 * @type {import('vite').InlineConfig}
 */
const LOAD_CONFIG = { configFile: false, logLevel: 'silent', resolve: { alias: { '@': SRC_DIR } } }

/**
 * Intent: load a TypeScript module through Vite and return it.
 * @param {string} path
 * @returns {Promise<Record<string, any>>}
 */
async function load(path) {
  const { module } = await runnerImport(path, LOAD_CONFIG)
  return /** @type {Record<string, any>} */ (module)
}

/**
 * Intent: an entry list as text, one compact entry per line, indented under its key.
 * @param {readonly unknown[]} entries
 * @returns {string}
 */
function entryLines(entries) {
  return entries.map((entry) => `    ${JSON.stringify(entry)}`).join(',\n')
}

/**
 * Intent: the fixture text: the top level readable, each context, start, seed and row compact on
 * one line, valid JSON ending with a newline. Crashes if the text does not parse back to the
 * fixture.
 * @param {{ recordedOn: string, recordedOnAppVersion: string, about: string[], lastPhrase: number,
 *   seeds: unknown[], contexts: unknown[], starts: Record<string, unknown>, columns: string[],
 *   rows: unknown[] }} fixture
 * @returns {string}
 */
function fixtureText(fixture) {
  const startLines = Object.entries(fixture.starts).map(
    ([id, start]) => `    ${JSON.stringify(id)}: ${JSON.stringify(start)}`,
  )
  const text = [
    '{',
    `  "recordedOn": ${JSON.stringify(fixture.recordedOn)},`,
    `  "recordedOnAppVersion": ${JSON.stringify(fixture.recordedOnAppVersion)},`,
    '  "about": [',
    entryLines(fixture.about),
    '  ],',
    `  "lastPhrase": ${JSON.stringify(fixture.lastPhrase)},`,
    '  "seeds": [',
    entryLines(fixture.seeds),
    '  ],',
    '  "contexts": [',
    entryLines(fixture.contexts),
    '  ],',
    '  "starts": {',
    startLines.join(',\n'),
    '  },',
    `  "columns": ${JSON.stringify(fixture.columns)},`,
    '  "rows": [',
    entryLines(fixture.rows),
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
 * Intent: run every session twice, crash when the runs differ, and write the fixture with the
 * version it was recorded on.
 */
async function main() {
  const { version } = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'))
  if (version !== RECORDED_ON_APP_VERSION) {
    throw new Error(
      `The v3.1 draws corpus is recorded on ${RECORDED_ON_APP_VERSION}, not ${version}.`,
    )
  }
  const cases = await load(CASES_MODULE)
  const rows = cases.everySessionDrawRow()
  if (JSON.stringify(cases.everySessionDrawRow()) !== JSON.stringify(rows)) {
    throw new Error('Two runs of the corpus sessions gave different rows: not deterministic.')
  }
  /** @type {Record<string, unknown>} */
  const starts = {}
  for (const presetId of cases.VARY_SETTINGS_DRAWS_V31_PRESETS) {
    starts[presetId] = JSON.parse(cases.canonicalJson(cases.startSettings(presetId)))
  }
  const fixture = {
    recordedOn: `v${version}`,
    recordedOnAppVersion: version,
    about: ABOUT,
    lastPhrase: cases.VARY_SETTINGS_DRAWS_V31_LAST_PHRASE,
    seeds: cases.VARY_SETTINGS_DRAWS_V31_SESSION_SEEDS.map(
      /** @param {number} session */
      (session) => ({ session, mutation: cases.mutationSeedOf(session) }),
    ),
    contexts: cases.VARY_SETTINGS_DRAWS_V31_CONTEXTS,
    starts,
    columns: [...cases.VARY_SETTINGS_DRAWS_V31_COLUMNS],
    rows,
  }
  writeFileSync(FIXTURE_PATH, fixtureText(fixture))
  process.stderr.write(`wrote ${rows.length} landings to ${FIXTURE_PATH}\n`)
}

await main()
