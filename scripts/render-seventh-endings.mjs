import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * The renders for the v3.3 listening check L1 (endings on the seventh, master spec D6.3): short
 * MIDI files the owner plays in a MIDI player, with the real backing, each phrase as generated
 * followed by the same phrase with one note moved onto a seventh, and a Markdown index beside
 * them. Every choice and every byte is made by `tests/unit/scripts/seventh-endings-plan.ts`,
 * loaded through Vite; this script only reads the arguments and writes the files. It only
 * rewrites notes of the phrases it is given (phrase replay keys), never generating an ending the
 * spec does not allow (D280); given none, it renders the hand-built demonstration. Deterministic.
 * It deletes and rewrites only its own output folder, which it marks with a `.seventh-endings`
 * file, and refuses to write into any other non-empty folder. Tooling only: nothing in the app
 * reads it.
 *
 * usage: node scripts/render-seventh-endings.mjs [--out <dir>] [--ending <key>]...
 *          [--landing <first key> <next key>]...     (default out: seventh-endings/)
 */

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const PLAN_MODULE = fileURLToPath(
  new URL('../tests/unit/scripts/seventh-endings-plan.ts', import.meta.url),
)
/** @type {import('vite').InlineConfig} */
const LOAD_CONFIG = {
  configFile: false,
  logLevel: 'silent',
  resolve: { alias: { '@': join(REPO_ROOT, 'src') } },
}
const DEFAULT_OUT = 'seventh-endings'
/** The file marking a folder as this script's own output, which it may delete. */
const MARKER = '.seventh-endings'
const USAGE =
  'usage: --out <dir> | --ending <key> | --landing <first key> <next key> (each repeatable)'

/**
 * The arguments: the output folder, and the phrases to render, in the order given.
 * @typedef {{ kind: 'ending', key: string } | { kind: 'landing', first: string, next: string }} Requested
 * @typedef {{ out: string, requested: Requested[] }} Arguments
 */

/**
 * Intent: the value after an option, crashing when it is missing or another option.
 * @param {readonly string[]} args
 * @param {number} index
 * @param {string} what
 * @returns {string}
 */
function valueAt(args, index, what) {
  const value = args[index]
  if (value === undefined || value.startsWith('--')) throw new Error(`${what}. ${USAGE}`)
  return value
}

/**
 * Intent: the output folder and the requested phrases, crashing on any other argument.
 * @param {readonly string[]} args
 * @returns {Arguments}
 */
function parseArguments(args) {
  let out = DEFAULT_OUT
  /** @type {Requested[]} */
  const requested = []
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--out') out = valueAt(args, ++index, '--out needs a folder')
    else if (arg === '--ending')
      requested.push({ kind: 'ending', key: valueAt(args, ++index, '--ending needs a key') })
    else if (arg === '--landing') {
      const first = valueAt(args, ++index, '--landing needs two keys')
      requested.push({
        kind: 'landing',
        first,
        next: valueAt(args, ++index, '--landing needs two keys'),
      })
    } else throw new Error(`Unknown argument ${arg}. ${USAGE}`)
  }
  return { out: resolve(REPO_ROOT, out), requested }
}

/**
 * Intent: crash unless the output folder is absent, empty or this script's own (marked), so
 * nothing else is ever deleted; checked before the slow build.
 * @param {string} out
 */
function assertOwnOut(out) {
  if (!existsSync(out)) return
  const entries = readdirSync(out)
  if (entries.length > 0 && !entries.includes(MARKER))
    throw new Error(`${out} is not empty and is not a seventh-endings folder; refusing to write.`)
}

/**
 * Intent: replace the output folder by an empty one holding only the marker.
 * @param {string} out
 */
function resetOut(out) {
  assertOwnOut(out)
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, MARKER), 'Written by scripts/render-seventh-endings.mjs.\n')
}

/**
 * Intent: the named export of the loaded module, crashing when it is not a function.
 * @param {unknown} loaded
 * @param {string} name
 * @returns {Function}
 */
function exported(loaded, name) {
  const value = typeof loaded === 'object' && loaded !== null && Reflect.get(loaded, name)
  if (typeof value !== 'function') throw new TypeError(`${PLAN_MODULE} does not export ${name}().`)
  return value
}

const { out, requested } = parseArguments(process.argv.slice(2))
assertOwnOut(out)
const { module } = await runnerImport(PLAN_MODULE, LOAD_CONFIG)
const sources =
  requested.length === 0
    ? exported(module, 'demonstrationSources')()
    : requested.map((request, index) =>
        request.kind === 'ending'
          ? exported(module, 'endingFromKey')(request.key, `phrase ${index + 1}`)
          : exported(module, 'landingFromKeys')(request.first, request.next, `pair ${index + 1}`),
      )
/** @type {{ outputs: readonly { path: string, content: Uint8Array | string }[], summaries: readonly { file: string }[] }} */
const build = exported(module, 'buildSeventhEndingRenders')(sources)
resetOut(out)
for (const output of build.outputs) writeFileSync(join(out, output.path), output.content)
console.log(`Wrote ${build.outputs.length} files to ${out}`)
for (const summary of build.summaries) console.log(`  ${summary.file}`)
