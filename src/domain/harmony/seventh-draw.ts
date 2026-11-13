/**
 * The seventh-chord draw (spec D278): whether a harmony event tries its seventh form before its
 * triad form, the same way in every browser. A pure function of the Seventh chords level, the
 * phrase's seed and where the event starts (its bar index and start beat), in whole-number
 * operations only: no floating point anywhere in this module. It reads neither the event's degree
 * nor its role nor anything a generation stage chooses, and draws from no stream.
 */

import type { ChordFamilyLevel } from '../chords/chord-families'
import { fnv1a32 } from '../random/hash32'
import { encodeSeed, type Seed } from '../random/seed'
import type { HarmonyEvent } from './harmony-types'

/** Intent: the draw's versioned hash domain, so its hashes never collide with another stage's. */
// @spec-link [[module_named_stream_pseudorandomness]]
// @spec-link [[rule_seventh_chord_draws_reproducible]]
export const SEVENTH_DRAW_DOMAIN = 'infinite-flow/seventh-chord/v1'

/** Intent: how many low bits of the hash a draw reads; each share is a numerator over 2^8. */
// @spec-link [[module_named_stream_pseudorandomness]]
export const SEVENTH_DRAW_SHARE_BITS = 8

/** The mask keeping exactly the draw's SEVENTH_DRAW_SHARE_BITS low bits. */
const SHARE_MASK = 0xff

/**
 * Intent: Sometimes' share of harmony events, 64 / 256 = about 1 in 4, a starting value. Never
 * above Favored's.
 */
// @spec-link [[rule_seventh_chords_level_steps]]
export const SOMETIMES_SEVENTH_SHARE = 64

/**
 * Intent: Favored's share of harmony events, 128 / 256 = about 1 in 2, a starting value. Never
 * below Sometimes'.
 */
// @spec-link [[rule_seventh_chords_level_steps]]
export const FAVORED_SEVENTH_SHARE = 128

/** The two levels whose draw hashes, and each one's share. */
const SHARES: Readonly<Record<'sometimes' | 'favored', number>> = Object.freeze({
  sometimes: SOMETIMES_SEVENTH_SHARE,
  favored: FAVORED_SEVENTH_SHARE,
})

/** Intent: where a harmony event starts, the only part of it the draw reads. */
// @spec-link [[rule_seventh_chance_same_at_every_degree]]
export type SeventhDrawPosition = Pick<HarmonyEvent, 'barIndex' | 'startBeat'>

/**
 * Intent: the low byte of the FNV-1a 32-bit hash of the draw domain, the seed's documented
 * encoding and the event's start (bar index, then start beat).
 */
// @spec-link [[module_named_stream_pseudorandomness]]
// @spec-link [[rule_seventh_chord_draws_reproducible]]
export function seventhDrawByte(seed: Seed, position: SeventhDrawPosition): number {
  const hash = fnv1a32(
    `${SEVENTH_DRAW_DOMAIN}|${encodeSeed(seed)}|${position.barIndex}|${position.startBeat}`,
  )
  return (hash >>> 0) & SHARE_MASK
}

/**
 * Intent: whether the event starting at `position` tries its seventh form first: never at Off and
 * always at Strongly favored, neither computing a hash; at Sometimes and Favored, when the draw's
 * low byte falls under the level's share.
 */
// @spec-link [[rule_seventh_chords_level_steps]]
// @spec-link [[rule_seventh_chance_same_at_every_degree]]
// @spec-link [[rule_seventh_chord_draws_reproducible]]
// @spec-link [[rule_seventh_chords_off_changes_nothing]]
export function isSeventhDrawn(
  level: ChordFamilyLevel,
  seed: Seed,
  position: SeventhDrawPosition,
): boolean {
  if (level === 'off') return false
  if (level === 'stronglyFavored') return true
  return seventhDrawByte(seed, position) < SHARES[level]
}
