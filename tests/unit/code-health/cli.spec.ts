// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/** The checker's entry point, run as `node <cli> ...` the way `npm run lint:health` does. */
const cli = fileURLToPath(new URL('../../../scripts/code-health-check.mjs', import.meta.url))

/** A documented, linked file that every rule accepts. */
const cleanModule = `/** Intent: the answer every caller needs. */
// @spec-link [[demo_atom]]
export function answer(): number {
  return 42
}
`

/** A documented, linked module of 601 effective lines: a size error and nothing else. */
const oversizedModule = `/** Intent: many values. */
// @spec-link [[demo_atom]]
export const values = [
${Array.from({ length: 599 }, (_, index) => `  ${index},`).join('\n')}
]
`

/** A component whose only ATD link is a template comment. */
const templateLinkedComponent = `<template>
  <!-- @spec-link [[demo_atom]] -->
  <p>Hello</p>
</template>
`

/**
 * Intent: run the checker in `cwd` with `args` (and extra environment variables) and return its
 * exit code and output.
 */
function runCli(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe('code-health-check CLI over a temporary repository', () => {
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-health-cli-'))
    const files: [string, string][] = [
      ['docs/demo.atom.md', '---\nid: demo_atom\n---\n'],
      ['src/clean.ts', cleanModule],
      ['scripts/oversized.mjs', oversizedModule],
      ['src/TemplateLinked.vue', templateLinkedComponent],
    ]
    for (const [file, text] of files) {
      await mkdir(dirname(join(root, file)), { recursive: true })
      await writeFile(join(root, file), text)
    }
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('exits 1 and prints each error line and the summary when a default root has an error', () => {
    const { status, stdout } = runCli(root, [])
    expect(status).toBe(1)
    expect(stdout).toContain(
      'ERROR scripts/oversized.mjs:1 size: 601 effective lines of code exceed the error limit of 600',
    )
    expect(stdout).toContain('Code health: 3 file(s) scanned.')
    expect(stdout).toContain('Files bypassed: none.')
    expect(stdout).toContain('Files ATD-exempt by scope: 1.')
    expect(stdout).toContain('size: 1 error(s), 0 warning(s)')
    expect(stdout).toContain('Total: 1 error(s), 0 warning(s).')
  })

  it('exits 0 when the paths it is narrowed to are clean', () => {
    const { status, stdout } = runCli(root, ['src'])
    expect(status).toBe(0)
    expect(stdout).toContain('Code health: 2 file(s) scanned.')
    expect(stdout).not.toContain('oversized')
  })

  it('keeps template comment links of a .vue file under the production build of Vue', () => {
    const { status, stdout } = runCli(root, ['--json', 'src/TemplateLinked.vue'], {
      NODE_ENV: 'production',
    })
    const report = JSON.parse(stdout)
    expect(report.summary.filesScanned).toBe(1)
    expect(report.findings).toEqual([])
    expect(status).toBe(0)
  })

  it('prints the findings and the summary as JSON with --json', () => {
    const { status, stdout } = runCli(root, ['--json', 'src/clean.ts', 'scripts'])
    expect(status).toBe(1)
    const report = JSON.parse(stdout)
    expect(report.findings).toEqual([
      {
        level: 'ERROR',
        rule: 'size',
        path: 'scripts/oversized.mjs',
        line: 1,
        message: 'size: 601 effective lines of code exceed the error limit of 600',
      },
    ])
    expect(report.summary).toEqual({
      filesScanned: 2,
      filesBypassed: {},
      filesAtdExempt: 1,
      counts: {
        size: { ERROR: 1, WARN: 0 },
        nesting: { ERROR: 0, WARN: 0 },
        docs: { ERROR: 0, WARN: 0 },
        atd: { ERROR: 0, WARN: 0 },
      },
      errors: 1,
      warnings: 0,
    })
  })

  it('fails loudly on an unknown option', () => {
    const { status, stderr } = runCli(root, ['--fix'])
    expect(status).not.toBe(0)
    expect(stderr).toContain('unknown option --fix')
  })
})
