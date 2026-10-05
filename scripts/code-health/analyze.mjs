import { BYPASS_TOKENS } from './config.mjs'
import { checkAtd, isAtdScopeExempt } from './rules/atd.mjs'
import { checkDocs } from './rules/docs.mjs'
import { checkNesting } from './rules/nesting.mjs'
import { checkSize } from './rules/size.mjs'
import { loadSource, parseSource } from './sources.mjs'

/**
 * @typedef {import('./sources.mjs').Finding} Finding
 * @typedef {import('./sources.mjs').Level} Level
 * @typedef {import('./sources.mjs').ParsedSource} ParsedSource
 * @typedef {import('./sources.mjs').Rule} Rule
 * @typedef {import('./sources.mjs').RuleContext} RuleContext
 * @typedef {import('./sources.mjs').RuleName} RuleName
 * @typedef {{ filesScanned: number, filesBypassed: Record<string, number>, filesAtdExempt: number,
 *   counts: Record<RuleName, Record<Level, number>>, errors: number, warnings: number }} Summary
 *   `filesBypassed` counts, per bypass token, the files declaring it; `filesAtdExempt` counts the
 *   files outside the ATD scope by path (config.mjs ATD_EXEMPT_PATHS).
 */

/** Every rule, in report order, under the name its bypass tokens refer to. */
const rules = /** @type {const} */ ([
  ['size', checkSize],
  ['nesting', checkNesting],
  ['docs', checkDocs],
  ['atd', checkAtd],
])

/**
 * Intent: order findings by path, then line, then rule and message, so every run prints the same
 * report.
 *
 * @param {Finding} left
 * @param {Finding} right
 * @returns {number}
 */
function compareFindings(left, right) {
  const keys = /** @type {const} */ (['path', 'line', 'rule', 'message'])
  for (const key of keys) {
    if (left[key] < right[key]) return -1
    if (left[key] > right[key]) return 1
  }
  return 0
}

/**
 * Intent: the rules a parsed file has switched off with its bypass tokens.
 *
 * @param {ParsedSource} source
 * @returns {Set<RuleName>}
 */
function bypassedRules(source) {
  return new Set([...source.bypass].flatMap((token) => BYPASS_TOKENS[token] ?? []))
}

/**
 * Intent: run every rule the file has not bypassed over an already parsed file and return its
 * findings, sorted.
 *
 * @param {ParsedSource} source
 * @param {RuleContext} context
 * @returns {Finding[]}
 */
export function analyzeParsedSource(source, context) {
  const bypassed = bypassedRules(source)
  return rules
    .filter(([name]) => !bypassed.has(name))
    .flatMap(([, check]) => check(source, context))
    .sort(compareFindings)
}

/**
 * Intent: parse one file's text and return its sorted findings, bypass tokens applied.
 *
 * @param {{ path: string, text: string, atomIds: Set<string> }} file `path` is repo-relative
 * @returns {Finding[]}
 */
export function analyzeSource({ path, text, atomIds }) {
  return analyzeParsedSource(parseSource(path, text), { atomIds })
}

/**
 * Intent: read, parse and analyze every listed repo-relative file and return all findings, sorted,
 * with the run's summary.
 *
 * @param {{ repoRoot: string, paths: string[], atomIds: Set<string> }} run
 * @returns {Promise<{ findings: Finding[], summary: Summary }>}
 */
export async function analyzeFiles({ repoRoot, paths, atomIds }) {
  const sources = await Promise.all(paths.map((path) => loadSource(repoRoot, path)))
  const findings = sources
    .flatMap((source) => analyzeParsedSource(source, { atomIds }))
    .sort(compareFindings)
  return { findings, summary: summarize(sources, findings) }
}

/**
 * Intent: the run's summary: files scanned, files declaring each bypass token, files outside the
 * ATD scope, and finding counts per rule and level, with the error and warning totals.
 *
 * @param {{ path: string, bypass: Set<string> }[]} sources
 * @param {Finding[]} findings
 * @returns {Summary}
 */
export function summarize(sources, findings) {
  /** @type {Record<string, number>} */
  const filesBypassed = {}
  for (const token of sources.flatMap((source) => [...source.bypass])) {
    filesBypassed[token] = (filesBypassed[token] ?? 0) + 1
  }
  /** @type {Summary['counts']} */
  const counts = {
    size: { ERROR: 0, WARN: 0 },
    nesting: { ERROR: 0, WARN: 0 },
    docs: { ERROR: 0, WARN: 0 },
    atd: { ERROR: 0, WARN: 0 },
  }
  for (const finding of findings) counts[finding.rule][finding.level] += 1
  return {
    filesScanned: sources.length,
    filesBypassed,
    filesAtdExempt: sources.filter((source) => isAtdScopeExempt(source.path)).length,
    counts,
    errors: findings.filter((finding) => finding.level === 'ERROR').length,
    warnings: findings.filter((finding) => finding.level === 'WARN').length,
  }
}

/**
 * Intent: one report line for a finding: `LEVEL path:line message`.
 *
 * @param {Finding} finding
 * @returns {string}
 */
export function formatFinding(finding) {
  return `${finding.level} ${finding.path}:${finding.line} ${finding.message}`
}

/**
 * Intent: the human-readable summary printed after the findings.
 *
 * @param {Summary} summary
 * @returns {string[]}
 */
export function formatSummary(summary) {
  const bypassed = Object.entries(summary.filesBypassed)
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([token, files]) => `${token} ${files}`)
  const perRule = Object.entries(summary.counts).map(
    ([rule, { ERROR, WARN }]) => `  ${rule}: ${ERROR} error(s), ${WARN} warning(s)`,
  )
  return [
    `Code health: ${summary.filesScanned} file(s) scanned.`,
    `Files bypassed: ${bypassed.length > 0 ? bypassed.join(', ') : 'none'}.`,
    `Files ATD-exempt by scope: ${summary.filesAtdExempt}.`,
    ...perRule,
    `Total: ${summary.errors} error(s), ${summary.warnings} warning(s).`,
  ]
}
