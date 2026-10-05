// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { analyzeSource } from '../../../scripts/code-health/analyze.mjs'
import { checkAtd, isAtdScopeExempt } from '../../../scripts/code-health/rules/atd.mjs'
import { parseSource } from '../../../scripts/code-health/sources.mjs'

/** The atom ids the fixtures may link: `alpha`, `beta` and `atom1` to `atom12`. */
const atomIds = new Set(['alpha', 'beta', ...Array.from({ length: 12 }, (_, i) => `atom${i + 1}`)])

/** Intent: the atd findings of one file, as `LEVEL line message` strings in report order. */
function atdOf(path: string, text: string): string[] {
  return checkAtd(parseSource(path, text), { atomIds })
    .map((finding) => `${finding.level} ${finding.line} ${finding.message}`)
    .sort()
}

/** Intent: a module of one exported function per id, each linked to that id. */
function linkedFunctions(ids: string[]): string {
  return ids
    .map((id, index) => `// @spec-link [[${id}]]\nexport function f${index}() {}`)
    .join('\n')
}

/** Intent: the ids `atom1` to `atom<count>`. */
function atomRange(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `atom${index + 1}`)
}

/** Message of an unattached-link finding for a `@spec-link` to `id`. */
const unattached = (id: string) =>
  `atd: unattached @spec-link [[${id}]], put it directly above a declaration, a top-level call or a test call`

describe('atd link presence', () => {
  it('reports a file without any link at line 1', () => {
    expect(atdOf('src/a.ts', "import x from './x'\nexport const a = x\n")).toEqual([
      'ERROR 1 atd: no ATD link in file',
    ])
  })

  it('exempts a file with nothing to link: imports, re-exports and triple-slash directives', () => {
    const text = `/// <reference types="vite/client" />
import './setup'
import type { Kind } from './kinds'
export * from './all'
export { first, type Second } from './more'
`
    expect(atdOf('src/index.ts', text)).toEqual([])
    expect(atdOf('src/env.d.ts', '/// <reference types="vite/client" />\n')).toEqual([])
  })
})

describe('atd scope: business behaviour only', () => {
  /** An unlinked module and an unlinked suite: each needs a link wherever ATD applies. */
  const unlinkedModule = 'export const a = 1\n'
  const unlinkedSuite = "describe('suite', () => {})\n"
  const noLink = ['ERROR 1 atd: no ATD link in file']

  it('exempts repo tooling and the specs of that tooling from the link requirement', () => {
    expect(atdOf('scripts/tool.mjs', unlinkedModule)).toEqual([])
    expect(atdOf('scripts/code-health/rules/x.mjs', unlinkedModule)).toEqual([])
    expect(atdOf('tests/unit/code-health/x.spec.ts', unlinkedSuite)).toEqual([])
  })

  it.each([
    'tests/fixtures/midi/score.ts',
    'tests/unit/helpers/fake-clock.ts',
    'tests/e2e/notation-harness/main.ts',
    'tests/e2e/workspace-harness/audio-seams.ts',
    'tests/e2e/workspace/workspace-window.d.ts',
  ])('exempts the non-spec test plumbing file %s', (path) => {
    expect(atdOf(path, unlinkedModule)).toEqual([])
  })

  it.each([
    'tests/perf/generation-latency.perf.ts',
    'tests/e2e/workspace/generation-latency.spec.ts',
    'tests/e2e/workspace/engraving-main-thread.spec.ts',
    'tests/e2e/session/rolling-display-timing.spec.ts',
  ])('exempts the measurement harness %s', (path) => {
    expect(atdOf(path, unlinkedSuite)).toEqual([])
  })

  it('keeps specs of business behaviour and source files in scope', () => {
    expect(atdOf('tests/unit/a.spec.ts', unlinkedSuite)).toEqual(noLink)
    expect(atdOf('tests/e2e/session/play.spec.ts', unlinkedSuite)).toEqual(noLink)
    expect(atdOf('src/x.test.ts', unlinkedSuite)).toEqual(noLink)
    expect(atdOf('src/a.ts', unlinkedModule)).toEqual(noLink)
    expect(isAtdScopeExempt('src/scripts/a.ts')).toBe(false)
    expect(isAtdScopeExempt('tests/unit/code-healthy.spec.ts')).toBe(false)
  })

  it('applies no distinct-atom limit to an exempt file', () => {
    expect(atdOf('scripts/tool.mjs', linkedFunctions(atomRange(12)))).toEqual([])
    expect(atdOf('src/a.ts', linkedFunctions(atomRange(12)))).toEqual([
      'ERROR 1 atd: 12 distinct atom ids linked, above the error limit of 10',
    ])
  })

  it('still checks the links an exempt file carries', () => {
    expect(atdOf('scripts/tool.mjs', '// @spec-link [[ghost]]\nexport const a = 1\n')).toEqual([
      'ERROR 1 atd: phantom atom id [[ghost]], no docs/*.atom.md defines it',
    ])
    expect(atdOf('scripts/tool.mjs', '// @test-link [[alpha]]\n\nexport const a = 1\n')).toEqual([
      `ERROR 1 atd: unattached @test-link [[alpha]], put it directly above a declaration, a top-level call or a test call`,
      'WARN 1 atd: @test-link [[alpha]] in a source file, use @spec-link',
    ])
    expect(atdOf('tests/fixtures/a.ts', '// @spec-link [[alpha]]\nexport const a = 1\n')).toEqual([
      'ERROR 1 atd: @spec-link [[alpha]] in a test file, use @test-link',
    ])
  })
})

