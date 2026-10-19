// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

/** Intent: every source file under one repo folder, as a repo-relative path and its text. */
function sourceFiles(folder: string): readonly { path: string; text: string }[] {
  const root = join(REPO_ROOT, folder)
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((entry) => /\.(?:ts|vue)$/u.test(entry))
    .map((entry) => join(root, entry))
    .map((path) => ({ path: relative(REPO_ROOT, path), text: readFileSync(path, 'utf8') }))
}

// @test-link [[module_preset_model]]
describe('the preset model stays pure', () => {
  it('imports no interface, storage, session or worker code and reads no clock or random source', () => {
    const files = sourceFiles('src/domain/presets')
    expect(files.length).toBeGreaterThanOrEqual(5)
    const findings = files.flatMap(({ path, text }) => {
      const imports = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/gu)]
        .map((match) => match[1] ?? '')
        .filter((source) =>
          /(?:^|\/)(?:components|storage|session|composables)(?:\/|$)|generation-worker/u.test(
            source,
          ),
        )
        .map((source) => `${path}: imports ${source}`)
      const impure = /\bMath\.random\b|\bDate\b/u.test(text) ? [`${path}: clock or random`] : []
      return [...imports, ...impure]
    })
    expect(findings).toEqual([])
  })
})
