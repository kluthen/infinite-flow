/**
 * The favored figure draw: whether a Favored or Strongly favored figure is drawn at a note, the
 * same way in every browser. A pure function of the phrase's seed, the note's identity, the figure
 * and its level, in whole-number operations only: no floating point anywhere in this module.
 */

import type { FigureId, FigureLevel } from '../figures/figure-levels'
import { fnv1a32 } from '../random/hash32'

/** Intent: the draw's versioned hash domain, so its hashes never collide with another stage's. */
// @spec-link [[rule_figure_draws_reproducible]]
export const FIGURE_DRAW_DOMAIN = 'infinite-flow/figure-draw/v1'

/** Intent: how many top bits of the hash a draw reads; each share is a numerator over 2^16. */
// @spec-link [[module_favored_figure_draw]]
export const FIGURE_DRAW_SHARE_BITS = 16

/** The mask keeping exactly the draw's FIGURE_DRAW_SHARE_BITS bits. */
const SHARE_MASK = 0xffff

/**
 * Intent: Favored's share of notes, 16384 / 65536 = 1/4. Never above Strongly favored's.
 * Measured shares: docs/generation-latency.md, "Embellishment figures" (M1).
 */
// @spec-link [[module_favored_figure_draw]]
// @spec-link [[rule_figure_draws_reproducible]]
export const FAVORED_SHARE = 0x4000

/**
 * Intent: Strongly favored's share of notes, 32768 / 65536 = 1/2. Never below Favored's.
 * Measured shares: docs/generation-latency.md, "Embellishment figures" (M1).
 */
// @spec-link [[module_favored_figure_draw]]
// @spec-link [[rule_figure_draws_reproducible]]
export const STRONGLY_FAVORED_SHARE = 0x8000

/** Intent: the two levels at which a figure is drawn. */
// @spec-link [[module_favored_figure_draw]]
export type FavoredLevel = 'favored' | 'stronglyFavored'

/** Each favored level's share. */
const SHARES: Readonly<Record<FavoredLevel, number>> = Object.freeze({
  favored: FAVORED_SHARE,
  stronglyFavored: STRONGLY_FAVORED_SHARE,
})

/** Intent: whether a level is one at which a figure is drawn: Favored or Strongly favored. */
// @spec-link [[module_favored_figure_draw]]
export function isFavoredLevel(level: FigureLevel): level is FavoredLevel {
  return level === 'favored' || level === 'stronglyFavored'
}

/**
 * Intent: whether a figure is drawn at a note: never at Off or As today, where no hash is
 * computed; otherwise when the top 16 bits of the FNV-1a 32-bit hash of the draw domain, the seed,
 * the note identity and the figure id fall under the level's share. Reads nothing else, so the
 * same inputs always give the same draw on every machine.
 */
// @spec-link [[module_favored_figure_draw]]
// @spec-link [[rule_figure_draws_reproducible]]
export function isFigureDrawn(
  seed: number,
  noteIdentity: string,
  figureId: FigureId,
  level: FigureLevel,
): boolean {
  if (!isFavoredLevel(level)) return false
  const hash = fnv1a32(`${FIGURE_DRAW_DOMAIN}|${seed}|${noteIdentity}|${figureId}`)
  return ((hash >>> (32 - FIGURE_DRAW_SHARE_BITS)) & SHARE_MASK) < SHARES[level]
}