describe('atd distinct-atom spread', () => {
  it('accepts up to 5 distinct ids, warns from 6 to 10 and errors from 11, at line 1', () => {
    expect(atdOf('src/a.ts', linkedFunctions(atomRange(5)))).toEqual([])
    expect(atdOf('src/a.ts', linkedFunctions(atomRange(6)))).toEqual([
      'WARN 1 atd: 6 distinct atom ids linked, above the warning limit of 5',
    ])
    expect(atdOf('src/a.ts', linkedFunctions(atomRange(10)))).toEqual([
      'WARN 1 atd: 10 distinct atom ids linked, above the warning limit of 5',
    ])
    expect(atdOf('src/a.ts', linkedFunctions(atomRange(11)))).toEqual([
      'ERROR 1 atd: 11 distinct atom ids linked, above the error limit of 10',
    ])
  })

  it('counts an id linked several times once', () => {
    const ids = [...atomRange(5), 'atom1', 'atom2', 'atom3']
    expect(atdOf('src/a.ts', linkedFunctions(ids))).toEqual([])
  })
})

describe('atd link kind by file kind', () => {
  it('rejects a @spec-link in a test file, under tests/ or named *.spec.*', () => {
    const text = "// @spec-link [[alpha]]\ndescribe('a', () => {})\n"
    const expected = ['ERROR 1 atd: @spec-link [[alpha]] in a test file, use @test-link']
    expect(atdOf('tests/unit/a.spec.ts', text)).toEqual(expected)
    expect(atdOf('src/x.spec.ts', text)).toEqual(expected)
  })

  it('warns about a @test-link in a source file', () => {
    expect(atdOf('src/a.ts', '// @test-link [[alpha]]\nexport const a = 1\n')).toEqual([
      'WARN 1 atd: @test-link [[alpha]] in a source file, use @spec-link',
    ])
  })
})

describe('atd phantom ids', () => {
  it('reports an id no atom defines at the line of its link', () => {
    const text = `// @spec-link [[alpha]]
export const a = 1
/**
 * Intent: two links in one doc comment.
 * @spec-link [[alpha]]
 * @spec-link [[ghost]]
 */
export const b = 2
`
    expect(atdOf('src/a.ts', text)).toEqual([
      'ERROR 6 atd: phantom atom id [[ghost]], no docs/*.atom.md defines it',
    ])
  })
})

