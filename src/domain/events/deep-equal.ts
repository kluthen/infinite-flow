// @lint-ignore-atd shared plumbing: structural equality of plain JSON-shaped values; no business rule
/**
 * Structural equality over plain JSON-shaped values, shared by the generation worker's intent
 * rebuild check and the session's check of a pre-generated phrase's intent.
 */

/**
 * Intent: deep-structural equality over plain JSON-shaped values (objects, arrays, primitives) —
 * the only shape a rebuilt domain value or a structured-cloned wire value can take. Two objects
 * are equal when they have the same own keys with equal values; an array never equals an object.
 */
export function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true
  if (typeof left !== typeof right) return false
  if (left === null || right === null) return false
  if (typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) !== Array.isArray(right)) return false
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false
    return left.every((entry, index) => deepEqual(entry, right[index]))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(
    (key) => Object.hasOwn(rightRecord, key) && deepEqual(leftRecord[key], rightRecord[key]),
  )
}
