/**
 * Named-stream pseudorandomness: derives an independent, non-interfering Mulberry32 sequence
 * per named stage of generation, mixing the seed with a stream label drawn from a closed,
 * versioned registry. Each derivation owns its own generator state, so drawing any number of
 * values from one named stream never changes the sequence any other named stream produces.
 */

import { fnv1a32 } from './hash32'
import { createMulberry32 } from './prng'
import type { Seed } from './seed'

/**
 * Intent: version the stream-label mixing scheme so a change to it (adding/renaming a label,
 * changing the mixing hash) is explicit and can be paired with a golden-fixture regeneration
 * rather than silently reproducing different sequences under the same registry identity.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export const STREAM_REGISTRY_VERSION = 1

/**
 * Intent: the closed, versioned registry of stream labels. Typed as a literal union (not
 * `string`) so requesting an unregistered label is a compile-time error, not a runtime one.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export const STREAM_LABELS = [
  'harmony',
  'rhythm',
  'pitch',
  'register-resolution',
  'tie-breaking',
] as const

/** The closed union of registered named-stream labels. */
// @spec-link [[module_named_stream_pseudorandomness]]
export type StreamLabel = (typeof STREAM_LABELS)[number]

/** One named, independently-seeded pseudorandom stream. */
export interface NamedStream {
  readonly label: StreamLabel
  /** Intent: produce the next value from this stream as an unsigned 32-bit integer. */
  readonly next: () => number
  /** Intent: produce the next value from this stream as a float in [0, 1). */
  readonly nextFloat: () => number
}

/**
 * Intent: mix a Seed with a versioned stream label into one 32-bit unsigned value used to seed
 * that label's private Mulberry32 generator, so distinct labels under the same seed start from
 * distinct, deterministic states.
 */
function mixSeedWithLabel(seed: Seed, label: StreamLabel): number {
  const labelHash = fnv1a32(`named-stream-registry-v${STREAM_REGISTRY_VERSION}:${label}`)
  return ((seed >>> 0) ^ labelHash) >>> 0
}

/**
 * Intent: derive the named, independent pseudorandom stream for a registered label under a
 * seed. Each call returns a fresh generator with its own private state, closed over
 * independently of any other derived stream, so consuming values from one never shifts another.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function deriveNamedStream(seed: Seed, label: StreamLabel): NamedStream {
  const mixedSeed = mixSeedWithLabel(seed, label)
  const generator = createMulberry32(mixedSeed)

  return {
    label,
    next: generator.nextUint32,
    nextFloat: generator.nextFloat,
  }
}
