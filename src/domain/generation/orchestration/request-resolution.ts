/**
 * Resolution of a Step 7 GenerationIntent into the fully-resolved core GenerationRequest(s) it
 * covers, and deterministic seeded selection among successful Varying register windows. A fixed
 * register resolves to exactly one core request; Varying resolves to one request per candidate
 * window, walked in the canonical Low, Middle, High order.
 */

import type { GenerationIntent } from '../generation-intent'
import { makeGenerationRequest, type GenerationRequest } from '../generation-request'
import { deepFreeze } from '../../events/deep-freeze'
import { CANONICAL_REGISTER_INDEX, type RegisterId } from '../../profile/register-id'
import {
  registerTieKey,
  type GenerationAffectingRegisterIntent,
} from '../../profile/register-tie-key'
import { resolveRegisterIntentCandidate } from '../../profile/register-intent'

/** Typed failure for a rejected attempt to resolve requests or select a Varying register. */
// @spec-link [[service_generation_orchestration]]
export class RequestResolutionError extends Error {
  readonly kind = 'RequestResolutionError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RequestResolutionError'
  }
}

/** Intent: build one resolved core GenerationRequest for one candidate register window. */
function buildCoreRequest(intent: GenerationIntent, id: RegisterId): GenerationRequest {
  const candidate = resolveRegisterIntentCandidate(intent.registerIntent, id)
  return makeGenerationRequest({
    requestId: intent.requestId,
    seed: intent.seed,
    measureCount: intent.measureCount,
    meter: intent.meter,
    activeConcertRange: intent.instrumentProfile.concertRange,
    register: candidate.id,
    registerWindow: candidate.window,
  })
}

/**
 * Intent: resolve a GenerationIntent into the complete, immutable list of core requests it
 * covers. A fixed register (Low/Middle/High) resolves to exactly one request for that register;
 * Varying resolves to one request per resolved candidate window, in the intent's already-
 * canonical Low, Middle, High candidate order.
 */
// @spec-link [[service_generation_orchestration]]
export function resolveCoreRequests(intent: GenerationIntent): readonly GenerationRequest[] {
  if (intent.registerIntent.requestedRegister === 'Varying') {
    return deepFreeze(
      intent.registerIntent.candidates.map((candidate) => buildCoreRequest(intent, candidate.id)),
    )
  }
  return deepFreeze([buildCoreRequest(intent, intent.registerIntent.requestedRegister)])
}

/** Intent: derive the generation-affecting register intent used for register tie-key derivation. */
function toGenerationAffectingRegisterIntent(
  intent: GenerationIntent,
): GenerationAffectingRegisterIntent {
  return {
    sourceRange: intent.registerIntent.sourceRange,
    requestedRegister: intent.registerIntent.requestedRegister,
    policyVersion: intent.registerIntent.policyVersion,
  }
}

/** Intent: reject a successful-register set that is empty, unknown to the intent, or duplicated. */
function assertValidSuccessfulRegisters(
  successful: readonly RegisterId[],
  candidateIds: readonly RegisterId[],
): void {
  if (successful.length === 0) {
    throw new RequestResolutionError(
      'At least one successful register window is required to select among.',
    )
  }
  successful.forEach((id, index) => {
    if (!candidateIds.includes(id)) {
      throw new RequestResolutionError(
        `Register "${id}" is not among the intent's candidate windows.`,
      )
    }
    if (successful.indexOf(id) !== index) {
      throw new RequestResolutionError(`Register "${id}" appears more than once in "successful".`)
    }
  })
}

/**
 * Intent: choose one register among a set of successfully-searched candidate windows, by the
 * lowest unsigned register tie key for the intent's seed and generation-affecting register
 * intent, falling back to the canonical register index (Low=0, Middle=1, High=2) only on a key
 * collision. Accepts an injectable, defaulted key function so a collision can be constructed
 * deterministically in tests. Rejects an empty, unknown, or duplicated successful set.
 */
// @spec-link [[rule_instrument_profile_range]]
export function selectVaryingRegister(
  intent: GenerationIntent,
  successful: readonly RegisterId[],
  key: typeof registerTieKey = registerTieKey,
): RegisterId {
  const candidateIds = intent.registerIntent.candidates.map((candidate) => candidate.id)
  assertValidSuccessfulRegisters(successful, candidateIds)

  const generationAffectingIntent = toGenerationAffectingRegisterIntent(intent)
  const ranked = successful
    .map((id) => ({
      id,
      tieKey: key(intent.seed, generationAffectingIntent, id),
      canonicalIndex: CANONICAL_REGISTER_INDEX[id],
    }))
    .sort((left, right) => left.tieKey - right.tieKey || left.canonicalIndex - right.canonicalIndex)

  return ranked[0]!.id
}
