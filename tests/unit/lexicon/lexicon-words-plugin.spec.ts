// @vitest-environment node
/**
 * The lexicon's build step (scripts/lexicon-words-plugin.ts), run in real Vite builds over the
 * made-up sample lexicon `fixtures/sample-lexicon.md` and variants of it, each written to a
 * throwaway directory with a tiny app that imports the words dynamically. The words' built file is
 * loaded back to read the entries the build hands the app.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { build, type Rolldown } from 'vite'
import { describe, expect, it } from 'vitest'

import type { LexiconEntry } from '@/lexicon'

import { lexiconWordsPlugin } from '../../../scripts/lexicon-words-plugin'

const sampleLexiconUrl = new URL('fixtures/sample-lexicon.md', import.meta.url)

/** The sample lexicon's text. */
async function sampleText(): Promise<string> {
  return readFile(sampleLexiconUrl, 'utf8')
}

/** What one build of a lexicon text gives: its JS chunks and the words the words' file holds. */
interface WordsBuild {
  readonly chunks: readonly Rolldown.OutputChunk[]
  readonly wordsFile: Rolldown.OutputChunk
  readonly entries: readonly LexiconEntry[]
}

/**
 * Build a tiny app, whose entry imports `virtual:lexicon-words` dynamically, with the build step
 * reading `lexiconText` from `<dir>/lexicon.md`; `dir` is a fresh throwaway directory, removed
 * after. Rejects with the build's error when the build fails.
 */
async function buildWords(lexiconText: string): Promise<WordsBuild> {
  const root = await mkdtemp(join(tmpdir(), 'lexicon-words-'))
  try {
    const lexiconPath = join(root, 'lexicon.md')
    await writeFile(lexiconPath, lexiconText)
    await writeFile(
      join(root, 'main.js'),
      "globalThis.loadWords = () => import('virtual:lexicon-words')\n",
    )
    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [lexiconWordsPlugin({ lexiconPath })],
      build: { write: false, minify: false, rollupOptions: { input: join(root, 'main.js') } },
    })
    const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[]
    const chunks = outputs
      .flatMap((output) => output.output)
      .filter((output): output is Rolldown.OutputChunk => output.type === 'chunk')
    const wordsFiles = chunks.filter((chunk) => chunk.name === 'lexicon-words')
    expect(wordsFiles).toHaveLength(1)
    const wordsFile = wordsFiles[0]!
    const loadable = join(root, 'words.mjs')
    await writeFile(loadable, wordsFile.code)
    const loaded = (await import(/* @vite-ignore */ pathToFileURL(loadable).href)) as {
      default: readonly LexiconEntry[]
    }
    return { chunks, wordsFile, entries: loaded.default }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

/** The sample text with the entry `### <word>` and its lines cut out, and that block. */
function cutEntry(text: string, word: string): { rest: string; block: string } {
  const start = text.indexOf(`### ${word}\n`)
  const next = text.indexOf('\n#', start + 1)
  const end = next === -1 ? text.length : next + 1
  return { rest: text.slice(0, start) + text.slice(end), block: text.slice(start, end) }
}

describe('the lexicon build step on the sample lexicon', () => {
  // @test-link [[module_lexicon_single_source]]
  it("emits the shown entries as a words' file of its own, reached by the dynamic import", async () => {
    const { chunks, wordsFile, entries } = await buildWords(await sampleText())
    expect(wordsFile.fileName).toMatch(/^assets\/lexicon-words-[\w-]+\.js$/u)
    expect(entries.map((entry) => entry.id)).toEqual(['blorp', 'zindle', 'snerk'])
    expect(entries[0]).toEqual({
      id: 'blorp',
      word: 'Blorp',
      otherNames: ['blorpy', 'the blorp (old, rare)'],
      popup: "A made-up round shape, for the build step's tests only.",
      definition: 'Blorp is a word made up for the tests.',
      appMeaning: 'Blorp means nothing in the app.',
      related: ['zindle'],
      group: 'Shapes',
      groupOrder: 1,
    })
    const app = chunks.find((chunk) => chunk.isEntry && chunk !== wordsFile)!
    expect(app.dynamicImports).toEqual([wordsFile.fileName])
    expect(app.imports).toEqual([])
    expect(app.code).not.toContain('A made-up round shape')
    expect(wordsFile.code).not.toContain('made-up source')
    expect(wordsFile.code).not.toContain('Quaffle')
  })

  // @test-link [[module_lexicon_single_source]]
  it('adds an added entry to the output with nothing else changed', async () => {
    const text = await sampleText()
    const before = (await buildWords(text)).entries
    const added = text.replace(
      '### Zindle\n',
      [
        '### Plonk',
        '',
        '- **id:** `plonk`',
        '- **aliases:** none',
        "- **popup:** A made-up flat shape, added by the build step's test.",
        '- **definition:** Plonk is a made-up word.',
        '- **sources:** made-up source S0',
        '',
        '### Zindle',
        '',
      ].join('\n'),
    )
    const after = (await buildWords(added)).entries
    expect(after).toEqual([
      before[0],
      {
        id: 'plonk',
        word: 'Plonk',
        otherNames: [],
        popup: "A made-up flat shape, added by the build step's test.",
        definition: 'Plonk is a made-up word.',
        appMeaning: null,
        related: [],
        group: 'Shapes',
        groupOrder: 1,
      },
      ...before.slice(1),
    ])
  })

  // @test-link [[module_lexicon_single_source]]
  it('puts an entry moved out of the Internal group on the page, with nothing else changed', async () => {
    const text = await sampleText()
    const before = (await buildWords(text)).entries
    const { rest, block } = cutEntry(text, 'Wibble')
    const moved = rest.replace('## Internal (no popup)\n', `${block}\n## Internal (no popup)\n`)
    const after = (await buildWords(moved)).entries
    expect(after).toEqual([
      ...before,
      {
        id: 'wibble',
        word: 'Wibble',
        otherNames: ['wobble'],
        popup: 'Internal: a made-up word that a test moves out of the Internal group.',
        definition: 'Wibble is a made-up internal word.',
        appMeaning: null,
        related: ['snerk'],
        group: 'Colours',
        groupOrder: 2,
      },
    ])
  })

  // @test-link [[module_lexicon_single_source]]
  it("fails the build on a malformed sample lexicon, with the parser's message", async () => {
    const text = await sampleText()
    const malformed = text.replace(
      "- **popup:** A made-up pointed shape, for the build step's tests only.\n",
      '',
    )
    const line = malformed.split('\n').indexOf('### Zindle') + 1
    await expect(buildWords(malformed)).rejects.toThrow(
      new RegExp(`lexicon\\.md:${line}: "Zindle" lacks the required field popup`, 'u'),
    )
  })

  // @test-link [[module_lexicon_single_source]]
  it('fails the build on a sample lexicon with no shown entry, naming the file', async () => {
    const text = await sampleText()
    const onlyInternal = (
      text.slice(0, text.indexOf('## Shapes')) + text.slice(text.indexOf('## Internal'))
    ).replace(/^- \*\*related:\*\* .*\n/gmu, '')
    await expect(buildWords(onlyInternal)).rejects.toThrow(
      /lexicon\.md: the lexicon has no shown entry/u,
    )
  })
})
