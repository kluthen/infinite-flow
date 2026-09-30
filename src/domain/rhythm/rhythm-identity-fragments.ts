/**
 * The normalized rhythm identity assembled from cached JSON fragments. `JSON.stringify` without a
 * replacer or indentation is compositional: an object's text is its keys, in insertion order, each
 * followed by its value's standalone text, and an array's text is its elements' texts. So the
 * identity of `normalizedRhythmIdentity` can be spliced from the standalone text of its parts.
 * Bars, descriptors, the recurrence and the input are shared by many candidates of one expansion,
 * so each is serialized once per expansion instead of once per candidate. (Caching finer parts,
 * such as source-cell lists, measured slower: many small pieces cost more to join than to
 * serialize.)
 */
import type { RhythmBar, RhythmTransformDescriptor, UnindexedRhythmCandidate } from './rhythm-types'

/**
 * Per-expansion cache of each shared part's standalone JSON text, keyed by the part object. Parts
 * are never mutated, so a cached text is the text a fresh serialization would produce.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export type RhythmIdentityFragments = WeakMap<object, string>

/** A fresh, empty fragment cache for one rhythm expansion. */
// @spec-link [[entity_rhythm_candidate_domain]]
export function createRhythmIdentityFragments(): RhythmIdentityFragments {
  return new WeakMap()
}

/** `JSON.stringify(part)`, cached on first use. */
function fragment(fragments: RhythmIdentityFragments, part: object): string {
  let text = fragments.get(part)
  if (text === undefined) {
    text = JSON.stringify(part)
    fragments.set(part, text)
  }
  return text
}

/** The JSON array text of the parts, from each part's cached text. */
function arrayFragment(
  fragments: RhythmIdentityFragments,
  parts: readonly (RhythmBar | RhythmTransformDescriptor)[],
): string {
  let text = '['
  for (let index = 0; index < parts.length; index += 1) {
    if (index > 0) text += ','
    text += fragment(fragments, parts[index]!)
  }
  return `${text}]`
}

/**
 * Exactly `normalizedRhythmIdentity(candidate)`: the same keys in the same order (grammarVersion,
 * controls, bars, recurrence, transforms), each value's text taken from the cache. Every field is
 * required, so a field that would not serialize is an error rather than an omitted key.
 */
// @spec-link [[entity_rhythm_candidate_domain]]
export function fragmentRhythmIdentity(
  fragments: RhythmIdentityFragments,
  candidate: UnindexedRhythmCandidate,
): string {
  const { grammarVersion, input, bars, recurrence, transforms } = candidate
  if (
    !Array.isArray(bars) ||
    !Array.isArray(transforms) ||
    typeof grammarVersion !== 'string' ||
    typeof input !== 'object' ||
    input === null ||
    typeof recurrence !== 'object' ||
    recurrence === null ||
    bars.some((bar) => typeof bar !== 'object' || bar === null) ||
    transforms.some((descriptor) => typeof descriptor !== 'object' || descriptor === null)
  )
    throw new TypeError('rhythm identity requires every structural field')
  return (
    `{"grammarVersion":${JSON.stringify(grammarVersion)},` +
    `"controls":${fragment(fragments, input)},` +
    `"bars":${arrayFragment(fragments, bars)},` +
    `"recurrence":${fragment(fragments, recurrence)},` +
    `"transforms":${arrayFragment(fragments, transforms)}}`
  )
}
