/**
 * A preset's key and mode restriction: two halves, the written keys and the modes (Collection
 * values), each "any" or an ordered list. Membership, comparison and the restriction in words.
 * Pure data and functions: no storage, interface, clock or random source; the display labels of
 * keys and modes are the interface's and are passed in.
 */

import {
  COLLECTIONS,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'

/** One half of a restriction: any value, or an ordered list whose first entry is the main sound. */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_key_and_mode_restriction]]
export type RestrictionHalf<T> = 'any' | readonly [T, ...T[]]

/**
 * The keys a preset is meant for (written keys) and its modes (Collection values). Major and
 * Ionian are distinct entries, and so are Minor and Aeolian: nothing maps one to the other.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_key_and_mode_restriction]]
export interface KeyAndModeRestriction {
  readonly keys: RestrictionHalf<PitchClass>
  readonly modes: RestrictionHalf<Collection>
}

/** A restriction value that is not "any" or a non-empty list of distinct known values per half. */
// @spec-link [[module_preset_model]]
export class KeyAndModeRestrictionError extends Error {
  readonly kind = 'KeyAndModeRestrictionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'KeyAndModeRestrictionError'
  }
}

/** Intent: the restriction allowing every written key with every mode. */
// @spec-link [[rule_key_and_mode_restriction]]
export const ANY_KEY_AND_MODE: KeyAndModeRestriction = deepFreeze({ keys: 'any', modes: 'any' })

/** Intent: whether a value is a plain, non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Intent: read one half: "any", or a non-empty list of known values with no duplicate, kept in
 * its order. Anything else throws a KeyAndModeRestrictionError naming the half and the cause.
 */
function parseHalf<T extends string>(
  catalog: readonly T[],
  value: unknown,
  half: string,
): RestrictionHalf<T> {
  if (value === 'any') return 'any'
  if (!Array.isArray(value)) {
    throw new KeyAndModeRestrictionError(
      `The ${half} half must be "any" or a list, got ${JSON.stringify(value)}.`,
    )
  }
  if (value.length === 0) {
    throw new KeyAndModeRestrictionError(`The ${half} half is an empty list.`)
  }
  const parsed: T[] = []
  for (const entry of value) {
    const known = catalog.find((candidate) => candidate === entry)
    if (known === undefined) {
      throw new KeyAndModeRestrictionError(
        `The ${half} half holds the unknown value ${JSON.stringify(entry)}.`,
      )
    }
    if (parsed.includes(known)) {
      throw new KeyAndModeRestrictionError(`The ${half} half holds a duplicate "${known}".`)
    }
    parsed.push(known)
  }
  return parsed as unknown as readonly [T, ...T[]]
}

/**
 * Intent: read a restriction: each half "any" or a non-empty list of known values (PITCH_CLASSES
 * for the keys, COLLECTIONS for the modes) with no duplicate. A refusal throws a
 * KeyAndModeRestrictionError naming the cause; nothing is defaulted. Returns a fresh deep-frozen
 * copy, lists in their given order.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_key_and_mode_restriction]]
export function makeKeyAndModeRestriction(input: KeyAndModeRestriction): KeyAndModeRestriction {
  const value: unknown = input
  if (!isPlainObject(value)) {
    throw new KeyAndModeRestrictionError('A key and mode restriction must be a plain object.')
  }
  return deepFreeze({
    keys: parseHalf(PITCH_CLASSES, value.keys, 'keys'),
    modes: parseHalf(COLLECTIONS, value.modes, 'modes'),
  })
}

/** Intent: the one-pair restriction to one written key and one mode. */
// @spec-link [[rule_key_and_mode_restriction]]
export function onlyKeyAndMode(key: PitchClass, mode: Collection): KeyAndModeRestriction {
  return makeKeyAndModeRestriction({ keys: [key], modes: [mode] })
}

/** Intent: whether a half allows a value: it is "any", or lists the value. */
function halfAllows<T>(half: RestrictionHalf<T>, value: T): boolean {
  return half === 'any' || half.includes(value)
}

/** Intent: whether the restriction's keys half allows a written key. */
// @spec-link [[rule_key_and_mode_restriction]]
export function allowsKey(restriction: KeyAndModeRestriction, key: PitchClass): boolean {
  return halfAllows(restriction.keys, key)
}

/** Intent: whether the restriction's modes half allows a mode, by plain identity. */
// @spec-link [[rule_key_and_mode_restriction]]
export function allowsMode(restriction: KeyAndModeRestriction, mode: Collection): boolean {
  return halfAllows(restriction.modes, mode)
}

/** Intent: whether a written key and a mode are both allowed: every allowed key with every mode. */
// @spec-link [[rule_key_and_mode_restriction]]
export function allowsKeyAndMode(
  restriction: KeyAndModeRestriction,
  key: PitchClass,
  mode: Collection,
): boolean {
  return allowsKey(restriction, key) && allowsMode(restriction, mode)
}

/** Intent: whether both halves are "any". */
// @spec-link [[rule_key_and_mode_restriction]]
export function isAnyKeyAndMode(restriction: KeyAndModeRestriction): boolean {
  return restriction.keys === 'any' && restriction.modes === 'any'
}

/** Intent: whether two halves are both "any", or equal lists in the same order. */
function sameHalf<T>(left: RestrictionHalf<T>, right: RestrictionHalf<T>): boolean {
  if (left === 'any' || right === 'any') return left === right
  return left.length === right.length && left.every((entry, index) => entry === right[index])
}

/** Intent: whether two restrictions are the same, half by half, list order included. */
// @spec-link [[rule_key_and_mode_restriction]]
export function sameRestriction(
  left: KeyAndModeRestriction,
  right: KeyAndModeRestriction,
): boolean {
  return sameHalf(left.keys, right.keys) && sameHalf(left.modes, right.modes)
}

/** The interface's display labels for written keys and modes, passed in to the words. */
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export interface RestrictionLabels {
  readonly key: (key: PitchClass) => string
  readonly mode: (mode: Collection) => string
}

/** Intent: a list read as "A", "A or B", "A, B or C". */
export function listInWords(items: readonly string[]): string {
  const last = items.at(-1) ?? ''
  if (items.length <= 1) return last
  return `${items.slice(0, -1).join(', ')} or ${last}`
}

/**
 * Intent: the restriction in plain words, as the preset sheet and the description line write it:
 * "{modes} in any key", "{keys} in any mode", "only {key} {mode}" for one pair ("{key} {mode}"
 * with `{ only: false }`), "{keys}, in {modes}" for lists on both halves, and "any key and mode".
 * Every key and mode label comes from `labels`.
 */
// @spec-link [[module_preset_model]]
// @spec-link [[rule_saving_preset_asks_its_restriction]]
export function restrictionInWords(
  restriction: KeyAndModeRestriction,
  labels: RestrictionLabels,
  options: { readonly only?: boolean } = {},
): string {
  const { keys, modes } = restriction
  const keysInWords = keys === 'any' ? '' : listInWords(keys.map((key) => labels.key(key)))
  const modesInWords = modes === 'any' ? '' : listInWords(modes.map((mode) => labels.mode(mode)))
  if (keys === 'any' && modes === 'any') return 'any key and mode'
  if (keys === 'any') return `${modesInWords} in any key`
  if (modes === 'any') return `${keysInWords} in any mode`
  if (keys.length > 1 || modes.length > 1) return `${keysInWords}, in ${modesInWords}`
  const pair = `${keysInWords} ${modesInWords}`
  return options.only === false ? pair : `only ${pair}`
}
