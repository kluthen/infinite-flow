/**
 * The outer, player-facing register-intent boundary: the closed four-value vocabulary a player
 * selects from (Low, Middle, High, Varying), and the descriptor that carries a requested choice
 * alongside its resolved candidate set for a validated instrument profile. Varying is deliberately
 * representable here — this is the outer boundary — but the narrower three-value vocabulary this
 * resolves into for a core generation request (see ../generation/generation-request.ts) excludes
 * it entirely at the type level; see register-id.ts for that narrower resolved vocabulary.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type InstrumentProfile } from './instrument-profile'
import { type RegisterId } from './register-id'
import {
  REGISTER_WINDOW_ALGORITHM_V1,
  type RegisterWindowCandidate,
  deriveRegisterWindowCandidates,
} from './register-window-derivation'
import { type ActiveConcertRange } from './active-concert-range'

/** The outer, player-facing register selection vocabulary: a fixed register, or Varying. */
// @spec-link [[module_register_intent_boundary]]
export type RegisterChoice = RegisterId | 'Varying'

/**
 * A register-intent descriptor: the requested outer choice plus the resolved candidate set
 * derived from a validated instrument profile. Built once per profile/requested-choice pair;
 * never mutated.
 */
// @spec-link [[module_register_intent_boundary]]
export interface RegisterIntent {
  readonly kind: 'RegisterIntent'
  readonly sourceRange: ActiveConcertRange
  readonly requestedRegister: RegisterChoice
  readonly candidates: readonly RegisterWindowCandidate[]
  readonly policyVersion: typeof REGISTER_WINDOW_ALGORITHM_V1
}

/** Typed failure for an invalid attempt to resolve a candidate from a RegisterIntent. */
// @spec-link [[module_register_intent_boundary]]
export class RegisterIntentError extends Error {
  readonly kind = 'RegisterIntentError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RegisterIntentError'
  }
}

/**
 * Intent: build an immutable, deep-frozen RegisterIntent for a validated instrument profile and
 * a requested outer register choice, reusing deriveRegisterWindowCandidates for the resolved
 * candidate set so window derivation has exactly one implementation. Accepts Varying as a valid
 * requested choice — resolving Varying into one concrete candidate is not this function's job.
 */
// @spec-link [[module_register_intent_boundary]]
// @spec-link [[module_phrase_generation_profile_policy]]
export function buildRegisterIntent(
  profile: InstrumentProfile,
  requestedRegister: RegisterChoice,
): RegisterIntent {
  const candidates = deriveRegisterWindowCandidates(profile.concertRange, profile.registerWindows)

  return deepFreeze({
    kind: 'RegisterIntent',
    sourceRange: profile.concertRange,
    requestedRegister,
    candidates,
    policyVersion: profile.registerWindows.algorithm,
  })
}

/**
 * Intent: resolve exactly one candidate window by its stable register identity from an already-
 * built RegisterIntent. Rejects an identity absent from the candidate set as a typed failure
 * rather than returning undefined.
 */
// @spec-link [[module_register_intent_boundary]]
export function resolveRegisterIntentCandidate(
  intent: RegisterIntent,
  id: RegisterId,
): RegisterWindowCandidate {
  const candidate = intent.candidates.find((entry) => entry.id === id)
  if (candidate === undefined) {
    throw new RegisterIntentError(`No candidate window found for register "${id}".`)
  }
  return candidate
}
