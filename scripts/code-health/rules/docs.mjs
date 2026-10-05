import ts from 'typescript'

import { attachedComments, commentTextLines, createFinding, lineOf } from '../sources.mjs'

/**
 * @typedef {import('../sources.mjs').Finding} Finding
 * @typedef {import('../sources.mjs').ParsedSource} ParsedSource
 * @typedef {import('../sources.mjs').ScriptBlock} ScriptBlock
 * @typedef {{ docNodes: ts.Node[], nameNode: ts.Node | undefined, name: string,
 *   exported: boolean }} DocTarget
 *   A function that needs an intent comment: the comment may sit on any of `docNodes`; a finding
 *   is reported at `nameNode` (at the first doc node when the function has no name).
 * @typedef {{ block: ScriptBlock, exportedNames: Set<string>, inSetup: boolean }} BlockScope
 *   What target detection needs to know about the block being walked.
 */

/** Starts of comment lines that are ATD links or tool directives, never intent prose. */
const directivePrefixes = [
  '@spec-link',
  '@test-link',
  '@lint-ignore-',
  'eslint-',
  'prettier-ignore',
  '@ts-',
  '@vitest-environment',
]

/**
 * Intent: the documentation rule: every function that needs an intent comment and has none
 * in its attached comments is reported, ERROR when exported and WARN otherwise.
 *
 * Contract: pure; reads the file only through `source` and the sources.mjs helpers (`lineOf`,
 * `attachedComments`, `commentTextLines`, `createFinding`); returns findings with rule 'docs' in
 * any order (analyze.mjs sorts them and applies the bypass tokens). The rule context is not used.
 *
 * @param {ParsedSource} source
 * @returns {Finding[]}
 */
export function checkDocs(source) {
  return source.blocks.flatMap((block) => {
    const scope = {
      block,
      exportedNames: locallyExportedNames(block.sourceFile),
      inSetup: block.kind === 'script-setup',
    }
    return targetsIn(scope)
      .filter((target) => !target.docNodes.some((node) => hasIntentDoc(block, node)))
      .map((target) => missingDocFinding(source, block, target))
  })
}

/**
 * Intent: the finding for one undocumented function, at the line of its name.
 *
 * @param {ParsedSource} source
 * @param {ScriptBlock} block
 * @param {DocTarget} target
 * @returns {Finding}
 */
function missingDocFinding(source, block, target) {
  const position = target.nameNode ?? target.docNodes[0]
  const line = position ? lineOf(block, position.getStart(block.sourceFile)) : 1
  const kind = target.exported ? 'exported function' : 'function'
  const message = `docs: missing intent comment on ${kind} ${target.name}`
  return createFinding(source, 'docs', target.exported ? 'ERROR' : 'WARN', line, message)
}

/**
 * Intent: whether the comments attached to `node` hold real text: at least one line, outside ATD
 * links and tool directives, with a letter in it once any JSDoc tag syntax is removed (so
 * `@param x the value` counts, `@param {string} x` and `@returns {number}` do not).
 *
 * @param {ScriptBlock} block
 * @param {ts.Node} node
 * @returns {boolean}
 */
function hasIntentDoc(block, node) {
  return attachedComments(block, node).some((comment) =>
    commentTextLines(comment.text).some(
      (line) =>
        !directivePrefixes.some((prefix) => line.startsWith(prefix)) &&
        /\p{L}/u.test(jsDocProse(line)),
    ),
  )
}

/** The JSDoc tags whose first word after the type is a parameter or property name, not prose. */
const namedTags = new Set(['param', 'arg', 'argument', 'property', 'prop'])

/**
 * Intent: the prose of one comment line: the line itself, or for a JSDoc tag line what remains
 * after the tag, its `{type}` expression and, for `@param`/`@property`, the name.
 *
 * @param {string} line
 * @returns {string}
 */
