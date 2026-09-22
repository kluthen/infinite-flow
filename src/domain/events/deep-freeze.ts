/**
 * Recursive freeze applied by every constructor in this schema so a returned timeline, measure,
 * or event cannot be mutated by downstream consumers (notation display, session state) outside
 * the closed constructors and parsers, satisfying the schema's closed-construction guarantee.
 */

/**
 * Intent: freeze a plain object or array and every nested plain object/array reachable from it,
 * so mutation attempts on any nested field fail rather than silently succeeding. Skips values
 * that are not plain objects/arrays (numbers, strings, booleans, branded primitives) since those
 * are already immutable in JavaScript.
 */
// @spec-link [[entity_concert_event_timeline]]
export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    if (!Object.isFrozen(value)) {
      Object.freeze(value)
      for (const key of Object.getOwnPropertyNames(value)) {
        deepFreeze((value as Record<string, unknown>)[key])
      }
    }
  }
  return value as Readonly<T>
}
