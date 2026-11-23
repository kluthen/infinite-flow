// @vitest-environment node
/**
 * The lexicon API's browser-free check: no file under `src/lexicon/` uses the DOM, browser storage,
 * a Vite-only import (a build-only module, a `?raw` import, `import.meta.env`), Vue, the network or
 * a file, nor imports a package, so a backend or a service in another language could later serve
 * the same entries without the module's callers changing. Run over `src/lexicon/`, and over a
 * throwaway copy of it with a planted use, to show it fails.
 *
 * The code is read through the TypeScript parser, so a word in a comment or a string is not a use.
 * An ambient `declare module` (the type of the build-only module the build step serves, in
 * `lexicon-words.d.ts`) declares a type for callers outside the module and imports nothing; an
 * import of that module from inside `src/lexicon/` is a use and fails.
 */
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const lexiconDirectory = fileURLToPath(new URL('../../../src/lexicon/', import.meta.url))

/** Global names that only exist in a browser, with what each one reaches. */
const browserGlobals: ReadonlyMap<string, string> = new Map([
  ...[
    'window',
    'document',
    'self',
    'navigator',
    'location',
    'history',
    'customElements',
    'DOMParser',
    'MutationObserver',
    'requestAnimationFrame',
  ].map((name) => [name, 'the DOM'] as const),
  ...['localStorage', 'sessionStorage', 'indexedDB', 'caches', 'cookieStore'].map(
    (name) => [name, 'browser storage'] as const,
  ),
  ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'RTCPeerConnection'].map(
    (name) => [name, 'the network'] as const,
  ),
])

/** The `import.meta` properties only Vite gives. */
const viteMetaProperties = new Set(['env', 'glob', 'hot'])

/** Node's modules that reach the network or a file, without their `node:` prefix. */
const nodeModules: ReadonlyMap<string, string> = new Map([
  ...['http', 'https', 'http2', 'net', 'tls', 'dgram', 'dns'].map(
    (name) => [name, 'the network'] as const,
  ),
  ...['fs', 'fs/promises'].map((name) => [name, 'a file'] as const),
])

/** What an import specifier reaches that the module must not, or null when it is allowed. */
function forbiddenSpecifier(specifier: string): string | null {
  if (specifier.startsWith('virtual:') || specifier.startsWith('\0')) return 'a build-only module'
  if (specifier.includes('?')) return 'a Vite-only import'
  if (/^(?:vue|pinia|vue-router)(?:\/|$)|^@vue\/|\.vue$/u.test(specifier)) return 'Vue'
  if (/^(?:vite|@vitejs\/)|^\/@/u.test(specifier)) return 'a Vite-only import'
  const nodeModule = nodeModules.get(specifier.replace(/^node:/u, ''))
  if (nodeModule !== undefined) return nodeModule
  if (specifier.startsWith('.') || specifier.startsWith('@/')) return null
  return 'a package (a runtime dependency)'
}

/** Whether an identifier stands for a property's name rather than a value it reads. */
function isPropertyName(node: ts.Identifier): boolean {
  const parent = node.parent
  return (
    ((ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent)) &&
      parent.name === node) ||
    (ts.isQualifiedName(parent) && parent.right === node)
  )
}

/** The module specifier a node imports, when it is an import of any kind. */
function importedSpecifier(node: ts.Node): ts.Expression | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return node.moduleSpecifier
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
    return node.moduleReference.expression
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return node.argument.literal as ts.Expression
  }
  if (
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
  ) {
    return node.arguments[0]
  }
  return undefined
}

/** Every forbidden use in one source file, as `<what> (<what it reaches>)` with its node. */
function forbiddenUses(source: ts.SourceFile): { node: ts.Node; use: string }[] {
  const uses: { node: ts.Node; use: string }[] = []
  /** Record the uses in one node, then in each of its children. */
  const visit = (node: ts.Node): void => {
    const specifier = importedSpecifier(node)
    if (specifier !== undefined) {
      if (!ts.isStringLiteralLike(specifier)) {
        uses.push({ node, use: 'imports a computed path (a Vite-only import)' })
      } else {
        const reached = forbiddenSpecifier(specifier.text)
        if (reached !== null) uses.push({ node, use: `imports ${specifier.text} (${reached})` })
      }
    }
    if (
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword &&
      ts.isPropertyAccessExpression(node.parent) &&
      viteMetaProperties.has(node.parent.name.text)
    ) {
      uses.push({ node, use: `uses import.meta.${node.parent.name.text} (a Vite-only import)` })
    }
    if (ts.isIdentifier(node) && !isPropertyName(node)) {
      const reached = browserGlobals.get(node.text)
      if (reached !== undefined) uses.push({ node, use: `uses ${node.text} (${reached})` })
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'globalThis'
    ) {
      const reached = browserGlobals.get(node.name.text)
      if (reached !== undefined) {
        uses.push({ node, use: `uses globalThis.${node.name.text} (${reached})` })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return uses
}

/** Every file under a directory, recursively, as absolute paths. */
async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? filesUnder(path) : [path]
    }),
  )
  return nested.flat()
}

