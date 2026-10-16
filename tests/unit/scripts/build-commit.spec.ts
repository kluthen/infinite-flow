// @vitest-environment node
/**
 * The build commit the header shows: the id `git archive` substitutes into
 * scripts/build-commit.txt (how the production Docker build, which has no .git, learns it), else
 * HEAD's short id from git, else `unknown` with a warning, never a failed build.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  appVersionDefine,
  buildCommit,
  UNKNOWN_BUILD_COMMIT,
} from '../../../scripts/app-version-define.mjs'

/** The repository root, where the real .gitattributes and scripts/build-commit.txt live. */
const REPO_ROOT = new URL('../../../', import.meta.url)

/** Git flags that keep a throwaway repository independent of the user's own git config. */
const GIT_ISOLATION = ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid']
const GIT_NO_SIGNING = ['-c', 'commit.gpgsign=false']

/** Temporary directories made by a test, removed after it. */
const made: string[] = []

/** Intent: a fresh empty directory outside any git checkout, removed after the test. */
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'build-commit-'))
  made.push(dir)
  return dir
}

/** Intent: run git in `cwd` and return its trimmed output. */
function git(cwd: string, args: string[]): string {
  return execFileSync('git', [...GIT_ISOLATION, ...args], { cwd, encoding: 'utf8' }).trim()
}

/** Intent: write a build-commit file holding `content` into a fresh directory; returns its URL. */
function commitFileWith(content: string): URL {
  const file = join(tempDir(), 'build-commit.txt')
  writeFileSync(file, content)
  return pathToFileURL(file)
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('buildCommit', () => {
  it('takes the id git archive wrote into the file, without asking git', () => {
    const outsideGit = tempDir()
    expect(buildCommit({ commitFile: commitFileWith('283a8ed\n'), cwd: outsideGit })).toBe(
      '283a8ed',
    )
  })

  it("falls back to HEAD's short id when the file still holds the placeholder", () => {
    const repo = fileURLToPath(REPO_ROOT)
    const head = git(repo, ['rev-parse', '--short', 'HEAD'])
    expect(buildCommit({ commitFile: commitFileWith('$Format:%h$\n'), cwd: repo })).toBe(head)
  })

  it('says unknown, with a warning, when neither the archive nor git gives an id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const outsideGit = tempDir()
    expect(buildCommit({ commitFile: commitFileWith('$Format:%h$\n'), cwd: outsideGit })).toBe(
      UNKNOWN_BUILD_COMMIT,
    )
    expect(warn).toHaveBeenCalledOnce()
  })

  it('throws when the file is missing from the repository', () => {
    const missing = pathToFileURL(join(tempDir(), 'build-commit.txt'))
    expect(() => buildCommit({ commitFile: missing, cwd: tempDir() })).toThrow()
  })

  it("reads the archived commit's id from a real git archive of the repository's two files", () => {
    const repo = tempDir()
    mkdirSync(join(repo, 'scripts'))
    copyFileSync(new URL('.gitattributes', REPO_ROOT), join(repo, '.gitattributes'))
    copyFileSync(
      new URL('scripts/build-commit.txt', REPO_ROOT),
      join(repo, 'scripts', 'build-commit.txt'),
    )
    git(repo, ['init', '--quiet'])
    git(repo, ['add', '.'])
    git(repo, [...GIT_NO_SIGNING, 'commit', '--quiet', '-m', 'archive fixture'])
    const sha = git(repo, ['rev-parse', 'HEAD'])
    const shipped = tempDir()
    const archive = execFileSync('git', ['archive', sha], { cwd: repo })
    execFileSync('tar', ['-x', '-C', shipped], { input: archive })

    const id = buildCommit({
      commitFile: pathToFileURL(join(shipped, 'scripts', 'build-commit.txt')),
      cwd: shipped,
    })
    expect(id).toMatch(/^[0-9a-f]{4,40}$/)
    expect(sha.startsWith(id)).toBe(true)
  })
})

describe('appVersionDefine', () => {
  it('injects the package version and a commit id or unknown', () => {
    const manifest = JSON.parse(readFileSync(new URL('package.json', REPO_ROOT), 'utf8')) as {
      version: string
    }
    const define = appVersionDefine()
    expect(JSON.parse(define.__APP_VERSION__)).toBe(manifest.version)
    expect(JSON.parse(define.__APP_COMMIT__)).toMatch(/^([0-9a-f]{4,40}|unknown)$/)
  })
})
