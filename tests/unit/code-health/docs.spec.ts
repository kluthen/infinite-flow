// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { analyzeSource } from '../../../scripts/code-health/analyze.mjs'
import { checkDocs } from '../../../scripts/code-health/rules/docs.mjs'
import { parseSource } from '../../../scripts/code-health/sources.mjs'

/** Intent: the docs findings of one file, as `LEVEL line message` strings in source order. */
function docsOf(path: string, text: string): string[] {
  return checkDocs(parseSource(path, text))
    .sort((left, right) => left.line - right.line)
    .map((finding) => `${finding.level} ${finding.line} ${finding.message}`)
}

/** Intent: the docs findings of a TypeScript source file under src/. */
function docsOfModule(text: string): string[] {
  return docsOf('src/module.ts', text)
}

/** Intent: the expected text of a missing-doc finding on a non-exported function. */
function warn(line: number, name: string): string {
  return `WARN ${line} docs: missing intent comment on function ${name}`
}

/** Intent: the expected text of a missing-doc finding on an exported function. */
function error(line: number, name: string): string {
  return `ERROR ${line} docs: missing intent comment on exported function ${name}`
}

describe('docs rule: function kinds', () => {
  it('reports undocumented function declarations and accepts documented ones', () => {
    const text = `/** Intent: adds one. */
function documented(value: number) {
  return value + 1
}
function bare() {
  function inner() {}
  return inner
}
`
    expect(docsOfModule(text)).toEqual([warn(5, 'bare'), warn(6, 'inner')])
  })

  it('lets a doc on the first overload signature cover the implementation', () => {
    const documented = `/** Intent: the value as text. */
export function format(value: number): string
export function format(value: string): string
export function format(value: number | string): string {
  return String(value)
}
`
    expect(docsOfModule(documented)).toEqual([])
    const bare = `export function format(value: number): string
export function format(value: string): string
export function format(value: number | string): string {
  return String(value)
}
`
    expect(docsOfModule(bare)).toEqual([error(1, 'format')])
  })

  it('checks class methods and accessors but exempts constructors', () => {
    const text = `class Counter {
  constructor(private count: number) {}
  increment() {
    this.count += 1
  }
  get value() {
    return this.count
  }
  set value(next: number) {
    this.count = next
  }
  /** Intent: back to zero. */
  reset() {
    this.count = 0
  }
}
`
    expect(docsOfModule(text)).toEqual([
      warn(3, 'Counter.increment'),
      warn(6, 'Counter.value'),
      warn(9, 'Counter.value'),
    ])
  })

  it('checks arrows and function expressions assigned to const, let and var', () => {
    const text = `const arrow = () => 1
let expression = function () {
  return 2
}
var wrapped = (async (value: number) => value) as (value: number) => Promise<number>
/** Intent: three. */
const documented = () => 3
`
    expect(docsOfModule(text)).toEqual([
      warn(1, 'arrow'),
      warn(2, 'expression'),
      warn(5, 'wrapped'),
    ])
  })

  it('checks object property arrows and object-literal methods', () => {
    const text = `const handlers = {
  onStart: () => 1,
  onStop() {
    return 2
  },
  /** Intent: pauses. */
  onPause: function () {
    return 3
  },
  label: 'handlers',
}
`
    expect(docsOfModule(text)).toEqual([warn(2, 'onStart'), warn(3, 'onStop')])
  })
})

describe('docs rule: export level', () => {
  it('reports exported functions as errors in every export form', () => {
    const text = `export function declared() {}
export const arrow = () => 1
function listed() {}
const renamed = function () {}
function local() {}
export { listed, renamed as alias }
`
    expect(docsOfModule(text)).toEqual([
      error(1, 'declared'),
      error(2, 'arrow'),
      error(3, 'listed'),
      error(4, 'renamed'),
      warn(5, 'local'),
    ])
  })

  it('reports an export default function as an error, named or not', () => {
    expect(docsOfModule('export default function main() {}\n')).toEqual([error(1, 'main')])
    expect(docsOfModule('export default function () {}\n')).toEqual([error(1, 'default')])
  })

  it('reports only the public members of an exported class as errors', () => {
    const text = `export class Store {
  read() {}
  static create() {}
  private write() {}
  protected flush() {}
  #reset() {}
}
class Hidden {
  read() {}
}
`
    expect(docsOfModule(text)).toEqual([
      error(2, 'Store.read'),
      error(3, 'Store.create'),
      warn(4, 'Store.write'),
      warn(5, 'Store.flush'),
      warn(6, 'Store.#reset'),
      warn(9, 'Hidden.read'),
    ])
  })
})

