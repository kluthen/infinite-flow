import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, sep } from 'node:path'

import ts from 'typescript'
import { parse as parseSfc } from 'vue/compiler-sfc'

import { BYPASS_TOKENS, SKIPPED_DIRS, SOURCE_EXTENSIONS } from './config.mjs'

/**
 * Shared model of the code-health checker. Every rule receives a ParsedSource and reports
 * Findings; the helpers below are the only way rules reach comments and original line numbers.
 *
 * @typedef {'size' | 'nesting' | 'docs' | 'atd'} RuleName
 * @typedef {'ERROR' | 'WARN'} Level
 * @typedef {{ level: Level, rule: RuleName, path: string, line: number, message: string }} Finding
 *   One reported problem: `path` is repo-relative with forward slashes, `line` is 1-based in the
 *   original file (a .vue file included).
 * @typedef {{ kind: 'module' | 'script' | 'script-setup', sourceFile: ts.SourceFile,
 *   lineOffset: number, offset: number }} ScriptBlock
 *   One TypeScript/JavaScript program of a file: the whole file for .ts/.js-like files (kind
 *   'module', offsets 0), or the content of one `<script>` / `<script setup>` of a .vue file.
 *   `lineOffset` is the number of original lines before the block's first line and `offset` the
 *   character offset of the block's content in the original text. Parent pointers are set.
 * @typedef {{ text: string, line: number, attached: boolean }} TemplateComment
 *   One HTML comment of a .vue `<template>`: `text` is its raw source (`<!-- ... -->`), `line` its
 *   original first line, `attached` whether the next sibling (whitespace and other comments
 *   skipped) is an element.
 * @typedef {{ pos: number, end: number, text: string, line: number, endLine: number,
 *   multiLine: boolean }} CommentRange
 *   One script comment: `pos`/`end` are block-relative offsets, `text` its raw source (`//` or
 *   `/* *\/` included), `line`/`endLine` original 1-based lines.
 * @typedef {{ path: string, text: string, isTest: boolean, isVue: boolean,
 *   blocks: ScriptBlock[], templateComments: TemplateComment[], bypass: Set<string> }} ParsedSource
 *   A parsed file; `bypass` holds the bypass tokens (keys of BYPASS_TOKENS) found in its comments.
 * @typedef {{ atomIds: Set<string> }} RuleContext
 *   What every rule gets besides the file: the atom ids defined in docs/*.atom.md.
 * @typedef {(source: ParsedSource, context: RuleContext) => Finding[]} Rule
 * @typedef {NonNullable<import('vue/compiler-sfc').SFCTemplateBlock['ast']>['children']} TemplateChildren
 */

/** Vue template AST node types the checker looks at (values of compiler-core's NodeTypes). */
const templateNodeType = { element: 1, text: 2, comment: 3 }

/** Comments per parsed block, computed once however many rules ask for them. */
const commentCache = new WeakMap()

/**
 * Intent: whether discovery must not descend into a directory of this name, at any depth.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSkippedDirectory(name) {
  return SKIPPED_DIRS.has(name) || name.startsWith('dist') || name.startsWith('.')
}

/**
 * Intent: whether a repo-relative path is a test file: under `tests/`, or named `*.spec.*` /
 * `*.test.*` anywhere.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isTestFile(path) {
  const name = path.slice(path.lastIndexOf('/') + 1)
  return path.startsWith('tests/') || name.includes('.spec.') || name.includes('.test.')
}

/**
 * Intent: every source file under `directory`, recursively, skipping excluded directories, as
 * absolute paths.
 *
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function sourceFilesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        return isSkippedDirectory(entry.name) ? [] : sourceFilesUnder(entryPath)
      }
      return entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)) ? [entryPath] : []
    }),
  )
  return nested.flat()
}

/**
 * Intent: the sorted, de-duplicated repo-relative paths of the source files designated by
 * `targets` (absolute paths of files or directories). Throws on a missing target, an explicit file
 * that is not a source file, or a target outside `repoRoot`.
 *
 * @param {string} repoRoot
 * @param {string[]} targets
 * @returns {Promise<string[]>}
 */
export async function discoverSourceFiles(repoRoot, targets) {
  const found = await Promise.all(
    targets.map(async (target) => {
      if ((await stat(target)).isDirectory()) return sourceFilesUnder(target)
      if (!SOURCE_EXTENSIONS.has(extname(target))) {
        throw new Error(`${target}: not a source file (${[...SOURCE_EXTENSIONS].join(' ')})`)
      }
      return [target]
    }),
  )
  const paths = found.flat().map((absolutePath) => {
    const path = relative(repoRoot, absolutePath)
    if (path.startsWith('..') || isAbsolute(path)) {
      throw new Error(`${absolutePath}: outside the repository root ${repoRoot}`)
    }
    return path.split(sep).join('/')
  })
  return [...new Set(paths)].sort()
}

/**
 * Intent: the atom ids the project defines, read from the `id:` line of the YAML frontmatter of
 * every `docs/*.atom.md` (top level of docs/ only). Throws if an atom file declares no id.
 *
 * @param {string} repoRoot
 * @returns {Promise<Set<string>>}
 */
