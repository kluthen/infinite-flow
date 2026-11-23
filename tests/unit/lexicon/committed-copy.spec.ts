// @vitest-environment node
/**
 * The committed-copy check: no file under `src/`, `public/` or `tests/` holds the plain line of a
 * real lexicon entry, so the lexicon file stays the words' only source. Run over the repository,
 * and over a throwaway tree laid out like it with a planted copy, to show it fails. The plain
 * lines are read from the real lexicon file at run time; none is written here.
 */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseLexicon } from '@/lexicon'

import { realLexiconText } from './lexicon-test-text'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))

/** The directories whose committed files may hold no real plain line. */
const checkedDirectories = ['src', 'public', 'tests']

/** Every file under a directory, recursively, as absolute paths; none when it does not exist. */
async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    },
  )
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? filesUnder(path) : [path]
    }),
  )
  return nested.flat()
}

/**
 * Every file under `root`'s checked directories that holds one of the plain lines, with the entry
 * whose line it holds, as `<path from root> holds the plain line of "<word>"`.
 */
async function committedCopies(
  root: string,
  plainLines: readonly { word: string; popup: string }[],
): Promise<string[]> {
  const found: string[] = []
  for (const directory of checkedDirectories) {
    for (const path of await filesUnder(join(root, directory))) {
      const contents = await readFile(path, 'utf8')
      for (const { word, popup } of plainLines) {
        if (contents.includes(popup)) {
          found.push(
            `${relative(root, path).split(sep).join('/')} holds the plain line of "${word}"`,
          )
        }
      }
    }
  }
  return found
}

describe('the committed-copy check', () => {
  const plainLines = parseLexicon(realLexiconText(), 'docs/music/lexicon.md').map(
    ({ word, popup }) => ({ word, popup }),
  )

  // @test-link [[module_lexicon_single_source]]
  it("finds no real entry's plain line in a file under src/, public/ or tests/", async () => {
    expect(plainLines.length).toBeGreaterThan(0)
    expect(await committedCopies(repositoryRoot, plainLines)).toEqual([])
  }, 30_000)

  // @test-link [[module_lexicon_single_source]]
  it('fails on a planted copy', async () => {
    const root = await mkdtemp(join(tmpdir(), 'committed-copy-'))
    try {
      const planted = plainLines[plainLines.length - 1]!
      await mkdir(join(root, 'src', 'components'), { recursive: true })
      await writeFile(join(root, 'src', 'components', 'clean.ts'), 'export const words = []\n')
      await writeFile(
        join(root, 'src', 'components', 'planted.ts'),
        `export const popup = ${JSON.stringify(planted.popup)}\n`,
      )
      expect(await committedCopies(root, plainLines)).toEqual([
        `src/components/planted.ts holds the plain line of "${planted.word}"`,
      ])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