function jsDocProse(line) {
  const tag = /^@(\w+)\s*/u.exec(line)
  if (!tag) return line
  const rest = withoutTypeExpression(line.slice(tag[0].length)).trimStart()
  return namedTags.has(tag[1] ?? '') ? rest.replace(/^(?:\[[^\]]*\]|\S+)/u, '') : rest
}

/**
 * Intent: `text` without a leading `{type}` expression (braces balanced); an expression left
 * open on the line swallows the rest of it.
 *
 * @param {string} text
 * @returns {string}
 */
function withoutTypeExpression(text) {
  if (!text.startsWith('{')) return text
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1
    else if (text[index] === '}') depth -= 1
    if (depth === 0) return text.slice(index + 1)
  }
  return ''
}

/**
 * Intent: the names a module exports from its own scope through `export { a, b as c }` (without
 * `from`) or `export default name`, by their local name.
 *
 * @param {ts.SourceFile} sourceFile
 * @returns {Set<string>}
 */
function locallyExportedNames(sourceFile) {
  return new Set(
    sourceFile.statements.flatMap((statement) => {
      if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
        return [statement.expression.text]
      }
      if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier) return []
      const clause = statement.exportClause
      if (!clause || !ts.isNamedExports(clause)) return []
      return clause.elements.map((element) => (element.propertyName ?? element.name).text)
    }),
  )
}

/**
 * Intent: every function of a block that needs an intent comment, in source order, nested ones
 * included.
 *
 * @param {BlockScope} scope
 * @returns {DocTarget[]}
 */
function targetsIn(scope) {
  /** @type {DocTarget[]} */
  const targets = []
  /**
   * Intent: record the node if it is a function needing a doc, then visit its children.
   *
   * @param {ts.Node} node
   */
  const visit = (node) => {
    const target = docTargetOf(scope, node)
    if (target) targets.push(target)
    ts.forEachChild(node, visit)
  }
  visit(scope.block.sourceFile)
  return targets
}

/**
 * Intent: the doc target `node` stands for, if it is a function with a body that needs a doc:
 * a function declaration, a class or object-literal method or accessor, or a function/arrow
 * expression bound to a name. Constructors, bodiless signatures, anonymous callbacks and members
 * of typed object literals (see `isTypedLiteral`) have none.
 *
 * @param {BlockScope} scope
 * @param {ts.Node} node
 * @returns {DocTarget | undefined}
 */
function docTargetOf(scope, node) {
  if (ts.isFunctionDeclaration(node) && node.body) return declarationTarget(scope, node)
  const isMethodLike =
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  if (isMethodLike && node.body && !isContractMember(node)) return memberTarget(scope, node)
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return expressionTarget(scope, node)
  }
  return undefined
}

/**
 * Intent: the target of a function declaration with a body; a doc on its first overload signature
 * covers it, and findings point at that signature.
 *
 * @param {BlockScope} scope
 * @param {ts.FunctionDeclaration} node
 * @returns {DocTarget}
 */
function declarationTarget(scope, node) {
  const first = firstOverloadOf(node)
  return {
    docNodes: first === node ? [node] : [first, node],
    nameNode: first.name ?? first,
    name: node.name?.text ?? 'default',
    exported: !scope.inSetup && isExportedStatement(scope, node, node.name),
  }
}

/**
 * Intent: the first of the bodiless signatures of the same name directly preceding a function
 * implementation, or the implementation itself when it has no overloads.
 *
 * @param {ts.FunctionDeclaration} node
 * @returns {ts.FunctionDeclaration}
 */
function firstOverloadOf(node) {
  const { parent } = node
  const hasStatements = ts.isSourceFile(parent) || ts.isBlock(parent) || ts.isModuleBlock(parent)
  const name = node.name?.text
  if (!hasStatements || name === undefined) return node
  const siblings = parent.statements
  let first = node
  for (let index = siblings.indexOf(node) - 1; index >= 0; index -= 1) {
    const previous = siblings[index]
    const isSignature =
      previous !== undefined &&
      ts.isFunctionDeclaration(previous) &&
      !previous.body &&
      previous.name?.text === name
    if (!isSignature) break
    first = previous
  }
  return first
}