describe('atd link attachment in scripts', () => {
  it.each([
    ['function', 'export function run() {}'],
    ['class', 'export class Box {}'],
    ['method', 'export class Box {\n  // @spec-link [[beta]]\n  open() {}\n}'],
    ['class property', 'export class Box {\n  // @spec-link [[beta]]\n  size = 1\n}'],
    ['interface', 'export interface Shape {\n  size: number\n}'],
    ['type alias', 'export type Id = string'],
    ['enum', 'export enum Mode {\n  On,\n}'],
    ['exported const', 'export const limit = 3'],
    ['object property', 'export const table = {\n  // @spec-link [[beta]]\n  key: 1,\n}'],
    ['object method', 'export const table = {\n  // @spec-link [[beta]]\n  run() {},\n}'],
    ['interface property', 'export interface Shape {\n  // @spec-link [[beta]]\n  size: number\n}'],
    ['interface method', 'export interface Shape {\n  // @spec-link [[beta]]\n  area(): number\n}'],
    ['call signature', 'export interface Fn {\n  // @spec-link [[beta]]\n  (x: number): void\n}'],
    [
      'construct signature',
      'export interface Ctor {\n  // @spec-link [[beta]]\n  new (): object\n}',
    ],
    [
      'index signature',
      'export interface Bag {\n  // @spec-link [[beta]]\n  [key: string]: number\n}',
    ],
    ['type-literal member', 'export type Pair = {\n  // @spec-link [[beta]]\n  left: number\n}'],
    ['enum member', 'export enum Mode {\n  // @spec-link [[beta]]\n  On,\n}'],
    ['local export list', 'export { a }\n// @spec-link [[beta]]\nconst a = 1'],
    ['re-export list', "export { a, type B } from './x'"],
    ['star re-export', "export * from './y'"],
    ['namespace re-export', "export * as z from './z'"],
    ['top-level call', "app.mount('#app')"],
    ['top-level awaited call', 'await ready()'],
    ['top-level void call', 'void promise.then(() => {})'],
    ['top-level parenthesized call', '(start())'],
  ])('accepts a link directly above a %s', (_kind, code) => {
    expect(
      atdOf('src/a.ts', `/** Intent: documented. */\n// @spec-link [[alpha]]\n${code}\n`),
    ).toEqual([])
  })

  it('accepts links above test-framework calls and declarations nested in their callbacks', () => {
    const text = `// @test-link [[alpha]]
describe('suite', () => {
  // @test-link [[alpha]]
  const helper = 1
  // @test-link [[alpha]]
  it('works', () => {})
  // @test-link [[alpha]]
  it.each([1, 2])('case %i', () => {})
})
// @test-link [[alpha]]
test.describe('end to end', () => {})
`
    expect(atdOf('tests/unit/a.spec.ts', text)).toEqual([])
  })

  it('rejects a link above a call statement nested in a function body', () => {
    const text = `// @spec-link [[alpha]]
export function run() {
  // @spec-link [[beta]]
  foo()
}
`
    expect(atdOf('src/main.ts', text)).toEqual([`ERROR 3 ${unattached('beta')}`])
  })

  it('rejects a link above a top-level statement that is not a call', () => {
    const text = `// @spec-link [[alpha]]
export const ready = true
// @spec-link [[beta]]
if (ready) start()
`
    expect(atdOf('src/main.ts', text)).toEqual([`ERROR 3 ${unattached('beta')}`])
  })

  it('rejects a file-header link separated from the code by a blank line', () => {
    expect(atdOf('src/a.ts', '// @spec-link [[alpha]]\n\nexport const a = 1\n')).toEqual([
      `ERROR 1 ${unattached('alpha')}`,
    ])
  })

  it('rejects a trailing link on a code line', () => {
    const text = 'export const a = 1 // @spec-link [[alpha]]\nexport const b = 2\n'
    expect(atdOf('src/a.ts', text)).toEqual([`ERROR 1 ${unattached('alpha')}`])
  })

  it('ignores link-like text inside strings and template literals', () => {
    const text = `// @spec-link [[alpha]]
export const quoted = '// @spec-link [[ghost]]'
// @spec-link [[alpha]]
export const template = \`
// @test-link [[ghost]]
\`
`
    expect(atdOf('src/a.ts', text)).toEqual([])
  })
})

describe('atd links in .vue files', () => {
  it('maps <script setup> links to their original line', () => {
    const text = `<template>
  <p>hello</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// @spec-link [[alpha]]
const open = ref(false)
// @spec-link [[ghost]]
const shut = ref(true)
</script>
`
    expect(atdOf('src/C.vue', text)).toEqual([
      'ERROR 10 atd: phantom atom id [[ghost]], no docs/*.atom.md defines it',
    ])
  })

  it('accepts and counts a template link directly before an element', () => {
    const text = `<template>
  <section>
    <!-- @spec-link [[alpha]] -->
    <p>hello</p>
    <!-- @spec-link [[ghost]] -->
    <p>world</p>
  </section>
</template>
`
    expect(atdOf('src/C.vue', text)).toEqual([
      'ERROR 5 atd: phantom atom id [[ghost]], no docs/*.atom.md defines it',
    ])
  })

  it('rejects a template link followed by text or by nothing', () => {
    const text = `<template>
  <p>
    <!-- @spec-link [[alpha]] -->
    plain text
  </p>
  <div>
    <!-- @spec-link [[beta]] -->
  </div>
</template>
`
    expect(atdOf('src/C.vue', text)).toEqual([
      `ERROR 3 ${unattached('alpha')}`,
      `ERROR 7 ${unattached('beta')}`,
    ])
  })
})

describe('atd bypass tokens', () => {
  /** Intent: the atd findings of a source file analyzed with every rule and its bypasses. */
  const bypassedOf = (text: string) =>
    analyzeSource({ path: 'src/a.ts', text, atomIds }).filter((finding) => finding.rule === 'atd')

  it('is reported when no token, or another rule token, is present', () => {
    expect(bypassedOf('export const a = 1\n')).toHaveLength(1)
    expect(bypassedOf('// @lint-ignore-complexity\nexport const a = 1\n')).toHaveLength(1)
  })

  it('is suppressed by @lint-ignore-atd and by @lint-ignore-all', () => {
    expect(bypassedOf('// @lint-ignore-atd vendored\nexport const a = 1\n')).toEqual([])
    expect(bypassedOf('/* @lint-ignore-all generated */\nexport const a = 1\n')).toEqual([])
  })

  it('lets @lint-ignore-atd bypass the whole rule in a source file', () => {
    const text =
      '// @lint-ignore-atd debug-only module\n// @spec-link [[ghost]]\nexport const a = 1\n'
    expect(bypassedOf('// @lint-ignore-atd debug-only module\nexport const a = 1\n')).toEqual([])
    expect(bypassedOf(text)).toEqual([])
  })
})
