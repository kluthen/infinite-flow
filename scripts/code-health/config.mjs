/**
 * Effective lines of code above which a file is reported as a size warning (CODING_RULE.md §6).
 */
export const SIZE_WARN_LOC = 400

/** Effective lines of code above which a file is reported as a size error. */
export const SIZE_ERROR_LOC = 600

/** Deepest control-flow nesting a function (or module scope) may reach before it is an error. */
export const MAX_NESTING = 4

/** Distinct atom ids linked from one file above which the file is an ATD-spread warning. */
export const ATD_WARN_DISTINCT = 5

/** Distinct atom ids linked from one file above which the file is an ATD-spread error. */
export const ATD_ERROR_DISTINCT = 10

/**
 * ATD scope. CODING_RULE.md §1: "ATD is for business behaviour only. Tooling, scripts, debug,
 * logging, diagnostics, app bootstrap and test plumbing (fixtures, harnesses, shared helpers) stand
 * outside it: they get no atoms and need no links. They still follow every other rule in this
 * file." §6: "≥1 link per business file, ≤10 distinct atoms (warn >5 distinct); repeated links to
 * the same atom count once. Files outside ATD scope (§1) are exempt."
 *
 * A file matching this list is outside that scope: it needs no ATD link and has no distinct-atom
 * limit, but the links it does carry are still checked (phantom id, unattached link, link kind by
 * file kind). Paths are repo-relative with forward slashes and match by plain prefix or exact
 * path. Files under src/ that stand outside the scope (app bootstrap, debug, plumbing) are not
 * listed; each declares it per file with `@lint-ignore-atd <reason>`.
 *
 * - `prefixes`: every file under these directories: tooling (`scripts/`), the tests of that
 *   tooling (`tests/unit/code-health/`) and the perf measurement harness run by `measure:latency`
 *   (`tests/perf/`).
 * - `files`: the measurement harnesses run by the other `measure:*` npm scripts and by
 *   `sweep:my-instrument` (see package.json), the figure census's own test run by
 *   `measure:figures` (measurement tooling), and the design-system accessibility conformance checks (focus visibility,
 *   reduced motion, target size), which no business atom governs, and the test of the build
 *   commit id the header shows (build tooling).
 * - `plumbingUnder`: test plumbing, i.e. every file under these directories that is not a spec
 *   (its name holds neither `.spec.` nor `.test.`): fixtures, fakes, shared helpers, goldens,
 *   harness entry points and seams, `.d.ts` window typings. The specs there test business
 *   behaviour and stay in scope.
 *
 * @type {Readonly<{ prefixes: readonly string[], files: readonly string[],
 *   plumbingUnder: readonly string[] }>}
 */
export const ATD_EXEMPT_PATHS = {
  prefixes: ['scripts/', 'tests/unit/code-health/', 'tests/perf/'],
  files: [
    'tests/e2e/workspace/generation-latency.spec.ts',
    'tests/e2e/workspace/engraving-main-thread.spec.ts',
    'tests/e2e/session/rolling-display-timing.spec.ts',
    'tests/sweep-my-instrument/my-instrument-range-sweep.spec.ts',
    'tests/sweep/figure-census.spec.ts',
    'tests/sweep/lock-census.spec.ts',
    'tests/sweep/lock-census-seeds.spec.ts',
    'tests/sweep/lock-census-runner.spec.ts',
    'tests/sweep/jam-sweep.spec.ts',
    'tests/unit/jam/doodle-set.spec.ts',
    'tests/e2e/workspace/focus-visibility.spec.ts',
    'tests/e2e/workspace/reduced-motion.spec.ts',
    'tests/e2e/workspace/target-size.spec.ts',
    'tests/unit/scripts/build-commit.spec.ts',
    'tests/unit/scripts/render-rhythm-examples.spec.ts',
  ],
  plumbingUnder: ['tests/'],
}

/** Directories, relative to the repository root, scanned when the CLI gets no path argument. */
export const DEFAULT_ROOTS = ['src', 'tests', 'scripts']

/**
 * Directory names never descended into, at any depth: installed packages, build and test output.
 * Directories whose name starts with `dist` or with a dot are skipped as well (see sources.mjs).
 */
export const SKIPPED_DIRS = new Set([
  'node_modules',
  '.vitest',
  '.vite',
  'test-results',
  'playwright-report',
  'blob-report',
  'coverage',
  'pipeline_output',
])

/** File extensions the checker reads; `.d.ts` files are included through `.ts`. */
export const SOURCE_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.vue'])

/**
 * Bypass tokens and the rules each one suppresses for the whole file it appears in. They exist for
 * genuine exceptions (third-party or generated code), never to silence a developer's own code.
 *
 * @type {Readonly<Record<string, readonly ('size' | 'nesting' | 'docs' | 'atd')[]>>}
 */
export const BYPASS_TOKENS = {
  '@lint-ignore-all': ['size', 'nesting', 'docs', 'atd'],
  '@lint-ignore-file-bloating': ['size'],
  '@lint-ignore-complexity': ['nesting'],
  '@lint-ignore-documentation': ['docs'],
  '@lint-ignore-atd': ['atd'],
}

/**
 * Callee names of the test frameworks (vitest, Playwright): their callbacks need no intent comment,
 * and an expression statement calling one of them may carry an ATD link.
 */
export const TEST_FRAMEWORK_CALLS = new Set([
  'describe',
  'it',
  'test',
  'bench',
  'suite',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
])