/**
 * Intent: the target of a function/arrow expression bound to a name — the initializer of a
 * variable declarator, an object property or a class property, or a default export — once type
 * assertions and parentheses around it are looked through. Anything else is an anonymous callback.
 *
 * @param {BlockScope} scope
 * @param {ts.ArrowFunction | ts.FunctionExpression} node
 * @returns {DocTarget | undefined}
 */
function expressionTarget(scope, node) {
  const outer = outermostWrapper(node)
  const owner = outer.parent
  if (ts.isVariableDeclaration(owner) && owner.initializer === outer) {
    const statement = owner.parent.parent
    const docNode = ts.isVariableStatement(statement) ? statement : owner
    const exported = !scope.inSetup && isExportedStatement(scope, docNode, owner.name)
    return { docNodes: [docNode], nameNode: owner.name, name: owner.name.getText(), exported }
  }
  if (ts.isPropertyAssignment(owner) && owner.initializer === outer) {
    if (isContractMember(owner)) return undefined
    return { docNodes: [owner], nameNode: owner.name, name: owner.name.getText(), exported: false }
  }
  if (ts.isPropertyDeclaration(owner) && owner.initializer === outer) {
    return memberTarget(scope, owner)
  }
  if (ts.isExportAssignment(owner)) {
    return { docNodes: [owner], nameNode: undefined, name: 'default', exported: !scope.inSetup }
  }
  return undefined
}

/**
 * Intent: the outermost expression that is only `node` wrapped in parentheses, `as`, `satisfies`,
 * a type assertion or a non-null assertion.
 *
 * @param {ts.Node} node
 * @returns {ts.Node}
 */
function outermostWrapper(node) {
  let current = node
  while (
    ts.isParenthesizedExpression(current.parent) ||
    ts.isAsExpression(current.parent) ||
    ts.isSatisfiesExpression(current.parent) ||
    ts.isTypeAssertionExpression(current.parent) ||
    ts.isNonNullExpression(current.parent)
  ) {
    current = current.parent
  }
  return current
}

/**
 * Intent: whether `member` (an object-literal method, accessor or property) belongs to a typed
 * object literal and so needs no intent comment of its own.
 *
 * @param {ts.Node} member
 * @returns {boolean}
 */
function isContractMember(member) {
  return ts.isObjectLiteralExpression(member.parent) && isTypedLiteral(member.parent)
}

/**
 * Intent: whether an object literal is typed by its context, so its function-valued members
 * implement a declared contract. Rationale: the declared type documents the contract — such
 * members are mostly factories and fakes implementing a documented interface. Once parentheses,
 * `as`, `satisfies`, `<T>` and `!` are looked through, the literal is typed when it is:
 * (a) a `return` expression or an arrow function's expression body; (b) an argument of a call or
 * `new`; (c) the operand of `satisfies`, `as` or `<T>`; (d) the initializer of a variable, class
 * property or parameter with a type annotation; or a property value of a typed literal. An
 * un-annotated free-standing literal (`const handlers = { ... }`) is not typed.
 *
 * @param {ts.ObjectLiteralExpression} literal
 * @returns {boolean}
 */
function isTypedLiteral(literal) {
  const outer = outermostWrapper(literal)
  const owner = outer.parent
  if (hasTypeAssertionBetween(literal, outer)) return true
  if (ts.isReturnStatement(owner)) return true
  if (ts.isArrowFunction(owner)) return owner.body === outer
  if (ts.isCallExpression(owner) || ts.isNewExpression(owner)) {
    return owner.arguments?.includes(/** @type {ts.Expression} */ (outer)) ?? false
  }
  const isAnnotatable =
    ts.isVariableDeclaration(owner) || ts.isPropertyDeclaration(owner) || ts.isParameter(owner)
  if (isAnnotatable) return owner.initializer === outer && owner.type !== undefined
  if (ts.isPropertyAssignment(owner) && owner.initializer === outer) {
    return isTypedLiteral(owner.parent)
  }
  return false
}

