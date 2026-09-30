/**
 * FNV-1a 32-bit hash: a small, well-known, non-cryptographic hash used to mix deterministic
 * string inputs into a 32-bit unsigned value across this schema (named-stream label mixing,
 * register tie-key derivation). Extracted as a shared primitive so every consumer uses exactly
 * the same arithmetic rather than each owning a private copy that could silently drift apart.
 */

// Standard FNV-1a 32-bit offset basis and prime.
export const FNV_OFFSET_BASIS_32 = 0x811c9dc5
export const FNV_PRIME_32 = 0x01000193

/**
 * Intent: compute the FNV-1a 32-bit hash of a string, forcing unsigned interpretation at every
 * step. Every intermediate value is forced into unsigned 32-bit interpretation with `>>> 0`, the
 * single most common source of cross-runtime drift for bitwise hashes, so it is made explicit
 * rather than left to JS's default signed semantics.
 */
// @spec-link [[module_register_window_resolution_primitives]]
// @spec-link [[module_named_stream_pseudorandomness]]
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS_32
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash ^ input.charCodeAt(index)) >>> 0
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0
  }
  return hash >>> 0
}

/**
 * Intent: resume an FNV-1a 32-bit hash state over the UTF-16 code units `input[start..end)`, with
 * exactly the per-character arithmetic of `fnv1a32`. Hashing a string in consecutive pieces with
 * this helper, starting from `FNV_OFFSET_BASIS_32`, gives the same value as `fnv1a32` over their
 * concatenation, so a caller can hash a shared prefix once and continue it without concatenating.
 */
// @spec-link [[module_ranked_candidate_ordering]]
export function fnv1a32Resume(hash: number, input: string, start: number, end: number): number {
  let state = hash >>> 0
  for (let index = start; index < end; index += 1) {
    state = (state ^ input.charCodeAt(index)) >>> 0
    state = Math.imul(state, FNV_PRIME_32) >>> 0
  }
  return state >>> 0
}
