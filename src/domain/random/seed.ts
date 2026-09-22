/**
 * A generation seed is a distinct 32-bit unsigned identity. It is branded (nominal) so a raw
 * `number` cannot be passed where a Seed is expected by accident — callers must go through
 * makeSeed, which validates the 32-bit unsigned range.
 */

const SEED_MAX_UNSIGNED_32 = 0xffffffff

declare const seedBrand: unique symbol

/** A validated 32-bit unsigned seed identity. Construct only via makeSeed or parseSeed. */
// @spec-link [[module_named_stream_pseudorandomness]]
export type Seed = number & { readonly [seedBrand]: 'Seed' }

/** Typed failure for an out-of-range or non-integer attempt to construct a Seed. */
// @spec-link [[module_named_stream_pseudorandomness]]
export class SeedConstructionError extends Error {
  readonly kind = 'SeedConstructionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SeedConstructionError'
  }
}

/** Typed failure for a malformed encoded seed string. */
// @spec-link [[module_named_stream_pseudorandomness]]
export class SeedParseError extends Error {
  readonly kind = 'SeedParseError' as const

  constructor(message: string) {
    super(message)
    this.name = 'SeedParseError'
  }
}

/**
 * Intent: validate a raw number as a 32-bit unsigned integer and brand it as a Seed. This is
 * the only way to obtain a Seed from a plain number; out-of-range or non-integer input is
 * rejected loudly rather than clamped, wrapped, or coerced.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function makeSeed(value: number): Seed {
  if (!Number.isInteger(value)) {
    throw new SeedConstructionError(`Seed must be an integer, got ${value}.`)
  }
  if (value < 0 || value > SEED_MAX_UNSIGNED_32) {
    throw new SeedConstructionError(
      `Seed must be a 32-bit unsigned integer in [0, ${SEED_MAX_UNSIGNED_32}], got ${value}.`,
    )
  }
  return value as Seed
}

// Documented string encoding, version 1: `seed1-` followed by exactly 8 lowercase hex digits,
// the seed's unsigned 32-bit value zero-padded to 8 digits. The version prefix lets a future
// encoding change be distinguished from this one rather than silently misparsed.
const SEED_ENCODING_PREFIX = 'seed1-'
const SEED_ENCODING_PATTERN = /^seed1-([0-9a-f]{8})$/u

/** Intent: render a Seed as its stable, documented, versioned string encoding. */
// @spec-link [[module_named_stream_pseudorandomness]]
export function encodeSeed(seed: Seed): string {
  const unsigned = seed >>> 0
  return `${SEED_ENCODING_PREFIX}${unsigned.toString(16).padStart(8, '0')}`
}

/**
 * Intent: parse the documented seed string encoding back into a Seed, exactly inverting
 * encodeSeed. Rejects any string that does not match the versioned encoding as a typed failure.
 */
// @spec-link [[module_named_stream_pseudorandomness]]
export function parseSeed(encoded: string): Seed {
  const match = SEED_ENCODING_PATTERN.exec(encoded)
  if (!match) {
    throw new SeedParseError(
      `"${encoded}" is not a valid seed1-encoded seed (expected "seed1-" followed by 8 lowercase hex digits).`,
    )
  }
  const hexDigits = match[1]
  if (hexDigits === undefined) {
    throw new SeedParseError(`"${encoded}" did not capture the expected hex digits.`)
  }
  const unsigned = Number.parseInt(hexDigits, 16) >>> 0
  return makeSeed(unsigned)
}
