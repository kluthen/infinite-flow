// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { analyzeSource } from '../../../scripts/code-health/analyze.mjs'
import { checkSize, effectiveLineCount } from '../../../scripts/code-health/rules/size.mjs'
import { parseSource } from '../../../scripts/code-health/sources.mjs'

/** Intent: the effective line count of a file given its repo-relative path and text. */
function countOf(path: string, text: string): number {
  return effectiveLineCount(parseSource(path, text))
}

/** Intent: a module of exactly `count` effective lines of code, one constant per line. */
function linesOfCode(count: number): string {
  return Array.from({ length: count }, (_, index) => `const value${index} = ${index}`).join('\n')
}

/** Intent: the size findings of a TypeScript file analyzed with every rule and its bypasses. */
function sizeFindingsOf(text: string) {
  return analyzeSource({ path: 'src/big.ts', text, atomIds: new Set() }).filter(
    (finding) => finding.rule === 'size',
  )
}

describe('effective lines of code', () => {
  it('skips blank and comment-only lines, block comments included', () => {
    const text = `// a line comment

/**
 * A doc block.
 */
const a = 1 // code with a trailing comment
/* inline */ const b = 2
/* one */ /* two */
   /*
     still a comment
   */
`
    expect(countOf('src/a.ts', text)).toBe(2)
  })

  it('skips import and re-export statements, multi-line ones included', () => {
    const text = `import {
  first,
  second,
} from './things'
import type { Kind } from './kinds'
import fs = require('node:fs')
export * from './all'
export {
  third,
} from './more'
export const used: Kind = first + second
export { used as alias }
`
    expect(countOf('src/a.ts', text)).toBe(2)
  })

  it('counts a whole .vue file, its template and style comments as comments', () => {
    const text = `<script setup lang="ts">
// a comment
import { ref } from 'vue'
const open = ref(false)
</script>

<template>
  <!-- a template comment -->
  <!--
    spanning lines
  -->
  <p>{{ open }}</p>
</template>

<style scoped>
/* a style comment */
p {
  margin: 0;
}
</style>
`
    // Code: 2 script tag lines, the const, 2 template tag lines, the <p>, 2 style tag lines and the
    // 3 lines of the CSS rule.
    expect(countOf('src/C.vue', text)).toBe(11)
  })
})

describe('size thresholds', () => {
  it('reports nothing up to 400 effective lines', () => {
    expect(checkSize(parseSource('src/a.ts', linesOfCode(400)))).toEqual([])
  })

  it('warns from 401 to 600 effective lines and errors from 601, at line 1', () => {
    expect(checkSize(parseSource('src/a.ts', linesOfCode(401)))).toEqual([
      {
        level: 'WARN',
        rule: 'size',
        path: 'src/a.ts',
        line: 1,
        message: 'size: 401 effective lines of code exceed the warning limit of 400',
      },
    ])
    expect(checkSize(parseSource('src/a.ts', linesOfCode(600))).map((f) => f.level)).toEqual([
      'WARN',
    ])
    expect(checkSize(parseSource('src/a.ts', linesOfCode(601)))).toEqual([
      {
        level: 'ERROR',
        rule: 'size',
        path: 'src/a.ts',
        line: 1,
        message: 'size: 601 effective lines of code exceed the error limit of 600',
      },
    ])
  })
})

describe('size bypass tokens', () => {
  it('is reported when no token, or another rule token, is present', () => {
    expect(sizeFindingsOf(linesOfCode(601))).toHaveLength(1)
    expect(sizeFindingsOf(`// @lint-ignore-complexity\n${linesOfCode(601)}`)).toHaveLength(1)
  })

  it('is suppressed by @lint-ignore-file-bloating and by @lint-ignore-all', () => {
    expect(sizeFindingsOf(`// @lint-ignore-file-bloating\n${linesOfCode(601)}`)).toEqual([])
    expect(sizeFindingsOf(`/* @lint-ignore-all vendored */\n${linesOfCode(601)}`)).toEqual([])
  })
})