/**
 * Intent: whether one of the wrappers from `node` (excluded) up to `outer` (included) is an `as`,
 * `satisfies` or `<T>` type assertion.
 *
 * @param {ts.Node} node
 * @param {ts.Node} outer
 * @returns {boolean}
 */
function hasTypeAssertionBetween(node, outer) {
  for (let current = node; current !== outer; current = current.parent) {
    const wrapper = current.parent
    const asserts =
      ts.isAsExpression(wrapper) ||
      ts.isSatisfiesExpression(wrapper) ||
      ts.isTypeAssertionExpression(wrapper)
    if (asserts) return true
  }
  return false
}

/**
 * Intent: the target of a method, accessor or function-valued class property: an object-literal
 * member is never exported (WARN); a class member is exported when it is public and its class is.
 *
 * @param {BlockScope} scope
 * @param {ts.MethodDeclaration | ts.AccessorDeclaration | ts.PropertyDeclaration} member
 * @returns {DocTarget}
 */
function memberTarget(scope, member) {
  const memberName = member.name.getText()
  const owner = member.parent
  if (!ts.isClassLike(owner)) {
    return { docNodes: [member], nameNode: member.name, name: memberName, exported: false }
  }
  const isPrivate =
    ts.isPrivateIdentifier(member.name) ||
    hasModifier(member, ts.SyntaxKind.PrivateKeyword) ||
    hasModifier(member, ts.SyntaxKind.ProtectedKeyword)
  const exported = !scope.inSetup && !isPrivate && isExportedClass(scope, owner)
  const name = `${className(owner)}.${memberName}`
  return { docNodes: [member], nameNode: member.name, name, exported }
}

/**
 * Intent: the name a class goes by: its own, else the variable it is assigned to.
 *
 * @param {ts.ClassLikeDeclaration} node
 * @returns {string}
 */
function className(node) {
  if (node.name) return node.name.text
  const owner = outermostWrapper(node).parent
  return ts.isVariableDeclaration(owner) ? owner.name.getText() : 'anonymous class'
}

/**
 * Intent: whether a class is part of the module's interface: an exported or default-exported
 * declaration, a class listed in a local `export { }`, or a class expression assigned to an
 * exported variable or default-exported.
 *
 * @param {BlockScope} scope
 * @param {ts.ClassLikeDeclaration} node
 * @returns {boolean}
 */
function isExportedClass(scope, node) {
  if (ts.isClassDeclaration(node)) return isExportedStatement(scope, node, node.name)
  const owner = outermostWrapper(node).parent
  if (ts.isExportAssignment(owner)) return true
  if (!ts.isVariableDeclaration(owner)) return false
  return isExportedStatement(scope, owner.parent.parent, owner.name)
}

/**
 * Intent: whether a declaration statement is exported: it carries `export`, or it is at the top
 * level and its name is listed in a local `export { }` / `export default name`.
 *
 * @param {BlockScope} scope
 * @param {ts.Node} statement
 * @param {ts.Node | undefined} nameNode
 * @returns {boolean}
 */
function isExportedStatement(scope, statement, nameNode) {
  if (hasModifier(statement, ts.SyntaxKind.ExportKeyword)) return true
  const atTopLevel = statement.parent === scope.block.sourceFile
  return (
    atTopLevel &&
    nameNode !== undefined &&
    ts.isIdentifier(nameNode) &&
    scope.exportedNames.has(nameNode.text)
  )
}

/**
 * Intent: whether a node carries the modifier keyword of the given kind.
 *
 * @param {ts.Node} node
 * @param {ts.SyntaxKind} kind
 * @returns {boolean}
 */
function hasModifier(node, kind) {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
  return modifiers?.some((modifier) => modifier.kind === kind) ?? false
}
