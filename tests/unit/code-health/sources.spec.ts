// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  attachedComments,
  bypassTokensIn,
  commentRanges,
  discoverSourceFiles,
  isTestFile,
  lineOf,
  loadAtomIds,
  parseSource,
} from '../../../scripts/code-health/sources.mjs'

/** Intent: the `index`-th top-level statement of the `blockIndex`-th script block of a file. */
function statementOf(path: string, text: string, blockIndex: number, index: number) {
  const block = parseSource(path, text).blocks[blockIndex]
  const statement = block?.sourceFile.statements[index]
  if (block === undefined || statement === undefined) {
    throw new Error(`${path} has no statement ${index} in block ${blockIndex}`)
  }
  return { block, statement }
}

/** A component with a `<script>` and a `<script setup>`, each holding one function. */
const twoScriptComponent = `<script lang="ts">
export function outer() {}
</script>

<template>
  <div />
</template>

<script setup lang="ts">
// a note
function inner() {}
</script>
`

describe('parseSource', () => {
  it('parses a TypeScript or JavaScript module as one block at offset 0', () => {
    const source = parseSource('src/a.ts', 'export const a = 1\n')
    expect(source.isVue).toBe(false)
    expect(source.isTest).toBe(false)
    expect(source.templateComments).toEqual([])
    expect(source.blocks.map(({ kind, lineOffset, offset }) => [kind, lineOffset, offset])).toEqual(
      [['module', 0, 0]],
    )
    expect(parseSource('scripts/b.mjs', 'export {}\n').blocks).toHaveLength(1)
  })

  it('maps .vue script and script setup positions back to original lines', () => {
    const source = parseSource('src/C.vue', twoScriptComponent)
    expect(source.isVue).toBe(true)
    expect(source.blocks.map((block) => block.kind)).toEqual(['script', 'script-setup'])
    const outer = statementOf('src/C.vue', twoScriptComponent, 0, 0)
    expect(lineOf(outer.block, outer.statement.getStart(outer.block.sourceFile))).toBe(2)
    const inner = statementOf('src/C.vue', twoScriptComponent, 1, 0)
    expect(lineOf(inner.block, inner.statement.getStart(inner.block.sourceFile))).toBe(11)
    expect(commentRanges(inner.block).map(({ text, line }) => [text, line])).toEqual([
      ['// a note', 10],
    ])
  })

  it('collects template comments with their line and whether an element follows', () => {
    const text = `<template>
  <!-- @spec-link [[a]] -->
  <!-- second -->
  <section>
    <!-- before text -->
    words
    <!-- last child -->
  </section>
</template>
`
    expect(parseSource('src/T.vue', text).templateComments).toEqual([
      { text: '<!-- @spec-link [[a]] -->', line: 2, attached: true },
      { text: '<!-- second -->', line: 3, attached: true },
      { text: '<!-- before text -->', line: 5, attached: false },
      { text: '<!-- last child -->', line: 7, attached: false },
    ])
  })
})

describe('comment helpers', () => {
  it('finds real comments only, never comment-like text in strings or regular expressions', () => {
    const text = [
      "const url = 'http://example.org' // trailing",
      'const pattern = /a\\/\\/b/u',
      'const template = `/* not a comment ${url} // nor this`',
      '/* block */ const after = 1',
    ].join('\n')
    const [block] = parseSource('src/a.ts', text).blocks
    if (block === undefined) throw new Error('no block')
    expect(commentRanges(block).map(({ text, line }) => [text, line])).toEqual([
      ['// trailing', 1],
      ['/* block */', 4],
    ])
  })

  it('attaches only the contiguous run of comments right above a node', () => {
    const text = `// file header

// first part of the doc
/** second part */
// @spec-link [[x]]
export function f() {}
`
    const { block, statement } = statementOf('src/a.ts', text, 0, 0)
    expect(attachedComments(block, statement).map(({ text, line }) => [text, line])).toEqual([
      ['// first part of the doc', 3],
      ['/** second part */', 4],
      ['// @spec-link [[x]]', 5],
    ])
  })

  it('attaches nothing when a blank line separates the last comment from the node', () => {
    const { block, statement } = statementOf('src/a.ts', '// header\n\nconst a = 1\n', 0, 0)
    expect(attachedComments(block, statement)).toEqual([])
  })
})

