/**
 * Deterministic register tie-key derivation: a versioned 32-bit unsigned key computed from a
 * seed, the canonical field-ordered serialization of the generation-affecting register intent,
 * and a candidate window's stable identity. This module fixes only how the key is computed; it
 * never selects a window or proves eligibility among candidates — that requires running the
 * bounded planner and belongs to a later planning stage.
 */

import { fnv1a32 } from '../random/hash32'
import { encodeSeed, type Seed } from '../random/seed'
import { type ActiveConcertRange } from './active-concert-range'
import { type RegisterChoice } from './register-intent'
import { type RegisterId } from './register-id'

/**
 * Intent: version the register tie-key domain so a change to the hash inputs (adding a
 * generation-affecting field, changing the hash algorithm) is explicit and can be paired with a
 * golden-fixture regeneration rather than silently reproducing different keys under the same
 * identity.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export const REGISTER_TIE_KEY_DOMAIN_V1 = 'infinite-flow/register-window/v1'

/**
 * The generation-affecting register intent: exactly the fields that can change a resolved
 * register window or tie key. Display convention, theme, notation, and session state are
 * structurally excluded — there is no field for them here, so they cannot be passed into
 * canonicalization or key derivation by construction, not merely by runtime filtering.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export interface GenerationAffectingRegisterIntent {
  readonly sourceRange: ActiveConcertRange
  readonly requestedRegister: RegisterChoice
  readonly policyVersion: string
}

const CANONICAL_SERIALIZATION_VERSION = 'v1'

/**
 * Intent: serialize the generation-affecting register intent into one explicit, field-ordered
 * string. Field order is fixed in source (never derived from Object.keys or JSON.stringify of an
 * arbitrary object) so the same logical intent always serializes identically regardless of how
 * the caller constructed the input object.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export function canonicalizeGenerationAffectingRegisterIntent(
  intent: GenerationAffectingRegisterIntent,
): string {
  return [
    `v=${CANONICAL_SERIALIZATION_VERSION}`,
    `rangeMin=${intent.sourceRange.minMidi}`,
    `rangeMax=${intent.sourceRange.maxMidi}`,
    `register=${intent.requestedRegister}`,
    `policy=${intent.policyVersion}`,
  ].join('|')
}

/**
 * Intent: derive the deterministic 32-bit unsigned register tie key for one candidate window
 * identity, hashing (with the project's FNV-1a 32-bit hash) the concatenation of the versioned
 * domain string, the seed's documented string encoding (reusing seed.ts's own encoding rather
 * than inventing a second one), the canonical generation-affecting intent serialization, and the
 * candidate's stable identity. Identical inputs always produce an identical key; display,
 * theme, notation, and session state cannot influence it because they are not parameters of
 * this function.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export function registerTieKey(
  seed: Seed,
  intent: GenerationAffectingRegisterIntent,
  candidateId: RegisterId,
): number {
  const payload = [
    REGISTER_TIE_KEY_DOMAIN_V1,
    encodeSeed(seed),
    canonicalizeGenerationAffectingRegisterIntent(intent),
    candidateId,
  ].join('|')

  return fnv1a32(payload)
}
