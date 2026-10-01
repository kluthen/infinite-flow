import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * The replay module's surface this script calls, narrowed from the module Vite loads.
 * @typedef {object} PhraseReplayModule
 * @property {(text: string) => string} extractPhraseReplayKey
 * @property {(key: string) => unknown} decodePhraseReplayKey
 * @property {(key: string, decoded: unknown) => { readonly output: { readonly kind: string } }} replayDecodedPhraseKey
 */

const REPLAY_MODULE_PATH = fileURLToPath(
  new URL('../src/generation-worker/phrase-replay.ts', import.meta.url),
)

const USAGE =
  'usage: npm run replay:phrase -- <key>   (or give the key, or a copied console line, on stdin)'

/** Exit code of a replay that ran, whether it produced a phrase or a generation failure. */
const EXIT_REPLAYED = 0
/** Exit code of a malformed or unsupported key, a usage error or an unexpected internal error. */
const EXIT_REJECTED = 1
/** Exit code of a replay whose generation worker path crashed. */
const EXIT_CRASHED = 2

/**
 * Intent: the text holding the key: the first argument, or else all of stdin when it is piped;
 * null when neither is given.
 * @returns {Promise<string | null>}
 */
async function readKeyText() {
  const argument = process.argv[2]
  if (argument !== undefined) return argument
  if (process.stdin.isTTY) return null
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Intent: narrow the module Vite loaded to the replay surface, crashing if any function is missing.
 * @param {unknown} loaded
 * @returns {PhraseReplayModule}
 */
function requireReplayModule(loaded) {
  const names = ['extractPhraseReplayKey', 'decodePhraseReplayKey', 'replayDecodedPhraseKey']
  if (typeof loaded !== 'object' || loaded === null) {
    throw new TypeError(`${REPLAY_MODULE_PATH} did not load as a module.`)
  }
  for (const name of names) {
    if (typeof Reflect.get(loaded, name) !== 'function') {
      throw new TypeError(`${REPLAY_MODULE_PATH} does not export ${name}().`)
    }
  }
  return /** @type {PhraseReplayModule} */ (loaded)
}

/**
 * Intent: whether an error is a typed domain rejection of the key (every domain error class
 * carries a `kind` tag), as opposed to an unexpected internal error.
 * @param {unknown} error
 * @returns {error is Error}
 */
function isTypedKeyError(error) {
  return error instanceof Error && 'kind' in error
}

/**
 * Intent: decode the key, rejecting a missing, malformed or unsupported one with a one-line
 * message on stderr (no stack) and exit code 1; an untyped error is unexpected and rethrown.
 * @param {PhraseReplayModule} replay
 * @param {string} text
 * @returns {{ key: string, decoded: unknown } | null}
 */
function decodeKey(replay, text) {
  try {
    const key = replay.extractPhraseReplayKey(text)
    return { key, decoded: replay.decodePhraseReplayKey(key) }
  } catch (error) {
    if (!isTypedKeyError(error)) throw error
    process.stderr.write(`replay-phrase: ${error.name}: ${error.message}\n`)
    return null
  }
}

/**
 * Intent: replay one phrase key and print its JSON report: exit 0 when the replay ran, 1 for a
 * usage or key error (nothing on stdout), 2 when the worker path crashed (JSON still printed).
 * @returns {Promise<number>}
 */
// @spec-link [[service_headless_phrase_replay]]
async function main() {
  const text = await readKeyText()
  if (text === null) {
    process.stderr.write(`replay-phrase: UsageError: no key given.\n${USAGE}\n`)
    return EXIT_REJECTED
  }
  const { module } = await runnerImport(REPLAY_MODULE_PATH, {
    configFile: false,
    logLevel: 'silent',
  })
  const replay = requireReplayModule(module)
  const input = decodeKey(replay, text)
  if (input === null) return EXIT_REJECTED
  const report = replay.replayDecodedPhraseKey(input.key, input.decoded)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  return report.output.kind === 'crash' ? EXIT_CRASHED : EXIT_REPLAYED
}

try {
  process.exitCode = await main()
} catch (error) {
  process.stderr.write(
    `replay-phrase: unexpected internal error\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  )
  process.exitCode = EXIT_REJECTED
}
