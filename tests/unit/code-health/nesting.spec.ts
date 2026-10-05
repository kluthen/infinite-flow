// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { analyzeSource } from '../../../scripts/code-health/analyze.mjs'
import { checkNesting } from '../../../scripts/code-health/rules/nesting.mjs'
import { parseSource } from '../../../scripts/code-health/sources.mjs'

/** Intent: the nesting findings of a file given its repo-relative path and text. */
function nestingOf(path: string, text: string) {
  return checkNesting(parseSource(path, text))
}

/** Intent: the nesting findings of a TypeScript file analyzed with every rule and its bypasses. */
function analyzedNestingOf(text: string) {
  return analyzeSource({ path: 'src/deep.ts', text, atomIds: new Set() }).filter(
    (finding) => finding.rule === 'nesting',
  )
}

/**
 * Intent: a function `deep` whose body nests `levels` constructs, each an `if (c) {`, then
 * `statement` at the innermost level. Line 1 is the function header; the construct at depth N
 * opens on line N + 1.
 */
function nestedIfs(levels: number, statement = 'work()'): string {
  const opens = Array.from({ length: levels }, () => 'if (c) {')
  return ['function deep(c: boolean) {', ...opens, statement, ...opens.map(() => '}'), '}'].join(
    '\n',
  )
}

/** Intent: a function `deep` with four nested `if`s around one `construct` placed at depth 5. */
function withFifthLevel(construct: string): string {
  return nestedIfs(4, construct)
}

describe('nesting rule', () => {
  it('passes a function nested exactly MAX_NESTING (4) deep', () => {
    expect(nestingOf('src/deep.ts', nestedIfs(4))).toEqual([])
  })

  it('reports depth 5 at the line of the fifth construct, with the function name', () => {
    expect(nestingOf('src/deep.ts', nestedIfs(5))).toEqual([
      {
        level: 'ERROR',
        rule: 'nesting',
        path: 'src/deep.ts',
        line: 6,
        message: 'nesting: depth 5 exceeds 4 in deep',
      },
    ])
  })

  it('reports the maximum depth once per function, at the first construct past the limit', () => {
    const text = [
      'function deep(c: boolean) {',
      'if (c) { if (c) { if (c) { if (c) {',
      '  if (c) { work() }',
      '  if (c) { if (c) { work() } }',
      '} } } }',
      '}',
    ].join('\n')
    const findings = nestingOf('src/deep.ts', text)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ line: 3, message: 'nesting: depth 6 exceeds 4 in deep' })
  })

  it.each([
    ['if', 'if (c) { work() }'],
    ['for', 'for (let i = 0; i < 2; i++) { work() }'],
    ['for-in', 'for (const key in object) { work() }'],
    ['for-of', 'for (const item of items) { work() }'],
    ['while', 'while (c) { work() }'],
    ['do', 'do { work() } while (c)'],
    ['switch', 'switch (c) { case true: work() }'],
    ['try/catch', 'try { work() } catch { work() }'],
    ['try/finally', 'try { work() } finally { work() }'],
  ])('counts %s as one level', (_construct, statement) => {
    expect(nestingOf('src/deep.ts', withFifthLevel(statement))).toMatchObject([
      { line: 6, message: 'nesting: depth 5 exceeds 4 in deep' },
    ])
  })

  it.each([
    ['a switch case body', 'switch (c) { case true: { if (c) { work() } } }'],
    ['a catch body', 'try { work() } catch { if (c) { work() } }'],
    ['a finally body', 'try { work() } finally { if (c) { work() } }'],
    ['an else body', 'if (c) { work() } else { if (c) { work() } }'],
  ])('keeps %s at the depth of its construct', (_part, statement) => {
    expect(nestingOf('src/deep.ts', nestedIfs(2, statement))).toEqual([])
    expect(nestingOf('src/deep.ts', nestedIfs(3, statement))).toMatchObject([
      { message: 'nesting: depth 5 exceeds 4 in deep' },
    ])
  })

  it('counts an else-if chain of six branches once', () => {
    const chain = Array.from({ length: 6 }, (_, index) => `if (c === ${index}) { work() }`)
    const text = ['function chained(c: number) {', chain.join(' else '), '}'].join('\n')
    const deeper = nestedIfs(3, chain.join(' else '))
    expect(nestingOf('src/chain.ts', text)).toEqual([])
    expect(nestingOf('src/chain.ts', deeper)).toEqual([])
  })

  it('does not count ternaries, logical operators or labeled statements', () => {
    const statement = 'outer: for (const item of items) { if (c) { use(c ? (c && item) : !c) } }'
    expect(nestingOf('src/deep.ts', nestedIfs(2, statement))).toEqual([])
    expect(nestingOf('src/deep.ts', nestedIfs(3, statement))).toMatchObject([
      { message: 'nesting: depth 5 exceeds 4 in deep' },
    ])
  })

  it.each([
    ['a function declaration', 'function inner() { if (c) { work() } }'],
    ['a function expression', 'const inner = function () { if (c) { work() } }'],
    ['an arrow function', 'items.forEach((item) => { if (item) { work() } })'],
    ['an object method', 'const object = { inner() { if (c) { work() } } }'],
    ['a class method', 'class Inner { run() { if (c) { work() } } }'],
  ])('starts a new count in %s nested in a deep function', (_kind, statement) => {
    expect(nestingOf('src/deep.ts', nestedIfs(4, statement))).toEqual([])
  })

  it('names the nested function that exceeds the limit, or calls it anonymous', () => {
    const body = nestedIfs(5).split('\n').slice(1, -1).join('\n')
    const text = [
      `const named = () => {\n${body}\n}`,
      `class Owner {\nmethod() {\n${body}\n}\n}`,
      `items.forEach(function () {\n${body}\n})`,
    ].join('\n')
    expect(nestingOf('src/deep.ts', text).map((finding) => finding.message)).toEqual([
      'nesting: depth 5 exceeds 4 in named',
      'nesting: depth 5 exceeds 4 in method',
      'nesting: depth 5 exceeds 4 in anonymous function',
    ])
  })

  it('counts module-level code as "module scope"', () => {
    const body = nestedIfs(5).split('\n').slice(1, -1).join('\n')
    expect(nestingOf('scripts/deep.mjs', body)).toEqual([
      {
        level: 'ERROR',
        rule: 'nesting',
        path: 'scripts/deep.mjs',
        line: 5,
        message: 'nesting: depth 5 exceeds 4 in module scope',
      },
    ])
  })

  it('maps a .vue <script setup> finding to its line in the original file', () => {
    const text = ['<template>', '  <p>deep</p>', '</template>', '', '<script setup lang="ts">']
      .concat(nestedIfs(5).split('\n'), ['</script>'])
      .join('\n')
    expect(nestingOf('src/Deep.vue', text)).toMatchObject([
      { path: 'src/Deep.vue', line: 11, message: 'nesting: depth 5 exceeds 4 in deep' },
    ])
  })

  it.each(['// @lint-ignore-complexity', '/* @lint-ignore-all */'])(
    'is suppressed by %s',
    (token) => {
      expect(analyzedNestingOf(nestedIfs(5))).toHaveLength(1)
      expect(analyzedNestingOf(`${token}\n${nestedIfs(5)}`)).toEqual([])
    },
  )
})
