/**
 * The shape checks the kept-phrase validators share: the refusal they throw, and the readers of a
 * stored plain object with exact keys, an array, a bounded whole number, a non-empty string and a
 * member of a closed set. Each refuses with a KeptRecordError naming the field; none defaults.
 */

/** The refusal of a stored kept-phrase value that no domain parser refused first. */
// @spec-link [[module_kept_session_codec]]
export class KeptRecordError extends Error {
  readonly kind = 'KeptRecordError' as const

  constructor(message: string) {
    super(message)
    this.name = 'KeptRecordError'
  }
}

/** Intent: whether a value is a plain object, as a stored record or object value is. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Intent: a stored plain object holding exactly the given fields, the optional ones present or
 * not, and no other; anything else is refused.
 */
export function exactRecord(
  value: unknown,
  keys: readonly string[],
  context: string,
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new KeptRecordError(`${context} must be a plain object.`)
  for (const key of Object.keys(value)) {
    if (!keys.includes(key) && !optional.includes(key))
      throw new KeptRecordError(`${context} has unknown field "${key}".`)
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new KeptRecordError(`${context} is missing "${key}".`)
  }
  return value
}

/** Intent: a stored array with at least one entry. */
export function nonEmptyArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new KeptRecordError(`${context} must be a non-empty array.`)
  return value
}

/** Intent: a stored array, empty or not. */
export function anyArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new KeptRecordError(`${context} must be an array.`)
  return value
}

/** Intent: a stored whole number within an inclusive range. */
export function integerIn(value: unknown, min: number, max: number, context: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    throw new KeptRecordError(`${context} must be a whole number from ${min} to ${max}.`)
  return value
}

/** Intent: a stored value that is exactly one of the given numbers. */
export function oneOfNumbers<T extends number>(
  value: unknown,
  allowed: readonly T[],
  context: string,
): T {
  if (!allowed.includes(value as T))
    throw new KeptRecordError(`${context} must be one of ${JSON.stringify(allowed)}.`)
  return value as T
}

/** Intent: a stored string holding more than blanks. */
export function nonEmptyString(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new KeptRecordError(`${context} must be a non-empty string.`)
  return value
}

/**
 * A closed set of names, written as a record over the type's union so the compiler proves it
 * names every member and no other.
 */
export type Catalog<T extends string> = Readonly<Record<T, true>>

/** Intent: a stored value that names a member of a closed set. */
export function member<T extends string>(catalog: Catalog<T>, value: unknown, context: string): T {
  if (typeof value !== 'string' || !Object.hasOwn(catalog, value))
    throw new KeptRecordError(`${context} has an unknown value ${JSON.stringify(value)}.`)
  return value as T
}

/** Intent: a stored finite number no lower than `min`. */
export function finiteAtLeast(value: unknown, min: number, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min)
    throw new KeptRecordError(`${context} must be a finite number of at least ${min}.`)
  return value
}

/** Intent: a stored finite number above zero, such as a tempo or a length. */
export function positiveFinite(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new KeptRecordError(`${context} must be a finite number above 0.`)
  return value
}

/** Intent: a stored boolean, never a truthy or falsy stand-in. */
export function booleanValue(value: unknown, context: string): boolean {
  if (typeof value !== 'boolean') throw new KeptRecordError(`${context} must be a boolean.`)
  return value
}