describe('docs rule: what counts as a doc', () => {
  it('does not count ATD links or tool directives as a doc', () => {
    const text = `// @spec-link [[some_atom]]
export function linked() {}
// eslint-disable-next-line no-console
// @ts-expect-error legacy call
function directives() {}
`
    expect(docsOfModule(text)).toEqual([error(2, 'linked'), warn(5, 'directives')])
  })

  it('does not count a comment separated from the function by a blank line', () => {
    const text = `/** Intent: a file header, not a doc. */

export function detached() {}
`
    expect(docsOfModule(text)).toEqual([error(3, 'detached')])
  })

  it('accepts a JSDoc followed by an ATD link, and JSDoc tag lines with prose', () => {
    const text = `/**
 * Intent: parses the input.
 */
// @spec-link [[some_atom]]
export function parse() {}
/**
 * @param value the value to double
 */
// @spec-link [[some_atom]]
export function double(value: number) {
  return value * 2
}
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('does not count JSDoc tag lines left without prose once the tag, type and name are removed', () => {
    const text = `/** @returns {number} */
export function count() {
  return 1
}
/** @param {string} x */
export function voiceOf(x: string) {
  return x
}
/** @param {string} x the voice id */
export function described(x: string) {
  return x
}
`
    expect(docsOfModule(text)).toEqual([error(2, 'count'), error(6, 'voiceOf')])
  })
})

describe('docs rule: exemptions', () => {
  it('exempts anonymous inline callbacks', () => {
    const text = `/** Intent: doubled values. */
export function doubled(values: number[]) {
  return values.map((value) => value * 2).filter(function (value) {
    return value > 0
  })
}
setTimeout(() => {}, 10)
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('exempts test-framework callbacks of every form', () => {
    const text = `describe('suite', () => {
  beforeEach(() => {})
  it('works', () => {})
  test('works too', async () => {})
  it.each([1, 2])('handles %i', (value) => {})
  test.describe('group', () => {
    test('step by step', async () => {
      await test.step('first', async () => {})
    })
  })
})
`
    expect(docsOf('tests/unit/suite.spec.ts', text)).toEqual([])
  })

  it('still checks named helpers declared inside test callbacks', () => {
    const text = `describe('suite', () => {
  const helper = () => 1
  it('works', () => {
    expect(helper()).toBe(1)
  })
})
`
    expect(docsOf('tests/unit/suite.spec.ts', text)).toEqual([warn(2, 'helper')])
  })

  it('exempts signatures without a body', () => {
    const declarations = `declare function external(value: number): string
export declare function exported(): void
interface Shape {
  area(): number
}
`
    expect(docsOf('src/types.d.ts', declarations)).toEqual([])
    const abstract = `/** Intent: a shape. */
export abstract class Shape {
  abstract area(): number
}
`
    expect(docsOfModule(abstract)).toEqual([])
  })
})

describe('docs rule: members of typed object literals', () => {
  it('exempts members of a returned literal and of an arrow expression body', () => {
    const text = `/** Intent: a fake clock. */
export function createClock(): Clock {
  return {
    now: () => 0,
    tick() {},
  }
}
/** Intent: a fake timer. */
export const createTimer = (): Timer => ({ start: () => 1, stop() {} })
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('exempts members of a literal passed to a call or a constructor', () => {
    const text = `register({ onStart: () => 1, onStop() {} })
const store = new Store({ load: function () {}, save() {} })
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('exempts members of a literal under satisfies or as', () => {
    const text = `const ports = { play: () => {}, stop() {} } satisfies Ports
const fake = ({ read: () => 1 } as unknown) as Reader
const legacy = <Writer>{ write() {} }
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('exempts members of a literal initializing an annotated variable, property or parameter', () => {
    const text = `const ports: Ports = { play: () => {}, stop() {} }
/** Intent: a player. */
class Player {
  private ports: Ports = { play: () => {} }
  /** Intent: starts with the given ports. */
  start(ports: Ports = { stop() {} }) {}
}
`
    expect(docsOfModule(text)).toEqual([])
  })

  it('exempts literals nested as property values of an exempt literal, not other nesting', () => {
    const text = `const deps: Deps = {
  audio: { play: () => {}, mixer: { mute() {} } },
  list: [{ pick: () => 1 }],
}
`
    expect(docsOfModule(text)).toEqual([warn(3, 'pick')])
  })

  it('still checks members of an un-annotated free-standing literal', () => {
    const text = `export const api = {
  fetch: () => 1,
  save() {},
}
let nested = { inner: { run: () => 2 } }
`
    expect(docsOfModule(text)).toEqual([warn(2, 'fetch'), warn(3, 'save'), warn(5, 'run')])
  })
})

describe('docs rule: single-file components and bypasses', () => {
  it('reports script-setup functions as warnings at their original line', () => {
    const text = `<template>
  <p>{{ label }}</p>
</template>

<script setup lang="ts">
const label = 'hello'
function shout() {
  return label.toUpperCase()
}
const whisper = () => label.toLowerCase()
</script>
`
    expect(docsOf('src/Hello.vue', text)).toEqual([warn(7, 'shout'), warn(10, 'whisper')])
  })

  it('reports exports of a plain script block as errors', () => {
    const text = `<script lang="ts">
export function helper() {}
</script>

<template><p>hi</p></template>
`
    expect(docsOf('src/Plain.vue', text)).toEqual([error(2, 'helper')])
  })

  it('is suppressed by @lint-ignore-documentation and @lint-ignore-all', () => {
    /** Intent: the docs findings of a file analyzed with every rule and its bypass tokens. */
    const analyzedDocs = (text: string) =>
      analyzeSource({ path: 'src/module.ts', text, atomIds: new Set() }).filter(
        (finding) => finding.rule === 'docs',
      )
    const body = 'export function bare() {}\n'
    expect(analyzedDocs(body)).toHaveLength(1)
    expect(analyzedDocs(`// @lint-ignore-documentation third-party\n${body}`)).toEqual([])
    expect(analyzedDocs(`// @lint-ignore-all generated\n${body}`)).toEqual([])
  })
})
