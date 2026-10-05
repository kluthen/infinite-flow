import ts from 'typescript'

import { MAX_NESTING } from '../config.mjs'
import { createFinding, lineOf } from '../sources.mjs'

/**
 * @typedef {import('../sources.mjs').Finding} Finding
 * @typedef {import('../sources.mjs').ParsedSource} ParsedSource
 * @typedef {import('../sources.mjs').ScriptBlock} ScriptBlock
 * @typedef {{ name: string, maxDepth: number, line: number }} Scope
 *   One counted scope (a function-like node or the module-level code): its deepest control-flow
 *   depth and the original line of the first construct past MAX_NESTING (0 while none is).
 */

/**
 * Intent: the nesting rule: one ERROR per function-like node (and once for module scope)
 * whose control-flow depth exceeds MAX_NESTING, at the line of the first construct past it.
 *
 * Contract: pure; reads the file only through `source` and the sources.mjs helpers; returns
 * findings with rule 'nesting' (analyze.mjs sorts them and applies the bypass tokens). Like the
 * size rule it needs no RuleContext, so it takes none.
 *
 * @param {ParsedSource} source
 * @returns {Finding[]}
 */
export function checkNesting(source) {
  return source.blocks
    .flatMap(scopesOf)
    .filter((scope) => scope.maxDepth > MAX_NESTING)
    .map((scope) => {
      const message = `nesting: depth ${scope.maxDepth} exceeds ${MAX_NESTING} in ${scope.name}`
      return createFinding(source, 'nesting', 'ERROR', scope.line, message)
    })
}

/**
 * Intent: every counted scope of a script block, in source order: its module-level code first,
 * then each function-like node, whose count starts again at 0 whatever the depth it sits at.
 *
 * Depth rules: `if`, `for`, `for-in`, `for-of`, `while`, `do`, `switch` and `try` add one level to
 * everything inside them (so case, catch and finally bodies sit at their construct's depth); an
 * `if` that is the `else` of another `if` adds none, so an else-if chain counts once. Blocks,
 * labels, ternaries and logical operators are transparent; expressions hold no statement outside a
 * nested function, so the depth given to them does not matter.
 *
 * @param {ScriptBlock} block
 * @returns {Scope[]}
 */
function scopesOf(block) {
  const { sourceFile } = block
  /** @type {Scope[]} */
  const scopes = []

  /**
   * Intent: record that `node`, a nesting construct, puts its content at `depth` in `scope`.
   *
   * @param {ts.Node} node
   * @param {number} depth
   * @param {Scope} scope
   */
  const enter = (node, depth, scope) => {
    scope.maxDepth = Math.max(scope.maxDepth, depth)
    if (depth > MAX_NESTING && scope.line === 0) {
      scope.line = lineOf(block, node.getStart(sourceFile))
    }
  }

  /**
   * Intent: walk `node` at `depth` in `scope`, opening a new scope for a function-like node.
   *
   * @param {ts.Node} node
   * @param {number} depth
   * @param {Scope} scope
   */
  const visit = (node, depth, scope) => {
    if (isFunctionScope(node)) {
      const inner = { name: scopeName(node, sourceFile), maxDepth: 0, line: 0 }
      scopes.push(inner)
      ts.forEachChild(node, (child) => visit(child, 0, inner))
    } else if (ts.isIfStatement(node)) {
      enter(node, depth + 1, scope)
      visit(node.expression, depth, scope)
      visit(node.thenStatement, depth + 1, scope)
      const { elseStatement } = node
      if (elseStatement) {
        visit(elseStatement, ts.isIfStatement(elseStatement) ? depth : depth + 1, scope)
      }
    } else if (isNestingConstruct(node)) {
      enter(node, depth + 1, scope)
      ts.forEachChild(node, (child) => visit(child, depth + 1, scope))
    } else {
      ts.forEachChild(node, (child) => visit(child, depth, scope))
    }
  }

  const moduleScope = { name: 'module scope', maxDepth: 0, line: 0 }
  scopes.push(moduleScope)
  visit(sourceFile, 0, moduleScope)
  return scopes
}

/**
 * Intent: whether a node is a loop, `switch` or `try`: a construct adding one nesting level to
 * all its content (`if` is handled apart for its else-if chains).
 *
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isNestingConstruct(node) {
  return (
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isTryStatement(node)
  )
}

/**
 * Intent: whether a node starts its own nesting count: a function declaration or expression, an
 * arrow function, a method, an accessor, a constructor or a class static block.
 *
 * @param {ts.Node} node
 * @returns {node is ts.FunctionLikeDeclaration | ts.ClassStaticBlockDeclaration}
 */
function isFunctionScope(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isClassStaticBlockDeclaration(node)
  )
}

/**
 * Intent: the name a finding gives a function scope: its own name, else the name of the variable,
 * property or class field it initializes, else "anonymous function".
 *
 * @param {ts.FunctionLikeDeclaration | ts.ClassStaticBlockDeclaration} node
 * @param {ts.SourceFile} sourceFile
 * @returns {string}
 */
function scopeName(node, sourceFile) {
  if (ts.isConstructorDeclaration(node)) return 'constructor'
  if (ts.isClassStaticBlockDeclaration(node)) return 'class static block'
  const { parent } = node
  const holder =
    ts.isVariableDeclaration(parent) ||
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent)
      ? parent.name
      : undefined
  const name = node.name ?? holder
  const isPattern = name && (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
  return name && !isPattern ? name.getText(sourceFile) : 'anonymous function'
}