const codeExtensions = new Set(['.ts', '.mts', '.cts', '.tsx', '.js', '.mjs', '.cjs', '.jsx'])

/**
 * Every browser-bound use in the files under `root`, as `<path from root>:<line>: <use>`: code
 * files are read through the TypeScript parser, a Vue file is a use by itself, and any other file
 * (the schema, a document) holds no code.
 */
async function browserBoundUses(root: string): Promise<string[]> {
  const found: string[] = []
  for (const path of (await filesUnder(root)).sort()) {
    const name = relative(root, path).split(sep).join('/')
    if (extname(path) === '.vue') found.push(`${name}:1: is a Vue file (Vue)`)
    if (!codeExtensions.has(extname(path))) continue
    const text = await readFile(path, 'utf8')
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
    for (const { node, use } of forbiddenUses(source)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
      found.push(`${name}:${line + 1}: ${use}`)
    }
  }
  return found
}

/** The uses found in a throwaway copy of `src/lexicon/` with one more file planted in it. */
async function usesWithPlanted(fileName: string, contents: string): Promise<string[]> {
  const root = await mkdtemp(join(tmpdir(), 'lexicon-boundary-'))
  try {
    await cp(lexiconDirectory, root, { recursive: true })
    await writeFile(join(root, fileName), contents)
    return await browserBoundUses(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe("the lexicon API's browser-free check", () => {
  // @test-link [[api_lexicon_read_contract]]
  it('finds no DOM, browser storage, Vite-only import, Vue or network use under src/lexicon/', async () => {
    expect((await filesUnder(lexiconDirectory)).length).toBeGreaterThan(0)
    expect(await browserBoundUses(lexiconDirectory)).toEqual([])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('fails on a planted window use', async () => {
    expect(
      await usesWithPlanted(
        'planted.ts',
        '// The window is wide.\nexport const width = (): number => window.innerWidth\n',
      ),
    ).toEqual(['planted.ts:2: uses window (the DOM)'])
  })

  // @test-link [[api_lexicon_read_contract]]
  it('fails on a planted import of a build-only module', async () => {
    expect(
      await usesWithPlanted(
        'planted.ts',
        "import entries from 'virtual:lexicon-words'\nexport const count = entries.length\n",
      ),
    ).toEqual(['planted.ts:1: imports virtual:lexicon-words (a build-only module)'])
  })

  it.each([
    ['document.title', 'uses document (the DOM)'],
    ['globalThis.localStorage', 'uses globalThis.localStorage (browser storage)'],
    ['sessionStorage.length', 'uses sessionStorage (browser storage)'],
    ['indexedDB', 'uses indexedDB (browser storage)'],
    ["fetch('/words.json')", 'uses fetch (the network)'],
    ['import.meta.env.MODE', 'uses import.meta.env (a Vite-only import)'],
    ["import('virtual:lexicon-words')", 'imports virtual:lexicon-words (a build-only module)'],
  ])('fails on a planted %s', async (expression, use) => {
    expect(await usesWithPlanted('planted.ts', `export const planted = ${expression}\n`)).toEqual([
      `planted.ts:1: ${use}`,
    ])
  })

  it.each([
    ["import text from './lexicon.md?raw'", 'imports ./lexicon.md?raw (a Vite-only import)'],
    ["import { ref } from 'vue'", 'imports vue (Vue)'],
    ["import type { Ref } from '@vue/reactivity'", 'imports @vue/reactivity (Vue)'],
    ["import { request } from 'node:https'", 'imports node:https (the network)'],
    ["import { readFileSync } from 'node:fs'", 'imports node:fs (a file)'],
    ["import { marked } from 'marked'", 'imports marked (a package (a runtime dependency))'],
  ])('fails on a planted %s', async (statement, use) => {
    expect(await usesWithPlanted('planted.ts', `${statement}\n`)).toEqual([`planted.ts:1: ${use}`])
  })

  it('fails on a planted Vue file', async () => {
    expect(await usesWithPlanted('Planted.vue', '<template><p /></template>\n')).toEqual([
      'Planted.vue:1: is a Vue file (Vue)',
    ])
  })

  it('reads neither comments nor strings nor property names as uses', async () => {
    expect(
      await usesWithPlanted(
        'planted.ts',
        [
          '/** No window, no document, no fetch here. */',
          "export const note = 'the window and the document'",
          'export const entry = { document: 1, window: 2 }',
          'export const read = entry.document + entry.window',
          '',
        ].join('\n'),
      ),
    ).toEqual([])
  })
})
