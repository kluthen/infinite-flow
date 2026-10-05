import ts from 'typescript'
import { parse as parseSfc } from 'vue/compiler-sfc'

import { SIZE_ERROR_LOC, SIZE_WARN_LOC } from '../config.mjs'
import { commentRanges, createFinding, lineOf } from '../sources.mjs'

/**
 * @typedef {import('../sources.mjs').Finding} Finding
 * @typedef {import('../sources.mjs').ParsedSource} ParsedSource
 * @typedef {import('../sources.mjs').ScriptBlock} ScriptBlock
 */

/**
 * Intent: the size rule — one finding at line 1 when the file's effective lines of code exceed
 * the warning (400) or error (600) limit, nothing otherwise.
 *
 * @param {ParsedSource} source
 * @returns {Finding[]}
 */
export function checkSize(source) {
  const count = effectiveLineCount(source)
  if (count > SIZE_ERROR_LOC) {
    const message = `size: ${count} effective lines of code exceed the error limit of ${SIZE_ERROR_LOC}`
    return [createFinding(source, 'size', 'ERROR', 1, message)]
  }
  if (count > SIZE_WARN_LOC) {
    const message = `size: ${count} effective lines of code exceed the warning limit of ${SIZE_WARN_LOC}`
    return [createFinding(source, 'size', 'WARN', 1, message)]
  }
  return []
}

/**
 * Intent: the number of effective lines of code of a file: lines that are not blank, not
 * comment-only (every non-whitespace character inside a comment) and not part of an import,
 * import-equals or `export ... from` statement. A .vue file is counted whole: its script blocks,
 * and its template and style lines, where HTML and CSS comments count as comments.
 *
 * @param {ParsedSource} source
 * @returns {number}
 */
export function effectiveLineCount(source) {
  const commentMask = new Uint8Array(source.text.length)
  /** @type {Set<number>} */
  const importLines = new Set()
  for (const block of source.blocks) {
    for (const comment of commentRanges(block)) {
      commentMask.fill(1, block.offset + comment.pos, block.offset + comment.end)
    }
    markImportLines(block, importLines)
  }
  if (source.isVue) markVueMarkupComments(source, commentMask)

  let count = 0
  let lineStart = 0
  for (const [index, line] of source.text.split('\n').entries()) {
    if (!importLines.has(index + 1) && hasCodeOutsideComments(line, lineStart, commentMask)) {
      count += 1
    }
    lineStart += line.length + 1
  }
  return count
}

/**
 * Intent: add to `importLines` every original line spanned by an import, import-equals or
 * re-export (`export ... from`) statement of the block.
 *
 * @param {ScriptBlock} block
 * @param {Set<number>} importLines
 */
function markImportLines(block, importLines) {
  const { sourceFile } = block
  for (const statement of sourceFile.statements) {
    const isImport =
      ts.isImportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement) ||
      (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined)
    if (!isImport) continue
    const last = lineOf(block, statement.end)
    for (let line = lineOf(block, statement.getStart(sourceFile)); line <= last; line += 1) {
      importLines.add(line)
    }
  }
}

/**
 * Intent: whether a line holds a non-whitespace character outside every comment.
 *
 * @param {string} line
 * @param {number} lineStart offset of the line in the file text
 * @param {Uint8Array} commentMask 1 for every file character inside a comment
 * @returns {boolean}
 */
function hasCodeOutsideComments(line, lineStart, commentMask) {
  for (let index = 0; index < line.length; index += 1) {
    if (line.charAt(index).trim() !== '' && commentMask[lineStart + index] === 0) return true
  }
  return false
}

/**
 * Intent: mark as comment the `<!-- -->` spans of a .vue file outside its script blocks, and the
 * `/* *\/` spans of its style blocks.
 *
 * @param {ParsedSource} source
 * @param {Uint8Array} commentMask
 */
function markVueMarkupComments(source, commentMask) {
  let regionStart = 0
  for (const block of source.blocks) {
    markDelimited(source.text, commentMask, [regionStart, block.offset], ['<!--', '-->'])
    regionStart = block.offset + block.sourceFile.text.length
  }
  markDelimited(source.text, commentMask, [regionStart, source.text.length], ['<!--', '-->'])

  const { descriptor } = parseSfc(source.text, { filename: source.path })
  for (const style of descriptor.styles) {
    markDelimited(
      source.text,
      commentMask,
      [style.loc.start.offset, style.loc.end.offset],
      ['/*', '*/'],
    )
  }
}

/**
 * Intent: mark as comment every `open ... close` span starting inside `[from, to)` of the text; an
 * unclosed span runs to `to`.
 *
 * @param {string} text
 * @param {Uint8Array} commentMask
 * @param {[number, number]} region
 * @param {[string, string]} delimiters
 */
function markDelimited(text, commentMask, [from, to], [open, close]) {
  let start = text.indexOf(open, from)
  while (start !== -1 && start < to) {
    const closeAt = text.indexOf(close, start + open.length)
    const end = closeAt === -1 || closeAt >= to ? to : closeAt + close.length
    commentMask.fill(1, start, end)
    start = text.indexOf(open, end)
  }
}
