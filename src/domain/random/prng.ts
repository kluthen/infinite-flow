/**
 * A small, documented, deterministic 32-bit pseudorandom generator.
 *
 * Algorithm: Mulberry32 (public-domain, by Tommy Ettinger). Chosen for its compactness (a
 * single 32-bit state word, no seeding table) and wide cross-engine reproducibility record.
 * Reference constants (fixed, do not change without bumping every dependent golden fixture):
 *   - state increment: 0x6D2B79F5
 *   - first mix multiplier bit-mask: `| 1`
 *   - second mix multiplier bit-mask: `| 61`
 *
 * Canonical reference form:
 *   function mulberry32(a) {
 *     return function () {
 *       var t = (a += 0x6D2B79F5)
 *       t = Math.imul(t ^ (t >>> 15), t | 1)
 *       t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
 *       return ((t ^ (t >>> 14)) >>> 0) / 4294967296
 *     }
 *   }
 *
 * Every intermediate value is forced into unsigned 32-bit interpretation with `>>> 0` at each
 * step. This is the single most common source of cross-runtime drift for bitwise PRNGs (signed
 * vs. unsigned interpretation of the same bit pattern differs across engines/operations unless
 * forced), so it is made explicit rather than left implicit in JS's default signed semantics.
 */

/** One independent Mulberry32 generator instance with its own private 32-bit state. */
export interface Mulberry32Generator {
  /** Intent: produce the next value as an unsigned 32-bit integer in [0, 0xffffffff]. */
  readonly nextUint32: () => number
  /** Intent: produce the next value as a float in [0, 1), derived from nextUint32. */
  readonly nextFloat: () => number
}

const UINT32_MODULUS = 4294967296 // 2**32

/**
 * Intent: create one independent Mulberry32 generator seeded from a raw 32-bit value. Each
 * instance owns its own closed-over state, so instances never interfere with one another
 * regardless of how many values are drawn from any other instance.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function createMulberry32(seed: number): Mulberry32Generator {
  let state = seed >>> 0

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0
    return (t ^ (t >>> 14)) >>> 0
  }

  function nextFloat(): number {
    return nextUint32() / UINT32_MODULUS
  }

  return { nextUint32, nextFloat }
}
