import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * The file `git archive` fills with the archived commit's short id: .gitattributes marks it
 * `export-subst`, so in an archive its `$Format:%h$` placeholder is replaced by the id. This is how
 * the production build (scripts/vps.sh ships `git archive` output into a Docker build that has no
 * .git directory) learns which commit it was built from. In a git checkout it keeps the
 * placeholder, and the id comes from git itself.
 */
const BUILD_COMMIT_FILE = new URL('./build-commit.txt', import.meta.url)

/** What the app shows when no commit id can be found (no archive substitution and no git). */
export const UNKNOWN_BUILD_COMMIT = 'unknown'

/** A short or full hexadecimal commit id; anything else (the raw placeholder) is not one. */
const COMMIT_ID = /^[0-9a-f]{4,40}$/

/**
 * Intent: the short id of the commit HEAD points at in the git checkout around `cwd`, or null when
 * git or a checkout is not there (git's own error is not printed: the caller reports it).
 *
 * @param {string} cwd
 * @returns {string | null}
 */
function gitShortCommit(cwd) {
  try {
    const id = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return COMMIT_ID.test(id) ? id : null
  } catch {
    return null
  }
}

/**
 * Intent: the short id of the commit this build comes from: the id `git archive` wrote into
 * scripts/build-commit.txt, else HEAD's id from git, else `unknown`, with a warning, so a build
 * without either still runs and says honestly that it cannot tell. Throws when the file is missing:
 * it is part of the repository, like package.json.
 *
 * @param {{ commitFile?: URL, cwd?: string }} [where] where to look; the repository by default
 * @returns {string}
 */
export function buildCommit({
  commitFile = BUILD_COMMIT_FILE,
  cwd = fileURLToPath(new URL('..', import.meta.url)),
} = {}) {
  const archived = readFileSync(commitFile, 'utf8').trim()
  if (COMMIT_ID.test(archived)) return archived
  const fromGit = gitShortCommit(cwd)
  if (fromGit !== null) return fromGit
  console.warn(
    `build commit: no commit id (not a git archive, and git found no checkout); the app shows "${UNKNOWN_BUILD_COMMIT}"`,
  )
  return UNKNOWN_BUILD_COMMIT
}

/**
 * Intent: the build-time `define` entries that inject the app's package version as the constant
 * `__APP_VERSION__`, read from package.json, so every record the app stores names the version
 * that wrote it, and the short id of the commit the build comes from as `__APP_COMMIT__` (see
 * buildCommit), which the header shows beside the version. Throws when package.json holds no
 * non-empty version: a build without one must not run.
 *
 * @returns {{ __APP_VERSION__: string, __APP_COMMIT__: string }}
 */
export function appVersionDefine() {
  /** @type {unknown} */
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const version =
    typeof manifest === 'object' && manifest !== null && 'version' in manifest
      ? manifest.version
      : undefined
  if (typeof version !== 'string' || version === '') {
    throw new Error('app version: package.json has no non-empty "version"')
  }
  return {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(buildCommit()),
  }
}
