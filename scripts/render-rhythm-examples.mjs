import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runnerImport } from 'vite'

/**
 * The renders for the v3.2 hand checks H1 (drift's scale by ear) and H2 (allowed rhythm
 * changes): short MIDI files the owner plays in a MIDI player, with their Markdown beside them.
 * Every choice and every byte is made by `tests/unit/scripts/rhythm-renders-plan.ts`, loaded
 * through Vite; this script only writes the files. Deterministic. It deletes and rewrites only its
 * own output folder, which it marks with a `.rhythm-renders` file, and refuses to write into any
 * other non-empty folder. Tooling only: nothing in the app reads it.
 *
 * usage: node scripts/render-rhythm-examples.mjs [--out <dir>]   (default: rhythm-renders/)
 */

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const PLAN_MODULE = fileURLToPath(
  new URL('../tests/unit/scripts/rhythm-renders-plan.ts', import.meta.url),
)
/** @type {import('vite').InlineConfig} */
const LOAD_CONFIG = {
  configFile: false,
  logLevel: 'silent',
  resolve: { alias: { '@': join(REPO_ROOT, 'src') } },
}
const DEFAULT_OUT = 'rhythm-renders'
/** The file marking a folder as this script's own output, which it may delete. */
const MARKER = '.rhythm-renders'

/**
 * The plan module's surface this script calls, narrowed from the module Vite loads.
 * @typedef {object} RenderBuild
 * @property {readonly { path: string, content: Uint8Array | string }[]} outputs
 * @property {readonly { number: number, folder: string, candidates: readonly { letter: string }[], missing: readonly string[] }[]} sets
 * @property {{ domainSize: number, locks: readonly { locked: { candidateIndex: number }, changes: ReadonlyMap<string, unknown> }[], missing: readonly string[] }} plan
 * @property {number} poolSize
 */

/**
 * Intent: the output folder, from `--out <dir>` or the default, crashing on any other argument.
 * @param {readonly string[]} args
 * @returns {string}
 */
function parseOut(args) {
  let out = DEFAULT_OUT
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg !== '--out') throw new Error(`Unknown argument ${arg}. usage: --out <dir>`)
    const value = args[++index]
    if (value === undefined || value.startsWith('--')) throw new Error('--out needs a folder.')
    out = value
  }
  return resolve(REPO_ROOT, out)
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
    throw new Error(`${out} is not empty and is not a rhythm-render folder; refusing to write.`)
}

/**
 * Intent: replace the output folder by an empty one holding only the marker.
 * @param {string} out
 */
function resetOut(out) {
  assertOwnOut(out)
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, MARKER), 'Written by scripts/render-rhythm-examples.mjs.\n')
}

/**
 * Intent: narrow the loaded module to the one function this script calls, crashing if missing.
 * @param {unknown} loaded
 * @returns {() => RenderBuild}
 */
function requireBuild(loaded) {
  const build = typeof loaded === 'object' && loaded !== null && Reflect.get(loaded, 'buildRenders')
  if (typeof build !== 'function')
    throw new TypeError(`${PLAN_MODULE} does not export buildRenders().`)
  return /** @type {() => RenderBuild} */ (build)
}

/**
 * Intent: print what was written: the sets with their letters, the locked rhythms and kinds.
 * @param {string} out
 * @param {RenderBuild} build
 */
function printSummary(out, build) {
  console.log(`Wrote ${build.outputs.length} files to ${out}`)
  console.log(`H1: ${build.poolSize} distinct domain measures pooled`)
  for (const set of build.sets) {
    const letters = set.candidates.map((candidate) => candidate.letter).join('')
    const missing =
      set.missing.length > 0 ? `; no domain measure for ${set.missing.join(', ')}` : ''
    console.log(`  set ${set.number} ${set.folder}: ${letters}${missing}`)
  }
  console.log(`H2: domain of ${build.plan.domainSize} rhythms`)
  for (const lock of build.plan.locks)
    console.log(`  locked #${lock.locked.candidateIndex}: ${[...lock.changes.keys()].join(', ')}`)
  if (build.plan.missing.length > 0)
    console.log(`  missing kinds: ${build.plan.missing.join(', ')}`)
}

const out = parseOut(process.argv.slice(2))
assertOwnOut(out)
const { module } = await runnerImport(PLAN_MODULE, LOAD_CONFIG)
const build = requireBuild(module)()
resetOut(out)
for (const output of build.outputs) {
  const path = join(out, output.path)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, output.content)
}
printSummary(out, build)