describe('bypass detection', () => {
  it('counts a token only at the start of a comment line', () => {
    expect(bypassTokensIn('// @lint-ignore-all generated code')).toEqual(['@lint-ignore-all'])
    expect(bypassTokensIn('/**\n * Vendored.\n * @lint-ignore-complexity\n */')).toEqual([
      '@lint-ignore-complexity',
    ])
    expect(bypassTokensIn('<!-- @lint-ignore-atd -->')).toEqual(['@lint-ignore-atd'])
    expect(bypassTokensIn('// never use @lint-ignore-all on your own code')).toEqual([])
    expect(bypassTokensIn('// @lint-ignore-allowed is not a token')).toEqual([])
  })

  it('collects the tokens of script and template comments but not of strings', () => {
    const script = "// @lint-ignore-documentation\nconst s = '@lint-ignore-all'\n"
    expect([...parseSource('src/a.ts', script).bypass]).toEqual(['@lint-ignore-documentation'])
    const vue = '<template>\n  <!-- @lint-ignore-file-bloating -->\n  <p />\n</template>\n'
    expect([...parseSource('src/V.vue', vue).bypass]).toEqual(['@lint-ignore-file-bloating'])
  })
})

describe('isTestFile', () => {
  it('recognizes files under tests/ and spec or test files anywhere', () => {
    expect(isTestFile('tests/e2e/helpers.ts')).toBe(true)
    expect(isTestFile('src/a.spec.ts')).toBe(true)
    expect(isTestFile('scripts/b.test.mjs')).toBe(true)
    expect(isTestFile('src/testing.ts')).toBe(false)
    expect(isTestFile('src/latest/a.ts')).toBe(false)
  })
})

describe('discovery and atom ids over a temporary tree', () => {
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-health-sources-'))
    const files = [
      'src/a.ts',
      'src/nested/B.vue',
      'src/types.d.ts',
      'src/readme.md',
      'src/node_modules/x.ts',
      'src/dist-harness/x.ts',
      'dist/x.js',
      '.cache/x.ts',
      'src/coverage/x.ts',
      'scripts/c.mjs',
    ]
    for (const file of files) {
      await mkdir(dirname(join(root, file)), { recursive: true })
      await writeFile(join(root, file), '')
    }
    await mkdir(join(root, 'docs/nested'), { recursive: true })
    await writeFile(join(root, 'docs/one.atom.md'), '---\nid: atom_one\nstatus: DRAFT\n---\n')
    await writeFile(join(root, 'docs/two.atom.md'), "---\nid: 'atom_two'\n---\n# id: no\n")
    await writeFile(join(root, 'docs/nested/three.atom.md'), '---\nid: atom_three\n---\n')
    await writeFile(join(root, 'docs/notes.md'), '---\nid: not_an_atom\n---\n')
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('finds source files and skips installed, build, coverage and dot directories', async () => {
    expect(await discoverSourceFiles(root, [root])).toEqual([
      'scripts/c.mjs',
      'src/a.ts',
      'src/nested/B.vue',
      'src/types.d.ts',
    ])
  })

  it('narrows to the given files and directories and rejects anything else', async () => {
    const targets = [join(root, 'scripts'), join(root, 'src/a.ts'), join(root, 'src/a.ts')]
    expect(await discoverSourceFiles(root, targets)).toEqual(['scripts/c.mjs', 'src/a.ts'])
    await expect(discoverSourceFiles(root, [join(root, 'src/readme.md')])).rejects.toThrow(
      'not a source file',
    )
    await expect(discoverSourceFiles(root, [join(root, 'missing')])).rejects.toThrow('ENOENT')
    await expect(discoverSourceFiles(join(root, 'src'), [join(root, 'scripts')])).rejects.toThrow(
      'outside the repository root',
    )
  })

  it('reads atom ids from the frontmatter of the top-level docs/*.atom.md files', async () => {
    expect([...(await loadAtomIds(root))].sort()).toEqual(['atom_one', 'atom_two'])
  })
})
