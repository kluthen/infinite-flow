import ts from 'typescript'

import {
  ATD_ERROR_DISTINCT,
  ATD_EXEMPT_PATHS,
  ATD_WARN_DISTINCT,
  TEST_FRAMEWORK_CALLS,
} from '../config.mjs'
import { attachedComments, commentRanges, createFinding } from '../sources.mjs'

/**
 * @typedef {import('../sources.mjs').Finding} Finding
 * @typedef {import('../sources.mjs').ParsedSource} ParsedSource
 * @typedef {import('../sources.mjs').RuleContext} RuleContext
 * @typedef {import('../sources.mjs').ScriptBlock} ScriptBlock
 * @typedef {{ kind: 'spec' | 'test', id: string, line: number, attached: boolean }} AtdLink
 *   One `@spec-link` / `@test-link` occurrence: its original line and whether the comment holding
 *   it documents a construct the link may describe.
 */

/** One ATD link inside a comment's text: its kind (`spec` or `test`) and its atom id. */
const linkPattern = /@(spec|test)-link\s+\[\[([^\]\s]+)\]\]/gu

/**
 * Intent: whether a repo-relative path lies outside the ATD scope (ATD_EXEMPT_PATHS): repo
 * tooling, its specs, measurement harnesses, or a non-spec file of test plumbing.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isAtdScopeExempt(path) {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const isSpec = name.includes('.spec.') || name.includes('.test.')
  return (
    ATD_EXEMPT_PATHS.files.includes(path) ||
    ATD_EXEMPT_PATHS.prefixes.some((prefix) => path.startsWith(prefix)) ||
    (!isSpec && ATD_EXEMPT_PATHS.plumbingUnder.some((prefix) => path.startsWith(prefix)))
  )
}

/**
 * Intent: the ATD rule: link presence, distinct-atom spread, @spec-link/@test-link by file
 * kind, phantom ids and unattached links, over script and template comments. A file outside the
 * ATD scope (isAtdScopeExempt) needs no link and has no spread limit; its links are still checked.
 *
 * Contract: pure; reads the file only through `source` and the sources.mjs helpers; returns
 * findings with rule 'atd' in any order (analyze.mjs sorts them and applies the bypass tokens).
 *
 * @param {ParsedSource} source
 * @param {RuleContext} context
 * @returns {Finding[]}
 */
export function checkAtd(source, context) {
  const links = linksOf(source)
  const linkFindingsOfFile = links.flatMap((link) => linkFindings(source, context, link))
  if (isAtdScopeExempt(source.path)) return linkFindingsOfFile
  if (links.length === 0) {
    if (hasNothingToLink(source)) return []
    return [createFinding(source, 'atd', 'ERROR', 1, 'atd: no ATD link in file')]
  }
  return [...spreadFindings(source, links), ...linkFindingsOfFile]
}

/**
 * Intent: every ATD link of a file, from its script comments and its template comments, with its
 * original line and attachment.
 *
 * @param {ParsedSource} source
 * @returns {AtdLink[]}
 */
function linksOf(source) {
  const scriptLinks = source.blocks.flatMap((block) => {
    const attached = attachedCommentStarts(block)
    return commentRanges(block).flatMap((comment) =>
      linksInComment(comment.text, comment.line, attached.has(comment.pos)),
    )
  })
  const templateLinks = source.templateComments.flatMap((comment) =>
    linksInComment(comment.text, comment.line, comment.attached),
  )
  return [...scriptLinks, ...templateLinks]
}

/**
 * Intent: the links written in one raw comment, each at the original line it sits on.
 *
 * @param {string} text the comment's raw source
 * @param {number} firstLine the original line of the comment's first character
 * @param {boolean} attached whether the comment documents an attachable construct
 * @returns {AtdLink[]}
 */
function linksInComment(text, firstLine, attached) {
  return [...text.matchAll(linkPattern)].map((match) => ({
    kind: match[1] === 'spec' ? 'spec' : 'test',
    id: match[2] ?? '',
    line: firstLine + text.slice(0, match.index).split('\n').length - 1,
    attached,
  }))
}

/**
 * Intent: the block-relative start offsets of every comment attached to an attachable node of the
 * block, at any depth of its syntax tree.
 *
 * @param {ScriptBlock} block
 * @returns {Set<number>}
 */
