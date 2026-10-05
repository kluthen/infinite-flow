/**
 * Code-health checker for this repository (CODING_RULE.md §6 and the ATD rules of §1): file size,
 * control-flow nesting, intent comments on functions, and ATD links. Usage:
 * `node scripts/code-health-check.mjs [paths...] [--json]` (`npm run lint:health`).
 *
 * ATD scope. CODING_RULE.md §1: "Every source file that carries business behaviour carries ≥1
 * ATD link (`@spec-link`/`@test-link`), atop the exact function/type — never on package/file
 * headers." and "ATD is for business behaviour only. Tooling, scripts, debug, logging,
 * diagnostics, app bootstrap and test plumbing (fixtures, harnesses, shared helpers) stand outside
 * it: they get no atoms and need no links. They still follow every other rule in this file."
 * §6: "≥1 link per business file, ≤10 distinct atoms (warn >5 distinct); repeated links to the
 * same atom count once. Files outside ATD scope (§1) are exempt."
 *
 * The out-of-scope paths are listed in code-health/config.mjs (ATD_EXEMPT_PATHS); the links those
 * files do carry are still checked. Size, nesting and documentation rules apply to all code.
 */
import { existsSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { analyzeFiles, formatFinding, formatSummary } from './code-health/analyze.mjs'
import { DEFAULT_ROOTS } from './code-health/config.mjs'
import { discoverSourceFiles, loadAtomIds } from './code-health/sources.mjs'

/** How to call the checker, shown when an argument is not understood. */
const usage = 'usage: node scripts/code-health-check.mjs [paths...] [--json]'

/**
 * Intent: split the command-line arguments into the `--json` switch and the paths to scan; any
 * other option is rejected.
 *
 * @param {string[]} args
 * @returns {{ json: boolean, paths: string[] }}
 */
export function parseArguments(args) {
  const unknown = args.find((arg) => arg.startsWith('-') && arg !== '--json')
  if (unknown !== undefined) throw new Error(`unknown option ${unknown} (${usage})`)
  return { json: args.includes('--json'), paths: args.filter((arg) => arg !== '--json') }
}

/**
 * Intent: run the code-health check from `cwd`, which is the repository root (atoms are read from
 * its docs/ directory and reported paths are relative to it). Scans the given paths, or the
 * default roots that exist, and returns the report text and the exit code: 1 when any finding is
 * an error, 0 otherwise.
 *
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ output: string, exitCode: number }>}
 */
export async function runCodeHealthCheck(args, cwd) {
  const { json, paths } = parseArguments(args)
  const targets =
    paths.length > 0
      ? paths.map((path) => resolve(cwd, path))
      : DEFAULT_ROOTS.map((root) => join(cwd, root)).filter((root) => existsSync(root))
  const files = await discoverSourceFiles(cwd, targets)
  const atomIds = await loadAtomIds(cwd)
  const { findings, summary } = await analyzeFiles({ repoRoot: cwd, paths: files, atomIds })
  const output = json
    ? JSON.stringify({ findings, summary }, null, 2)
    : [
        ...findings.map(formatFinding),
        ...(findings.length > 0 ? [''] : []),
        ...formatSummary(summary),
      ].join('\n')
  return { output, exitCode: summary.errors > 0 ? 1 : 0 }
}

// Runs the check only when this file is the Node entry point (`npm run lint:health`), so importing
// it for its exported functions has no side effect.
if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { output, exitCode } = await runCodeHealthCheck(process.argv.slice(2), process.cwd())
  console.log(output)
  process.exitCode = exitCode
}