export async function loadAtomIds(repoRoot) {
  const docsDirectory = join(repoRoot, 'docs')
  const entries = await readdir(docsDirectory, { withFileTypes: true })
  const atomFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.atom.md'))
  const ids = await Promise.all(
    atomFiles.map(async (entry) => {
      const id = frontmatterId(await readFile(join(docsDirectory, entry.name), 'utf8'))
      if (id === undefined) throw new Error(`docs/${entry.name}: no id in its frontmatter`)
      return id
    }),
  )
  return new Set(ids)
}

/**
 * Intent: the `id:` value of a Markdown file's leading YAML frontmatter, unquoted, if any.
 *
 * @param {string} text
 * @returns {string | undefined}
 */
function frontmatterId(text) {
  if (!text.startsWith('---')) return undefined
  const end = text.indexOf('\n---', 3)
  const lines = text.slice(3, end === -1 ? text.length : end).split('\n')
  const idLine = lines.find((line) => line.startsWith('id:'))
  return (
    idLine
      ?.slice(3)
      .trim()
      .replace(/^['"]|['"]$/gu, '') || undefined
  )
}

/**
 * Intent: read one repo-relative source file and parse it.
 *
 * @param {string} repoRoot
 * @param {string} path
 * @returns {Promise<ParsedSource>}
 */
export async function loadSource(repoRoot, path) {
  return parseSource(path, await readFile(join(repoRoot, path), 'utf8'))
}

/**
 * Intent: parse a file's text into the shared model: its script blocks (TypeScript compiler API;
 * `vue/compiler-sfc` for .vue), its template comments and its bypass tokens. Throws when a .vue
 * file cannot be parsed.
 *
 * @param {string} path repo-relative, forward slashes
 * @param {string} text
 * @returns {ParsedSource}
 */
export function parseSource(path, text) {
  const isVue = path.endsWith('.vue')
  const { blocks, templateComments } = isVue
    ? parseVueParts(path, text)
    : { blocks: [moduleBlock(path, text)], templateComments: [] }
  const tokens = [
    ...blocks.flatMap((block) => commentRanges(block).map((comment) => comment.text)),
    ...templateComments.map((comment) => comment.text),
  ].flatMap(bypassTokensIn)
  const bypass = new Set(tokens)
  return { path, text, isTest: isTestFile(path), isVue, blocks, templateComments, bypass }
}

/**
 * Intent: the single script block of a non-.vue file, parsed as JavaScript or TypeScript by
 * extension.
 *
 * @param {string} path
 * @param {string} text
 * @returns {ScriptBlock}
 */
function moduleBlock(path, text) {
  const kind = ['.js', '.mjs', '.cjs'].includes(extname(path)) ? ts.ScriptKind.JS : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind)
  return { kind: 'module', sourceFile, lineOffset: 0, offset: 0 }
}

/**
 * Intent: the script blocks (in file order) and template comments of a .vue single-file component.
 *
 * @param {string} path
 * @param {string} text
 * @returns {{ blocks: ScriptBlock[], templateComments: TemplateComment[] }}
 */
function parseVueParts(path, text) {
  // `comments: true` keeps template comments when NODE_ENV=production selects Vue's production
  // build, which otherwise drops them (and the ATD links and bypass tokens they carry).
  const { descriptor, errors } = parseSfc(text, {
    filename: path,
    templateParseOptions: { comments: true },
  })
  if (errors.length > 0) {
    throw new Error(`${path}: cannot parse the single-file component: ${String(errors[0])}`)
  }
  /** @type {ScriptBlock[]} */
  const blocks = []
  if (descriptor.script) blocks.push(vueScriptBlock(path, 'script', descriptor.script))
  if (descriptor.scriptSetup) {
    blocks.push(vueScriptBlock(path, 'script-setup', descriptor.scriptSetup))
  }
  blocks.sort((left, right) => left.offset - right.offset)
  const ast = descriptor.template?.ast
  return { blocks, templateComments: ast ? templateCommentsOf(ast.children) : [] }
}

/**
 * Intent: one `<script>` or `<script setup>` of a .vue file as a TypeScript block, with the
 * offsets that map its positions back to the original file.
 *
 * @param {string} path
 * @param {'script' | 'script-setup'} kind
 * @param {import('vue/compiler-sfc').SFCScriptBlock} block
 * @returns {ScriptBlock}
 */
function vueScriptBlock(path, kind, block) {
  const sourceFile = ts.createSourceFile(
    `${path}.${kind}.ts`,
    block.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  return { kind, sourceFile, lineOffset: block.loc.start.line - 1, offset: block.loc.start.offset }
}

/**
 * Intent: every HTML comment of a template node list, recursively, in document order.
 *
 * @param {TemplateChildren} children
 * @returns {TemplateComment[]}
 */
function templateCommentsOf(children) {
  return children.flatMap((child, index) => {
    if (child.type === templateNodeType.comment) {
      const attached = nextTemplateNode(children, index)?.type === templateNodeType.element
      return [{ text: child.loc.source, line: child.loc.start.line, attached }]
    }
    return 'children' in child && Array.isArray(child.children)
      ? templateCommentsOf(/** @type {TemplateChildren} */ (child.children))
      : []
  })
}

/**
 * Intent: the first sibling after `children[index]` that is neither whitespace-only text nor a
 * comment, if any — the node a comment run documents.
 *
 * @param {TemplateChildren} children
 * @param {number} index
 */
function nextTemplateNode(children, index) {
  return children.slice(index + 1).find((sibling) => {
    if (sibling.type === templateNodeType.comment) return false
    return !(sibling.type === templateNodeType.text && sibling.loc.source.trim() === '')
  })
}

/**
 * Intent: the original 1-based line of a block-relative position.
 *
 * @param {ScriptBlock} block
 * @param {number} pos
 * @returns {number}
 */
export function lineOf(block, pos) {
  return block.sourceFile.getLineAndCharacterOfPosition(pos).line + 1 + block.lineOffset
}

/**
 * Intent: a block-relative TypeScript comment range as a CommentRange.
 *
 * @param {ScriptBlock} block
 * @param {ts.CommentRange} range
 * @returns {CommentRange}
 */
function toCommentRange(block, range) {
  return {
    pos: range.pos,
    end: range.end,
    text: block.sourceFile.text.slice(range.pos, range.end),
    line: lineOf(block, range.pos),
    endLine: lineOf(block, range.end),
    multiLine: range.kind === ts.SyntaxKind.MultiLineCommentTrivia,
  }
}

/**
 * Intent: every comment of a script block, in source order, found as the leading and trailing
 * trivia of the block's tokens (so comment-like text inside strings, template literals and regular
 * expressions is never mistaken for a comment). Cached per block.
 *
 * @param {ScriptBlock} block
 * @returns {CommentRange[]}
 */
export function commentRanges(block) {
  const cached = commentCache.get(block.sourceFile)
  if (cached) return cached
  const { sourceFile } = block
  /** @type {Map<number, ts.CommentRange>} */
  const byPos = new Map()
  /**
   * Intent: record the comments around one node, then visit its children (tokens included,
   * JSDoc nodes skipped since they lie inside a comment already recorded).
   *
   * @param {ts.Node} node
   */
  const visit = (node) => {
    const around = [
      ...(ts.getLeadingCommentRanges(sourceFile.text, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(sourceFile.text, node.end) ?? []),
    ]
    for (const range of around) byPos.set(range.pos, range)
    for (const child of node.getChildren(sourceFile)) {
      if (!ts.isJSDoc(child)) visit(child)
    }
  }
  visit(sourceFile)
  const comments = [...byPos.values()]
    .sort((left, right) => left.pos - right.pos)
    .map((range) => toCommentRange(block, range))
  commentCache.set(sourceFile, comments)
  return comments
}

/**
 * Intent: the comments directly attached to `node`: the tail run of its leading comments with no
 * blank line between two consecutive comments, nor between the last comment and the node's first
 * token. A comment separated from the node by a blank line (a file header) is not attached.
 *
 * @param {ScriptBlock} block
 * @param {ts.Node} node
 * @returns {CommentRange[]}
 */
export function attachedComments(block, node) {
  const { sourceFile } = block
  const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? []
  /** @type {ts.CommentRange[]} */
  const attached = []
  let nextStart = node.getStart(sourceFile)
  for (const range of ranges.toReversed()) {
    const gap = sourceFile.text.slice(range.end, nextStart)
    if (gap.split('\n').length > 2) break
    attached.unshift(range)
    nextStart = range.pos
  }
  return attached.map((range) => toCommentRange(block, range))
}

/**
 * Intent: the prose lines of a raw comment (script or template): each line with its leading
 * comment markers (`//`, `/*`, `*`, `<!--`) and trailing closers (`*\/`, `-->`) removed, trimmed.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function commentTextLines(text) {
  return text.split('\n').map((line) =>
    line
      .replace(/^(?:\s|\/\/|\/\*|\*|<!--)+/u, '')
      .replace(/(?:\*\/|-->)\s*$/u, '')
      .trim(),
  )
}

/**
 * Intent: the bypass tokens a raw comment declares: a token counts only when a line of the comment
 * starts with it once the comment markers are stripped, so prose or a string that merely mentions
 * a token bypasses nothing.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function bypassTokensIn(text) {
  const lines = commentTextLines(text)
  return Object.keys(BYPASS_TOKENS).filter((token) =>
    lines.some((line) => line.startsWith(token) && !/^[\w-]/u.test(line.slice(token.length))),
  )
}

/**
 * Intent: build a Finding on `source` (rules should create every finding through this).
 *
 * @param {ParsedSource} source
 * @param {RuleName} rule
 * @param {Level} level
 * @param {number} line
 * @param {string} message
 * @returns {Finding}
 */
export function createFinding(source, rule, level, line, message) {
  return { level, rule, path: source.path, line, message }
}
