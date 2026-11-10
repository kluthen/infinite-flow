/**
 * The chord families and their four levels: the internal vocabulary the generation intent, the
 * worker protocol and, from data version 5, the stored records hold for the Seventh chords level.
 * The ids name a family by its capability, never by a preset's or profile's name, and the level
 * ids are never the interface's labels: the interface maps them to its own words (`favored` to
 * Often, `stronglyFavored` to Mostly). Pure data and functions: no storage, interface, clock or
 * random source.
 */

import { deepFreeze } from '../events/deep-freeze'

/**
 * Intent: the chord families' internal ids, in the fixed order every value listing them follows:
 * the one family, the seventh chords. Internal and never changed, since requests and stored
 * records hold them.
 */
// @spec-link [[module_generation_request_construction]]
export const CHORD_FAMILY_IDS = deepFreeze(['seventh-chords'] as const)

/** Intent: one chord family's internal id. */
// @spec-link [[module_generation_request_construction]]
export type ChordFamilyId = (typeof CHORD_FAMILY_IDS)[number]

/**
 * Intent: the four levels' internal ids, in increasing order. The interface's labels can change
 * without touching them.
 */
// @spec-link [[module_generation_request_construction]]
export const CHORD_FAMILY_LEVEL_IDS = deepFreeze([
  'off',
  'sometimes',
  'favored',
  'stronglyFavored',
] as const)

/** Intent: one chord family's level. */
// @spec-link [[module_generation_request_construction]]
export type ChordFamilyLevel = (typeof CHORD_FAMILY_LEVEL_IDS)[number]

/** Intent: exactly one level for each chord family, no more and no fewer. */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[rule_seventh_chord_draws_reproducible]]
export type ChordFamilies = { readonly [F in ChordFamilyId]: ChordFamilyLevel }

/** Intent: every chord family at off: triads only, the level before any is chosen. */
// @spec-link [[module_generation_request_construction]]
export const OFF_CHORD_FAMILIES: ChordFamilies = deepFreeze({ 'seventh-chords': 'off' })

/** Intent: whether every chord family is at off. */
// @spec-link [[module_generation_request_construction]]
export function isOffChordFamilies(families: ChordFamilies): boolean {
  return CHORD_FAMILY_IDS.every((family) => families[family] === 'off')
}

/** A chord-families value that is not exactly one known level for each known chord family. */
// @spec-link [[module_generation_request_construction]]
export class ChordFamiliesError extends Error {
  readonly kind = 'ChordFamiliesError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ChordFamiliesError'
  }
}

/** Intent: whether a value is a plain, non-null, non-array object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Intent: what a value that is not a plain object is, for a refusal's message. */
function describeNonObject(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return typeof value
}

/**
 * Intent: read an untrusted chord-families value: a plain object holding exactly the known family
 * ids, each a known level. A non-object, a missing family, an unknown or extra key, or an unknown
 * level throws a ChordFamiliesError naming the cause; nothing is defaulted. Returns a fresh
 * deep-frozen value, keys in CHORD_FAMILY_IDS order.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[rule_seventh_chord_draws_reproducible]]
export function parseChordFamilies(value: unknown): ChordFamilies {
  if (!isPlainObject(value)) {
    throw new ChordFamiliesError(
      `Chord families must be a plain object, got ${describeNonObject(value)}.`,
    )
  }
  for (const key of Object.keys(value)) {
    if (!(CHORD_FAMILY_IDS as readonly string[]).includes(key)) {
      throw new ChordFamiliesError(`Chord families name an unknown family "${key}".`)
    }
  }
  const parsed: Partial<Record<ChordFamilyId, ChordFamilyLevel>> = {}
  for (const family of CHORD_FAMILY_IDS) {
    if (!Object.hasOwn(value, family)) {
      throw new ChordFamiliesError(`Chord families are missing the family "${family}".`)
    }
    const level = value[family]
    const known = CHORD_FAMILY_LEVEL_IDS.find((id) => id === level)
    if (known === undefined) {
      throw new ChordFamiliesError(
        `Chord families give "${family}" the unknown level ${JSON.stringify(level)}; expected one of ${JSON.stringify(CHORD_FAMILY_LEVEL_IDS)}.`,
      )
    }
    parsed[family] = known
  }
  return deepFreeze(
    Object.fromEntries(CHORD_FAMILY_IDS.map((family) => [family, parsed[family]])) as ChordFamilies,
  )
}