function attachedCommentStarts(block) {
  /** @type {Set<number>} */
  const starts = new Set()
  /**
   * Intent: record the comments attached to `node` if it is attachable, then visit its children.
   *
   * @param {ts.Node} node
   */
  const visit = (node) => {
    if (isAttachable(node)) {
      for (const comment of attachedComments(block, node)) starts.add(comment.pos)
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(block.sourceFile, visit)
  return starts
}

/**
 * Intent: whether an ATD link may document this node: a declaration (function, class, class
 * member, interface, type alias, enum, module, variable statement, export assignment, any export
 * declaration: `export { ... }`, `export { ... } from`, `export * from`), an interface or
 * type-literal member, an enum member, an object property or method, a top-level call statement
 * (`app.mount(...)`, `void watch(...)`), or a statement calling a test framework at any depth
 * (`describe`, `it.each(...)(...)`, `test.describe`, ...).
 *
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isAttachable(node) {
  return (
    isDeclaration(node) ||
    isMemberSignature(node) ||
    ts.isEnumMember(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isExportDeclaration(node) ||
    (ts.isExpressionStatement(node) && isLinkableStatement(node))
  )
}

/**
 * Intent: whether a node is a declaration a link may document: function, class, class member,
 * interface, type alias, enum, module, variable statement or export assignment.
 *
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isDeclaration(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isVariableStatement(node) ||
    ts.isExportAssignment(node)
  )
}

/**
 * Intent: whether a node is a member of an interface or a type literal: a property, method, call,
 * construct or index signature.
 *
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isMemberSignature(node) {
  return (
    ts.isPropertySignature(node) ||
    ts.isMethodSignature(node) ||
    ts.isCallSignatureDeclaration(node) ||
    ts.isConstructSignatureDeclaration(node) ||
    ts.isIndexSignatureDeclaration(node)
  )
}

/**
 * Intent: whether an expression statement may carry a link: a test-framework call at any depth,
 * or any call that is a direct statement of the block's source file once `void`, `await` and
 * parentheses are unwrapped.
 *
 * @param {ts.ExpressionStatement} statement
 * @returns {boolean}
 */
function isLinkableStatement(statement) {
  if (isTestFrameworkCall(statement.expression)) return true
  return ts.isSourceFile(statement.parent) && ts.isCallExpression(unwrapped(statement.expression))
}

/**
 * Intent: an expression with its `void`, `await` and parenthesis wrappers removed, at any nesting.
 *
 * @param {ts.Expression} expression
 * @returns {ts.Expression}
 */
function unwrapped(expression) {
  let inner = expression
  while (
    ts.isVoidExpression(inner) ||
    ts.isAwaitExpression(inner) ||
    ts.isParenthesizedExpression(inner)
  ) {
    inner = inner.expression
  }
  return inner
}

/**
 * Intent: whether an expression (awaited or not) is a call whose root callee is a test-framework
 * name, through property accesses and chained calls: `it(...)`, `it.each([...])(...)`,
 * `test.describe(...)`, `await test.step(...)`.
 *
 * @param {ts.Expression} expression
 * @returns {boolean}
 */
function isTestFrameworkCall(expression) {
  const call = ts.isAwaitExpression(expression) ? expression.expression : expression
  if (!ts.isCallExpression(call)) return false
  /** @type {ts.Expression} */
  let callee = call.expression
  for (;;) {
    if (ts.isCallExpression(callee) || ts.isPropertyAccessExpression(callee)) {
      callee = callee.expression
    } else if (ts.isTaggedTemplateExpression(callee)) {
      callee = callee.tag
    } else {
      return ts.isIdentifier(callee) && TEST_FRAMEWORK_CALLS.has(callee.text)
    }
  }
}

/**
 * Intent: whether a file without any link has nothing to link: a non-.vue file whose statements
 * are all imports, import-equals or `export ... from` re-exports (triple-slash directives are
 * comments, so a file of only those has no statement at all).
 *
 * @param {ParsedSource} source
 * @returns {boolean}
 */
function hasNothingToLink(source) {
  if (source.isVue) return false
  return source.blocks.every((block) =>
    block.sourceFile.statements.every(
      (statement) =>
        ts.isImportDeclaration(statement) ||
        ts.isImportEqualsDeclaration(statement) ||
        (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined),
    ),
  )
}

/**
 * Intent: the distinct-atom spread finding of a file, at line 1: an error above
 * ATD_ERROR_DISTINCT distinct ids, a warning above ATD_WARN_DISTINCT, nothing otherwise.
 *
 * @param {ParsedSource} source
 * @param {AtdLink[]} links
 * @returns {Finding[]}
 */
function spreadFindings(source, links) {
  const count = new Set(links.map((link) => link.id)).size
  const linked = `atd: ${count} distinct atom ids linked`
  if (count > ATD_ERROR_DISTINCT) {
    const message = `${linked}, above the error limit of ${ATD_ERROR_DISTINCT}`
    return [createFinding(source, 'atd', 'ERROR', 1, message)]
  }
  if (count > ATD_WARN_DISTINCT) {
    const message = `${linked}, above the warning limit of ${ATD_WARN_DISTINCT}`
    return [createFinding(source, 'atd', 'WARN', 1, message)]
  }
  return []
}

/**
 * Intent: the findings of one link, at its line: a @spec-link in a test file (error), a
 * @test-link in a source file (warning), a phantom id (error), an unattached link (error).
 *
 * @param {ParsedSource} source
 * @param {RuleContext} context
 * @param {AtdLink} link
 * @returns {Finding[]}
 */
function linkFindings(source, context, link) {
  const tag = `@${link.kind}-link [[${link.id}]]`
  /** @type {Finding[]} */
  const findings = []
  if (link.kind === 'spec' && source.isTest) {
    const message = `atd: ${tag} in a test file, use @test-link`
    findings.push(createFinding(source, 'atd', 'ERROR', link.line, message))
  }
  if (link.kind === 'test' && !source.isTest) {
    const message = `atd: ${tag} in a source file, use @spec-link`
    findings.push(createFinding(source, 'atd', 'WARN', link.line, message))
  }
  if (!context.atomIds.has(link.id)) {
    const message = `atd: phantom atom id [[${link.id}]], no docs/*.atom.md defines it`
    findings.push(createFinding(source, 'atd', 'ERROR', link.line, message))
  }
  if (!link.attached) {
    const message = `atd: unattached ${tag}, put it directly above a declaration, a top-level call or a test call`
    findings.push(createFinding(source, 'atd', 'ERROR', link.line, message))
  }
  return findings
}
